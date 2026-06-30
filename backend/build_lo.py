"""Gom các thửa liền kề thành LÔ (cụm) và lưu vào bảng `lo`.

  - Dùng ST_ClusterDBSCAN gom theo khoảng cách (thửa cách nhau < eps → cùng lô).
  - Mỗi lô: hình bao = UNION (dissolve) các thửa, hàn khe hở nhỏ bằng buffer
    (phình +WELD rồi co -WELD) để ra 1 polygon liền KHÍT với hình thật — thay vì
    convex hull (phình ra ở hình lõm/xiên). Thửa được ST_MakeValid trước vì dữ
    liệu gốc có self-intersection.
  - meta (jsonb): mã lô / mô tả / ghi chú — người dùng sửa qua app. Được BACKUP
    trước khi DROP rồi KHÔI PHỤC sau rebuild (map theo 1 thửa đại diện của lô,
    bền vững kể cả khi id lô đổi).
  - Gắn lo_id vào từng thửa (cột ranh_thua.lo_id) để biết thửa thuộc lô nào.

Chạy: python build_lo.py   (sau khi import_shp.py đã nạp ranh_thua).
"""
from app.db import get_conn

# eps ~0.00012 độ ≈ 13m: thửa cách nhau dưới ngần này coi như cùng dãy/lô.
EPS = 0.00012
MIN_POINTS = 1  # cho phép lô 1 thửa
# Buffer hàn khe hở giữa các thửa trong cùng lô (~0.00002 độ ≈ 2m). Phình ra
# +WELD để các mảnh rời dính lại, rồi co -WELD về kích thước cũ → 1 polygon
# liền khít. Đo trên dữ liệu thật: gộp mọi lô về 1 mảnh, phình chỉ +0~6%
# (so với convex hull phình tới +37%).
WELD = 0.00002

# Mỗi phần tử là 1 câu lệnh DDL chạy riêng (psycopg không cho gộp nhiều lệnh).
DDL = [
    "DROP TABLE IF EXISTS lo CASCADE;",
    """CREATE TABLE lo (
        id        serial PRIMARY KEY,
        layer_id  text NOT NULL,
        cell_count integer NOT NULL DEFAULT 0,
        area_total double precision NOT NULL DEFAULT 0,
        meta      jsonb NOT NULL DEFAULT '{}'::jsonb,
        geom      geometry(MultiPolygon, 4326) NOT NULL
    );""",
    "CREATE INDEX lo_geom_gist ON lo USING GIST (geom);",
    "ALTER TABLE ranh_thua ADD COLUMN IF NOT EXISTS lo_id integer;",
    # Cột tạm giữ cluster id (cid) theo từng layer. lo_id sẽ nhận id THẬT của lô.
    "ALTER TABLE ranh_thua ADD COLUMN IF NOT EXISTS lo_cid integer;",
]

# 1) Gán cluster_id (cid) cho từng thửa, lưu tạm vào ranh_thua.lo_cid.
#    cid đánh số lại từ 0 theo TỪNG layer_id (PARTITION BY) → cid KHÔNG là khoá
#    toàn cục; phải map qua cặp (layer_id, cid), không dùng cid+1 làm id.
CLUSTER_RESET = "UPDATE ranh_thua SET lo_id = NULL, lo_cid = NULL;"
CLUSTER = """
WITH clustered AS (
    SELECT id,
           ST_ClusterDBSCAN(geom, eps := %s, minpoints := %s)
             OVER (PARTITION BY layer_id) AS cid
    FROM ranh_thua
)
UPDATE ranh_thua r SET lo_cid = c.cid
FROM clustered c WHERE r.id = c.id AND c.cid IS NOT NULL;
"""

# 2) Tạo lô từ các cụm (layer_id, cid). DB tự sinh id (serial). Cột tạm `cid`
#    trên bảng lo giữ cluster id để map ngược chính xác (không qua hình học).
#    Hình lô = UNION các thửa (đã MakeValid) + hàn khe buffer(+WELD)/(-WELD).
BUILD_ADD_CID = "ALTER TABLE lo ADD COLUMN IF NOT EXISTS cid integer;"
BUILD = """
INSERT INTO lo (layer_id, cid, cell_count, area_total, geom)
SELECT layer_id,
       lo_cid,
       COUNT(*),
       SUM(ST_Area(geom::geography)),
       ST_Multi(
         ST_Buffer(
           ST_Buffer(
             ST_UnaryUnion(ST_Collect(ST_MakeValid(geom))),
             %(weld)s
           ),
           -%(weld)s
         )
       )::geometry(MultiPolygon, 4326)
FROM ranh_thua
WHERE lo_cid IS NOT NULL
GROUP BY layer_id, lo_cid;
"""

# 3) Map (layer_id, cid) → id THẬT của lô bằng cặp khoá chính xác. Xong xoá cột tạm.
REMAP = """
UPDATE ranh_thua r SET lo_id = l.id
FROM lo l
WHERE r.layer_id = l.layer_id AND r.lo_cid = l.cid;
"""
BUILD_DROP_CID = "ALTER TABLE lo DROP COLUMN IF EXISTS cid;"
DROP_TMP = "ALTER TABLE ranh_thua DROP COLUMN IF EXISTS lo_cid;"

# Backup meta TRƯỚC khi DROP: gắn mỗi meta với 1 thửa đại diện (min id) của lô.
# Sau rebuild, lô mới chứa thửa đó (qua ranh_thua.lo_id) sẽ nhận lại meta —
# bền vững kể cả khi id lô thay đổi.
# meta::text để truyền lại an toàn rồi cast về jsonb khi khôi phục.
BACKUP_META = """
SELECT (SELECT MIN(r.id) FROM ranh_thua r WHERE r.lo_id = l.id) AS sample_id,
       l.meta::text
FROM lo l
WHERE l.meta IS NOT NULL AND l.meta <> '{}'::jsonb
  AND EXISTS (SELECT 1 FROM ranh_thua r WHERE r.lo_id = l.id);
"""

# Khôi phục: gán meta cho lô mới chứa thửa đại diện (cast text → jsonb).
RESTORE_META = """
UPDATE lo SET meta = %(meta)s::jsonb
WHERE id = (SELECT lo_id FROM ranh_thua WHERE id = %(sample_id)s);
"""


def _table_exists(cur, name):
    cur.execute("SELECT to_regclass(%s)", (name,))
    return cur.fetchone()[0] is not None


def main():
    with get_conn() as conn, conn.cursor() as cur:
        # 0) Backup meta lô đã sửa (nếu bảng lo đã tồn tại từ lần chạy trước).
        saved_meta = []
        if _table_exists(cur, "lo"):
            cur.execute(BACKUP_META)
            saved_meta = [
                (sid, meta) for (sid, meta) in cur.fetchall() if sid is not None
            ]
            print(f"Backup {len(saved_meta)} meta lô (theo thửa đại diện).")

        for stmt in DDL:
            cur.execute(stmt)
        conn.commit()
        cur.execute(CLUSTER_RESET)
        cur.execute(CLUSTER, (EPS, MIN_POINTS))
        conn.commit()
        cur.execute(BUILD_ADD_CID)
        cur.execute(BUILD, {"weld": WELD})
        cur.execute(REMAP)
        conn.commit()

        # Khôi phục meta vào lô mới (map qua thửa đại diện).
        restored = 0
        for sid, meta in saved_meta:
            cur.execute(RESTORE_META, {"meta": meta, "sample_id": sid})
            restored += cur.rowcount
        conn.commit()

        # Dọn cột tạm.
        cur.execute(BUILD_DROP_CID)
        cur.execute(DROP_TMP)
        conn.commit()

        cur.execute("SELECT COUNT(*) FROM lo")
        (n_lo,) = cur.fetchone()
        cur.execute("SELECT COUNT(*) FROM ranh_thua WHERE lo_id IS NOT NULL")
        (n_assigned,) = cur.fetchone()
    print(
        f"Đã tạo {n_lo} lô; gắn lo_id cho {n_assigned} thửa; "
        f"khôi phục {restored}/{len(saved_meta)} meta."
    )


if __name__ == "__main__":
    main()
