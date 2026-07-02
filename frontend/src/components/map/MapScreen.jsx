import { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, RotateCcw } from 'lucide-react';
// Real basemap via Leaflet + Google tiles (lyrs=m). Same interface as the SVG
// MapCanvas, so swapping is a one-line import change.
// Alternatives kept alongside: ./GoogleMapCanvas (Google Maps JS API, needs
// key) and ./MapCanvas (offline SVG schematic).
import MapCanvas from './LeafletMapCanvas';
import MapToolbar from './MapToolbar';
import MapLegend from './MapLegend';
import FilterPanel, { GROUPS } from './FilterPanel';
import SearchBar from './SearchBar';
import CellDetailPanel from './CellDetailPanel';
import EditCellModal from './EditCellModal';
import DiscardDialog from './DiscardDialog';
import { makeColorResolver } from '../../lib/layers';
import { SUBDIVISIONS, zoneOfCell } from '../../data/cells';
import { getRanhThuaAt, getRanhThuaLayers } from '../../services/planningApi';
import { saveCell } from '../../services/cellsApi';
import { useDbCells } from '../../hooks/useDbCells';
import RanhThuaPanel from './RanhThuaPanel';
import RanhThuaSearch from './RanhThuaSearch';
import LoPanel from './LoPanel';
import { statusValue } from './ranhThuaStatus';

// Build initial filter state: every option selected (= no constraint).
function buildInitialFilters() {
  const state = {};
  for (const g of GROUPS) {
    state[g.key] = new Set(g.options.map((o) => o.value));
  }
  return state;
}

// Bbox [minLng, minLat, maxLng, maxLat] của 1 geometry GeoJSON
// (Polygon / MultiPolygon). Trả null nếu không có tọa độ.
function geometryBbox(geometry) {
  if (!geometry?.coordinates) return null;
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  const visit = (node) => {
    if (typeof node[0] === 'number') {
      const [lng, lat] = node;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    } else {
      node.forEach(visit);
    }
  };
  visit(geometry.coordinates);
  return Number.isFinite(minLng) ? [minLng, minLat, maxLng, maxLat] : null;
}

// Count how many groups are "constrained" (not all options selected).
function countActiveFilters(filters) {
  let n = 0;
  for (const g of GROUPS) {
    if (filters[g.key].size !== g.options.length) n += 1;
  }
  return n;
}

export default function MapScreen({ showToast, projectId }) {
  // Nạp ô THẬT của dự án đang mở — dùng hook chung với màn "Quản lý theo ô".
  const [cells, setCells, cellsReady] = useDbCells(projectId, []);
  // Dự án có dữ liệu bản đồ không (để bật/tắt lớp ranh thửa).
  const projectHasCells = cellsReady && cells.length > 0;
  const [activeLayerId, setActiveLayerId] = useState('business');
  // Lớp ranh thửa: chỉ bật khi dự án CÓ dữ liệu bản đồ. Dự án rỗng → tắt hẳn
  // (không vẽ ranh thửa của dự án khác). User vẫn bật/tắt tay trên toolbar.
  const [showRanhThua, setShowRanhThua] = useState(false);
  useEffect(() => {
    setShowRanhThua(projectHasCells);
  }, [projectHasCells]);
  const [showLo, setShowLo] = useState(false);
  const [showLoThua, setShowLoThua] = useState(false); // bật/tắt tile lô thửa
  const [selectedLoId, setSelectedLoId] = useState(null);
  const [ranhThuaLayerId, setRanhThuaLayerId] = useState(null);
  const [ranhThuaPlot, setRanhThuaPlot] = useState(null); // thửa đang chọn

  const [filters, setFilters] = useState(buildInitialFilters);
  const [hideUnmatched, setHideUnmatched] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPinned, setFilterPinned] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [discardFor, setDiscardFor] = useState(null);

  const colorResolver = useMemo(
    () => makeColorResolver(activeLayerId),
    [activeLayerId]
  );

  // Filter predicate: within group OR, across groups AND.
  const filterPredicate = useMemo(() => {
    return (feature) => {
      for (const g of GROUPS) {
        const selected = filters[g.key];
        // All selected → no constraint for this group.
        if (selected.size === g.options.length) continue;
        // Phân khu: suy khu (khu-a/khu-b) qua zoneOfCell (fallback theo mã lô)
        // vì ô tĩnh có thể không có sẵn field zone.
        const v =
          g.key === 'zone'
            ? zoneOfCell(feature.properties)
            : feature.properties[g.key];
        if (!selected.has(v)) return false;
      }
      return true;
    };
  }, [filters]);

  // Predicate lọc RANH THỬA. Within group OR, across groups AND.
  //  - Nhóm trạng thái (KD/pháp lý/thanh toán): dùng statusValue.
  //  - Nhóm 'zone' (Khu A/B): suy khu từ mã lô (meta.lotCode). Thửa CHƯA gán lô
  //    (không có lotCode) → "vô khu" → KHÔNG bị lọc khu (luôn hiện).
  const ranhThuaFilter = useMemo(() => {
    const STATUS_KEYS = ['businessStatus', 'collateralStatus', 'paymentStatus'];
    return (feature) => {
      for (const g of GROUPS) {
        const selected = filters[g.key];
        if (selected.size === g.options.length) continue; // chọn hết → không ràng buộc
        if (g.key === 'zone') {
          // Zone THẬT từ DB (meta.zone, gộp từ subdivision). Thửa chưa gán zone
          // → "vô khu" → luôn hiện (không đoán theo mã lô hardcode nữa).
          const zone = feature?.meta?.zone;
          if (!zone) continue;
          if (!selected.has(zone)) return false;
        } else if (STATUS_KEYS.includes(g.key)) {
          if (!selected.has(statusValue(feature, g.key))) return false;
        }
        // nhóm khác (nếu có) → bỏ qua cho ranh thửa
      }
      return true;
    };
  }, [filters]);

  const matched = useMemo(
    () => cells.filter(filterPredicate),
    [cells, filterPredicate]
  );

  const activeFilterCount = countActiveFilters(filters);
  const selectedFeature = cells.find((c) => c.id === selectedId) ?? null;

  // ---- Handlers --------------------------------------------------------
  const toggleFilterOption = (groupKey, value) => {
    setFilters((prev) => {
      const next = { ...prev, [groupKey]: new Set(prev[groupKey]) };
      if (next[groupKey].has(value)) next[groupKey].delete(value);
      else next[groupKey].add(value);
      return next;
    });
  };

  const resetFilters = () => {
    setFilters(buildInitialFilters());
    setHideUnmatched(false);
  };

  const handleFeatureClick = (id) => {
    setSelectedId(id);
    setFilterOpen(false); // detail takes the right slot
  };

  const handlePickCell = (id) => {
    setSelectedId(id);
    setFocusTarget({ featureId: id });
    setFilterOpen(false);
  };

  const handlePickLot = (lot) => {
    const ids = cells
      .filter((c) => c.properties.lotCode === lot)
      .map((c) => c.id);
    setFocusTarget({ bboxOfIds: ids });
    setSelectedId(null);
  };

  const handlePickCoord = ([x, y]) => {
    // Find nearest cell by centroid distance.
    let best = null;
    let bestD = Infinity;
    for (const c of cells) {
      const [cx, cy] = c.properties.centroid;
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (best) handlePickCell(best.id);
  };

  const handleSaveCell = (updated) => {
    // 1) Cập nhật local state ngay (optimistic) để UI phản hồi tức thì.
    setCells((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditing(null);

    // 2) Ghi xuống DB qua API (field phẳng). Chỉ gửi các trường sửa được.
    const up = updated.properties;
    saveCell(up.cellCode, {
      value: up.value,
      business_status: up.businessStatus,
      internal_legal: up.internalLegal,
      description: up.description,
      note: up.note,
    }).then((ok) => {
      showToast?.(
        ok
          ? `Đã lưu ô ${up.cellCode} vào hệ thống`
          : `Đã cập nhật ô ${up.cellCode} (chưa đồng bộ DB)`
      );
    });
  };

  const closeEdit = () => setEditing(null);

  // Khi bật lớp ranh thửa, lấy layer id (để query đúng layer khi click).
  useEffect(() => {
    if (!showRanhThua) {
      setRanhThuaPlot(null);
      return;
    }
    let cancelled = false;
    getRanhThuaLayers().then((layers) => {
      if (cancelled || !layers.length) return;
      // Chọn lớp ranh thửa có nhiều ô nhất làm mặc định.
      // (Layer 'dccb-chialo' đã được xoá khỏi DB; giữ fallback an toàn phòng
      // trường hợp có layer rác khác được import về sau.)
      const best = layers.reduce(
        (a, b) => ((b.features ?? 0) > (a.features ?? 0) ? b : a),
        layers[0]
      );
      setRanhThuaLayerId(best.id);
    });
    return () => {
      cancelled = true;
    };
  }, [showRanhThua]);

  // Click trên bản đồ khi đang xem ranh thửa → query thửa tại điểm (point-in-polygon
  // ở backend PostGIS) + luôn hiện tọa độ điểm click.
  const handleRanhThuaClick = async ({ lat, lng }) => {
    if (!showRanhThua) return;
    setSelectedLoId(null); // click vào thửa → bỏ chọn lô để panel thửa hiện ra
    setRanhThuaPlot({ clickedAt: { lat, lng }, properties: {} }); // hiện toạ độ ngay
    const res = await getRanhThuaAt(lat, lng, { layer: ranhThuaLayerId });
    if (res?.found && res.feature) {
      setRanhThuaPlot({ ...res.feature, clickedAt: { lat, lng } });
    }
  };

  // Chọn 1 thửa từ kết quả tra cứu → zoom tới bbox + mở panel metadata.
  const handlePickRanhThua = (item) => {
    setRanhThuaPlot({
      type: 'Feature',
      id: item.id,
      properties: item.properties,
      meta: item.meta,
      geometry: item.geometry,
    });
    if (item.bbox) setFocusTarget({ lngLatBbox: item.bbox });
  };

  // Chọn 1 lô từ kết quả tra cứu → zoom tới bbox của lô + mở panel lô
  // (giống như click thẳng vào lô trên bản đồ).
  const handlePickRanhThuaLot = (lot) => {
    const bbox = geometryBbox(lot.geometry);
    if (bbox) setFocusTarget({ lngLatBbox: bbox });
    setRanhThuaPlot(null);
    setSelectedLoId(lot.id); // mở LoPanel theo id backend
  };

  // ---- Render ----------------------------------------------------------
  const showDetail = Boolean(selectedFeature);
  const showFilter = filterOpen && !showDetail;

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Map area — isolate tạo stacking context riêng nên map (z thấp) không
          bao giờ đè lên topbar/sidebar ở ngoài. */}
      <div className="relative flex-1 overflow-hidden isolate">
        <MapCanvas
          projectId={projectId}
          features={cells}
          // Lớp ô tĩnh (CELLS) đã tắt hẳn — bản đồ chỉ dùng nền + ranh phân khu
          // (và lớp ranh thửa thật từ backend khi bật).
          showCells={false}
          activeLayerId={activeLayerId}
          colorResolver={colorResolver}
          filterPredicate={filterPredicate}
          selectedFeatureId={selectedId}
          showSubdivisionBorders={false}
          subdivisions={SUBDIVISIONS}
          focusTarget={focusTarget}
          hideUnmatched={hideUnmatched}
          showRanhThua={showRanhThua}
          showLoThua={showLoThua}
          ranhThuaLayerId={ranhThuaLayerId}
          ranhThuaStatusLayer={
            ['business', 'legal', 'payment'].includes(activeLayerId)
              ? activeLayerId
              : 'business'
          }
          ranhThuaFilter={ranhThuaFilter}
          ranhThuaHideUnmatched={true}
          showRanhThuaSubdivisions={false}
          showLo={showLo}
          selectedLoId={selectedLoId}
          onLoClick={(id) => {
            setSelectedLoId(id);
            setRanhThuaPlot(null);
          }}
          onRanhThuaClick={handleRanhThuaClick}
          ranhThuaHighlight={ranhThuaPlot?.geometry || null}
          onFeatureClick={handleFeatureClick}
        />

        {/* Floating toolbar + search (top-left, xếp dọc) */}
        <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-col items-start gap-3">
          <MapToolbar
            activeLayerId={activeLayerId}
            onLayerChange={setActiveLayerId}
            onToggleFilter={() => setFilterOpen((o) => !o)}
            activeFilterCount={activeFilterCount}
            showRanhThua={showRanhThua}
            onToggleRanhThua={() => setShowRanhThua((s) => !s)}
            showLoThua={showLoThua}
            onToggleLoThua={() => setShowLoThua((s) => !s)}
            showLo={showLo}
            onToggleLo={() =>
              setShowLo((s) => {
                // Tắt lớp Lô → bỏ chọn lô đang mở, để click ô hiện lại panel thửa.
                if (s) setSelectedLoId(null);
                return !s;
              })
            }
          />

          {/* Search — ngay dưới toolbar; đổi theo lớp đang xem */}
          <div className="pointer-events-auto">
            {showRanhThua ? (
              <RanhThuaSearch
                layerId={ranhThuaLayerId}
                onPickCoord={handleRanhThuaClick}
                onPickPlot={handlePickRanhThua}
                onPickLot={handlePickRanhThuaLot}
              />
            ) : (
              <SearchBar
                features={cells}
                onPickCell={handlePickCell}
                onPickLot={handlePickLot}
                onPickCoord={handlePickCoord}
              />
            )}
          </div>
        </div>

        {/* Legend (bottom-left) — ẩn trên mobile để bottom-sheet không bị che */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden sm:block">
          <MapLegend activeLayerId={activeLayerId} features={matched} />
        </div>

        {/* Empty filter overlay — chỉ hiện khi:
            - đã load xong (cellsReady) — tránh nháy "trống" lúc reload đang tải;
            - KHÔNG đang xem ranh thửa thật (lớp ranh thửa có nguồn dữ liệu riêng,
              không phụ thuộc `matched` của grid ô — nếu không overlay sẽ che mất
              bản đồ ranh thửa khi reload dự án có dữ liệu). */}
        {cellsReady && !showRanhThua && matched.length === 0 && (
          <div className="absolute inset-0 z-[450] flex flex-col items-center justify-center gap-3 bg-surface-2/70 text-center">
            <SearchIcon className="h-8 w-8 text-ink-muted" />
            <p className="text-base font-medium text-ink-primary">
              Không có ô đất khớp bộ lọc
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-2 rounded-md border border-line bg-surface-1 px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2"
            >
              <RotateCcw className="h-4 w-4" />
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Right panels: filter OR detail */}
      {showFilter && (
        <FilterPanel
          filters={filters}
          onToggle={toggleFilterOption}
          onReset={resetFilters}
          matchCount={matched.length}
          // Tổng = số ô THỰC TẾ đang có (cùng nguồn với matched) để tránh
          // "khớp > tổng" khi data DB khác hằng số tĩnh TOTAL_CELLS.
          total={cells.length}
          pinned={filterPinned}
          onTogglePin={() => setFilterPinned((p) => !p)}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {showDetail && (
        <CellDetailPanel
          feature={selectedFeature}
          onClose={() => setSelectedId(null)}
          onEdit={(f) => setEditing(f)}
        />
      )}

      {/* Panel thông tin lô khi click vào lô */}
      {showRanhThua && selectedLoId != null && (
        <LoPanel
          loId={selectedLoId}
          showToast={showToast}
          onClose={() => setSelectedLoId(null)}
          onPickCell={(c) => {
            // Chọn ô con từ panel lô → mở panel thửa.
            setSelectedLoId(null);
            setRanhThuaPlot({
              type: 'Feature',
              id: c.id,
              properties: c.properties,
              meta: c.meta,
            });
          }}
        />
      )}

      {/* Panel thông tin thửa (ranh thửa) khi click */}
      {showRanhThua && selectedLoId == null && ranhThuaPlot && (
        <RanhThuaPanel
          plot={ranhThuaPlot}
          showToast={showToast}
          onClose={() => setRanhThuaPlot(null)}
          onSaved={(id, meta) =>
            setRanhThuaPlot((prev) =>
              prev && prev.id === id ? { ...prev, meta } : prev
            )
          }
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EditCellModal
          feature={editing}
          onClose={closeEdit}
          onSave={handleSaveCell}
          onDirtyClose={() => setDiscardFor(editing)}
        />
      )}

      {/* Discard confirm */}
      {discardFor && (
        <DiscardDialog
          onCancel={() => setDiscardFor(null)}
          onConfirm={() => {
            setDiscardFor(null);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
