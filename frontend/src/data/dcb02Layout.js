// BỐ CỤC SƠ ĐỒ lô DCB02 — vị trí lưới ô theo bản vẽ (KHÔNG có trong DB).
//   - Cột trái dọc: TM-01..07 (7 ô)
//   - 4 cột giữa × 2 hàng: trên TM-08..11, dưới TM-12..15 (8 ô)
//   - Khối phải: hàng trên NV-16..19, hàng dưới NV-27..24 (đánh phải→trái)
//   - Cột phải-cùng dọc: NV-20..23
//
// Chỉ chứa HÌNH HỌC khung (o + x/y/w/h) + area (nhãn ban đầu; DB ghi đè khi
// backend bật, qua useDbCells). KHÔNG chứa dữ liệu nghiệp vụ — status/owner/
// contract/payments lấy từ DB (/api/cells, /api/cells/{code}).
const GAP = 2;

// area mỗi ô (m²) — khớp DB; chỉ dùng cho nhãn lúc render đầu / khi offline.
const AREA = {
  1: 87, 2: 90, 3: 90, 4: 90, 5: 90, 6: 90, 7: 87,
  8: 80, 9: 80, 10: 80, 11: 80, 12: 80, 13: 80, 14: 80, 15: 80,
  16: 150, 17: 150, 18: 150, 19: 150,
  20: 116, 21: 124, 22: 124, 23: 116,
  24: 150, 25: 150, 26: 150, 27: 150,
};

// Dựng danh sách ô + vị trí theo đúng công thức bố cục bản vẽ.
function buildLayout() {
  const out = [];
  const push = (o, x, y, w, h) =>
    out.push({ o, cellCode: `DCB02-${o}`, area: AREA[o], x, y, w, h });

  const X0 = 70; // gốc trái
  const TOP = 90; // hàng trên
  const RH = 150; // cao 1 ô
  const BOT = TOP + RH + GAP; // hàng dưới

  // 1) Cột trái: TM-01..07 (xếp dọc).
  const leftH = (RH * 2 + GAP) / 7;
  const leftW = 95;
  for (let i = 0; i < 7; i++) {
    push(1 + i, X0, TOP + i * leftH + GAP, leftW, leftH - GAP * 2);
  }

  // 2) 4 cột giữa (TM-08..11 trên, TM-12..15 dưới).
  const midX0 = X0 + leftW + 20;
  const midW = 85;
  for (let i = 0; i < 4; i++) {
    push(8 + i, midX0 + i * (midW + GAP), TOP, midW, RH); // trên
    push(12 + i, midX0 + i * (midW + GAP), BOT, midW, RH); // dưới
  }

  // 3) Khối phải: hàng trên NV-16..19, hàng dưới NV-27..24 (trái→phải).
  const rX0 = midX0 + 4 * (midW + GAP) + 20;
  const rW = 95;
  for (let i = 0; i < 4; i++) {
    push(16 + i, rX0 + i * (rW + GAP), TOP, rW, RH); // trên: 16,17,18,19
    push(27 - i, rX0 + i * (rW + GAP), BOT, rW, RH); // dưới: 27,26,25,24
  }

  // 4) Cột phải-cùng dọc: NV-20..23 (trên→xuống).
  const colX = rX0 + 4 * (rW + GAP) + GAP;
  const colW = 80;
  const colH = (RH * 2 + GAP) / 4;
  for (let i = 0; i < 4; i++) {
    push(20 + i, colX, TOP + i * (colH + GAP), colW, colH - GAP);
  }

  return out;
}

export const DCB02_LAYOUT = buildLayout();
