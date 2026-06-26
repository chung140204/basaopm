// API ranh thửa.
//  - Tile nền (raster): service basata cũ (api-planning-basata.basao.com).
//  - Vector (polyline + click tra thửa): backend riêng FastAPI+PostGIS (backend/).
//    GET /api/ranh-thua/geojson  → cả lớp, vẽ polyline mọi ô
//    GET /api/ranh-thua/at       → point-in-polygon, trả thửa chứa điểm click
//    GET /api/ranh-thua/layers   → center để bay tới

const PLANNING_TILE_URL =
  import.meta.env.VITE_API_URL_PLANNING_TILE || 'https://api-planning-basata.basao.com';

// Backend ranh thửa (vector). Mặc định localhost:8000 (docker compose).
const RANH_THUA_API =
  import.meta.env.VITE_API_URL_RANH_THUA || 'http://localhost:8000';

// Tile XYZ ranh thửa nền — dùng cho L.tileLayer.
export const RANH_THUA_TILE_URL = `${PLANNING_TILE_URL}/ranh-thua-tiles/{z}/{x}/{y}.png`;

// Tile XYZ lô thửa (lo-thua) — overlay riêng, cùng host planning-tile.
// LƯU Ý: endpoint merged /lo-thua-tiles/{z}/{x}/{y}.png hiện trả 500 khi có
// nhiều layer. Phải dùng dạng PER-LAYER: /lo-thua-tiles/{layer}/{z}/{x}/{y}.png
// → trả image/png 200. Mặc định layer 'chia-lo'.
export const LOTHUA_DEFAULT_LAYER = 'truonglinh-lo';

export function loThuaTileUrl(layerId = LOTHUA_DEFAULT_LAYER) {
  return `${PLANNING_TILE_URL}/lo-thua-tiles/${encodeURIComponent(
    layerId
  )}/{z}/{x}/{y}.png`;
}

/**
 * Danh sách layer lô thửa, kèm center [lng, lat] để bay tới.
 * @returns {Promise<Array<{id:string,name:string,center:[number,number],tiles:number}>>}
 */
export async function getLoThuaLayers() {
  try {
    const res = await fetch(`${PLANNING_TILE_URL}/api/lo-thua/layers`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.layers || [];
  } catch {
    return [];
  }
}

/**
 * Danh sách layer ranh thửa, kèm center [lng, lat] để bay tới.
 * @returns {Promise<Array<{id:string,features:number,center:[number,number]}>>}
 */
export async function getRanhThuaLayers() {
  try {
    const res = await fetch(`${RANH_THUA_API}/api/ranh-thua/layers`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.layers || [];
  } catch {
    return [];
  }
}

/**
 * GeoJSON toàn bộ ranh thửa của 1 layer (hoặc tất cả) → vẽ polyline mọi ô.
 * @param {string} [layerId]
 * @returns {Promise<object|null>} FeatureCollection hoặc null nếu backend chưa chạy.
 */
export async function getRanhThuaGeoJSON(layerId) {
  const qs = layerId ? `?layer=${encodeURIComponent(layerId)}` : '';
  try {
    const res = await fetch(`${RANH_THUA_API}/api/ranh-thua/geojson${qs}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Tìm thửa tại điểm click (point-in-polygon, làm ở backend bằng PostGIS).
 * @param {number} lat
 * @param {number} lng
 * @param {{ layer?: string }} [opts]
 * @returns {Promise<{found:boolean, layer?:string, feature?:object}>}
 */
export async function getRanhThuaAt(lat, lng, { layer } = {}) {
  const qs = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (layer) qs.set('layer', layer);
  try {
    const res = await fetch(`${RANH_THUA_API}/api/ranh-thua/at?${qs}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { found: false };
    return await res.json();
  } catch {
    return { found: false };
  }
}

/**
 * Tìm thửa theo số thửa (So_thua) hoặc mã ô (meta.cellCode).
 * @param {string} q
 * @returns {Promise<Array<{id,layer,properties,meta,geometry,bbox}>>}
 */
export async function searchRanhThua(q) {
  if (!q?.trim()) return [];
  try {
    const res = await fetch(
      `${RANH_THUA_API}/api/ranh-thua/search?q=${encodeURIComponent(q.trim())}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- LÔ (cụm thửa)

/** GeoJSON hình bao tất cả lô (vẽ ranh lô + diện tích/ô con). */
export async function getLoGeoJSON(layerId) {
  const qs = layerId ? `?layer=${encodeURIComponent(layerId)}` : '';
  try {
    const res = await fetch(`${RANH_THUA_API}/api/lo/geojson${qs}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Chi tiết 1 lô: thông tin tổng + danh sách ô con. */
export async function getLoDetail(loId) {
  try {
    const res = await fetch(`${RANH_THUA_API}/api/lo/${loId}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Sửa mã lô / mô tả / ghi chú của 1 lô. */
export async function saveLoMeta(loId, meta) {
  try {
    const res = await fetch(`${RANH_THUA_API}/api/lo/${loId}/meta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meta }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Lưu metadata quản lý (giá, trạng thái, pháp lý, giao dịch, thanh toán, hồ sơ)
 * cho 1 thửa. Ghi đè toàn bộ object meta.
 * @param {number} plotId
 * @param {object} meta
 * @returns {Promise<boolean>} true nếu lưu thành công.
 */
export async function saveRanhThuaMeta(plotId, meta) {
  try {
    const res = await fetch(`${RANH_THUA_API}/api/ranh-thua/${plotId}/meta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meta }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
