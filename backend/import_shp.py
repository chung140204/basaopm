"""Nạp shapefile ranh thửa vào PostGIS.

  - Đọc _shp_seed/TruongLinh_Chialo.shp (VN2000).
  - Reproject sang WGS84 (EPSG:4326).
  - Tạo bảng ranh_thua + GiST index, nạp từng thửa (properties = jsonb).

Chạy: python import_shp.py   (trong container hoặc local có DATABASE_URL).
"""
import json
import os
import math

import geopandas as gpd

from app.db import get_conn

SHP_PATH = os.environ.get("SHP_PATH", "_shp_seed/TruongLinh_Chialo.shp")
LAYER_ID = os.environ.get("LAYER_ID", "truonglinh-chialo")

# proj4 VN2000 chính xác (kèm towgs84) — nguồn dữ liệu dùng hệ này.
VN2000_PROJ4 = (
    "+proj=tmerc +lat_0=0 +lon_0=105.5 +k=0.9999 +x_0=500000 +y_0=0 "
    "+ellps=WGS84 +units=m +no_defs "
    "+towgs84=-191.90441429,-39.30318279,-111.45032835,"
    "-0.00928836,0.01975479,-0.00427372,0.252906278"
)

DDL = """
CREATE EXTENSION IF NOT EXISTS postgis;
DROP TABLE IF EXISTS ranh_thua;
CREATE TABLE ranh_thua (
    id          serial PRIMARY KEY,
    layer_id    text NOT NULL,
    properties  jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- meta: dữ liệu quản lý nghiệp vụ (giá, trạng thái, pháp lý, giao dịch,
    -- thanh toán, hồ sơ) — người dùng nhập/sửa qua app, không có trong shapefile.
    meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
    geom        geometry(Geometry, 4326) NOT NULL
);
CREATE INDEX ranh_thua_geom_gist ON ranh_thua USING GIST (geom);
CREATE INDEX ranh_thua_layer_idx ON ranh_thua (layer_id);
"""


def clean_props(props: dict) -> dict:
    """Bỏ NaN/None lạ, để JSON hợp lệ."""
    out = {}
    for k, v in props.items():
        if isinstance(v, float) and math.isnan(v):
            out[k] = None
        else:
            out[k] = v
    return out


def main():
    print(f"Đọc shapefile: {SHP_PATH}")
    gdf = gpd.read_file(SHP_PATH)
    # Gán CRS nguồn (VN2000) rồi reproject sang WGS84.
    gdf = gdf.set_crs(VN2000_PROJ4, allow_override=True).to_crs(epsg=4326)
    print(f"Số thửa: {len(gdf)}")

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(DDL)
        conn.commit()

        sql = (
            "INSERT INTO ranh_thua (layer_id, properties, geom) "
            "VALUES (%s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))"
        )
        n = 0
        for _, row in gdf.iterrows():
            geom = row.geometry
            if geom is None or geom.is_empty:
                continue
            props = clean_props(
                {k: row[k] for k in gdf.columns if k != "geometry"}
            )
            cur.execute(
                sql,
                (LAYER_ID, json.dumps(props, default=str),
                 json.dumps(geom.__geo_interface__)),
            )
            n += 1
        conn.commit()
    print(f"Đã nạp {n} thửa vào PostGIS (layer_id={LAYER_ID}).")


if __name__ == "__main__":
    main()
