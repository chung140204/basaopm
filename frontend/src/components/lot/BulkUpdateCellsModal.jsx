import { useState } from 'react';
import { X, Loader2, Layers } from 'lucide-react';
import { getLayer } from '../../lib/layers';

// Các nhóm trạng thái cho phép cập nhật hàng loạt.
// `layerId` → lấy nhãn + màu từ layers.js (một nguồn sự thật).
// `prop`    → tên field trên cell.properties (camelCase, FE).
// `apiKey`  → tên field backend (snake_case) khi gọi PUT /api/cells.
const FIELDS = [
  { layerId: 'business', prop: 'businessStatus', apiKey: 'business_status', label: 'Tình trạng kinh doanh' },
  { layerId: 'legal', prop: 'collateralStatus', apiKey: 'collateral_status', label: 'Pháp lý định danh' },
  { layerId: 'payment', prop: 'paymentStatus', apiKey: 'payment_status', label: 'Tình trạng thanh toán' },
];

/**
 * Modal cập nhật hàng loạt trạng thái cho nhiều ô con đã chọn.
 * @param {string[]} cellCodes  Mã các ô được chọn.
 * @param {Function} onClose    Đóng modal (không lưu).
 * @param {Function} onApply    async ({field, apiKey, value}) => void — thực thi cập nhật.
 */
export default function BulkUpdateCellsModal({ cellCodes, onClose, onApply }) {
  const [fieldProp, setFieldProp] = useState(FIELDS[1].prop); // mặc định: Pháp lý định danh
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const field = FIELDS.find((f) => f.prop === fieldProp);
  const statuses = getLayer(field.layerId).statuses;

  const submit = async () => {
    if (!value) return;
    setSaving(true);
    await onApply({ prop: field.prop, apiKey: field.apiKey, value });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-surface-1 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent-600" />
            <h3 className="text-sm font-semibold text-ink-primary">
              Cập nhật hàng loạt — {cellCodes.length} ô
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            disabled={saving}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 disabled:opacity-60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-4 py-4">
          {/* Chọn nhóm trạng thái */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Nhóm trạng thái
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FIELDS.map((f) => (
                <button
                  key={f.prop}
                  type="button"
                  onClick={() => {
                    setFieldProp(f.prop);
                    setValue('');
                  }}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    fieldProp === f.prop
                      ? 'border-accent-500 bg-accent-50 text-accent-700'
                      : 'border-line text-ink-secondary hover:bg-surface-2'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chọn giá trị mới */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Giá trị mới
            </label>
            <div className="space-y-1">
              {statuses.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    value === s.value
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-line hover:bg-surface-2'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulk-value"
                    value={s.value}
                    checked={value === s.value}
                    onChange={() => setValue(s.value)}
                    className="accent-accent-600"
                  />
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: s.fill }}
                  />
                  <span className="text-ink-primary">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="rounded-md bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
            Trạng thái mới sẽ được áp dụng cho tất cả {cellCodes.length} ô đã
            chọn và lưu xuống hệ thống.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-line p-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-md border border-line py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !value}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent-600 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Cập nhật {cellCodes.length} ô
          </button>
        </div>
      </div>
    </div>
  );
}
