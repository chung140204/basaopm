import { useEffect, useRef, useState } from 'react';
import { Search, Square, Crosshair, Loader2, MapPin } from 'lucide-react';
import { searchRanhThua, getLoGeoJSON } from '../../services/planningApi';

// Nhận diện input: "lat, lng" (tọa độ) hay text (số thửa / mã ô).
function isCoord(t) {
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t.trim());
}

// Mã lô của 1 feature lô backend (ưu tiên meta.loCode, fallback #id).
function loLabel(f) {
  return f.properties?.meta?.loCode || `Lô #${f.id}`;
}

/**
 * Thanh tra cứu ranh thửa (PostGIS):
 *  - Gõ tọa độ "lat, lng" → tìm thửa chứa điểm (point-in-polygon).
 *  - Gõ mã lô → lọc danh sách lô (backend /api/lo/geojson).
 *  - Gõ số thửa / mã ô → search backend.
 * Chọn lô → onPickLot(feature) để zoom + click vào lô (mở panel lô).
 */
export default function RanhThuaSearch({
  onPickCoord,
  onPickPlot,
  onPickLot,
  layerId,
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // Toàn bộ lô của layer hiện tại (tải 1 lần / layer để lọc cục bộ).
  const allLotsRef = useRef([]);

  const coordMode = isCoord(q);

  // Tải danh sách lô của layer đang xem để tìm kiếm cục bộ.
  useEffect(() => {
    let cancelled = false;
    allLotsRef.current = [];
    getLoGeoJSON(layerId).then((geojson) => {
      if (cancelled) return;
      allLotsRef.current = geojson?.features ?? [];
    });
    return () => {
      cancelled = true;
    };
  }, [layerId]);

  // Lọc lô theo mã lô (meta.loCode), tối đa 5 kết quả.
  const matchLots = (value) => {
    const t = value.trim().toLowerCase();
    if (!t) return [];
    return allLotsRef.current
      .filter((f) => loLabel(f).toLowerCase().includes(t))
      .slice(0, 5);
  };

  const runSearch = async (value) => {
    setQ(value);
    if (!value.trim() || isCoord(value)) {
      setResults([]);
      setLots([]);
      return;
    }
    // Lọc lô ngay (cục bộ, đồng bộ).
    setLots(matchLots(value));
    setOpen(true);
    setLoading(true);
    const r = await searchRanhThua(value);
    setLoading(false);
    setResults(r);
  };

  const submitCoord = () => {
    const [lat, lng] = q.split(',').map((n) => parseFloat(n));
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      onPickCoord({ lat, lng });
      setOpen(false);
    }
  };

  const pick = (item) => {
    setQ(item.meta?.cellCode || item.properties?.So_thua || `#${item.id}`);
    setOpen(false);
    onPickPlot(item);
  };

  const pickLot = (lot) => {
    setQ(loLabel(lot));
    setOpen(false);
    onPickLot?.(lot);
  };

  const showDropdown = open && q.trim().length > 0;

  return (
    <div className="pointer-events-auto relative w-80">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={q}
          onChange={(e) => runSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => e.key === 'Enter' && coordMode && submitCoord()}
          placeholder="Lô, số thửa, mã ô, hoặc tọa độ (lat, lng)"
          className="w-full rounded-md border border-line bg-surface-1 py-2 pl-9 pr-3 text-sm text-ink-primary shadow-md placeholder:text-ink-muted focus:border-accent-500 focus:outline-none focus:shadow-focus"
          aria-label="Tra cứu ranh thửa"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-accent-600" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 top-full z-[30] mt-1 w-full overflow-hidden rounded-md border border-line bg-surface-1 py-1 shadow-md">
          {coordMode ? (
            <button
              type="button"
              onClick={submitCoord}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              <Crosshair className="h-4 w-4 text-info" />
              <span className="text-ink-secondary">
                Tìm thửa tại tọa độ {q.trim()}
              </span>
            </button>
          ) : lots.length > 0 || results.length > 0 ? (
            <>
              {/* Nhóm Lô */}
              {lots.length > 0 && (
                <>
                  <div className="px-3 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Lô
                  </div>
                  {lots.map((lot) => (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() => pickLot(lot)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2"
                    >
                      <MapPin className="h-4 w-4 text-accent-600" />
                      <span className="font-medium text-ink-primary">
                        {loLabel(lot)}
                      </span>
                      {lot.properties?.cellCount != null && (
                        <span className="ml-auto text-xs text-ink-muted">
                          {lot.properties.cellCount} ô
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* Nhóm Thửa / Ô */}
              {results.length > 0 && (
                <>
                  {lots.length > 0 && (
                    <div className="px-3 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                      Thửa / Ô
                    </div>
                  )}
                  {results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pick(item)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2"
                    >
                      <Square className="h-4 w-4 text-accent-600" />
                      <span className="font-medium text-ink-primary">
                        {item.meta?.cellCode ||
                          (item.properties?.So_thua != null
                            ? `Thửa ${item.properties.So_thua}`
                            : `Thửa #${item.id}`)}
                      </span>
                      {item.meta?.areaExcel != null && (
                        <span className="ml-auto text-xs text-ink-muted tabular">
                          {Number(item.meta.areaExcel).toLocaleString('vi-VN')}{' '}
                          m²
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}
            </>
          ) : (
            !loading && (
              <div className="px-3 py-3 text-sm text-ink-muted">
                Không tìm thấy lô hoặc thửa khớp «{q.trim()}»
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
