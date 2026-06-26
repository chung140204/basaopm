import { useEffect, useState } from 'react';
import { X, Info } from 'lucide-react';

// Edit a lot's management fields: mã lô, mô tả, ghi chú.
// Area / child cells / shape are derived from cells → read-only.
export default function EditLotModal({ lot, onClose, onSave }) {
  const [lotCode, setLotCode] = useState(lot.lotCode);
  const [description, setDescription] = useState(lot.description ?? '');
  const [note, setNote] = useState(lot.note ?? '');
  const [touched, setTouched] = useState(false);

  const codeError = lotCode.trim() === '';

  const isDirty =
    lotCode !== lot.lotCode ||
    description !== (lot.description ?? '') ||
    note !== (lot.note ?? '');

  const canSave = isDirty && !codeError;

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = () => {
    setTouched(true);
    if (!canSave) return;
    onSave({ ...lot, lotCode: lotCode.trim(), description, note });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-lot-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-lg bg-surface-1 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id="edit-lot-title" className="text-lg font-semibold text-ink-primary">
              Cập nhật lô {lot.lotCode}
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              {lot.zoneName} · {lot.cellCount} ô con
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-2 rounded-md bg-info-bg/60 p-3 text-xs text-ink-secondary">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
            <span>
              Diện tích, số ô con và hình dáng lô được tổng hợp tự động từ các ô
              đất con — không sửa trực tiếp tại đây.
            </span>
          </div>

          {/* Mã lô */}
          <div>
            <label htmlFor="lot-code" className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Mã lô <span className="text-danger">*</span>
            </label>
            <input
              id="lot-code"
              type="text"
              value={lotCode}
              onChange={(e) => setLotCode(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm text-ink-primary focus:outline-none focus:shadow-focus ${
                touched && codeError
                  ? 'border-danger'
                  : 'border-line focus:border-accent-500'
              }`}
            />
            {touched && codeError && (
              <p className="mt-1 text-xs text-danger">Mã lô không được để trống</p>
            )}
          </div>

          {/* Mô tả */}
          <div>
            <label htmlFor="lot-desc" className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Mô tả
            </label>
            <textarea
              id="lot-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả lô đất…"
              className="w-full resize-none rounded-md border border-line px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent-500 focus:outline-none focus:shadow-focus"
            />
          </div>

          {/* Ghi chú quản lý */}
          <div>
            <label htmlFor="lot-note" className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Ghi chú quản lý
            </label>
            <textarea
              id="lot-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú nội bộ…"
              className="w-full resize-none rounded-md border border-line px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent-500 focus:outline-none focus:shadow-focus"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
