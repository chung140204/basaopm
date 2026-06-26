import { useEffect } from 'react';
import { AlertTriangle, RotateCw, Info } from 'lucide-react';

// Generic confirm dialog with two variants: "hide" and "restore".
export default function ConfirmDialog({ variant, project, onCancel, onConfirm }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const isHide = variant === 'hide';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-[440px] overflow-hidden rounded-lg bg-surface-1 p-6 shadow-xl">
        {/* Icon + title */}
        <div className="mb-3 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
              isHide ? 'bg-warning-bg' : 'bg-accent-100'
            }`}
          >
            {isHide ? (
              <AlertTriangle className="h-5 w-5 text-warning" />
            ) : (
              <RotateCw className="h-5 w-5 text-accent-600" />
            )}
          </div>
          <h2 id="confirm-title" className="text-lg font-semibold text-ink-primary">
            {isHide ? 'Ẩn dự án này?' : 'Khôi phục dự án?'}
          </h2>
        </div>

        {/* Context */}
        <p className="text-sm text-ink-secondary">
          Dự án:{' '}
          <span className="font-medium text-ink-primary">
            {project.tenHienThi}
          </span>{' '}
          ({project.id})
        </p>

        {isHide ? (
          <>
            <p className="mt-2 text-sm text-ink-secondary">
              Dự án sẽ được ẩn khỏi danh sách đang hoạt động.
            </p>
            {/* Info box — blue, emphasises data safety */}
            <div className="mt-3 rounded-md border border-info-bg bg-info-bg/60 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
                <div className="text-xs text-ink-secondary">
                  <p className="font-medium text-ink-primary">
                    Dữ liệu KHÔNG bị xóa
                  </p>
                  <ul className="mt-1.5 space-y-1 list-disc pl-4">
                    <li>Phân khu, Lô đất, Ô đất được giữ nguyên</li>
                    <li>Các giao dịch liên quan không thay đổi</li>
                    <li>Bạn có thể khôi phục bất kỳ lúc nào</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-secondary">
            Dự án sẽ xuất hiện lại trong danh sách đang hoạt động.
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-2"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
              isHide
                ? 'bg-warning hover:brightness-95'
                : 'bg-accent-600 hover:bg-accent-700'
            }`}
          >
            {isHide ? 'Ẩn dự án' : 'Khôi phục'}
          </button>
        </div>
      </div>
    </div>
  );
}
