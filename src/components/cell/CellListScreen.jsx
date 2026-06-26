import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ZONES, zoneOfLot, zoneName } from '../../data/cells';
import { labelFor, getLayer } from '../map/layers';
import { formatM2, formatCurrency } from '../../utils/format';
import { useDbCells } from '../../hooks/useDbCells';
import CellDetailScreen from './CellDetailScreen';

function colorOf(layerId, value) {
  return getLayer(layerId).statuses.find((s) => s.value === value)?.fill ?? '#94A3B8';
}

function Dot({ layerId, value }) {
  return (
    <span
      className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
      style={{ backgroundColor: colorOf(layerId, value) }}
    />
  );
}

// Screen for "Quản lý theo ô": a filterable cell list. Clicking a row opens
// the full-screen cell detail (with Pháp lý / Giao dịch tabs).
export default function CellListScreen() {
  // Dữ liệu ô THẬT từ DB (DCB02 merge + DCB09 append) — cùng nguồn với Bản đồ.
  const [cells] = useDbCells();
  const [zone, setZone] = useState('all'); // 'all' | 'khu-a' | 'khu-b'
  const [lot, setLot] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Lot codes available for the current zone filter (for the dropdown).
  const lotOptions = useMemo(() => {
    const set = new Set(
      cells
        .filter((c) => zone === 'all' || zoneOfLot(c.properties.lotCode) === zone)
        .map((c) => c.properties.lotCode)
    );
    return [...set].sort();
  }, [zone, cells]);

  const rows = useMemo(() => {
    // Chuẩn hoá: bỏ dấu chấm + khoảng trắng, hạ chữ thường. Nhờ vậy gõ
    // "DC.A14", "DCA14", "dc a14" đều khớp; mã lô có/không dấu chấm đều trúng.
    const norm = (s) => (s ?? '').toLowerCase().replace(/[.\s]/g, '');
    const q = norm(query);
    return cells.filter((c) => {
      const p = c.properties;
      if (zone !== 'all' && zoneOfLot(p.lotCode) !== zone) return false;
      if (lot !== 'all' && p.lotCode !== lot) return false;
      if (!q) return true;
      // Khớp theo mã ô hoặc mã lô (đã chuẩn hoá bỏ chấm/khoảng trắng).
      const hay = `${norm(p.cellCode)} ${norm(p.lotCode)}`;
      return hay.includes(q);
    });
  }, [zone, lot, query, cells]);

  const selected = cells.find((c) => c.id === selectedId) ?? null;

  // When a cell is picked, the detail takes over the whole content area.
  if (selected) {
    return (
      <CellDetailScreen feature={selected} onBack={() => setSelectedId(null)} />
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-app">
      {/* List + filters */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-1 px-6 py-3">
          <div className="flex items-center gap-1 rounded-md bg-surface-2 p-0.5">
            {[{ id: 'all', name: 'Tất cả' }, ...ZONES].map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => {
                  setZone(z.id);
                  setLot('all');
                }}
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

          {/* Lọc theo mã lô */}
          <select
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            className="rounded-md border border-line bg-surface-1 px-3 py-1.5 text-sm text-ink-primary focus:border-accent-500 focus:outline-none"
          >
            <option value="all">Tất cả lô</option>
            {lotOptions.map((code) => (
              <option key={code} value={code}>
                Lô {code}
              </option>
            ))}
          </select>

          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã ô / mã lô…"
              className="w-56 rounded-md border border-line bg-surface-1 py-1.5 pl-8 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent-500 focus:outline-none"
            />
          </div>

          <span className="text-sm text-ink-muted">{rows.length} ô</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-hidden rounded-lg border border-line bg-surface-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2.5 font-semibold">Mã ô</th>
                  <th className="px-4 py-2.5 font-semibold">Mã lô</th>
                  <th className="px-4 py-2.5 font-semibold">Phân khu</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Diện tích</th>
                  <th className="px-4 py-2.5 font-semibold">Kinh doanh</th>
                  <th className="px-4 py-2.5 font-semibold">Pháp lý</th>
                  <th className="px-4 py-2.5 font-semibold">Thanh toán</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Giá trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-ink-muted">
                      Không có ô nào khớp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => {
                    const p = c.properties;
                    const active = c.id === selectedId;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`cursor-pointer transition-colors ${
                          active ? 'bg-accent-50' : 'hover:bg-surface-2'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-medium text-ink-primary">
                          {p.cellCode}
                        </td>
                        <td className="px-4 py-2.5 text-ink-secondary">{p.lotCode}</td>
                        <td className="px-4 py-2.5 text-ink-secondary">
                          {zoneName(zoneOfLot(p.lotCode))}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-secondary">
                          {formatM2(p.area)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1.5 text-ink-secondary">
                            <Dot layerId="business" value={p.businessStatus} />
                            {labelFor('business', p.businessStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1.5 text-ink-secondary">
                            <Dot layerId="legal" value={p.collateralStatus} />
                            {labelFor('legal', p.collateralStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1.5 text-ink-secondary">
                            <Dot layerId="payment" value={p.paymentStatus} />
                            {labelFor('payment', p.paymentStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-secondary">
                          {formatCurrency(p.value)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
