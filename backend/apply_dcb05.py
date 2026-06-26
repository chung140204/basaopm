"""Áp dữ liệu thật DC.B05 (từ DCB05.xlsx) vào LÔ #34.

Bối cảnh:
  - Lô #34 trong DB có 32 thửa: 3 cặp trùng lặp (1452=1456, 1453=1457,
    1454=1458) → 29 thửa hình học thực.
  - Sơ đồ DC.B05 có 31 ô (TM-01..31). => thiếu 2 ô trên bản đồ.
  - Map theo THỨ TỰ VỊ TRÍ sơ đồ (không theo diện tích — hình học lệch Excel).
  - Tạm BỎ QUA TM-30.

Excel có 3 nhóm trạng thái:
  I.  Đã có sổ (7): ô 3,4,5,6,7,12,13
  II. Chưa có sổ - đã bán (5): ô 1,24,25,30,31
  III.Chưa bán (19): 2,8,9,10,11,14,15,16,17,18,19,20,21,22,23,26,27,28,29

Chạy: docker compose run --rm -v ...apply_dcb05.py:/app/apply_dcb05.py api python apply_dcb05.py
"""
import json
from app.db import get_conn

LO_ID = 34
SKIP_OTO = {30}  # tạm bỏ qua TM-30

# --- Override ánh xạ id thửa → STT ô (gán cứng, ưu tiên hơn assign_order) ---
# Lý do: phép chia hình học của assign_order làm LỆCH cụm "giữa-phải hàng trên".
# Cụm này gồm 6 thửa thật (X tăng dần) = ô 16..21; trong đó #1353 (156 m²) là ô
# 16 nhưng trước đây bị bỏ sót (meta rỗng → hiện nét đứt). Gán cứng để:
#   - #1353 = ô 16 (hết nét đứt vì đã có meta)
#   - 1354..1358 dịch +1: 16→17, 17→18, 18→19, 19→20, 20→21
OVERRIDE_OTO_BY_ID = {
    1353: 16,
    1354: 17,
    1355: 18,
    1356: 19,
    1357: 20,
    1358: 21,
}

# --- Bảng trạng thái từng ô (theo nhóm Excel) ------------------------------
SOLD_RED = {3, 4, 5, 6, 7, 12, 13}        # đã có sổ
SOLD_NOBOOK = {1, 24, 25, 30, 31}          # chưa có sổ (đã bán)
# còn lại = chưa bán

# --- Thông tin nghiệp vụ từng ô đã bán (từ Excel) --------------------------
# stt(ô) -> dict
DEALS = {
    # I. Đã có sổ
    3:  {"contract": "150/10", "date": "2010-06-13", "owner": "Vũ Đình Lụa", "addr": "Sao Đỏ, CL, HD", "value": 1450000000, "paid": 1450000000},
    4:  {"contract": "150/10", "date": "2010-06-13", "owner": "Vũ Đình Lụa", "addr": "Sao Đỏ, CL, HD", "value": 1450000000, "paid": 1450000000},
    5:  {"contract": "6/10",   "date": "2010-01-29", "owner": "Đặng Trớ Trường", "addr": "Sao Đỏ, CL, HD", "value": 1050000000, "paid": 1050000000},
    6:  {"contract": "2/10",   "date": "2010-01-16", "owner": "Nguyễn Văn Sơn", "addr": "Sao Đỏ, CL, HD", "value": 1050000000, "paid": 1050000000},
    7:  {"contract": "70/09",  "date": "2009-10-06", "owner": "Nguyễn Văn Hiền", "addr": "Phả Lại, CL, HD", "value": 890000000, "paid": 890000000},
    12: {"contract": "33/11",  "date": "2011-09-11", "owner": "Lê Đức Hải", "addr": "Bến tắm, CL-HD", "value": 1127500000, "paid": 1127500000},
    13: {"contract": "33/11",  "date": "2011-09-11", "owner": "Lê Đức Hải", "addr": "Bến tắm, CL-HD", "value": 1127500000, "paid": 1127500000},
    # II. Chưa có sổ (đã bán)
    1:  {"contract": "22/15",  "date": "2015-10-14", "owner": "Nguyễn Thị Tớnh", "addr": "Tõn Dõn, CL, HD", "value": 1026178010, "paid": 803076443},
    24: {"contract": "47/14",  "date": "2014-11-16", "owner": "Phạm Thị Xuờ", "addr": "Cộng Hoà, CL, HD", "value": 641250000, "paid": 500000000},
    25: {"contract": "47/14",  "date": "2014-11-16", "owner": "Phạm Thị Xuờ", "addr": "Cộng Hoà, CL, HD", "value": 635000000, "paid": 500000000},
    30: {"contract": "5/19",   "date": "2019-01-31", "owner": "Nguyễn Quy Sơn", "addr": "Cộng Hoà, CL, HD", "value": 1228500000, "paid": 654229600},
    31: {"contract": "54/10",  "date": "2010-03-31", "owner": "Vũ Thị Hạnh", "addr": "Cộng Hoà, CL, HD", "value": 780000000, "paid": 450000000},
}

# Diện tích Excel từng ô (m²).
AREA = {
    1: 112, 2: 100, 3: 100, 4: 100, 5: 140, 6: 140, 7: 112,
    8: 102.5, 9: 102.5, 10: 102.5, 11: 102.5, 12: 102.5, 13: 102.5, 14: 102.5, 15: 102.5,
    16: 156, 17: 136.5, 18: 136.5, 19: 136.5, 20: 136.5, 21: 136.5,
    22: 127, 23: 128.25, 24: 128.25, 25: 127,
    26: 136.5, 27: 136.5, 28: 136.5, 29: 136.5, 30: 136.5, 31: 156,
}


def status_of(oto):
    if oto in SOLD_RED:
        return ("sold_red_book", "Đã cấp sổ đỏ")
    if oto in SOLD_NOBOOK:
        return ("sold_no_book", "Đang làm thủ tục cấp sổ")
    return ("unsold", "Chưa cấp sổ")


def payment_of(oto, deal):
    """Suy ra tình trạng thanh toán."""
    if oto in SOLD_RED:
        return "paid_full"
    if not deal:
        return "unpaid"
    return "partial" if deal["paid"] < deal["value"] else "paid_full"


def dedupe(rows):
    """Bỏ thửa trùng tâm (giữ id nhỏ hơn)."""
    uniq = []
    for r in rows:
        dup = False
        for u in uniq:
            if abs(r["x"] - u["x"]) < 0.00003 and abs(r["y"] - u["y"]) < 0.00003:
                dup = True
                break
        if not dup:
            uniq.append(r)
    return uniq


def assign_order(cells):
    """Gán STT ô (theo sơ đồ DC.B05) cho 29 thửa thực, THEO VỊ TRÍ.

    Sơ đồ (trái→phải):
      - Cột trái dọc: TM-01..07 (X nhỏ nhất)
      - Cụm 4 cột × 2 hàng (giữa-trái): trên TM-08,09,10,11 / dưới TM-12,13,14,15
      - Cụm giữa-phải hàng trên (6 ô): TM-16..21
      - Cụm giữa-phải hàng dưới (5 ô): TM-26,27,28,29,30 (TM-30 trống hình học)
      - Cột phải dọc: TM-22,23,24,25 (X lớn nhất)
    Vì shapefile thiếu 2 ô, ta map best-effort theo cụm + thứ tự.
    """
    xs = sorted(c["x"] for c in cells)
    ys = sorted(c["y"] for c in cells)
    xmin, xmax = xs[0], xs[-1]
    ymin, ymax = ys[0], ys[-1]
    xspan = xmax - xmin
    yspan = ymax - ymin

    def colp(c):
        return (c["x"] - xmin) / xspan  # 0=trái .. 1=phải

    def rowp(c):
        return (ymax - c["y"]) / yspan  # 0=trên .. 1=dưới

    left = sorted([c for c in cells if colp(c) < 0.10], key=lambda c: rowp(c))
    right = sorted([c for c in cells if colp(c) > 0.92], key=lambda c: rowp(c))
    mid = [c for c in cells if 0.10 <= colp(c) <= 0.92]

    # mid chia trên/dưới theo rowp 0.5
    mid_top = sorted([c for c in mid if rowp(c) < 0.5], key=lambda c: c["x"])
    mid_bot = sorted([c for c in mid if rowp(c) >= 0.5], key=lambda c: c["x"])

    mapping = {}  # stt_oto -> cell

    # Cột trái: TM-01..07 theo thứ tự trên→xuống (số thực tế có thể < 7).
    for i, c in enumerate(left):
        mapping[1 + i] = c

    # Cụm giữa-trái 4 cột (TM-08..11 trên, TM-12..15 dưới) — X nhỏ trong mid.
    # Cụm giữa-phải (TM-16..21 trên; TM-26..29 dưới) — X lớn trong mid.
    # Tách mid theo nửa X.
    def split_mid(group):
        if not group:
            return [], []
        gx = sorted(g["x"] for g in group)
        mx = (gx[0] + gx[-1]) / 2
        gl = sorted([g for g in group if g["x"] <= mx], key=lambda c: c["x"])
        gr = sorted([g for g in group if g["x"] > mx], key=lambda c: c["x"])
        return gl, gr

    top_left, top_right = split_mid(mid_top)
    bot_left, bot_right = split_mid(mid_bot)

    # TM-08,09,10,11 (giữa-trái trên)
    for i, c in enumerate(top_left):
        mapping[8 + i] = c
    # TM-12,13,14,15 (giữa-trái dưới)
    for i, c in enumerate(bot_left):
        mapping[12 + i] = c
    # TM-16..21 (giữa-phải trên)
    for i, c in enumerate(top_right):
        mapping[16 + i] = c
    # TM-26,27,28,29 (giữa-phải dưới); TM-30 bỏ qua / thiếu.
    # Sơ đồ đánh số PHẢI→TRÁI: TM-26 bên phải nhất → đảo chiều (X giảm dần).
    for i, c in enumerate(reversed(bot_right)):
        mapping[26 + i] = c
    # Cột phải: TM-22,23,24,25 trên→xuống.
    for i, c in enumerate(right):
        mapping[22 + i] = c

    return mapping


def main():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT id, ST_X(ST_Centroid(geom)), ST_Y(ST_Centroid(geom)),
                      ST_Area(geom::geography)
               FROM ranh_thua WHERE lo_id=%s ORDER BY id""",
            (LO_ID,),
        )
        rows = [
            {"id": r[0], "x": r[1], "y": r[2], "area": float(r[3])}
            for r in cur.fetchall()
        ]
        print("Thửa trong lô #34 (DB):", len(rows))

        # 1) Xác định thửa trùng (giữ id nhỏ, các id trùng còn lại sẽ gỡ khỏi lô).
        uniq = dedupe(rows)
        uniq_ids = {u["id"] for u in uniq}
        dup_ids = [r["id"] for r in rows if r["id"] not in uniq_ids]
        print("Thửa thực (sau khử trùng):", len(uniq), "| Gỡ trùng:", dup_ids)

        # 2) Map STT theo vị trí.
        mapping = assign_order(uniq)

        # 2b) Áp OVERRIDE id→ô (gán cứng) — đè kết quả assign_order cho các
        #     thửa có trong OVERRIDE_OTO_BY_ID. Gỡ các thửa này ra khỏi vị trí
        #     cũ trước để tránh 1 thửa giữ 2 ô.
        by_id = {c["id"]: c for c in uniq}
        if OVERRIDE_OTO_BY_ID:
            forced_ids = set(OVERRIDE_OTO_BY_ID)
            # Bỏ mọi entry trỏ tới thửa bị override khỏi mapping cũ.
            mapping = {
                oto: cell for oto, cell in mapping.items()
                if cell["id"] not in forced_ids
            }
            # Gán cứng theo override (thửa phải thuộc lô #34).
            for plot_id, oto in OVERRIDE_OTO_BY_ID.items():
                cell = by_id.get(plot_id)
                if cell is None:
                    print(f"  ! Override id={plot_id}→TM-{oto}: KHÔNG thấy thửa trong lô (bỏ qua)")
                    continue
                mapping[oto] = cell

        # 3) Ghi meta từng thửa theo ô (bỏ qua TM-30).
        print("--- Mapping TM → thửa ---")
        applied = 0
        for oto in sorted(mapping):
            cell = mapping[oto]
            if oto in SKIP_OTO:
                print(f"  TM-{oto:02d}: BỎ QUA (thửa id={cell['id']})")
                continue
            deal = DEALS.get(oto)
            biz, legal_txt = status_of(oto)
            pay = payment_of(oto, deal)
            meta = {
                "cellCode": f"DCB05-{oto}",
                "lotCode": "DC.B05",
                "stt": oto,
                "areaExcel": AREA.get(oto),
                "businessStatus": biz,
                "collateralStatus": "none",
                "paymentStatus": pay,
                "internalLegal": legal_txt,
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
                })
            cur.execute(
                "UPDATE ranh_thua SET meta=%s WHERE id=%s",
                (json.dumps(meta, ensure_ascii=False), cell["id"]),
            )
            applied += 1
            print(f"  TM-{oto:02d} → id={cell['id']:<5} {biz:<13} area_excel={AREA.get(oto)} area_db={round(cell['area'],1)}")

        # 4) Gỡ thửa trùng khỏi lô.
        if dup_ids:
            cur.execute(
                "UPDATE ranh_thua SET lo_id=NULL WHERE id = ANY(%s)", (dup_ids,)
            )

        # 5) Cập nhật bảng lo #34: đếm lại + meta lô.
        cur.execute(
            """UPDATE lo SET
                   cell_count = (SELECT COUNT(*) FROM ranh_thua WHERE lo_id=%s),
                   area_total = 3811.5,
                   meta = %s
               WHERE id=%s""",
            (
                LO_ID,
                json.dumps({
                    "loCode": "DC.B05",
                    "description": "Lô DC.B05 — số thửa 57-58-09-10-11",
                    "note": "31 ô, 3.811,5 m². 7 đã có sổ, 5 chưa sổ, 19 chưa bán (nguồn: DCB05.xlsx). TM-30 tạm chưa gán.",
                }, ensure_ascii=False),
                LO_ID,
            ),
        )
        conn.commit()

        print(f"\nĐã gán meta cho {applied} ô.")
        cur.execute("SELECT cell_count, round(area_total::numeric,1), meta->>'loCode' FROM lo WHERE id=%s", (LO_ID,))
        print("Lô #34 sau cập nhật:", cur.fetchone())


if __name__ == "__main__":
    main()
