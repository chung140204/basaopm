import { getLayer } from '../map/layers';
import { formatM2 } from '../../utils/format';

// Horizontal stacked bar showing area distribution by status, for a given
// layer (business / legal / payment). `data` is { statusValue: areaM2 }.
export default function AreaBreakdownBar({ layerId, data, label }) {
  const layer = getLayer(layerId);
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;

  // Keep status order from layers.js; only show segments with area.
  const segments = layer.statuses
    .map((s) => ({ ...s, area: data[s.value] ?? 0 }))
    .filter((s) => s.area > 0);

  return (
    <div>
      {label && (
        <p className="mb-1 text-[11px] font-medium text-ink-muted">{label}</p>
      )}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        {segments.map((s) => (
          <div
            key={s.value}
            className="h-full"
            style={{ width: `${(s.area / total) * 100}%`, backgroundColor: s.fill }}
            title={`${s.label}: ${formatM2(s.area)}`}
          />
        ))}
      </div>
    </div>
  );
}

// Legend + numbers list version, for the detail panel.
export function AreaBreakdownList({ layerId, data }) {
  const layer = getLayer(layerId);
  const segments = layer.statuses
    .map((s) => ({ ...s, area: data[s.value] ?? 0 }))
    .filter((s) => s.area > 0);

  if (segments.length === 0) {
    return <p className="text-sm text-ink-muted">— chưa có —</p>;
  }

  return (
    <ul className="space-y-1">
      {segments.map((s) => (
        <li key={s.value} className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 text-ink-secondary">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: s.fill }}
            />
            {s.label}
          </span>
          <span className="tabular font-medium text-ink-primary">{formatM2(s.area)}</span>
        </li>
      ))}
    </ul>
  );
}
