// Central definition of map layers, statuses, colours and labels.
// Used by MapCanvas (colorResolver), MapLegend, FilterPanel and Badges so
// everything stays in sync. When the real map API is plugged in, this file
// stays unchanged — colours map from feature.properties values.

export const LAYERS = [
  {
    id: 'business',
    label: 'Trạng thái kinh doanh',
    field: 'businessStatus',
    statuses: [
      { value: 'unsold', label: 'Chưa bán', fill: '#94A3B8', stroke: '#64748B' },
      {
        value: 'sold_red_book',
        label: 'Đã bán - có sổ đỏ',
        fill: '#16A34A',
        stroke: '#15803D',
      },
      {
        value: 'sold_no_book',
        label: 'Đã bán - chưa có sổ đỏ',
        fill: '#D97706',
        stroke: '#B45309',
      },
    ],
  },
  {
    id: 'legal',
    label: 'Pháp lý / tài sản bảo đảm',
    field: 'bookStatus',
    // Trạng thái CẤP SỔ (book_status). Màu chọn để KHÔNG trùng lớp 'business'
    // (business dùng: #94A3B8 xám, #16A34A xanh lá, #D97706 cam). Nhóm theo mức
    // độ hoàn thiện: chưa sổ → đỏ/hổ phách, đang xử lý → vàng, đã có sổ → tông
    // xanh/tím theo palette thương hiệu (color.md).
    statuses: [
      {
        value: 'no_book_ineligible',
        label: 'Chưa cấp sổ - Không đủ điều kiện',
        fill: '#DC2626',
        stroke: '#B91C1C',
      },
      {
        value: 'no_book_eligible',
        label: 'Chưa cấp sổ - Đủ điều kiện',
        fill: '#F59E0B',
        stroke: '#D97706',
      },
      {
        value: 'book_in_progress',
        label: 'Đang làm thủ tục cấp sổ',
        fill: '#CA8A04',
        stroke: '#A16207',
      },
      {
        value: 'book_held_investor',
        label: 'Đã có sổ - Do CĐT cầm',
        fill: '#7C3AED',
        stroke: '#6D28D9',
      },
      {
        value: 'book_transferred',
        label: 'Đã có sổ - Chuyển giao cho chủ sở hữu',
        fill: '#003AD6',
        stroke: '#0030B0',
      },
      {
        value: 'book_in_transaction',
        label: 'Đã có sổ - Đang giao dịch tài chính / pháp lý',
        fill: '#0891B2',
        stroke: '#0E7490',
      },
      {
        value: 'book_split',
        label: 'Đã có sổ - Đổi/Tách từ sổ cũ',
        fill: '#000D6D',
        stroke: '#000940',
      },
    ],
  },
  {
    // Lớp thế chấp CŨ — không còn dùng để tô màu bản đồ (lớp 'legal' đã chuyển
    // sang trạng thái cấp sổ), nhưng GIỮ để badge "Tài sản bảo đảm" trong panel
    // chi tiết ô còn nhãn/màu đúng cho collateralStatus.
    id: 'collateral',
    label: 'Tài sản bảo đảm (thế chấp)',
    field: 'collateralStatus',
    hideOnMap: true,
    statuses: [
      { value: 'none', label: 'Không thế chấp', fill: '#0891B2', stroke: '#0E7490' },
      {
        value: 'mortgage_bank',
        label: 'Thế chấp vay ngân hàng',
        fill: '#7C3AED',
        stroke: '#6D28D9',
      },
      {
        value: 'mortgage_external',
        label: 'Thế chấp vay ngoài',
        fill: '#DC2626',
        stroke: '#B91C1C',
      },
      {
        value: 'informal_sale',
        label: 'Bán không chính thống',
        fill: '#0F172A',
        stroke: '#000000',
      },
    ],
  },
  {
    id: 'payment',
    label: 'Tình trạng thanh toán',
    field: 'paymentStatus',
    statuses: [
      {
        value: 'partial',
        label: 'Thanh toán 1 phần',
        fill: '#D97706',
        stroke: '#B45309',
      },
      {
        value: 'paid_full',
        label: 'Đã thanh toán',
        fill: '#16A34A',
        stroke: '#15803D',
      },
      {
        value: 'unpaid',
        label: 'Chưa thanh toán',
        fill: '#94A3B8',
        stroke: '#64748B',
      },
      {
        value: 'deposit',
        label: 'Đã đặt cọc',
        fill: '#2563EB',
        stroke: '#1D4ED8',
      },
      {
        value: 'cancelled',
        label: 'Hủy giao dịch',
        fill: '#DC2626',
        stroke: '#B91C1C',
      },
    ],
  },
  {
    id: 'subdivision',
    label: 'Phân khu',
    field: 'subdivisionId',
    statuses: [
      { value: 'khu-a', label: 'Khu A', fill: '#DBEAFE', stroke: '#2563EB' },
      { value: 'khu-b', label: 'Khu B', fill: '#EDE9FE', stroke: '#7C3AED' },
    ],
  },
];

const LAYER_BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l]));

export function getLayer(layerId) {
  return LAYER_BY_ID[layerId] ?? LAYERS[0];
}

const FALLBACK = { fill: '#E2E8F0', stroke: '#CBD5E1', label: 'Không xác định' };

/** Resolve a status descriptor for a feature under a given layer. */
export function getStatusForFeature(layer, feature) {
  const value = feature.properties[layer.field];
  return layer.statuses.find((s) => s.value === value) ?? FALLBACK;
}

/** Build a colorResolver bound to the active layer. */
export function makeColorResolver(layerId) {
  const layer = getLayer(layerId);
  return (feature) => {
    const status = getStatusForFeature(layer, feature);
    return { fill: status.fill, stroke: status.stroke };
  };
}

// Convenient lookups for badges in the detail panel.
export function labelFor(layerId, value) {
  const layer = getLayer(layerId);
  return layer.statuses.find((s) => s.value === value)?.label ?? '—';
}
