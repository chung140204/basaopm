"""Áp dữ liệu thật DC.A14 (từ DCA14.xlsx) vào LÔ #8.

Bối cảnh:
  - Lô #8 trong DB (gom tự động bằng DBSCAN) có 55 thửa: 51 thửa THẬT của
    DC.A14 (id 235..285) + 4 thửa của lô bên cạnh bị gom nhầm (id 1025..1028).
  - DC.A14 thực tế = 51 ô (đúng theo Excel), tất cả CHƯA BÁN.

Việc làm:
  1) Bỏ 4 thửa thừa khỏi lô #8 (đưa về lô lân cận đúng của chúng — ở đây chỉ
     gỡ khỏi lô #8 bằng cách KHÔNG đụng; ta định nghĩa lô #8 = đúng 51 id thật).
  2) Map 51 thửa thật → STT ô DCA14-1..51 THEO VỊ TRÍ (đúng sơ đồ bản vẽ),
     không theo id tuần tự.
  3) Ghi meta cho từng thửa: cellCode, lotCode=DC.A14, area, trạng thái "chưa bán".
  4) Cập nhật bảng `lo` #8: cell_count=51, area_total=4796, geom = hull 51 thửa,
     meta mã lô DC.A14.

Chạy: docker compose run --rm api python apply_dca14.py
"""
from app.db import get_conn

LO_ID = 8
# 51 id thửa thật của DC.A14 (liên tiếp 235..285).
REAL_IDS = list(range(235, 286))  # 235..285 inclusive = 51 ids

# Diện tích thật (m²) theo STT ô (DCA14-1..51) — từ Excel.
AREAS = (
    [112, 110, 100, 100, 100, 110, 112]            # 1-7  cột trái (CL-01..CL-07)
    + [90] * 20                                     # 8-27 hàng trên (CL-08..CL-27)
    + [109, 117, 117, 109]                          # 28-31 cột phải (CL-28..CL-31)
    + [90] * 20                                      # 32-51 hàng dưới (CL-32..CL-51)
)


def fetch_centroids(cur):
    cur.execute(
        """SELECT id, ST_X(ST_Centroid(geom)), ST_Y(ST_Centroid(geom)),
                  ST_Area(geom::geography)
           FROM ranh_thua WHERE id = ANY(%s)""",
        (REAL_IDS,),
    )
    return [
        {"id": r[0], "x": float(r[1]), "y": float(r[2]), "area": float(r[3])}
        for r in cur.fetchall()
    ]


def assign_stt(cells):
    """Gán STT 1..51 cho từng thửa theo VỊ TRÍ, khớp sơ đồ bản vẽ.

    Bố cục: cột trái (7) | hàng trên (20) | cột phải (4) | hàng dưới (20).
    Phân tách bằng kinh độ X và vĩ độ Y.
    """
    xs = sorted(c["x"] for c in cells)
    # Ngưỡng cột trái / phải: lấy biên ~10% mỗi đầu.
    x_min, x_max = xs[0], xs[-1]
    span = x_max - x_min
    left_thr = x_min + span * 0.06   # cột trái: X rất nhỏ
    right_thr = x_max - span * 0.06  # cột phải: X rất lớn

    left = [c for c in cells if c["x"] <= left_thr]
    right = [c for c in cells if c["x"] >= right_thr]
    mid = [c for c in cells if left_thr < c["x"] < right_thr]

    # Hàng trên / hàng dưới của vùng giữa: tách theo Y (trên = Y lớn hơn).
    ys = sorted(c["y"] for c in mid)
    y_mid = (ys[0] + ys[-1]) / 2
    top = [c for c in mid if c["y"] >= y_mid]
    bottom = [c for c in mid if c["y"] < y_mid]

    # Sắp xếp trong từng nhóm:
    left.sort(key=lambda c: -c["y"])   # cột trái: trên→xuống (Y giảm) = ô 1..7
    top.sort(key=lambda c: c["x"])     # hàng trên: trái→phải = ô 8..27
    right.sort(key=lambda c: -c["y"])  # cột phải: trên→xuống = ô 28..31
    # Hàng dưới: sơ đồ đánh số PHẢI→TRÁI (ô 32 bên phải nhất) → sort X giảm.
    bottom.sort(key=lambda c: -c["x"])  # ô 32..51

    ordered = left + top + right + bottom
    assert len(ordered) == 51, f"Phân nhóm sai: {len(left)}+{len(top)}+{len(right)}+{len(bottom)}"
    for stt, c in enumerate(ordered, start=1):
        c["stt"] = stt
    return ordered


def main():
    with get_conn() as conn, conn.cursor() as cur:
        cells = fetch_centroids(cur)
        if len(cells) != 51:
            raise SystemExit(f"Kỳ vọng 51 thửa thật, lấy được {len(cells)}")

        ordered = assign_stt(cells)

        # 1) Ghi meta cho từng thửa theo STT.
        for c in ordered:
            stt = c["stt"]
            meta = {
                "cellCode": f"DCA14-{stt}",
                "lotCode": "DC.A14",
                "stt": stt,
                "areaExcel": AREAS[stt - 1],
                "businessStatus": "unsold",     # chưa bán
                "collateralStatus": "none",     # chưa thế chấp
                "paymentStatus": "unpaid",      # chưa thanh toán
                "internalLegal": "Chưa cấp sổ",
            }
            import json
            cur.execute(
                "UPDATE ranh_thua SET meta = %s, lo_id = %s WHERE id = %s",
                (json.dumps(meta, ensure_ascii=False), LO_ID, c["id"]),
            )

        # 2) Gỡ các thửa KHÔNG thuộc 51 id thật ra khỏi lô #8 (vd id 1025..1028).
        cur.execute(
            "UPDATE ranh_thua SET lo_id = NULL WHERE lo_id = %s AND NOT (id = ANY(%s))",
            (LO_ID, REAL_IDS),
        )

        # 3) Cập nhật bảng lo #8: đếm lại, diện tích, hull, meta mã lô.
        import json
        cur.execute(
            """UPDATE lo SET
                   cell_count = 51,
                   area_total = 4796,
                   geom = sub.hull,
                   meta = %s
               FROM (
                   SELECT ST_Buffer(ST_ConvexHull(ST_Collect(geom)), 0.000008)
                            ::geometry(Polygon,4326) AS hull
                   FROM ranh_thua WHERE id = ANY(%s)
               ) sub
               WHERE lo.id = %s""",
            (
                json.dumps(
                    {
                        "loCode": "DC.A14",
                        "description": "Lô DC.A14 — số thửa 133-134-135",
                        "note": "51 ô, tổng 4.796 m², toàn bộ chưa bán (nguồn: DCA14.xlsx)",
                    },
                    ensure_ascii=False,
                ),
                REAL_IDS,
                LO_ID,
            ),
        )
        conn.commit()

        # Kiểm tra lại.
        cur.execute("SELECT cell_count, round(area_total::numeric,1), meta->>'loCode' FROM lo WHERE id=%s", (LO_ID,))
        print("Lô #8 sau cập nhật:", cur.fetchone())
        cur.execute("SELECT COUNT(*) FROM ranh_thua WHERE lo_id=%s", (LO_ID,))
        print("Số thửa gắn lô #8:", cur.fetchone()[0])
        # In vài map STT→id để kiểm chứng.
        sample = [(c["stt"], c["id"], AREAS[c["stt"]-1], round(c["area"],1)) for c in ordered]
        sample.sort()
        print("STT | thua_id | area_excel | area_db (vài dòng đầu/cuối):")
        for s in sample[:8] + sample[-6:]:
            print("  ", s)


if __name__ == "__main__":
    main()
