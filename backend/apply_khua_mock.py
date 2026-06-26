# -*- coding: utf-8 -*-
"""MOCK: gán mã + dữ liệu màu cho 3 lô Khu A (ngoài DCA14).

DB sẵn có 49 lô hình học thật; chỉ DCA14/DCB02/DCB05 có mã. Script này gán
3 lô chưa có mã (gần DCA14 nhất) thành DCA15/16/17, mock trạng thái kinh doanh
trộn (có sổ / chưa sổ / chưa bán) để Khu A có nhiều lô nhiều màu.

  lo #9  -> DCA15 (51 ô)
  lo #10 -> DCA16 (52 ô)
  lo #20 -> DCA17 (59 ô)

DCA14 (#8) GIỮ NGUYÊN (dữ liệu thật, 100% chưa bán).

Chạy:
  docker compose cp apply_khua_mock.py api:/app/apply_khua_mock.py
  docker compose exec api python apply_khua_mock.py
"""
import json
from app.db import get_conn

# lo_id -> mã lô mock
LOTS = {9: "DCA15", 10: "DCA16", 20: "DCA17"}

OWNERS = [
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Dung",
    "Hoàng Văn Em", "Đỗ Thị Hoa", "Vũ Văn Khánh", "Bùi Thị Lan",
    "Ngô Văn Minh", "Đặng Thị Nga", "Phan Văn Phú", "Lý Thị Quỳnh",
    "Trịnh Văn Sơn", "Mai Thị Tâm", "Dương Văn Uy", "Cao Thị Vân",
]
ADDRS = ["Sao Đỏ, CL, HD", "Hưng Đạo, CL, HD", "Phả Lại, CL, HD",
         "Cộng Hoà, CL, HD", "Tân Dân, CL, HD", "Bến Tắm, CL, HD"]


def status_for(idx):
    """Phân bổ trạng thái theo chu kỳ 7 ô: 1 có sổ, 2 chưa sổ, 4 chưa bán.
    => ~14% có sổ, ~29% chưa sổ, ~57% chưa bán."""
    m = idx % 7
    if m == 0:
        return "sold_red_book"
    if m in (1, 2):
        return "sold_no_book"
    return "unsold"


def main():
    with get_conn() as conn, conn.cursor() as cur:
        grand = 0
        for lo_id, lot_code in LOTS.items():
            cur.execute(
                """SELECT id, round(ST_Area(geom::geography)::numeric,1)
                   FROM ranh_thua WHERE lo_id=%s ORDER BY id""",
                (lo_id,),
            )
            rows = cur.fetchall()
            counts = {"sold_red_book": 0, "sold_no_book": 0, "unsold": 0}
            for idx, (pid, area) in enumerate(rows):
                stt = idx + 1
                biz = status_for(idx)
                counts[biz] += 1
                area_f = float(area)
                meta = {
                    "cellCode": f"{lot_code}-{stt}",
                    "lotCode": lot_code,
                    "stt": stt,
                    "areaExcel": area_f,
                    "businessStatus": biz,
                    "collateralStatus": "none",
                    "paymentStatus": "unpaid",
                    "internalLegal": "Chưa cấp sổ",
                    "planningType": "Đất ở liền kề",
                    "mock": True,  # đánh dấu dữ liệu mock
                    "value": 0,
                }
                if biz != "unsold":
                    is_red = biz == "sold_red_book"
                    owner = OWNERS[idx % len(OWNERS)]
                    addr = ADDRS[idx % len(ADDRS)]
                    # Giá ~ diện tích × 10 triệu/m² (làm tròn triệu).
                    value = int(round(area_f * 10_000_000 / 1_000_000)) * 1_000_000
                    # Có sổ → trả đủ; chưa sổ → 60% trả góp, 40% đủ.
                    if is_red or (idx % 5 in (0, 1, 2)):
                        paid = value
                    else:
                        paid = int(value * 0.6 / 1_000_000) * 1_000_000
                    remaining = max(value - paid, 0)
                    pay = "paid_full" if remaining == 0 else "partial"
                    contract = f"{lot_code[-2:]}-{stt:02d}/{2010 + (idx % 12)}"
                    sign_date = f"{2010 + (idx % 12)}-{(idx % 12) + 1:02d}-15"
                    meta.update({
                        "businessStatus": biz,
                        "paymentStatus": pay,
                        "internalLegal": "Đã cấp sổ đỏ" if is_red else "Đang làm thủ tục cấp sổ",
                        "currentOwner": owner,
                        "ownershipContract": contract,
                        "transactionId": contract,
                        "transactionDate": sign_date,
                        "address": addr,
                        "value": value,
                        "contractValue": value,
                        "paid": paid,
                        "remaining": remaining,
                        "taxBearer": "Bên A",
                        "contract": {
                            "code": contract,
                            "signDate": sign_date,
                            "customer": owner,
                            "totalValue": value,
                            "taxBearer": "Bên A",
                        },
                        "payments": [
                            {"date": sign_date, "amount": paid, "method": "transfer", "note": "Mock thanh toán"}
                        ],
                    })
                cur.execute(
                    "UPDATE ranh_thua SET meta=%s WHERE id=%s",
                    (json.dumps(meta, ensure_ascii=False), pid),
                )
            # Cập nhật meta lô.
            cur.execute(
                """UPDATE lo SET meta=%s WHERE id=%s""",
                (
                    json.dumps({
                        "loCode": lot_code,
                        "description": f"Lô {lot_code} — Khu A (dữ liệu mock demo)",
                        "note": f"{len(rows)} ô. Mock: {counts['sold_red_book']} có sổ, "
                                f"{counts['sold_no_book']} chưa sổ, {counts['unsold']} chưa bán.",
                    }, ensure_ascii=False),
                    lo_id,
                ),
            )
            grand += len(rows)
            print(f"{lot_code} (lo #{lo_id}): {len(rows)} ô → {counts}")
        conn.commit()
        print(f"\nĐã mock {grand} ô trong 3 lô Khu A.")


if __name__ == "__main__":
    main()
