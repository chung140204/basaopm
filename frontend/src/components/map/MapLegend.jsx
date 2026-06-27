import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getLayer, getStatusForFeature } from '../../lib/layers';
import { formatInteger } from '../../utils/format';

// Legend bound to the active layer. Counts are computed from the currently
// filtered features so they stay in sync with the map.
export default function MapLegend({ activeLayerId, features }) {
  const [open, setOpen] = useState(true);
  const layer = getLayer(activeLayerId);

  // Count features per status value.
  const counts = {};
  for (const f of features) {
    const status = getStatusForFeature(layer, f);
    const value = f.properties[layer.field];
    counts[value] = (counts[value] ?? 0) + 1;
    void status;
  }

  return (
    <div className="pointer-events-auto w-64 overflow-hidden rounded-md border border-line bg-surface-1 shadow-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Chú giải · {layer.label}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-ink-muted" />
        ) : (
          <ChevronUp className="h-4 w-4 text-ink-muted" />
        )}
      </button>

      {open && (
        <div className="space-y-1.5 border-t border-line px-3 py-2.5">
          {layer.statuses.map((s) => (
            <div key={s.value} className="flex items-center gap-2 text-sm">
              <span
                className="h-3.5 w-3.5 flex-shrink-0 rounded-sm border"
                style={{ backgroundColor: s.fill, borderColor: s.stroke }}
              />
              <span className="flex-1 truncate text-ink-secondary" title={s.label}>
                {s.label}
              </span>
              <span className="tabular text-xs font-medium text-ink-muted">
                {formatInteger(counts[s.value] ?? 0)}
              </span>
            </div>
          ))}

          {/* Thửa tạm thời: chưa có dữ liệu meta thật → viền nét đứt amber. */}
          <div className="mt-1.5 flex items-center gap-2 border-t border-line pt-2 text-sm">
            <span
              className="h-3.5 w-3.5 flex-shrink-0 rounded-sm border-2 border-dashed bg-transparent"
              style={{ borderColor: '#D97706' }}
            />
            <span
              className="flex-1 truncate text-ink-secondary"
              title="Thửa chưa có dữ liệu — trạng thái tạm thời"
            >
              Tạm thời (chưa có dữ liệu)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
