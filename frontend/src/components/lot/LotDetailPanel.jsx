import { X, Pencil, Maximize2, Grid3x3, MapPin, ChevronRight } from 'lucide-react';
import LotShape from './LotShape';
import { AreaBreakdownList } from './AreaBreakdownBar';
import { labelFor, getLayer } from '../../lib/layers';
import { formatM2 } from '../../utils/format';
import ResponsiveSidePanel from '../common/ResponsiveSidePanel';

function colorOf(layerId, value) {
  return getLayer(layerId).statuses.find((s) => s.value === value)?.fill ?? '#94A3B8';
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2">
      <Icon className="h-4 w-4 text-ink-muted" />
      <div className="min-w-0">
        <p className="text-[11px] text-ink-muted">{label}</p>
        <p className="truncate text-sm font-semibold text-ink-primary">{value}</p>
      </div>
    </div>
  );
}

export default function LotDetailPanel({ lot, onClose, onEdit, onOpenCell }) {
  return (
    <ResponsiveSidePanel onClose={onClose} widthClass="md:w-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">Lô {lot.lotCode}</h3>
          <p className="text-xs text-ink-muted">{lot.zoneName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Shape */}
        <div className="rounded-lg border border-line bg-surface-2 p-2">
          <LotShape lot={lot} width={332} height={170} />
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat icon={Grid3x3} label="Số ô con" value={`${lot.cellCount} ô`} />
          <Stat icon={Maximize2} label="Tổng diện tích" value={formatM2(lot.totalArea)} />
        </div>

        {/* Diện tích theo tình trạng */}
        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Diện tích theo tình trạng kinh doanh
            </p>
            <AreaBreakdownList layerId="business" data={lot.areaByBusiness} />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Diện tích theo pháp lý định danh
            </p>
            <AreaBreakdownList layerId="legal" data={lot.areaByLegal} />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Diện tích theo pháp lý - tài chính
            </p>
            <AreaBreakdownList layerId="payment" data={lot.areaByPayment} />
          </div>
        </div>

        {/* Description / note */}
        <div className="mt-4 space-y-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Mô tả
            </p>
            <p className="mt-0.5 text-sm text-ink-secondary">
              {lot.description?.trim() || <span className="text-ink-muted">— chưa có —</span>}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Ghi chú quản lý
            </p>
            <p className="mt-0.5 text-sm text-ink-secondary">
              {lot.note?.trim() || <span className="text-ink-muted">— chưa có —</span>}
            </p>
          </div>
        </div>

        {/* Child cells */}
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            <MapPin className="h-3.5 w-3.5" />
            Các ô đất con
          </p>
          <ul className="space-y-1.5">
            {lot.cells.map((c) => {
              const p = c.properties;
              const dot = (
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: colorOf('business', p.businessStatus) }}
                />
              );
              const meta = (
                <span className="flex items-center gap-3 text-xs text-ink-muted">
                  <span className="tabular">{formatM2(p.area)}</span>
                  <span className="hidden sm:inline">
                    {labelFor('business', p.businessStatus)}
                  </span>
                </span>
              );
              // Click → mở chi tiết ô ở màn Quản lý theo ô (nếu được nối handler).
              if (onOpenCell) {
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onOpenCell(p.cellCode)}
                      title={`Xem chi tiết ô ${p.cellCode}`}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-left text-sm transition-colors hover:border-accent-500 hover:bg-accent-50"
                    >
                      <span className="flex items-center gap-2">
                        {dot}
                        <span className="font-medium text-ink-primary">{p.cellCode}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {meta}
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-muted" />
                      </span>
                    </button>
                  </li>
                );
              }
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {dot}
                    <span className="font-medium text-ink-primary">{p.cellCode}</span>
                  </span>
                  {meta}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={() => onEdit(lot)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-600 py-2 text-sm font-medium text-white hover:bg-accent-700"
        >
          <Pencil className="h-4 w-4" />
          Cập nhật thông tin lô
        </button>
      </div>
    </ResponsiveSidePanel>
  );
}
