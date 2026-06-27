# -*- coding: utf-8 -*-
"""Gán geom (ranh_thua_id + centroid) cho 32 ô DCB09 → đưa lô lên bản đồ thật.

Bối cảnh:
  - DCB09 có 32 ô nghiệp vụ trong DB nhưng CHƯA có geom (ranh_thua_id=NULL).
  - Ranh thửa thật của DCB09 = cụm `lo` id=48 (32 thửa, 4527.9 m², layer
    'truonglinh-chialo') — khớp tổng diện tích bản vẽ DC.B09 (4528).
    (LƯU Ý: lo #2 cũng có 32 thửa ~4529 m² nhưng KHÔNG phải DCB09.)
  - Map CL-01..32 → ranh_thua.id theo ĐÚNG bố cục bản vẽ (đối chiếu centroid):
      * 2 hàng (trên CL-01..16, dưới CL-17..32), chia bởi đường giữa.
      * Mỗi hàng: 2 ô đôi biên trái + 12 ô cột giữa + 2 ô đôi biên phải.
      * Hàng dưới đánh số ngược (CL-30..19 từ trái→phải).
  - Diện tích ô biên (142/150) vs ô giữa (140) khớp 100% với bản vẽ → map đúng.

Idempotent: chạy lại sẽ ghi đè cùng giá trị. KHÔNG đụng ô DCB09 ngoài mapping.

Chạy: docker compose exec api python apply_dcb09_geom.py
"""
from app.db import get_conn

# CL (số ô 1..32) → ranh_thua.id (cụm lo #48). Suy từ bố cục bản vẽ + centroid.
DCB09_ID_BY_OTO = {
    # Hàng trên: biên trái CL-01/02, 12 cột giữa CL-03..14, biên phải CL-15/16
    1: 1696, 2: 1693,
    3: 1668, 4: 1669, 5: 1670, 6: 1671, 7: 1672, 8: 1673,
    9: 1674, 10: 1675, 11: 1676, 12: 1677, 13: 1678, 14: 1679,
    15: 1697, 16: 1692,
    # Hàng dưới: biên phải CL-17/18, 12 cột giữa CL-30..19 (trái→phải số giảm),
    # biên trái CL-31/32
    17: 1695, 18: 1698,
    19: 1691, 20: 1690, 21: 1689, 22: 1688, 23: 1687, 24: 1686,
    25: 1685, 26: 1684, 27: 1683, 28: 1682, 29: 1681, 30: 1680,
    31: 1694, 32: 1699,
}


def main():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM subdivision WHERE lot_code='DCB09'"
        )
        row = cur.fetchone()
        if not row:
            print("Không tìm thấy subdivision DCB09 — chạy import_excel.py trước.")
            return

        n = 0
        lo_ids = set()
        for oto, ranh_id in DCB09_ID_BY_OTO.items():
            cell_code = f"DCB09-{oto:02d}"
            cur.execute(
                """UPDATE cell
                   SET ranh_thua_id = %s,
                       centroid = (SELECT ST_Centroid(geom) FROM ranh_thua WHERE id=%s)
                   WHERE cell_code = %s""",
                (ranh_id, ranh_id, cell_code),
            )
            n += cur.rowcount
            # Ghi meta vào ranh_thua: cellCode (tên) + business/payment/collateral
            # (để bản đồ TÔ MÀU trực tiếp từ ranh_thua.meta, giống DCB02 — không
            # phụ thuộc overlay FE). Lấy status từ bảng cell tương ứng.
            cur.execute(
                """UPDATE ranh_thua rt
                   SET meta = COALESCE(rt.meta, '{}'::jsonb)
                              || jsonb_build_object(
                                   'cellCode', c.cell_code,
                                   'businessStatus', c.business_status,
                                   'paymentStatus', c.payment_status,
                                   'collateralStatus', c.collateral_status
                                 )
                   FROM cell c
                   WHERE rt.id = %s AND c.cell_code = %s
                   RETURNING rt.lo_id""",
                (ranh_id, cell_code),
            )
            row = cur.fetchone()
            if row and row[0] is not None:
                lo_ids.add(row[0])
        print(f"Đã gán geom + cellCode cho {n} ô DCB09 (kỳ vọng 32).")

        # Đặt tên lô: meta.loCode = 'DCB09' cho cụm lo của DCB09 (panel đọc loCode).
        for lid in lo_ids:
            cur.execute(
                """UPDATE lo
                   SET meta = COALESCE(meta, '{}'::jsonb)
                              || jsonb_build_object(
                                   'loCode', 'DCB09',
                                   'description', 'Lô DCB09 — 32 ô',
                                   'note', '32 ô, ~4528 m²'
                                 )
                   WHERE id = %s""",
                (lid,),
            )
        print(f"Đã đặt tên lô DCB09 cho lo id={sorted(lo_ids)}.")


if __name__ == "__main__":
    main()
