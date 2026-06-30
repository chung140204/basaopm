import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Shield, Menu } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

// Chữ cái đầu cho avatar (tối đa 2 ký tự).
function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Topbar({ title = 'Quản lý dự án', onMenuClick }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);

  const name = user?.fullName || user?.email || 'Người dùng';

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-line bg-surface-1 px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Mở menu"
          className="-ml-1 rounded-md p-2 text-ink-secondary hover:bg-surface-2 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-sm font-medium text-ink-secondary">{title}</h1>
      </div>

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

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-surface-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
              {initials(name)}
            </div>
            <div className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-ink-primary">
                {name}
              </span>
              <span className="block text-[11px] leading-tight text-ink-muted">
                {user?.roleLabel ?? user?.role}
              </span>
            </div>
          </button>

          {open && (
            <div className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-lg border border-line bg-surface-1 shadow-md">
              <div className="border-b border-line px-4 py-3">
                <p className="truncate text-sm font-medium text-ink-primary">
                  {name}
                </p>
                <p className="truncate text-xs text-ink-muted">{user?.email}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-bg px-2 py-0.5 text-[11px] font-medium text-violet">
                  <Shield className="h-3 w-3" />
                  {user?.roleLabel ?? user?.role}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger-bg"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
