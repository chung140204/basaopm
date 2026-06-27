// Lộ trình thanh toán: tự tính tổng đã thanh toán + còn lại từ lịch sử.

/**
 * @param {number} totalValue - giá trị phải thanh toán (tổng giá trị HĐ).
 * @param {Array<{amount:number}>} payments - lịch sử thanh toán thực tế.
 * @returns {{ total:number, paid:number, remaining:number, percent:number }}
 */
export function paymentProgress(totalValue, payments = []) {
  const total = Number(totalValue) || 0;
  const paid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.max(total - paid, 0);
  const percent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  return { total, paid, remaining, percent };
}

// Nhãn hình thức thanh toán.
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản' },
  { value: 'other', label: 'Khác' },
];

export function paymentMethodLabel(value) {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value ?? '—';
}

// Nhãn tình trạng thế chấp.
export const MORTGAGE_STATUS = [
  { value: 'mortgaged', label: 'Thế chấp' },
  { value: 'released', label: 'Giải chấp' },
];

export function mortgageStatusLabel(value) {
  return MORTGAGE_STATUS.find((m) => m.value === value)?.label ?? '—';
}

// Nhãn loại tổ chức tài chính.
export const LENDER_TYPES = [
  { value: 'bank', label: 'Ngân hàng' },
  { value: 'other', label: 'Đơn vị khác' },
];
