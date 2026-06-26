import { useMemo, useState } from 'react';
import { Search, MapPin, Square, Crosshair } from 'lucide-react';

// Detect what the user typed: lot code, cell code, or "x, y" coordinates.
function classify(q) {
  const t = q.trim();
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t)) return 'coord';
  // Cell code looks like A-12-05 (3 segments); lot code like A-12 (2 segments).
  const segs = t.split('-').filter(Boolean);
  if (segs.length >= 3) return 'cell';
  if (segs.length === 2) return 'lot';
  return 'text';
}

export default function SearchBar({ features, onPickCell, onPickLot, onPickCoord }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return { kind: 'empty', items: [] };
    const kind = classify(q);

    if (kind === 'coord') {
      const [x, y] = q.split(',').map((n) => parseFloat(n));
      return { kind: 'coord', coord: [x, y] };
    }

    // Match lots
    const lots = [
      ...new Set(
        features
          .filter((f) => f.properties.lotCode.toLowerCase().includes(t))
          .map((f) => f.properties.lotCode)
      ),
    ].slice(0, 4);

    // Match cells
    const cells = features
      .filter((f) => f.properties.cellCode.toLowerCase().includes(t))
      .slice(0, 6);

    return { kind: 'list', lots, cells };
  }, [q, features]);

  const cellCountForLot = (lot) =>
    features.filter((f) => f.properties.lotCode === lot).length;

  const handlePickCell = (f) => {
    setQ(f.properties.cellCode);
    setFocused(false);
    onPickCell(f.id);
  };
  const handlePickLot = (lot) => {
    setQ(lot);
    setFocused(false);
    onPickLot(lot);
  };
  const handlePickCoord = (coord) => {
    setFocused(false);
    onPickCoord(coord);
  };

  const showDropdown = focused && q.trim().length > 0;
  const noResult =
    results.kind === 'list' &&
    results.lots.length === 0 &&
    results.cells.length === 0;

  return (
    <div className="pointer-events-auto relative w-80">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Mã lô (A-12), mã ô (A-12-05) hoặc tọa độ"
          className="w-full rounded-md border border-line bg-surface-1 py-2 pl-9 pr-3 text-sm text-ink-primary shadow-md placeholder:text-ink-muted focus:border-accent-500 focus:outline-none focus:shadow-focus"
          aria-label="Tra cứu lô / ô đất"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-md border border-line bg-surface-1 py-1 shadow-md">
          {results.kind === 'coord' && (
            <button
              type="button"
              onClick={() => handlePickCoord(results.coord)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              <Crosshair className="h-4 w-4 text-info" />
              <span className="text-ink-secondary">
                Tọa độ {results.coord[0]}, {results.coord[1]} — tìm ô gần nhất
              </span>
            </button>
          )}

          {results.kind === 'list' && (
            <>
              {results.lots.map((lot) => (
                <button
                  key={lot}
                  type="button"
                  onClick={() => handlePickLot(lot)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <MapPin className="h-4 w-4 text-accent-600" />
                  <span className="font-medium text-ink-primary">Lô {lot}</span>
                  <span className="ml-auto text-xs text-ink-muted">
                    {cellCountForLot(lot)} ô
                  </span>
                </button>
              ))}
              {results.cells.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handlePickCell(f)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <Square className="h-4 w-4 text-ink-muted" />
                  <span className="font-medium text-ink-primary">
                    {f.properties.cellCode}
                  </span>
                  <span className="ml-auto text-xs text-ink-muted tabular">
                    {f.properties.area} m²
                  </span>
                </button>
              ))}
              {noResult && (
                <div className="px-3 py-3 text-sm text-ink-muted">
                  Không tìm thấy đối tượng khớp «{q.trim()}»
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
