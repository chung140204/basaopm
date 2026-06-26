"""Nạp bản vẽ chia lô '05 Chia lo DCCB' (DWG → DXF) vào PostGIS.

Pipeline:
  1. DWG (AutoCAD 2007 / AC1021) đã được ODA File Converter chuyển sang DXF
     (xem _dccb_seed/dccb.dxf). Script này đọc DXF.
  2. Lấy line-work các lớp ranh (CHIA_LO_MOI + DUONG + VIAHE + BO), nối thành
     mạng kín rồi POLYGONIZE → từng ô/lô (lot face). Bản vẽ CAD vẽ ranh bằng
     line hở dùng chung cạnh, nên phải polygonize mới ra đa giác từng lô.
  3. Reproject VN2000 (lon_0=107.75, múi Quảng Ninh) → WGS84 (EPSG:4326).
  4. Nạp vào bảng ranh_thua với layer_id='dccb-chialo' (KHÔNG xoá layer cũ).
     Frontend tự phát hiện layer mới qua GET /api/ranh-thua/layers.

Chạy:  python import_dwg_dccb.py     (trong container backend, có DATABASE_URL)
"""
import json
import os

import ezdxf
from pyproj import Transformer
from shapely.geometry import LineString, mapping
from shapely.ops import polygonize, unary_union

from app.db import get_conn

DXF_PATH = os.environ.get("DXF_PATH", "_dccb_seed/dccb.dxf")
LAYER_ID = os.environ.get("LAYER_ID", "dccb-chialo")

# Các lớp tạo nên ranh ô/lô. CHIA_LO_MOI là ranh lô mới; DUONG/VIAHE/BO là
# đường/vỉa hè/bó vỉa — cạnh ngoài của các lô giáp đường nằm ở những lớp này,
# nên phải gộp chung mới khép kín được đa giác.
BOUNDARY_LAYERS = ("CHIA_LO_MOI", "DUONG", "VIAHE", "BO")

# Diện tích tối thiểu (m²) để loại các mảnh vụn (sliver) do giao cắt line.
MIN_AREA_M2 = 20.0

# --- Đặt chồng bản vẽ lên khu Chí Linh -----------------------------------
# Dữ liệu gốc đo ở Quảng Ninh; dự án thực tế ở Chí Linh (Hải Dương). Sau khi
# reproject ra lon/lat thật, ta TỊNH TIẾN + CO GIÃN ĐỀU (giữ nguyên hình dạng,
# không méo) để khung bản vẽ trùng với extent lớp ranh thửa Chí Linh hiện có
# (layer_id='truonglinh-chialo'). FIT_TO_LAYER = None để tắt việc đặt chồng.
FIT_TO_LAYER = os.environ.get("FIT_TO_LAYER", "truonglinh-chialo") or None
# Tỷ lệ lấp đầy khung đích (0..1): 1.0 = vừa khít, <1 để chừa lề.
FIT_RATIO = float(os.environ.get("FIT_RATIO", "1.0"))

# VN2000 múi 3°, kinh tuyến trục 107.75 (Quảng Ninh). Xác định bằng cách
# reproject và so khớp với extent dữ liệu hiện có (lon≈109.99, lat≈20.75).
VN2000_PROJ4 = (
    "+proj=tmerc +lat_0=0 +lon_0=107.75 +k=0.9999 +x_0=500000 +y_0=0 "
    "+ellps=WGS84 +units=m +no_defs "
    "+towgs84=-191.90441429,-39.30318279,-111.45032835,"
    "-0.00928836,0.01975479,-0.00427372,0.252906278"
)

DDL = """
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS ranh_thua (
    id          serial PRIMARY KEY,
    layer_id    text NOT NULL,
    properties  jsonb NOT NULL DEFAULT '{}'::jsonb,
    meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
    geom        geometry(Geometry, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS ranh_thua_geom_gist ON ranh_thua USING GIST (geom);
CREATE INDEX IF NOT EXISTS ranh_thua_layer_idx ON ranh_thua (layer_id);
"""


def collect_linework(msp) -> list[LineString]:
    """Gom mọi đoạn line từ các lớp ranh thành danh sách LineString (VN2000 m)."""
    lines: list[LineString] = []
    for lyr in BOUNDARY_LAYERS:
        for e in msp.query(f'LWPOLYLINE[layer=="{lyr}"]'):
            pts = [(round(p[0], 3), round(p[1], 3)) for p in e.get_points()]
            if len(pts) >= 2:
                lines.append(LineString(pts))
        for e in msp.query(f'LINE[layer=="{lyr}"]'):
            s, t = e.dxf.start, e.dxf.end
            lines.append(LineString([(round(s.x, 3), round(s.y, 3)),
                                     (round(t.x, 3), round(t.y, 3))]))
        for e in msp.query(f'ARC[layer=="{lyr}"]'):
            pts = [(round(p.x, 3), round(p.y, 3)) for p in e.flattening(0.2)]
            if len(pts) >= 2:
                lines.append(LineString(pts))
    return lines


def _layer_bbox(layer_id: str):
    """Lấy bbox [minLon,minLat,maxLon,maxLat] của 1 layer trong ranh_thua."""
    sql = """
        SELECT ST_XMin(e), ST_YMin(e), ST_XMax(e), ST_YMax(e)
        FROM (SELECT ST_Extent(geom) AS e FROM ranh_thua
              WHERE layer_id = %s) t
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (layer_id,))
        row = cur.fetchone()
    if not row or row[0] is None:
        return None
    return [float(v) for v in row]


def _fit_transform(rings_ll, target_layer, ratio):
    """Trả hàm (lon,lat) -> (lon,lat): tịnh tiến + co giãn ĐỀU (không méo)
    để khung bản vẽ trùng tâm và vừa khít extent của target_layer.
    Nếu target_layer None hoặc không có dữ liệu → trả hàm đồng nhất.
    """
    if not target_layer:
        return lambda x, y: (x, y)
    tgt = _layer_bbox(target_layer)
    if not tgt:
        print(f"  (không thấy layer đích '{target_layer}', giữ nguyên vị trí)")
        return lambda x, y: (x, y)

    xs = [p[0] for r in rings_ll for p in r]
    ys = [p[1] for r in rings_ll for p in r]
    sx0, sy0, sx1, sy1 = min(xs), min(ys), max(xs), max(ys)
    scx, scy = (sx0 + sx1) / 2, (sy0 + sy1) / 2          # tâm nguồn
    tx0, ty0, tx1, ty1 = tgt
    tcx, tcy = (tx0 + tx1) / 2, (ty0 + ty1) / 2          # tâm đích

    # scale đồng đều: vừa khít theo chiều chật nhất, có chừa lề theo ratio.
    sw, sh = (sx1 - sx0) or 1e-9, (sy1 - sy0) or 1e-9
    tw, th = (tx1 - tx0), (ty1 - ty0)
    s = min(tw / sw, th / sh) * ratio
    print(f"  Đặt chồng lên '{target_layer}': scale={s:.4f}, "
          f"tâm {scx:.5f},{scy:.5f} → {tcx:.5f},{tcy:.5f}")
    return lambda x, y: (tcx + (x - scx) * s, tcy + (y - scy) * s)


def main():
    print(f"Đọc DXF: {DXF_PATH}")
    doc = ezdxf.readfile(DXF_PATH)
    msp = doc.modelspace()

    lines = collect_linework(msp)
    print(f"Line-work: {len(lines)} đoạn từ lớp {BOUNDARY_LAYERS}")

    print("Polygonize → tách từng ô/lô…")
    faces = list(polygonize(unary_union(lines)))
    lots = [p for p in faces if p.area > MIN_AREA_M2]
    print(f"Đa giác: {len(faces)} (giữ {len(lots)} ô diện tích > {MIN_AREA_M2} m²)")

    transformer = Transformer.from_crs(VN2000_PROJ4, "EPSG:4326", always_xy=True)

    # B1: reproject tất cả lô ra lon/lat thật (Quảng Ninh).
    lots_ll = [
        [transformer.transform(x, y) for x, y in poly.exterior.coords]
        for poly in sorted(lots, key=lambda p: -p.area)
    ]

    # B2: nếu cần, tính phép tịnh tiến + co giãn đều để đặt chồng lên khu đích.
    place = _fit_transform(lots_ll, FIT_TO_LAYER, FIT_RATIO)

    def to_wgs84(ring):
        ring2 = [place(x, y) for x, y in ring]
        return {"type": "Polygon", "coordinates": [ring2]}

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(DDL)
        conn.commit()
        # Nạp lại sạch riêng layer này (idempotent), không đụng layer khác.
        cur.execute("DELETE FROM ranh_thua WHERE layer_id = %s", (LAYER_ID,))

        sql = (
            "INSERT INTO ranh_thua (layer_id, properties, geom) "
            "VALUES (%s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))"
        )
        # area_m2 = diện tích THẬT của lô (m²) từ hình gốc VN2000, không đổi
        # khi ta chỉ dời vị trí hiển thị sang Chí Linh.
        areas = [round(p.area, 1) for p in sorted(lots, key=lambda p: -p.area)]
        n = 0
        for i, (ring, area) in enumerate(zip(lots_ll, areas), start=1):
            props = {"layer": "CHIA_LO_MOI", "lo_id": i, "area_m2": area}
            cur.execute(sql, (LAYER_ID, json.dumps(props),
                              json.dumps(to_wgs84(ring))))
            n += 1
        conn.commit()
    print(f"Đã nạp {n} ô vào ranh_thua (layer_id={LAYER_ID}).")


if __name__ == "__main__":
    main()
