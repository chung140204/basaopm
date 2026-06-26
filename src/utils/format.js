// Vietnamese number / date formatting helpers.

const nfInteger = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const nfArea = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const nfArea1 = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nfDecimal1 = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 1240 -> "1.240" */
export function formatInteger(value) {
  return nfInteger.format(value ?? 0);
}

/** 113775.9 -> "113.775,9" (square metres, 1 decimal) */
export function formatSqm(value) {
  return nfArea1.format(value ?? 0);
}

/** 59.3 -> "59,3%" */
export function formatPercent(value) {
  return `${nfDecimal1.format(value ?? 0)}%`;
}

/** 239.6 -> "239,6 tỷ" */
export function formatTy(value) {
  return `${nfDecimal1.format(value ?? 0)} tỷ`;
}

/** 125.4 -> "125,40 ha" */
export function formatArea(value) {
  return `${nfArea.format(value ?? 0)} ha`;
}

/** "2022-03" -> "03/2022" */
export function formatMonthYear(value) {
  if (!value) return '—';
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  return `${month}/${year}`;
}

/** 191858 -> "191.858 m²" */
export function formatM2(value) {
  if (value == null) return '—';
  return `${nfInteger.format(value)} m²`;
}

/** 2350000000 -> "2.350.000.000 đ" */
export function formatCurrency(value) {
  if (value == null) return '—';
  return `${nfInteger.format(value)} đ`;
}

/** "2019-03-12" -> "12/03/2019" */
export function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

/**
 * Combined area label.
 * - If dienTichM2 present: "191.858 m² (~19,19 ha)"
 * - Otherwise: "125,40 ha"
 */
export function formatAreaFull(project) {
  if (project.dienTichM2 != null) {
    return `${formatM2(project.dienTichM2)} (~${nfArea.format(
      project.tongDienTichHa
    )} ha)`;
  }
  return formatArea(project.tongDienTichHa);
}
