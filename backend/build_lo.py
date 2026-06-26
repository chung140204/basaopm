"""Gom các thửa liền kề thành LÔ (cụm) và lưu vào bảng `lo`.

  - Dùng ST_ClusterDBSCAN gom theo khoảng cách (thửa cách nhau < eps → cùng lô).
  - Mỗi lô: hình bao (convex hull các thửa), diện tích tổng, số ô con.
  - meta (jsonb): mã lô / mô tả / ghi chú — người dùng sửa qua app.
  - Gắn lo_id vào từng thửa (cột ranh_thua.lo_id) để biết thửa thuộc lô nào.

Chạy: python build_lo.py   (sau khi import_shp.py đã nạp ranh_thua).
"""
from app.db import get_conn

# eps ~0.00012 độ ≈ 13m: thửa cách nhau dưới ngần này coi như cùng dãy/lô.
EPS = 0.00012
MIN_POINTS = 1  # cho phép lô 1 thửa

# Mỗi phần tử là 1 câu lệnh DDL chạy riêng (psycopg không cho gộp nhiều lệnh).
DDL = [
    "DROP TABLE IF EXISTS lo CASCADE;",
    """CREATE TABLE lo (
        id        serial PRIMARY KEY,
        layer_id  text NOT NULL,
        cell_count integer NOT NULL DEFAULT 0,
        area_total double precision NOT NULL DEFAULT 0,
        meta      jsonb NOT NULL DEFAULT '{}'::jsonb,
        geom      geometry(Polygon, 4326) NOT NULL
    );""",
    "CREATE INDEX lo_geom_gist ON lo USING GIST (geom);",
    "ALTER TABLE ranh_thua ADD COLUMN IF NOT EXISTS lo_id integer;",
]

# 1) Gán cluster_id (cid) cho từng thửa, lưu tạm vào ranh_thua.lo_id.
#    Tách từng câu (psycopg không cho nhiều lệnh trong 1 execute có tham số).
CLUSTER_RESET = "UPDATE ranh_thua SET lo_id = NULL;"
CLUSTER = """
WITH clustered AS (
    SELECT id,
           ST_ClusterDBSCAN(geom, eps := %s, minpoints := %s)
             OVER (PARTITION BY layer_id) AS cid
    FROM ranh_thua
)
UPDATE ranh_thua r SET lo_id = c.cid
FROM clustered c WHERE r.id = c.id AND c.cid IS NOT NULL;
"""

# 2) Tạo lô từ các cluster (gom theo lo_id tạm), rồi map lo_id tạm → id thật.
BUILD = """
-- Tạo lô; convex hull + buffer nhỏ để luôn ra polygon.
WITH grouped AS (
    SELECT layer_id, lo_id AS cid,
           COUNT(*)                        AS cell_count,
           SUM(ST_Area(geom::geography))   AS area_total,
           ST_Buffer(ST_ConvexHull(ST_Collect(geom)), 0.000008) AS hull
    FROM ranh_thua
    WHERE lo_id IS NOT NULL
    GROUP BY layer_id, lo_id
)
INSERT INTO lo (id, layer_id, cell_count, area_total, geom)
SELECT cid + 1, layer_id, cell_count, area_total,
       hull::geometry(Polygon, 4326)
FROM grouped;
"""

# 3) Map lo_id tạm (cid) → id thật của bảng lo (= cid + 1).
REMAP = "UPDATE ranh_thua SET lo_id = lo_id + 1 WHERE lo_id IS NOT NULL;"


def main():
    with get_conn() as conn, conn.cursor() as cur:
        for stmt in DDL:
            cur.execute(stmt)
        conn.commit()
        cur.execute(CLUSTER_RESET)
        cur.execute(CLUSTER, (EPS, MIN_POINTS))
        conn.commit()
        cur.execute(BUILD)
        cur.execute(REMAP)
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM lo")
        (n_lo,) = cur.fetchone()
        cur.execute("SELECT COUNT(*) FROM ranh_thua WHERE lo_id IS NOT NULL")
        (n_assigned,) = cur.fetchone()
    print(f"Đã tạo {n_lo} lô; gắn lo_id cho {n_assigned} thửa.")


if __name__ == "__main__":
    main()
