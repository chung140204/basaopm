// Phủ dữ liệu nghiệp vụ DCB02 lên các feature ranh thửa thật để TÔ MÀU polyline
// theo trạng thái kinh doanh/thanh toán. Nguồn dữ liệu: DB (API /api/cells-geojson).

// Lấy id của 1 feature geojson (PostGIS trả id ở feature.id; phòng khi nằm trong properties).
function featureId(f) {
  return f?.id ?? f?.properties?.id ?? null;
}

/**
 * Phủ dữ liệu nghiệp vụ lên ranh thửa TỪ DB (API /api/cells-geojson).
 * Map theo ranh_thua_id (cellsFC.properties.ranhThuaId) ↔ id của feature ranh
 * thửa. Trả về FeatureCollection mới; feature không khớp giữ nguyên.
 * An toàn khi geojson/cellsFC null/empty (backend tắt → trả nguyên geojson).
 *
 * @param {object} geojson FeatureCollection ranh thửa (từ /api/ranh-thua/geojson)
 * @param {object|null} cellsFC FeatureCollection ô nghiệp vụ (từ /api/cells-geojson)
 */
export function applyDbOverlay(geojson, cellsFC) {
  if (!geojson?.features?.length || !cellsFC?.features?.length) return geojson;
  // ranh_thua_id → properties nghiệp vụ (businessStatus/paymentStatus/...).
  const byRanhId = new Map();
  for (const cf of cellsFC.features) {
    const p = cf.properties || {};
    if (p.ranhThuaId != null) byRanhId.set(p.ranhThuaId, p);
  }
  const features = geojson.features.map((f) => {
    const cell = byRanhId.get(featureId(f));
    if (!cell) return f;
    const meta = {
      cellCode: cell.cellCode,
      lotCode: cell.lotCode, // để lọc theo Khu A/B (suy zone từ mã lô)
      businessStatus: cell.businessStatus,
      paymentStatus: cell.paymentStatus ?? 'unpaid',
      collateralStatus: cell.collateralStatus ?? 'none',
      areaExcel: cell.area,
    };
    return {
      ...f,
      meta: { ...(f.meta || {}), ...meta },
      properties: {
        ...(f.properties || {}),
        So_thua: cell.cellCode,
      },
    };
  });
  return { ...geojson, features };
}
