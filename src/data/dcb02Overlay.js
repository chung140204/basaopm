// Phủ dữ liệu nghiệp vụ DCB02 (tĩnh, từ Excel) lên các feature ranh thửa thật.
// Mục đích: TÔ MÀU polyline ranh thửa theo trạng thái kinh doanh/thanh toán mà
// KHÔNG cần backend ghi meta. Nguồn dữ liệu: cellsDCB02.js (DCB02_RAW).
import { DCB02_RAW } from './cellsDCB02';
import { DCB02_PLOT_TO_O } from './dcb02PlotMap';

// o (số ô 1..27) → bản ghi nghiệp vụ.
const BY_O = new Map(DCB02_RAW.map((r) => [r.o, r]));

// Dựng meta khớp các field mà bản đồ + RanhThuaPanel đọc.
function metaFromRaw(raw) {
  const sold = raw.business !== 'unsold';
  const paid = (raw.payments || []).reduce((s, p) => s + (p.amount ?? 0), 0);
  return {
    cellCode: raw.cellCode,
    businessStatus: raw.business, // tô màu lớp "business"
    paymentStatus: raw.payment ?? 'unpaid', // tô màu lớp "payment"
    collateralStatus: 'none',
    areaExcel: raw.area,
    currentOwner: raw.customer ?? null,
    owner: raw.customer ?? null,
    address: raw.address ?? null,
    contractValue: raw.totalValue ?? null,
    paid,
    remaining: raw.remaining ?? 0,
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
  };
}

// Lấy id của 1 feature geojson (PostGIS trả id ở feature.id; phòng khi nằm trong properties).
function featureId(f) {
  return f?.id ?? f?.properties?.id ?? null;
}

/**
 * Trả về FeatureCollection mới với meta DCB02 đã được phủ vào đúng feature.
 * Không làm gì với feature ngoài DCB02. An toàn khi geojson null/empty.
 */
export function applyDcb02Overlay(geojson) {
  if (!geojson?.features?.length) return geojson;
  const features = geojson.features.map((f) => {
    const o = DCB02_PLOT_TO_O[featureId(f)];
    if (!o) return f;
    const raw = BY_O.get(o);
    if (!raw) return f;
    return {
      ...f,
      // Giữ properties gốc (So_thua/Dien_tich...), ghi đè meta nghiệp vụ.
      meta: { ...(f.meta || {}), ...metaFromRaw(raw) },
      properties: {
        ...(f.properties || {}),
        So_thua: raw.cellCode,
        Dien_tich: raw.area,
      },
    };
  });
  return { ...geojson, features };
}

/** True nếu feature thuộc lô DCB02 (để biết có dữ liệu phủ hay không). */
export function isDcb02Feature(f) {
  return DCB02_PLOT_TO_O[featureId(f)] != null;
}
