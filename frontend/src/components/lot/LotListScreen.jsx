import { useEffect, useMemo, useState } from 'react';
import { Search, Grid3x3, Maximize2 } from 'lucide-react';
import { LOTS, buildLots } from '../../data/lots';
import { ZONES, CELLS } from '../../data/cells';
import { useDbCells } from '../../hooks/useDbCells';
import { formatM2 } from '../../utils/format';
import LotShape from './LotShape';
import LotDetailPanel from './LotDetailPanel';
import EditLotModal from './EditLotModal';
import AreaBreakdownBar from './AreaBreakdownBar';

function LotCard({ lot, active, onClick, ready }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col overflow-hidden rounded-xl border bg-surface-1 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:shadow-focus active:translate-y-0 ${
        active
          ? 'border-accent-500 ring-1 ring-accent-500'
          : 'border-line hover:border-accent-500'
      }`}
    >
      {/* Mini-map */}
      <div className="flex items-center justify-center border-b border-line bg-surface-2 p-2">
        <LotShape lot={lot} width={232} height={128} loading={!ready} />
      </div>
      {/* Info */}
      <div className="flex flex-col gap-2 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-primary">Lô {lot.lotCode}</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
            {lot.zoneName}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            <Grid3x3 className="h-3.5 w-3.5" />
            {lot.cellCount} ô
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="tabular">{formatM2(lot.totalArea)}</span>
          </span>
        </div>
        {/* Diện tích theo tình trạng kinh doanh */}
        {ready ? (
          <AreaBreakdownBar layerId="business" data={lot.areaByBusiness} />
        ) : (
          <div className="h-2.5 w-full animate-pulse rounded-full bg-surface-2" />
        )}
      </div>
    </button>
  );
}

export default function LotListScreen({ showToast, onOpenCell }) {
  // Cells trộn dữ liệu thật từ DB (qua API). Backend tắt → CELLS tĩnh.
  // ready=false trong lúc chờ DB → mini-map hiện skeleton thay vì màu xám.
  const [cells, , ready] = useDbCells(CELLS);
  // Local copy of derived lots so edits persist within the session.
  const [lots, setLots] = useState(LOTS);

  // Khi cells (DB) tải xong → dựng lại lots để grid lấy màu/diện tích từ DB.
  // Bao gồm cả DCB09 (32 ô dựng grid từ DB qua useDbCells) → hiện thành lô
  // ở Khu B. Backend tắt → cells không có DCB09 nên lô này tự ẩn.
  useEffect(() => {
    setLots(buildLots(cells));
  }, [cells]);
  const [zone, setZone] = useState('all'); // 'all' | 'khu-a' | 'khu-b'
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lots.filter((l) => {
      if (zone !== 'all' && l.zoneId !== zone) return false;
      if (q && !l.lotCode.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lots, zone, query]);

  // Group filtered lots by zone (Khu A / Khu B) for sectioned display.
  const groups = useMemo(() => {
    const order = ZONES.map((z) => z.id);
    const map = new Map();
    for (const l of filtered) {
      if (!map.has(l.zoneId)) map.set(l.zoneId, []);
      map.get(l.zoneId).push(l);
    }
    return order
      .filter((id) => map.has(id))
      .map((id) => ({
        id,
        name: ZONES.find((z) => z.id === id)?.name ?? id,
        lots: map.get(id),
      }));
  }, [filtered]);

  const selected = lots.find((l) => l.id === selectedId) ?? null;

  const handleSave = (updated) => {
    setLots((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setEditing(null);
    showToast?.(`Đã cập nhật lô ${updated.lotCode}`);
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-app">
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-1 px-6 py-3">
          <div className="flex items-center gap-1 rounded-md bg-surface-2 p-0.5">
            {[{ id: 'all', name: 'Tất cả' }, ...ZONES].map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setZone(z.id)}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  zone === z.id
                    ? 'bg-white text-ink-primary shadow-sm'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                {z.name}
              </button>
            ))}
          </div>

          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã lô…"
              className="w-48 rounded-md border border-line bg-surface-1 py-1.5 pl-8 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent-500 focus:outline-none"
            />
          </div>

          <span className="text-sm text-ink-muted">{filtered.length} lô</span>
        </div>

        {/* Grouped cards */}
        <div className="flex-1 overflow-auto p-6">
          {groups.length === 0 ? (
            <p className="py-10 text-center text-ink-muted">Không có lô nào khớp bộ lọc.</p>
          ) : (
            <div className="space-y-8">
              {groups.map((g) => (
                <section key={g.id}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-primary">
                    {g.name}
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-normal text-ink-muted">
                      {g.lots.length} lô
                    </span>
                  </h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-4">
                    {g.lots.map((lot) => (
                      <LotCard
                        key={lot.id}
                        lot={lot}
                        active={lot.id === selectedId}
                        onClick={() => setSelectedId(lot.id)}
                        ready={ready}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Slide-out detail panel */}
      {selected && (
        <LotDetailPanel
          lot={selected}
          onClose={() => setSelectedId(null)}
          onEdit={(l) => setEditing(l)}
          onOpenCell={onOpenCell}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EditLotModal
          lot={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
