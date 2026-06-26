// Trạng thái ranh thửa — KHÔNG còn sinh màu mock.
// Chỉ dùng dữ liệu thật (feature.meta / feature.properties). Thửa chưa có
// dữ liệu → trạng thái mặc định "chưa bán / chưa thế chấp / chưa thanh toán"
// (màu trung tính), cập nhật khi có meta thật từ backend.

const DEFAULTS = {
  businessStatus: 'unsold',
  collateralStatus: 'none',
  paymentStatus: 'unpaid',
};

/** Trạng thái mặc định cho 1 thửa (không random). */
export function mockStatusFor() {
  return { ...DEFAULTS };
}

// Lấy giá trị trạng thái của thửa theo field của 1 lớp.
// Ưu tiên meta thật; nếu trống → giá trị mặc định.
export function statusValue(feature, field) {
  const real = feature?.meta?.[field] ?? feature?.properties?.[field];
  if (real) return real;
  return DEFAULTS[field] ?? null;
}

// Thửa "tạm thời": CHƯA có dữ liệu meta thật cho field này
// (đang dùng giá trị mặc định). Dùng để tô viền nét đứt phân biệt với
// thửa đã có số liệu thật (ví dụ "Chưa bán" thật).
export function isProvisional(feature, field) {
  const real = feature?.meta?.[field] ?? feature?.properties?.[field];
  return !real;
}
