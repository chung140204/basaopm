import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Columns3, Check } from 'lucide-react';
import { ZONES, zoneOfCell, zoneName } from '../../data/cells';
import { useDbCells, normCellCode } from '../../hooks/useDbCells';
import usePersistentState from '../../utils/usePersistentState';
import { CELL_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from './cellColumns';
import CellDetailScreen from './CellDetailScreen';

// Panel chọn cột hiển thị (checkbox). Đóng khi click ra ngoài.
function ColumnPicker({ visible, onToggle }) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-line bg-surface-1 px-3 py-1.5 text-sm font-medium text-ink-secondary hover:bg-surface-2"
      >
        <Columns3 className="h-4 w-4" />
        Cột hiển thị
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 max-h-[70vh] w-60 overflow-auto rounded-lg border border-line bg-surface-1 p-1.5 shadow-lg">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Chọn cột hiển thị
          </p>
          {CELL_COLUMNS.map((col) => {
            const on = visible.includes(col.key);
            return (
              <button
                key={col.key}
                type="button"
                disabled={col.locked}
                onClick={() => onToggle(col.key)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  col.locked
                    ? 'cursor-default text-ink-muted'
                    : 'text-ink-primary hover:bg-surface-2'
                }`}
              >
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                    on
                      ? 'border-accent-600 bg-accent-600 text-white'
                      : 'border-line bg-surface-1'
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                {col.label}
                {col.locked && <span className="ml-auto text-[10px]">cố định</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Tra cột theo key → tái dùng col.render(p) cho card mobile (dot màu nhất quán
// với table). Card cố định các trường chính, không phụ thuộc column picker.
const COL_BY_KEY = Object.fromEntries(CELL_COLUMNS.map((c) => [c.key, c]));
const MOBILE_CARD_FIELDS = [
  'area',
  'value',
  'businessStatus',
  'collateralStatus',
  'paymentStatus',
];

// 1 trường trong card mobile: nhãn nhỏ + giá trị (render từ CELL_COLUMNS).
function CardField({ colKey, p }) {
  const col = COL_BY_KEY[colKey];
  if (!col) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-ink-muted">
        {col.label}
      </span>
      <span className="text-ink-secondary">{col.render(p)}</span>
    </div>
  );
}

// Thẻ ô cho mobile (thay hàng bảng). Click → mở chi tiết như khi bấm hàng.
function MobileCellCard({ cell, active, onClick }) {
  const p = cell.properties;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col gap-2 rounded-lg border p-3 text-left shadow-sm transition-colors ${
        active
          ? 'border-accent-200 bg-accent-50'
          : 'border-line bg-surface-1 hover:bg-surface-2'
      }`}
    >
      {/* Hàng đầu: Mã ô (đậm) + Mã lô */}
      <div className="flex items-center justify-between gap-2">
        {COL_BY_KEY.cellCode.render(p)}
        <span className="text-xs text-ink-muted">{p.lotCode ?? '—'}</span>
      </div>
      {/* Các trường chính dạng lưới 2 cột */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {MOBILE_CARD_FIELDS.map((k) => (
          <CardField key={k} colKey={k} p={p} />
        ))}
      </div>
    </button>
  );
}

// Screen for "Quản lý theo ô": a filterable cell list. Clicking a row opens
// the full-screen cell detail (with Pháp lý / Giao dịch tabs).
export default function CellListScreen({ initialCellCode, onConsumeInitial }) {
  // Dữ liệu ô THẬT từ DB (DCB02 merge + DCB09 append) — cùng nguồn với Bản đồ.
  const [cells] = useDbCells();
  const [zone, setZone] = useState('all'); // 'all' | 'khu-a' | 'khu-b'
  const [lot, setLot] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  // Cột hiển thị (key list) — lưu localStorage, nhớ sau F5.
  const [visibleCols, setVisibleCols] = usePersistentState(
    'bpm.cellCols',
    DEFAULT_VISIBLE_COLUMNS
  );
  const toggleCol = (key) =>
    setVisibleCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  // Cột đang bật, GIỮ đúng thứ tự định nghĩa trong CELL_COLUMNS.
  const shownColumns = CELL_COLUMNS.filter(
    (c) => c.locked || visibleCols.includes(c.key)
  );

  // Deep link từ panel lô: mở sẵn chi tiết ô theo mã (one-shot). Chờ cells có
  // mặt rồi khớp theo mã chuẩn hoá ('DCB02-1' ↔ 'DCB02-01'), sau đó tiêu thụ.
  useEffect(() => {
    if (!initialCellCode) return;
    const target = normCellCode(initialCellCode);
    const hit = cells.find(
      (c) => normCellCode(c.properties.cellCode) === target
    );
    if (hit) {
      setSelectedId(hit.id);
      onConsumeInitial?.();
    }
  }, [initialCellCode, cells, onConsumeInitial]);

  // Lot codes available for the current zone filter (for the dropdown).
  const lotOptions = useMemo(() => {
    const set = new Set(
      cells
        .filter((c) => zone === 'all' || zoneOfCell(c.properties) === zone)
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
      if (zone !== 'all' && zoneOfCell(p) !== zone) return false;
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
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-1 px-4 py-3 md:px-6">
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

          <div className="relative w-full sm:ml-auto sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã ô / mã lô…"
              className="w-full rounded-md border border-line bg-surface-1 py-1.5 pl-8 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent-500 focus:outline-none"
            />
          </div>

          {/* Cột tuỳ biến — chỉ áp cho table desktop; card mobile cố định trường */}
          <div className="hidden md:block">
            <ColumnPicker visible={visibleCols} onToggle={toggleCol} />
          </div>

          <span className="text-sm text-ink-muted">{rows.length} ô</span>
        </div>

        {/* List: card trên mobile, table trên desktop */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Card list — chỉ mobile (<md) */}
          <div className="space-y-3 md:hidden">
            {rows.length === 0 ? (
              <p className="py-10 text-center text-ink-muted">
                Không có ô nào khớp bộ lọc.
              </p>
            ) : (
              rows.map((c) => (
                <MobileCellCard
                  key={c.id}
                  cell={c}
                  active={c.id === selectedId}
                  onClick={() => setSelectedId(c.id)}
                />
              ))
            )}
          </div>

          {/* Table — chỉ desktop (md+) */}
          <div className="hidden overflow-hidden rounded-lg border border-line bg-surface-1 md:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-muted">
                  {shownColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`whitespace-nowrap px-4 py-2.5 font-semibold ${
                        col.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={shownColumns.length}
                      className="px-4 py-10 text-center text-ink-muted"
                    >
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
                        {shownColumns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-2.5 text-ink-secondary ${
                              col.align === 'right' ? 'text-right' : ''
                            }`}
                          >
                            {col.render(p)}
                          </td>
                        ))}
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
