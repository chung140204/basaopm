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

// Suy ra trạng thái từng đợt thanh toán (DB không lưu cột này).
// Cộng dồn số tiền theo thứ tự đợt:
//   - Đợt đầu tiên               → 'deposit'  (Đặt cọc)
//   - Đợt làm tổng tích lũy ĐỦ   → 'done'     (Hoàn tất)
//   - Còn lại                    → 'partial'  (Thanh toán một phần)
// Trả về mảng cùng độ dài payments, mỗi phần tử { key, label }.
export function derivePaymentStages(payments = [], totalDue = 0) {
  let cumulative = 0;
  return (payments || []).map((p, i) => {
    cumulative += Number(p.amount) || 0;
    if (i === 0) return { key: 'deposit', label: 'Đặt cọc' };
    if (totalDue > 0 && cumulative >= totalDue)
      return { key: 'done', label: 'Hoàn tất' };
    return { key: 'partial', label: 'Thanh toán một phần' };
  });
}

// Lớp màu Tailwind cho badge trạng thái đợt.
export const PAYMENT_STAGE_TONE = {
  deposit: 'bg-surface-2 text-ink-secondary',
  partial: 'bg-success-bg text-success',
  done: 'bg-success text-white',
};

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
