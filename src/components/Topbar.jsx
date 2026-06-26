import { Bell } from 'lucide-react';

export default function Topbar({ title = 'Quản lý dự án' }) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-line bg-surface-1 px-6">
      <h1 className="truncate text-sm font-medium text-ink-secondary">
        {title}
      </h1>

      <div className="flex flex-shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="Thông báo"
          className="relative rounded-md p-2 text-ink-secondary transition-colors hover:bg-surface-2 focus:outline-none focus:shadow-focus"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            3
          </span>
        </button>

        <div className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
            NA
          </div>
          <span className="text-sm font-medium text-ink-primary">Nguyễn A</span>
        </div>
      </div>
    </header>
  );
}
