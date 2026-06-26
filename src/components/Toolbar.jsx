import { Search, RotateCcw, Table2, LayoutGrid } from 'lucide-react';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'visible', label: 'Đang hiển thị' },
  { key: 'hidden', label: 'Đã ẩn' },
];

export default function Toolbar({
  searchValue,
  onSearchChange,
  filter,
  onFilterChange,
  onRefresh,
  view,
  onViewChange,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-1 p-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo tên / vị trí dự án..."
          className="w-full rounded-md border border-line bg-surface-1 py-2 pl-9 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent-500 focus:outline-none focus:shadow-focus"
          aria-label="Tìm kiếm dự án"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Segmented filter */}
        <div className="inline-flex rounded-md border border-line bg-surface-2 p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={`rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-surface-1 text-accent-700 shadow-sm'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* View toggle: table / card */}
        <div className="inline-flex rounded-md border border-line bg-surface-2 p-0.5">
          <button
            type="button"
            onClick={() => onViewChange('table')}
            aria-label="Xem dạng bảng"
            title="Xem dạng bảng"
            aria-pressed={view === 'table'}
            className={`rounded-[6px] p-1.5 transition-colors ${
              view === 'table'
                ? 'bg-surface-1 text-accent-700 shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Table2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('card')}
            aria-label="Xem dạng thẻ"
            title="Xem dạng thẻ"
            aria-pressed={view === 'card'}
            className={`rounded-[6px] p-1.5 transition-colors ${
              view === 'card'
                ? 'bg-surface-1 text-accent-700 shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Làm mới dữ liệu"
          title="Làm mới dữ liệu"
          className="rounded-md border border-line p-2 text-ink-secondary transition-colors hover:bg-surface-2 focus:outline-none focus:shadow-focus"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
