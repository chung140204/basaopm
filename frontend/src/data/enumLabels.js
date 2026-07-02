// Nhãn tiếng Việt tập trung cho mọi enum DB (schema_v2) → hiển thị FE.
// Giá trị tiếng Việt bám sát nguyên gốc 4 file Excel để khớp dữ liệu thật.
// Dùng helper label*(value) — mã lạ không có trong bảng thì giữ nguyên mã
// (không nuốt mất giá trị), null/rỗng → '—'.

export const PLANNING_LABEL = {
  residential_commercial: 'Đất ở + dịch vụ thương mại',
  residential_lot: 'Đất ở chia lô',
  garden_house: 'Đất nhà vườn',
};

export const CONSTRUCTION_LABEL = {
  not_handed_over: 'Chưa giao',
  built: 'Đã xây dựng',
};

// Trạng thái cấp sổ (book_status) — đồng bộ với lớp 'legal' trong lib/layers.js
// và CHECK constraint ck_cell_book trong DB.
export const BOOK_LABEL = {
  no_book_ineligible: 'Chưa cấp sổ - Không đủ điều kiện',
  no_book_eligible: 'Chưa cấp sổ - Đủ điều kiện',
  book_in_progress: 'Đang làm thủ tục cấp sổ',
  book_held_investor: 'Đã có sổ - Do CĐT cầm',
  book_transferred: 'Đã có sổ - Chuyển giao cho chủ sở hữu',
  book_in_transaction: 'Đã có sổ - Đang giao dịch tài chính / pháp lý',
  book_split: 'Đã có sổ - Đổi/Tách từ sổ cũ',
};

export const BUSINESS_LABEL = {
  unsold: 'Chưa bán',
  sold_red_book: 'Đã bán - có sổ đỏ',
  sold_no_book: 'Đã bán - chưa có sổ đỏ',
};

export const PAYMENT_LABEL = {
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid_full: 'Đã thanh toán',
  deposit: 'Đã đặt cọc',
  cancelled: 'Hủy giao dịch',
};

export const COLLATERAL_LABEL = {
  none: 'Không thế chấp',
  mortgage_bank: 'Thế chấp vay ngân hàng',
  mortgage_external: 'Thế chấp vay ngoài',
  informal_sale: 'Bán không chính thống',
};

export const TAX_BEARER_LABEL = {
  customer: 'Khách hàng',
  investor: 'Chủ đầu tư',
  has_vat: 'Có VAT',
};

export const MORTGAGE_STATE_LABEL = {
  mortgaged: 'Đang thế chấp',
  released: 'Đã giải chấp',
};

export const LEGAL_KIND_LABEL = {
  enforcement: 'Thi hành án',
  book_issuance: 'Cấp sổ',
  mortgage_change: 'Thay đổi thế chấp',
  status_change: 'Thay đổi trạng thái',
  other: 'Sự kiện pháp lý',
};

export const PAYMENT_METHOD_LABEL = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  other: 'Khác',
};

// Helper chung: tra bảng → nhãn Việt; giữ mã gốc nếu lạ; '—' nếu trống.
function lookup(map, v) {
  if (v == null || v === '') return '—';
  return map[v] ?? v;
}

export const labelPlanning = (v) => lookup(PLANNING_LABEL, v);
export const labelConstruction = (v) => lookup(CONSTRUCTION_LABEL, v);
export const labelBook = (v) => lookup(BOOK_LABEL, v);
export const labelBusiness = (v) => lookup(BUSINESS_LABEL, v);
export const labelPayment = (v) => lookup(PAYMENT_LABEL, v);
export const labelCollateral = (v) => lookup(COLLATERAL_LABEL, v);
export const labelTaxBearer = (v) => lookup(TAX_BEARER_LABEL, v);
export const labelMortgageState = (v) => lookup(MORTGAGE_STATE_LABEL, v);
export const labelLegalKind = (v) => lookup(LEGAL_KIND_LABEL, v);
export const labelPaymentMethod = (v) => lookup(PAYMENT_METHOD_LABEL, v);
