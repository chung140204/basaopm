// Spatial data for the map screen — REAL lots DCA14, DCB05 & DCB02.
// Source: DCA14.xlsx (51 ô, 4.796 m², tất cả CHƯA BÁN) + DCB05 dump
// (31 ô, 3.812 m²: 7 có sổ, 5 chưa sổ, 19 chưa bán) + DCB02 (27 ô, 2.943 m²:
// 1 có sổ, 16 chưa sổ, 10 chưa bán).
// Layout DCA14 dựng theo sơ đồ bản vẽ: 1 cột trái (7 ô), 1 hàng trên (20 ô),
// 1 cột phải (4 ô), 1 hàng dưới (20 ô). Coordinates: viewBox 0..1000 (y down).
// Mã lô dùng dạng KHÔNG dấu chấm (DCA14, DCB05, DCB02).

// ---- Phân khu A / B (zone) -----------------------------------------------
// Khu = nhóm cấp trên của lô (theo quy hoạch, chia bằng đường giữa dự án).
// Dùng để lọc/nhóm lô theo Khu A / Khu B trong "Quản lý theo lô".
// Gán cứng theo dữ liệu thật: DCA14 ở Khu A, DCB05 & DCB02 ở Khu B.
// Mã lô dùng dạng KHÔNG dấu chấm (DCA14, DCB05, DCB02).
export const ZONES = [
  { id: 'khu-a', name: 'Khu A' },
  { id: 'khu-b', name: 'Khu B' },
];

export const zoneName = (id) => ZONES.find((z) => z.id === id)?.name ?? id;

/**
 * Khu của 1 ô — dùng zone THẬT từ DB (properties.zone). Ô chưa gán zone → null
 * (không đoán theo mã lô nữa; bộ lọc coi như "vô khu", luôn hiện).
 */
export function zoneOfCell(properties) {
  return properties?.zone ?? null;
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
];


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
