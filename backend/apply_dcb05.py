# -*- coding: utf-8 -*-
"""Đưa lô DCB05 vào DB: data nghiệp vụ (31 ô) + geom (29 ô → lô #34).

Nguồn data: _dcb05_data.json (xuất từ frontend cellsDCB05.js — file .xlsx gốc
đã mất). Ranh thửa thật = cụm lo #34 (29 thửa, 3811.5 m², layer
'truonglinh-chialo') — khớp tổng diện tích bản vẽ DC.B05 (3811.5).

Map TM-01..29 → ranh_thua.id theo bố cục bản vẽ (đối chiếu centroid + diện tích):
  - Cột trái dọc: TM-01..07
  - 4 cột giữa-trái: TM-08..11 (trên), TM-12..15 (dưới)
  - 6 cột giữa-phải: TM-16..21 (trên), TM-29..26 (dưới, số giảm)
  - Cột phải dọc: TM-22..25
LƯU Ý: TM-30 bản vẽ = ô 30+31 data GỘP (292.5 m²); 2 ô này CHƯA có thửa thật
trên bản đồ → BỎ (chỉ map 29 ô đầu, ô 30/31 nạp data nhưng không có geom).

Idempotent: xoá DCB05 cũ rồi nạp lại.
Chạy: docker compose exec api python apply_dcb05.py
"""
import json
import os

from app.db import get_conn

# TM (số ô 1..29) → ranh_thua.id (cụm lo #34). Suy từ bố cục bản vẽ + centroid.
DCB05_ID_BY_OTO = {
    1: 1455, 2: 1454, 3: 1453, 4: 1452, 5: 1295, 6: 1296, 7: 1297,
    8: 1349, 9: 1350, 10: 1351, 11: 1352, 12: 1345, 13: 1346, 14: 1347, 15: 1348,
    16: 1353, 17: 1354, 18: 1355, 19: 1356, 20: 1357, 21: 1358,
    22: 1363, 23: 1364, 24: 1365, 25: 1366,
    26: 1362, 27: 1361, 28: 1360, 29: 1359,
}

DATA_PATH = os.environ.get("DCB05_DATA", "_dcb05_data.json")


def main():
    with open(DATA_PATH, encoding="utf-8") as f:
        rows = json.load(f)
    print(f"Đọc {len(rows)} ô DCB05 từ {DATA_PATH}.")

    with get_conn() as conn, conn.cursor() as cur:
        # 0) Xoá DCB05 cũ (idempotent). Gỡ meta khỏi ranh_thua đã gán trước.
        cur.execute(
            "DELETE FROM cell WHERE subdivision_id IN "
            "(SELECT id FROM subdivision WHERE lot_code='DCB05')"
        )
        cur.execute("DELETE FROM subdivision WHERE lot_code='DCB05'")

        # 1) SUBDIVISION DCB05 (Khu B).
        cur.execute(
            "INSERT INTO subdivision (lot_code, name, zone, lo_layer_id) "
            "VALUES (%s,%s,%s,%s) RETURNING id",
            ("DCB05", "Lô DCB05", "khu-b", "truonglinh-chialo"),
        )
        sub_id = cur.fetchone()[0]

        # 2) CELL — 31 ô (nghiệp vụ). 29 ô đầu có geom (map lô #34), ô 30/31 không.
        lo_ids = set()
        n_cell = n_geom = 0
        for r in rows:
            oto = r["o"]
            cell_code = r["cellCode"]
            ranh_id = DCB05_ID_BY_OTO.get(oto)  # None nếu ô 30/31
            biz = r.get("business", "unsold")
            pay = r.get("payment")
            total = r.get("totalValue")
            paid = None
            if r.get("payments"):
                paid = sum(p.get("amount", 0) for p in r["payments"])
            remaining = r.get("remaining")

            if ranh_id is not None:
                cur.execute(
                    """INSERT INTO cell
                       (cell_code, subdivision_id, cell_no, ranh_thua_id, centroid,
                        owner_name, address, area, business_status, payment_status,
                        value, paid_value, remaining_value, collateral_status)
                       VALUES (%s,%s,%s,%s,
                               (SELECT ST_Centroid(geom) FROM ranh_thua WHERE id=%s),
                               %s,%s,%s,%s,%s,%s,%s,%s,'none')
                       RETURNING id""",
                    (cell_code, sub_id, str(oto), ranh_id, ranh_id,
                     r.get("customer"), r.get("address"), r.get("area"), biz, pay,
                     total, paid, remaining),
                )
                n_geom += 1
                # meta vào ranh_thua → bản đồ tô màu + tên (giống DCB02/DCB09).
                cur.execute(
                    """UPDATE ranh_thua
                       SET meta = COALESCE(meta,'{}'::jsonb)
                                  || jsonb_build_object(
                                       'cellCode', %s::text,
                                       'businessStatus', %s::text,
                                       'paymentStatus', %s::text,
                                       'collateralStatus', 'none'
                                     )
                       WHERE id = %s
                       RETURNING lo_id""",
                    (cell_code, biz, pay, ranh_id),
                )
                row = cur.fetchone()
                if row and row[0] is not None:
                    lo_ids.add(row[0])
            else:
                cur.execute(
                    """INSERT INTO cell
                       (cell_code, subdivision_id, cell_no,
                        owner_name, address, area, business_status, payment_status,
                        value, paid_value, remaining_value, collateral_status)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'none')
                       RETURNING id""",
                    (cell_code, sub_id, str(oto),
                     r.get("customer"), r.get("address"), r.get("area"), biz, pay,
                     total, paid, remaining),
                )
            n_cell += 1
        print(f"Đã nạp {n_cell} ô DCB05 ({n_geom} ô có geom).")

        # 3) Đặt tên lô.
        for lid in lo_ids:
            cur.execute(
                """UPDATE lo
                   SET meta = COALESCE(meta,'{}'::jsonb)
                              || jsonb_build_object(
                                   'loCode', 'DCB05',
                                   'description', 'Lô DCB05 — 31 ô (29 có geom)',
                                   'note', '31 ô, ~3812 m²'
                                 )
                   WHERE id = %s""",
                (lid,),
            )
        print(f"Đã đặt tên lô DCB05 cho lo id={sorted(lo_ids)}.")


if __name__ == "__main__":
    main()
