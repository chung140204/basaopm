// API ô nghiệp vụ (schema_v2 — dữ liệu thật từ 4 file Excel).
// Trả FIELD PHẲNG (mã FE tiếng Anh), không dùng meta JSONB.
//   GET /api/cells?lot=DCB02        → danh sách ô (field phẳng)
//   GET /api/cells/{cellCode}       → chi tiết 1 ô (+ contract/payments/mortgage/legal)
//   GET /api/cells-geojson?lot=...  → GeoJSON các ô đã map geom (vẽ layer)
//   PUT /api/cells/{cellCode}       → cập nhật field phẳng (partial)

const RANH_THUA_API =
  import.meta.env.VITE_API_URL_RANH_THUA || 'http://localhost:8000';

/**
 * Danh sách ô nghiệp vụ của 1 lô (field phẳng từ DB).
 * @param {string} [lot] mã lô, vd 'DCB02'
 * @returns {Promise<Array<object>>} [] nếu backend chưa chạy.
 */
export async function getCells(lot) {
  const qs = lot ? `?lot=${encodeURIComponent(lot)}` : '';
  try {
    const res = await fetch(`${RANH_THUA_API}/api/cells${qs}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.cells || [];
  } catch {
    return [];
  }
}

/**
 * Chi tiết 1 ô theo mã (kèm contract, payments[], mortgage, legalEvents[]).
 * @param {string} cellCode vd 'DCB02-04'
 * @returns {Promise<object|null>}
 */
export async function getCellDetail(cellCode) {
  try {
    const res = await fetch(
      `${RANH_THUA_API}/api/cells/${encodeURIComponent(cellCode)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * GeoJSON các ô đã map geom (vẽ layer tô màu theo trạng thái).
 * @param {string} [lot]
 * @returns {Promise<object|null>} FeatureCollection hoặc null.
 */
export async function getCellsGeoJSON(lot) {
  const qs = lot ? `?lot=${encodeURIComponent(lot)}` : '';
  try {
    const res = await fetch(`${RANH_THUA_API}/api/cells-geojson${qs}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Cập nhật field phẳng cho 1 ô (chỉ gửi field thay đổi).
 * @param {string} cellCode
 * @param {object} patch vd { value, business_status, internal_legal, note }
 * @returns {Promise<boolean>}
 */
export async function saveCell(cellCode, patch) {
  try {
    const res = await fetch(
      `${RANH_THUA_API}/api/cells/${encodeURIComponent(cellCode)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
