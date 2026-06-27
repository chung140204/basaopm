// Spatial data for the map screen — REAL lots DCA14, DCB05 & DCB02.
// Source: DCA14.xlsx (51 ô, 4.796 m², tất cả CHƯA BÁN) + DCB05 dump
// (31 ô, 3.812 m²: 7 có sổ, 5 chưa sổ, 19 chưa bán) + DCB02 (27 ô, 2.943 m²:
// 1 có sổ, 16 chưa sổ, 10 chưa bán).
// Layout DCA14 dựng theo sơ đồ bản vẽ: 1 cột trái (7 ô), 1 hàng trên (20 ô),
// 1 cột phải (4 ô), 1 hàng dưới (20 ô). Coordinates: viewBox 0..1000 (y down).
// Mã lô dùng dạng KHÔNG dấu chấm (DCA14, DCB05, DCB02).
import { DCB05_RAW } from './cellsDCB05';
import { DCB02_LAYOUT } from './dcb02Layout';
import { KHUA_MOCK_RAW } from './cellsKhuAMock';

// ---- Phân khu A / B (zone) -----------------------------------------------
// Khu = nhóm cấp trên của lô (theo quy hoạch, chia bằng đường giữa dự án).
// Dùng để lọc/nhóm lô theo Khu A / Khu B trong "Quản lý theo lô".
// Gán cứng theo dữ liệu thật: DCA14 ở Khu A, DCB05 & DCB02 ở Khu B.
// Mã lô dùng dạng KHÔNG dấu chấm (DCA14, DCB05, DCB02).
export const ZONES = [
  { id: 'khu-a', name: 'Khu A' },
  { id: 'khu-b', name: 'Khu B' },
];

const LOT_ZONE = {
  DCA14: 'khu-a',
  DCB05: 'khu-b',
  DCB02: 'khu-b',
  DCB09: 'khu-b',
};

/**
 * Khu (zone id) của 1 lô theo mã lô; mặc định Khu A nếu chưa khai báo.
 * Chuẩn hoá bỏ dấu chấm để "DC.B02" và "DCB02" đều khớp.
 */
export function zoneOfLot(lotCode) {
  const code = (lotCode ?? '').replace(/\./g, '');
  return LOT_ZONE[code] ?? 'khu-a';
}

export const zoneName = (id) => ZONES.find((z) => z.id === id)?.name ?? id;

/**
 * Khu của 1 ô: ưu tiên zone thật từ DB (properties.zone), fallback map tĩnh
 * theo mã lô. Dùng cho ô đã merge DB (DCB02/DCB09) lẫn ô tĩnh (DCA14/DCB05...).
 */
export function zoneOfCell(properties) {
  return properties?.zone ?? zoneOfLot(properties?.lotCode);
}

// Subdivisions = mỗi lô là 1 phân khu (để tách nhóm trong "Quản lý theo lô").
export const SUBDIVISIONS = [
  {
    id: 'dca14',
    name: 'DCA14',
    lotCount: 1,
    labelPos: [500, 300],
    border: {
      type: 'Polygon',
      coordinates: [[[40, 60], [980, 60], [980, 560], [40, 560], [40, 60]]],
    },
  },
  {
    id: 'dcb05',
    name: 'DCB05',
    lotCount: 1,
    labelPos: [500, 300],
    border: {
      type: 'Polygon',
      coordinates: [[[40, 60], [980, 60], [980, 460], [40, 460], [40, 60]]],
    },
  },
  {
    id: 'dcb02',
    name: 'DCB02',
    lotCount: 1,
    labelPos: [500, 300],
    border: {
      type: 'Polygon',
      coordinates: [[[40, 60], [980, 60], [980, 420], [40, 420], [40, 60]]],
    },
  },
  {
    // DCB09: 32 ô (data thật từ DB), dựng grid ở dải dưới viewBox.
    id: 'dcb09',
    name: 'DCB09',
    lotCount: 1,
    labelPos: [500, 700],
    border: {
      type: 'Polygon',
      coordinates: [[[60, 630], [880, 630], [880, 980], [60, 980], [60, 630]]],
    },
  },
  // 3 lô mock Khu A (DCA15/16/17) — hình học dạng grid, chỉ để hiển thị.
  {
    id: 'dca15',
    name: 'DCA15',
    lotCount: 1,
    labelPos: [500, 300],
    border: {
      type: 'Polygon',
      coordinates: [[[40, 60], [980, 60], [980, 560], [40, 560], [40, 60]]],
    },
  },
  {
    id: 'dca16',
    name: 'DCA16',
    lotCount: 1,
    labelPos: [500, 300],
    border: {
      type: 'Polygon',
      coordinates: [[[40, 60], [980, 60], [980, 560], [40, 560], [40, 60]]],
    },
  },
  {
    id: 'dca17',
    name: 'DCA17',
    lotCount: 1,
    labelPos: [500, 300],
    border: {
      type: 'Polygon',
      coordinates: [[[40, 60], [980, 60], [980, 600], [40, 600], [40, 60]]],
    },
  },
];

// Diện tích thật (m²) theo STT ô (DCA14-1 .. DCA14-51), lấy từ Excel.
const AREAS = [
  112, 110, 100, 100, 100, 110, 112, // 1-7  cột trái (CL-01..CL-07)
  90, 90, 90, 90, 90, 90, 90, 90, 90, 90, // 8-17
  90, 90, 90, 90, 90, 90, 90, 90, 90, 90, // 18-27 (hàng trên CL-08..CL-27)
  109, 117, 117, 109, // 28-31 cột phải (CL-28..CL-31)
  90, 90, 90, 90, 90, 90, 90, 90, 90, 90, // 32-41
  90, 90, 90, 90, 90, 90, 90, 90, 90, 90, // 42-51 (hàng dưới CL-32..CL-51)
];

// Build a rectangular cell polygon + centroid.
function rect(x, y, w, h) {
  return {
    geometry: {
      type: 'Polygon',
      coordinates: [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]],
    },
    centroid: [Math.round(x + w / 2), Math.round(y + h / 2)],
  };
}

// Lịch sử pháp lý lô DCB02: tranh chấp đã xử lý xong, đang chuẩn bị thi hành án.
// 3 giai đoạn (mới → cũ): Chuẩn bị THA (hiện tại) ← Phúc thẩm xong ← Đã xử lý nợ.
function dcb02LegalHistory() {
  return [
    {
      status: 'Chuẩn bị Thi hành án (THA)',
      current: true,
      date: null,
      note: 'Đang chuẩn bị hồ sơ thi hành án',
      tone: 'current',
    },
    {
      status: 'Phúc thẩm xong',
      date: null,
      note: 'Bản án phúc thẩm đã có hiệu lực',
      tone: 'done',
    },
    {
      status: 'Đã xử lý nợ',
      date: null,
      note: 'Hoàn tất xử lý nợ',
      tone: 'done',
    },
  ];
}

// Chọn lịch sử pháp lý theo lô. Chỉ DCB02 có timeline 3 giai đoạn tranh chấp;
// các lô dump khác (DCB05...) không có lịch sử pháp lý.
function legalHistoryForLot(lotCode) {
  if (lotCode === 'DCB02') return dcb02LegalHistory();
  return [];
}

// Factory: every cell here is "chưa bán" (unsold), no owner/contract/payment.
function makeCell(stt, x, y, w, h) {
  const r = rect(x, y, w, h);
  const code = `DCA14-${stt}`;
  const baseProps = {
    cellCode: code,
    lotCode: 'DCA14',
    subdivisionId: 'dca14',
    centroid: r.centroid,
    area: AREAS[stt - 1],
    planningType: 'Đất ở liền kề',
    // Chưa bán → chưa thanh toán, chưa thế chấp, chưa có sổ.
    value: 0,
    businessStatus: 'unsold',
    collateralStatus: 'none',
    paymentStatus: 'unpaid',
    transaction: null,
    internalLegal: 'Chưa cấp sổ',
    documents: [
      { name: 'Hop_dong_dat_coc.pdf', size: 1.2 * 1024 * 1024, date: '2023-09-01' },
      { name: 'Ban_ve_so_do_1_500.png', size: 4.5 * 1024 * 1024, date: '2023-10-20' },
    ],
    // Lịch sử pháp lý: timeline mốc pháp lý (mới → cũ).
    // [{ status, current?, date, note, tone }]; tone: 'done' | 'current' | 'pending'
    // DCA14 hiện chưa có lịch sử pháp lý (chỉ DCB02 có).
    legalHistory: [],
    note: '',
    description: '',
    // Trường mở rộng (chưa bán → để trống).
    address: null,
    currentOwner: null,
    ownershipContract: null,
    constructionStatus: null,
    buildDensity: null,
    buildFloors: null,
    enforcementStatus: null,
    // --- Giao dịch & thanh toán (4 nhóm) — mặc định trống → UI hiện "—".
    // 1) Hợp đồng
    contract: null, // { code, signDate, customer, totalValue, taxBearer }
    // 2) Lịch sử thanh toán: [{ date, amount, method, voucher, note }]
    payments: [],
    // 4) Thế chấp ngân hàng
    mortgage: null, // { loanValue, status, lender, outstanding, note }
  };
  return {
    id: `cell-${code}`,
    type: 'Feature',
    geometry: r.geometry,
    properties: baseProps,
  };
}

// ---- Geometry construction theo sơ đồ ------------------------------------
// Khung tổng: cột trái | hàng trên/dưới ở giữa | cột phải.
const LEFT_X = 70; // cột trái
const LEFT_W = 110;
const RIGHT_X = 860; // cột phải
const RIGHT_W = 110;
const MID_X0 = 200; // bắt đầu vùng giữa
const MID_X1 = 840; // kết thúc vùng giữa
const TOP_Y = 80; // hàng trên
const ROW_H = 200;
const BOT_Y = 320; // hàng dưới
const GAP = 2;

const cells = [];

// 1) Cột trái: ô 1..7 (xếp dọc, từ trên xuống).
{
  const n = 7;
  const h = (560 - LEFT_X * 0 - 80 - 80) / n; // chiều cao khung trái
  const y0 = 80;
  const colH = (480) / n; // 80..560 → 480
  for (let i = 0; i < n; i++) {
    const stt = i + 1;
    cells.push(makeCell(stt, LEFT_X, y0 + i * colH + GAP, LEFT_W, colH - GAP * 2));
  }
}

// 2) Hàng trên: ô 8..27 (20 ô, trái→phải).
{
  const n = 20;
  const w = (MID_X1 - MID_X0) / n;
  for (let i = 0; i < n; i++) {
    const stt = 8 + i;
    cells.push(makeCell(stt, MID_X0 + i * w + GAP, TOP_Y, w - GAP * 2, ROW_H));
  }
}

// 3) Cột phải: ô 28..31 (4 ô, trên→xuống).
{
  const n = 4;
  const y0 = 80;
  const colH = 480 / n;
  for (let i = 0; i < n; i++) {
    const stt = 28 + i;
    cells.push(makeCell(stt, RIGHT_X, y0 + i * colH + GAP, RIGHT_W, colH - GAP * 2));
  }
}

// 4) Hàng dưới: ô 32..51 (20 ô). Trong bản vẽ nhãn chạy CL-51→CL-32 từ
//    trái sang phải, tức STT 32 nằm BÊN PHẢI nhất. Vẽ phải→trái.
{
  const n = 20;
  const w = (MID_X1 - MID_X0) / n;
  for (let i = 0; i < n; i++) {
    const stt = 32 + i;
    const col = n - 1 - i; // 32 → cột phải nhất
    cells.push(makeCell(stt, MID_X0 + col * w + GAP, BOT_Y, w - GAP * 2, ROW_H));
  }
}

// ---- Factory chung cho lô dump (DCB05, DCB02) ----------------------------
// Dump chỉ có số ô + nghiệp vụ (không có toạ độ thật) → dựng grid để hiển thị
// trong "Quản lý theo lô" (giống cách DCA14 dựng grid theo sơ đồ).
function makeDumpCell(raw, lotCode, subdivisionId, x, y, w, h) {
  const r = rect(x, y, w, h);
  const sold = raw.business !== 'unsold';
  const remaining = raw.remaining ?? 0;
  const totalPaid = (raw.payments || []).reduce((s, p) => s + (p.amount ?? 0), 0);
  return {
    id: `cell-${raw.cellCode}`,
    type: 'Feature',
    geometry: r.geometry,
    properties: {
      cellCode: raw.cellCode,
      lotCode,
      subdivisionId,
      centroid: r.centroid,
      area: raw.area,
      planningType: 'Đất ở liền kề',
      value: raw.totalValue ?? 0,
      businessStatus: raw.business, // sold_red_book | sold_no_book | unsold
      collateralStatus: 'none', // dump không có dữ liệu thế chấp
      paymentStatus: raw.payment ?? 'unpaid',
      transaction: null,
      internalLegal:
        raw.business === 'sold_red_book'
          ? 'Đã cấp sổ đỏ'
          : raw.business === 'sold_no_book'
          ? 'Chưa cấp sổ'
          : 'Chưa cấp sổ',
      documents: [],
      legalHistory: legalHistoryForLot(lotCode),
      note: '',
      description: '',
      address: raw.address ?? null,
      currentOwner: raw.customer ?? null,
      ownershipContract: raw.contractCode ?? null,
      constructionStatus: null,
      buildDensity: null,
      buildFloors: null,
      enforcementStatus: null,
      // Hợp đồng (chỉ ô đã bán).
      contract: sold
        ? {
            code: raw.contractCode ?? null,
            signDate: raw.signDate ?? null,
            customer: raw.customer ?? null,
            totalValue: raw.totalValue ?? null,
            taxBearer: raw.taxBearer ?? null,
          }
        : null,
      payments: raw.payments ?? [],
      paid: totalPaid,
      mortgage: null,
      remaining,
    },
  };
}

// Grid 8 cột cho 31 ô DCB05 (chỉ để hiển thị).
{
  const cols = 8;
  const cw = 110;
  const ch = 90;
  const gx = 70;
  const gy = 80;
  DCB05_RAW.forEach((raw, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cells.push(
      makeDumpCell(
        raw,
        'DCB05',
        'dcb05',
        gx + col * (cw + GAP),
        gy + row * (ch + GAP),
        cw,
        ch
      )
    );
  });
}

// ---- DCB02: 27 ô — bố cục sơ đồ từ dcb02Layout.js ------------------------
// Khung lưới (vị trí + area) dựng từ layout tĩnh (DB không có bố cục bản vẽ);
// dữ liệu nghiệp vụ (status/owner/contract...) để mặc định ở đây và được
// useDbCells ghi đè bằng DB khi backend bật.
for (const lo of DCB02_LAYOUT) {
  const raw = { o: lo.o, cellCode: lo.cellCode, area: lo.area, business: 'unsold' };
  cells.push(makeDumpCell(raw, 'DCB02', 'dcb02', lo.x, lo.y, lo.w, lo.h));
}

// ---- 3 lô mock Khu A (DCA15/16/17): grid 8 cột mỗi lô ---------------------
{
  const SUBS = { DCA15: 'dca15', DCA16: 'dca16', DCA17: 'dca17' };
  const byLot = new Map();
  for (const raw of KHUA_MOCK_RAW) {
    if (!byLot.has(raw.lotCode)) byLot.set(raw.lotCode, []);
    byLot.get(raw.lotCode).push(raw);
  }
  const cols = 8;
  const cw = 110;
  const ch = 90;
  const gx = 70;
  const gy = 80;
  for (const [lotCode, raws] of byLot) {
    raws.sort((a, b) => a.o - b.o);
    raws.forEach((raw, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      cells.push(
        makeDumpCell(
          raw,
          lotCode,
          SUBS[lotCode],
          gx + col * (cw + GAP),
          gy + row * (ch + GAP),
          cw,
          ch
        )
      );
    });
  }
}

export const CELLS = cells;

// Total cells across all lots.
export const TOTAL_CELLS = 51 + 31 + 27 + KHUA_MOCK_RAW.length;

// Bounding box covering everything (for the "Fit" control).
export const FULL_BBOX = { x: 40, y: 60, w: 940, h: 500 };

// --- Geographic placement (for real map basemaps like Google Maps) ------
// Neo lưới viewBox vào ĐÚNG vị trí lô DC.A14 thật (trùng lớp ranh thửa từ
// backend: center [106.3934, 21.1219]). Lô ~4.796 m² nên span nhỏ (~0,12km).
export const PROJECT_CENTER = { lat: 21.121964, lng: 106.39340 };

const SPAN_LNG = 0.0016; // ~165 m theo kinh độ (đủ phủ chiều ngang lô)
const SPAN_LAT = 0.0009; // ~100 m theo vĩ độ
const VIEW_W = 1000;
const VIEW_H = 600;

// Convert a viewBox point [x,y] (y down) to {lat,lng}.
export function toLatLng([x, y]) {
  const lng = PROJECT_CENTER.lng + (x / VIEW_W - 0.5) * SPAN_LNG;
  const lat = PROJECT_CENTER.lat + (0.5 - y / VIEW_H) * SPAN_LAT;
  return { lat, lng };
}

// Pre-compute geographic ring + centroid for each cell.
export function cellLatLngPath(feature) {
  return feature.geometry.coordinates[0].map(toLatLng);
}

export function subdivisionLatLngPath(sub) {
  return sub.border.coordinates[0].map(toLatLng);
}
