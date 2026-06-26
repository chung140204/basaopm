import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed right-6 top-6 z-[60] flex items-center gap-3 rounded-lg border border-line bg-surface-1 px-4 py-3 shadow-md">
      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
      <span className="text-sm font-medium text-ink-primary">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Đóng thông báo"
        className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
