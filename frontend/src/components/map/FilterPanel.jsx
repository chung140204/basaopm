import { useState } from 'react';
import { X, Pin, ChevronDown, RotateCcw } from 'lucide-react';
import { LAYERS } from '../../lib/layers';
import { SUBDIVISIONS } from '../../data/cells';
import { formatInteger } from '../../utils/format';
import ResponsiveSidePanel from '../common/ResponsiveSidePanel';

// Filter groups derive from layer definitions (business/legal/payment) plus
// subdivision. Each group is multi-select. All-selected within a group = no
// constraint. Within a group OR; across groups AND.
const GROUPS = [
  {
    key: 'subdivisionId',
    label: 'Phân khu',
    options: SUBDIVISIONS.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.lotCount} lô)`,
    })),
  },
  ...['business', 'legal', 'payment'].map((id) => {
    const layer = LAYERS.find((l) => l.id === id);
    return {
      key: layer.field,
      label: layer.label,
      options: layer.statuses.map((s) => ({ value: s.value, label: s.label })),
    };
  }),
];

function Group({ group, selected, onToggle }) {
  const [open, setOpen] = useState(true);
  const chosen = group.options.filter((o) => selected.has(o.value)).length;
  const total = group.options.length;

  return (
    <div className="border-b border-line py-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-1 text-left"
      >
        <span className="text-sm font-medium text-ink-secondary">
          {group.label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-ink-muted">
            {chosen}/{total}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-ink-muted transition-transform ${
              open ? '' : '-rotate-90'
            }`}
          />
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {group.options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2.5 px-1 py-0.5 text-sm text-ink-secondary"
            >
              <input
                type="checkbox"
                checked={selected.has(o.value)}
                onChange={() => onToggle(group.key, o.value)}
                className="h-4 w-4 rounded border-line text-accent-600 focus:ring-accent-500"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterPanel({
  filters,
  onToggle,
  onReset,
  hideUnmatched,
  onToggleHide,
  matchCount,
  total,
  pinned,
  onTogglePin,
  onClose,
}) {
  return (
    <ResponsiveSidePanel onClose={onClose} widthClass="md:w-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-sm font-semibold text-ink-primary">
          Bộ lọc ô đất
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onTogglePin}
            aria-label={pinned ? 'Bỏ ghim' : 'Ghim'}
            title={pinned ? 'Bỏ ghim' : 'Ghim panel'}
            className={`rounded-md p-1.5 hover:bg-surface-2 ${
              pinned ? 'text-accent-600' : 'text-ink-muted'
            }`}
          >
            <Pin className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-3">
        {GROUPS.map((g) => (
          <Group
            key={g.key}
            group={g}
            selected={filters[g.key]}
            onToggle={onToggle}
          />
        ))}

        <label className="flex cursor-pointer items-center gap-2.5 px-1 py-3 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={hideUnmatched}
            onChange={onToggleHide}
            className="h-4 w-4 rounded border-line text-accent-600 focus:ring-accent-500"
          />
          Ẩn hẳn ô không khớp
        </label>
      </div>

      {/* Footer */}
      <div className="border-t border-line p-3">
        <div className="mb-2 rounded-md bg-surface-2 px-3 py-2 text-center text-sm">
          <span className="text-ink-muted">Khớp: </span>
          <span className="font-semibold text-ink-primary tabular">
            {formatInteger(matchCount)}
          </span>
          <span className="text-ink-muted"> / {formatInteger(total)} ô</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-line py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2"
        >
          <RotateCcw className="h-4 w-4" />
          Đặt lại bộ lọc
        </button>
      </div>
    </ResponsiveSidePanel>
  );
}

// Expose group definitions so the screen can initialise "all selected" state.
export { GROUPS };
