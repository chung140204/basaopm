import {
  LayoutDashboard,
  Map,
  LayoutGrid,
  Grid3x3,
  Settings,
  ChevronLeft,
} from 'lucide-react';

// Workspace navigation — shown only after a project is opened.
// "Quản lý theo ô" is a single entry that opens the cell list screen; the
// per-cell detail (with Pháp lý / Giao dịch tabs) lives inside that flow.
const ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'map', label: 'Bản đồ', icon: Map },
  { key: 'lot', label: 'Quản lý theo lô', icon: LayoutGrid },
  { key: 'cell', label: 'Quản lý theo ô', icon: Grid3x3 },
];

function NavItem({ item, active, onNavigate }) {
  const Icon = item.icon;
  const base =
    'group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors';
  if (active) {
    return (
      <div className={`${base} bg-white/10 font-medium text-white`} aria-current="page">
        <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-[3px] rounded-r bg-accent-500" />
        <Icon className="h-[18px] w-[18px] text-accent-500" />
        {item.label}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.key)}
      className={`${base} text-ink-muted hover:bg-sidebar-hover hover:text-white`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {item.label}
    </button>
  );
}

export default function Sidebar({ project, activeKey, onNavigate, onBack }) {
  return (
    <aside className="flex w-60 flex-shrink-0 flex-col bg-sidebar-bg">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-600 text-sm font-bold text-white">
          B
        </div>
        <span className="text-base font-semibold text-white">BasaoPM</span>
      </div>

      {/* Project context + back */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-sidebar-hover hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Tất cả dự án
        </button>
        <div className="rounded-md bg-white/5 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">
            Dự án
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-white">
            {project.tenHienThi}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {ITEMS.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            active={item.key === activeKey}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-sidebar-hover hover:text-white"
        >
          <Settings className="h-[18px] w-[18px]" />
          Cài đặt
        </button>
      </div>
    </aside>
  );
}
