import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

// Lightweight confirm dialog for discarding unsaved cell edits.
export default function DiscardDialog({ onCancel, onConfirm }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-title"
    >
      <div className="w-full max-w-[420px] overflow-hidden rounded-lg bg-surface-1 p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-warning-bg">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <h2 id="discard-title" className="text-lg font-semibold text-ink-primary">
            Bỏ thay đổi chưa lưu?
          </h2>
        </div>
        <p className="text-sm text-ink-secondary">
          Bạn có thay đổi chưa được lưu. Thoát mà không lưu các chỉnh sửa?
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2"
          >
            Ở lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-warning px-4 py-2 text-sm font-medium text-white hover:brightness-95"
          >
            Thoát không lưu
          </button>
        </div>
      </div>
    </div>
  );
}
