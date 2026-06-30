import { useState } from 'react';
import {
  Layers,
  SlidersHorizontal,
  Check,
  Map as MapIcon,
  Grid3x3,
  LayoutGrid,
} from 'lucide-react';
import { LAYERS, getLayer } from '../../lib/layers';

export default function MapToolbar({
  activeLayerId,
  onLayerChange,
  onToggleFilter,
  activeFilterCount,
  showRanhThua,
  onToggleRanhThua,
  showLoThua,
  onToggleLoThua,
  showLo,
  onToggleLo,
}) {
  const [open, setOpen] = useState(false);
  const layer = getLayer(activeLayerId);

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-line bg-surface-1 p-1.5 shadow-md">
      {/* Layer dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-sm font-medium text-ink-secondary hover:bg-surface-2"
        >
          <Layers className="h-4 w-4 text-accent-600" />
          <span className="hidden sm:inline">Lớp:</span> {layer.label}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-md border border-line bg-surface-1 py-1 shadow-md">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    onLayerChange(l.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-ink-secondary hover:bg-surface-2"
                >
                  {l.label}
                  {l.id === activeLayerId && (
                    <Check className="h-4 w-4 text-accent-600" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <span className="h-5 w-px bg-line" />

      {/* Filter */}
      <button
        type="button"
        onClick={onToggleFilter}
        className="relative flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-sm font-medium text-ink-secondary hover:bg-surface-2"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">Lọc</span>
        {activeFilterCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-semibold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      <span className="h-5 w-px bg-line" />

      {/* Ranh thửa tile toggle */}
      <button
        type="button"
        onClick={onToggleRanhThua}
        aria-pressed={showRanhThua}
        title="Hiện/ẩn ranh thửa"
        className={`flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-sm font-medium hover:bg-surface-2 ${
          showRanhThua ? 'text-accent-700' : 'text-ink-muted'
        }`}
      >
        <MapIcon className="h-4 w-4" />
        <span className="hidden md:inline">Ranh thửa</span>
      </button>

      {/* Lô thửa tile toggle — overlay riêng, độc lập với ranh thửa */}
      <button
        type="button"
        onClick={onToggleLoThua}
        aria-pressed={showLoThua}
        title="Hiện/ẩn lô thửa"
        className={`flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-sm font-medium hover:bg-surface-2 ${
          showLoThua ? 'text-accent-700' : 'text-ink-muted'
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden md:inline">Lô thửa</span>
      </button>

      {/* Lô (cụm thửa) — chỉ ý nghĩa khi đang xem ranh thửa */}
      {showRanhThua && (
        <button
          type="button"
          onClick={onToggleLo}
          aria-pressed={showLo}
          title="Hiện/ẩn ranh lô (cụm thửa)"
          className={`flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-sm font-medium hover:bg-surface-2 ${
            showLo ? 'text-accent-700' : 'text-ink-muted'
          }`}
        >
          <Grid3x3 className="h-4 w-4" />
          <span className="hidden md:inline">Lô</span>
        </button>
      )}
    </div>
  );
}
