# -*- coding: utf-8 -*-
"""Áp dữ liệu thật DC.B02 (từ DCB02.xlsx) vào LÔ #33.

Bối cảnh:
  - Lô #33 (DB) có đúng 27 thửa = 27 ô sơ đồ DC.B02 (số thửa 5-54-55, 2.943 m²).
  - Map id thửa → STT ô bằng GÁN CỨNG theo vị trí + diện tích (đã đối chiếu
    centroid với sơ đồ bản vẽ và diện tích Excel — khớp 100%).

Sơ đồ DC.B02 (trái→phải):
  - Cột trái dọc: TM-01..07 (87, 90×5, 87 m²)
  - 4 cột giữa: hàng trên TM-08..11, hàng dưới TM-12..15 (80 m²)
  - Khối phải hàng trên: NV-16..19 (150 m²); hàng dưới NV-24..27 (đánh phải→trái)
  - Cột phải-cùng dọc: NV-20(115.75), NV-21(123.75), NV-22(123.75), NV-23(115.75)

Excel có 3 nhóm trạng thái:
  I.   Đã có sổ (1):       ô 7
  II.  Chưa có sổ (16):    ô 1-6, 8-16, 27
  III. Chưa bán (10):      ô 17-26

Chạy:
  docker compose cp apply_dcb02.py api:/app/apply_dcb02.py
  docker compose exec api python apply_dcb02.py
"""
import json
from app.db import get_conn

LO_ID = 33

# --- Gán cứng id thửa (DB) → STT ô sơ đồ -----------------------------------
# Xác định theo centroid (cụm cột trái / 4 cột giữa / khối phải) + diện tích.
ID_BY_OTO = {
    # Cột trái TM-01..07 (trên→xuống)
    1: 1339, 2: 1290, 3: 1291, 4: 1292, 5: 1293, 6: 1294, 7: 1340,
    # 4 cột giữa — hàng trên TM-08..11 (trái→phải)
    8: 1323, 9: 1324, 10: 1325, 11: 1326,
    # 4 cột giữa — hàng dưới TM-12..15 (trái→phải)
    12: 1327, 13: 1328, 14: 1329, 15: 1330,
    # Khối phải — hàng trên NV-16..19 (trái→phải)
    16: 1335, 17: 1336, 18: 1337, 19: 1338,
    # Cột phải-cùng NV-20..23 (trên→xuống)
    20: 1341, 21: 1342, 22: 1343, 23: 1344,
    # Khối phải — hàng dưới NV-24..27 (đánh số phải→trái: NV-24 ở phải nhất)
    24: 1334, 25: 1333, 26: 1332, 27: 1331,
}

# --- Trạng thái từng ô (theo nhóm Excel) -----------------------------------
SOLD_RED = {7}  # đã có sổ
SOLD_NOBOOK = {1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 27}  # chưa sổ (đã bán)
# còn lại (17..26) = chưa bán

# --- Diện tích Excel từng ô (m²) -------------------------------------------
AREA = {
    1: 87, 2: 90, 3: 90, 4: 90, 5: 90, 6: 90, 7: 87,
    8: 80, 9: 80, 10: 80, 11: 80, 12: 80, 13: 80, 14: 80, 15: 80,
    16: 150, 17: 150, 18: 150, 19: 150,
    20: 115.75, 21: 123.75, 22: 123.75, 23: 115.75,
    24: 150, 25: 150, 26: 150, 27: 150,
}

# --- Thông tin nghiệp vụ từng ô đã bán (từ DCB02.xlsx) ---------------------
# stt(ô) -> dict {contract, date(ISO), owner, addr, value, paid, remaining, tax}
DEALS = {
    # I. Đã có sổ
    7:  {"contract": "12/10", "date": "2010-10-02", "owner": "Phạm Khắc Tráng", "addr": "Hưng Đạo, CL, HD", "value": 957000000, "paid": 957000000, "remaining": 0, "tax": None},
    # II. Chưa có sổ (đã bán)
    1:  {"contract": "17/10", "date": "2010-02-03", "owner": "Phạm Mạnh Cường", "addr": "TP Hải Dương", "value": 750000000, "paid": 750000000, "remaining": 0, "tax": "Bên B"},
    2:  {"contract": "17/10", "date": "2010-02-03", "owner": "Phạm Mạnh Cường", "addr": "TP Hải Dương", "value": 750000000, "paid": 750000000, "remaining": 0, "tax": "Bên B"},
    3:  {"contract": "2/18",  "date": "2018-01-03", "owner": "Vũ Đỡnh Hựng", "addr": "Sao Đỏ, CL, HD", "value": 1100000000, "paid": 1100000000, "remaining": 0, "tax": "Bên A"},
    4:  {"contract": "12/15", "date": "2015-06-05", "owner": "Vũ Đỡnh Hựng", "addr": "Sao Đỏ, CL, HD", "value": 630000000, "paid": 600000000, "remaining": 30000000, "tax": "Bên A"},
    5:  {"contract": "12/15", "date": "2015-06-05", "owner": "Vũ Đỡnh Hựng", "addr": "Sao Đỏ, CL, HD", "value": 630000000, "paid": 600000000, "remaining": 30000000, "tax": "Bên A"},
    6:  {"contract": "12/15", "date": "2015-06-05", "owner": "Vũ Đỡnh Hựng", "addr": "Sao Đỏ, CL, HD", "value": 630000000, "paid": 600000000, "remaining": 30000000, "tax": "Bên A"},
    8:  {"contract": "1/18",  "date": "2018-01-03", "owner": "Vũ Đỡnh Hựng", "addr": "Sao Đỏ, CL, HD", "value": 550000000, "paid": 550000000, "remaining": 0, "tax": "Bên A"},
    9:  {"contract": "3/19",  "date": "2019-01-21", "owner": "Hưng Tỏm B02 6 lụ vay chưa rừ", "addr": None, "value": 333333333, "paid": 333333333, "remaining": 0, "tax": "Bên A"},
    10: {"contract": "3/19",  "date": "2019-01-21", "owner": "Hưng Tỏm B02 6 lụ vay chưa rừ", "addr": None, "value": 333333333, "paid": 333333333, "remaining": 0, "tax": "Bên A"},
    11: {"contract": "3/19",  "date": "2019-01-21", "owner": "Hưng Tỏm B02 6 lụ vay chưa rừ", "addr": None, "value": 333333333, "paid": 333333333, "remaining": 0, "tax": "Bên A"},
    12: {"contract": "18/15", "date": "2015-07-21", "owner": "Vũ Đỡnh Hựng", "addr": None, "value": 560000000, "paid": 444800000, "remaining": 115200000, "tax": "Bên A"},
    13: {"contract": "3/19",  "date": "2019-01-21", "owner": "Hưng Tỏm B02 6 lụ vay chưa rừ", "addr": None, "value": 333333333, "paid": 333333333, "remaining": 0, "tax": "Bên A"},
    14: {"contract": "3/19",  "date": "2019-01-21", "owner": "Hưng Tỏm B02 6 lụ vay chưa rừ", "addr": None, "value": 333333333, "paid": 333333333, "remaining": 0, "tax": "Bên A"},
    15: {"contract": "3/19",  "date": "2019-01-21", "owner": "Hưng Tỏm B02 6 lụ vay chưa rừ", "addr": None, "value": 333333333, "paid": 333333333, "remaining": 0, "tax": "Bên A"},
    16: {"contract": "20/15", "date": "2015-08-14", "owner": "Nguyễn Văn Chỳc", "addr": "Sao Đỏ, CL, HD", "value": 675000000, "paid": 337500000, "remaining": 337500000, "tax": "Bên A"},
    27: {"contract": "20/11", "date": "2011-04-27", "owner": "Nguyễn Văn Diệm", "addr": None, "value": 300000000, "paid": 300000000, "remaining": 0, "tax": "Bên B"},
}


def status_of(oto):
    if oto in SOLD_RED:
        return ("sold_red_book", "Đã cấp sổ đỏ")
    if oto in SOLD_NOBOOK:
        return ("sold_no_book", "Đang làm thủ tục cấp sổ")
    return ("unsold", "Chưa cấp sổ")


def payment_of(oto, deal):
    """Suy ra tình trạng thanh toán."""
    if not deal:
        return "unpaid"
    return "partial" if (deal.get("remaining") or 0) > 0 else "paid_full"


def main():
    with get_conn() as conn, conn.cursor() as cur:
        # 0) Lấy các thửa thật của lô để đối chiếu mapping.
        cur.execute(
            "SELECT id, round(ST_Area(geom::geography)::numeric,1) FROM ranh_thua WHERE lo_id=%s ORDER BY id",
            (LO_ID,),
        )
        db_rows = {r[0]: float(r[1]) for r in cur.fetchall()}
        print(f"Thửa trong lô #{LO_ID} (DB): {len(db_rows)}")

        missing = [oto for oto, pid in ID_BY_OTO.items() if pid not in db_rows]
        if missing:
            print("  ! Cảnh báo: các ô map tới id không có trong lô:", missing)

        applied = 0
        print("--- Mapping ô → thửa ---")
        for oto in sorted(ID_BY_OTO):
            pid = ID_BY_OTO[oto]
            if pid not in db_rows:
                continue
            deal = DEALS.get(oto)
            biz, legal_txt = status_of(oto)
            pay = payment_of(oto, deal)
            prefix = "NV" if oto >= 16 else "TM"
            meta = {
                "cellCode": f"DCB02-{oto}",
                "lotCode": "DCB02",
                "stt": oto,
                "areaExcel": AREA.get(oto),
                "businessStatus": biz,
                "collateralStatus": "none",
                "paymentStatus": pay,
                "internalLegal": legal_txt,
                "planningType": "Đất ở liền kề",
            }
            if deal:
                meta.update({
                    "currentOwner": deal["owner"],
                    "ownershipContract": deal["contract"],
                    "transactionId": deal["contract"],
                    "transactionDate": deal["date"],
                    "address": deal["addr"],
                    "value": deal["value"],
                    "contractValue": deal["value"],
                    "paid": deal["paid"],
                    "remaining": deal["remaining"],
                    "taxBearer": deal["tax"],
                    # Hợp đồng (cho tab Giao dịch & thanh toán).
                    "contract": {
                        "code": deal["contract"],
                        "signDate": deal["date"],
                        "customer": deal["owner"],
                        "totalValue": deal["value"],
                        "taxBearer": deal["tax"],
                    },
                    # Lịch sử thanh toán (gộp TT đến 2021 — nguồn Excel chỉ có mốc này).
                    "payments": [
                        {"date": "2021-12-31", "amount": deal["paid"], "method": "transfer", "note": "Thanh toán đến 2021"}
                    ] if deal["paid"] else [],
                })
            cur.execute(
                "UPDATE ranh_thua SET meta=%s WHERE id=%s",
                (json.dumps(meta, ensure_ascii=False), pid),
            )
            applied += 1
            print(f"  {prefix}-{oto:02d} → id={pid:<5} {biz:<13} area_excel={AREA.get(oto)} area_db={db_rows[pid]}")

        # Cập nhật bảng lo #33: meta lô (giữ nguyên cell_count/area_total từ hình học).
        cur.execute(
            """UPDATE lo SET
                   cell_count = (SELECT COUNT(*) FROM ranh_thua WHERE lo_id=%s),
                   meta = %s
               WHERE id=%s""",
            (
                LO_ID,
                json.dumps({
                    "loCode": "DCB02",
                    "description": "Lô DCB02 — số thửa 5-54-55",
                    "note": "27 ô, 2.943 m². 1 đã có sổ, 16 chưa sổ (đã bán), 10 chưa bán (nguồn: DCB02.xlsx).",
                }, ensure_ascii=False),
                LO_ID,
            ),
        )
        conn.commit()

        print(f"\nĐã gán meta cho {applied} ô.")
        cur.execute("SELECT cell_count, round(area_total::numeric,1), meta->>'loCode' FROM lo WHERE id=%s", (LO_ID,))
        print(f"Lô #{LO_ID} sau cập nhật:", cur.fetchone())


if __name__ == "__main__":
    main()
