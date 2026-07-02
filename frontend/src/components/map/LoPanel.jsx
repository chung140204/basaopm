import { useEffect, useState } from 'react';
import { X, Layers as LayersIcon, Pencil, Check, Loader2, ListChecks, CheckSquare } from 'lucide-react';
import { getLoDetail, saveLoMeta, saveRanhThuaMeta } from '../../services/planningApi';
import { zoneName } from '../../data/cells';
import { getLayer, labelFor } from '../../lib/layers';
import ResponsiveSidePanel from '../common/ResponsiveSidePanel';
import { Skeleton, SkeletonRows } from '../common/Skeleton';
import { useAuth } from '../../auth/AuthContext';
import { statusValue } from './ranhThuaStatus';
import BulkUpdateCellsModal from '../lot/BulkUpdateCellsModal';

function fmtArea(v) {
  if (v == null) return '—';
  return `${Number(v).toLocaleString('vi-VN')} m²`;
}

// Màu chấm theo tình trạng KINH DOANH của ô — dùng CHUNG nguồn trạng thái với
// bản đồ (statusValue) nên màu chấm khớp đúng màu ô trên map.
function businessDotColor(cell) {
  const v = statusValue(cell, 'businessStatus');
  return (
    getLayer('business').statuses.find((s) => s.value === v)?.fill ?? '#94A3B8'
  );
}

/**
 * Panel xem tổng quan + sửa thông tin LÔ.
 * Hiển thị: mã lô, mô tả, ghi chú, diện tích tổng, số ô con + danh sách ô.
 */
export default function LoPanel({ loId, onClose, onPickCell, showToast }) {
  const { can } = useAuth();
  const [lo, setLo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEditing(false);
    getLoDetail(loId).then((d) => {
      if (cancelled) return;
      setLo(d);
      setDraft(d?.meta || {});
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loId]);

  const meta = editing ? draft : lo?.meta || {};
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  // Khu của lô: zone THẬT từ DB (lo.zone). Lô chưa gán zone → null (ẩn nhãn khu).
  const zoneId = lo?.zone ?? null;

  // --- Chọn nhiều ô con để cập nhật hàng loạt -----------------------------
  // Ô con ở đây là THỬA (bảng ranh_thua) → lưu qua saveRanhThuaMeta (ghi đè meta),
  // KHÁC với 'Quản lý theo lô' (bảng cell / saveCell). Khóa chọn = c.id (plotId),
  // vì một số thửa chưa có cellCode.
  const canBulk = can('cell.edit');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set()); // Set<plotId>
  const [bulkOpen, setBulkOpen] = useState(false);

  const cells = lo?.cells || [];
  const allSelected = selected.size > 0 && selected.size === cells.length;
  const cellLabel = (c) =>
    c.meta?.cellCode ||
    (c.properties?.So_thua != null ? `Thửa ${c.properties.So_thua}` : `Thửa #${c.id}`);

  const toggleCell = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(cells.map((c) => c.id)));
  const exitSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  // Reset chế độ chọn khi đổi lô.
  useEffect(() => {
    setSelecting(false);
    setSelected(new Set());
    setBulkOpen(false);
  }, [loId]);

  // Áp trạng thái mới cho các thửa đã chọn → lưu THẬT qua saveRanhThuaMeta.
  // Merge {...c.meta, [prop]: value} để không xoá các field meta khác của thửa.
  const applyBulk = async ({ prop, value }) => {
    const targets = cells.filter((c) => selected.has(c.id));
    const results = await Promise.all(
      targets.map((c) =>
        saveRanhThuaMeta(c.id, { ...(c.meta || {}), [prop]: value })
      )
    );
    const okIds = new Set(targets.filter((_, i) => results[i]).map((c) => c.id));
    const okCount = okIds.size;

    if (okCount > 0) {
      setLo((prev) => ({
        ...prev,
        cells: prev.cells.map((c) =>
          okIds.has(c.id)
            ? { ...c, meta: { ...(c.meta || {}), [prop]: value } }
            : c
        ),
      }));
    }
    setBulkOpen(false);
    exitSelecting();

    if (okCount === targets.length) {
      showToast?.(`Đã cập nhật ${okCount} ô của lô ${meta.loCode || ''}`.trim());
    } else if (okCount > 0) {
      showToast?.(`Cập nhật ${okCount}/${targets.length} ô — một số ô lỗi`);
    } else {
      showToast?.('Cập nhật thất bại — kiểm tra backend/quyền');
    }
  };

  const save = async () => {
    setSaving(true);
    const ok = await saveLoMeta(loId, draft);
    setSaving(false);
    if (ok) {
      setLo((prev) => ({ ...prev, meta: draft }));
      setEditing(false);
      showToast?.('Đã lưu thông tin lô');
    } else {
      showToast?.('Lưu thất bại — kiểm tra backend');
    }
  };

  return (
    <ResponsiveSidePanel
      onClose={() => !editing && onClose()}
      widthClass="md:w-[360px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <LayersIcon className="h-4 w-4 text-accent-600" />
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">
              {meta.loCode || `Lô #${loId}`}
            </h3>
            <p className="text-xs text-ink-muted">Thông tin lô đất</p>
          </div>
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

      {loading ? (
        <div className="flex-1 px-4 py-4">
          {/* Skeleton: 2 ô tổng quan + danh sách field lô. */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
          </div>
          <SkeletonRows count={5} />
        </div>
      ) : !lo ? (
        <div className="flex-1 px-4 py-6 text-center text-sm text-ink-muted">
          Không tải được thông tin lô.
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Tổng quan */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-line bg-surface-2 px-3 py-2">
                <p className="text-xs text-ink-muted">Số ô đất con</p>
                <p className="text-lg font-semibold text-ink-primary">
                  {lo.cellCount}
                </p>
              </div>
              <div className="rounded-md border border-line bg-surface-2 px-3 py-2">
                <p className="text-xs text-ink-muted">Diện tích tổng</p>
                <p className="text-lg font-semibold text-ink-primary">
                  {fmtArea(lo.areaTotal)}
                </p>
              </div>
            </div>

            {/* Thông tin quản lý (xem / sửa) */}
            <dl className="divide-y divide-line">
              <FieldRow
                label="Mã lô"
                value={meta.loCode}
                editing={editing}
                onChange={(v) => setField('loCode', v)}
                placeholder="VD: LO-A-01"
              />
              {/* Phân khu — zone THẬT từ DB (lo.zone, nối qua bảng subdivision).
                  Chỉ hiện khi lô đã gán khu (chỉ đọc, theo quy hoạch). */}
              {zoneId && (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm text-ink-muted">Phân khu</dt>
                  <dd>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            zoneId === 'khu-b' ? '#2563EB' : '#DC2626',
                        }}
                      />
                      {zoneName(zoneId)}
                    </span>
                  </dd>
                </div>
              )}
              {/* Dự án — chỉ hiện khi lô đã gán dự án trong DB (subdivision). */}
              {lo.projectName && (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm text-ink-muted">Dự án</dt>
                  <dd className="text-right text-sm font-medium text-ink-primary">
                    {lo.projectName}
                  </dd>
                </div>
              )}
              <FieldRow
                label="Mô tả"
                value={meta.description}
                editing={editing}
                onChange={(v) => setField('description', v)}
                placeholder="Mô tả lô"
              />
              <FieldRow
                label="Ghi chú quản lý"
                value={meta.note}
                editing={editing}
                onChange={(v) => setField('note', v)}
                placeholder="Ghi chú nội bộ"
              />
            </dl>

            {/* Danh sách ô con */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-ink-muted">
                  Các ô đất con ({lo.cells.length})
                </p>
                {/* Bật chế độ chọn nhiều ô để cập nhật hàng loạt (cần quyền sửa). */}
                {canBulk &&
                  (selecting ? (
                    <button
                      type="button"
                      onClick={exitSelecting}
                      className="text-[11px] font-medium text-ink-muted hover:text-ink-primary"
                    >
                      Hủy chọn
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelecting(true)}
                      className="flex items-center gap-1 text-[11px] font-medium text-accent-600 hover:text-accent-700"
                    >
                      <ListChecks className="h-3.5 w-3.5" />
                      Chọn nhiều
                    </button>
                  ))}
              </div>

              {/* Chọn tất cả — chỉ khi đang ở chế độ chọn. */}
              {canBulk && selecting && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink-secondary hover:text-ink-primary"
                >
                  <CheckSquare
                    className={`h-4 w-4 ${allSelected ? 'text-accent-600' : 'text-ink-muted'}`}
                  />
                  {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'} ({selected.size}/{cells.length})
                </button>
              )}

              <div className="max-h-56 space-y-1 overflow-y-auto">
                {lo.cells.map((c) => {
                  const isChecked = selected.has(c.id);
                  const dot = (
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                      style={{ backgroundColor: businessDotColor(c) }}
                      title={labelFor('business', statusValue(c, 'businessStatus'))}
                    />
                  );
                  const label = (
                    <span className="truncate text-ink-primary">{cellLabel(c)}</span>
                  );
                  const area = (
                    <span className="text-xs text-ink-muted tabular">
                      {fmtArea(c.area)}
                    </span>
                  );

                  // Chế độ chọn: cả dòng là checkbox (không mở panel thửa).
                  if (selecting) {
                    return (
                      <label
                        key={c.id}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          isChecked
                            ? 'border-accent-500 bg-accent-50'
                            : 'border-line hover:bg-surface-2'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCell(c.id)}
                            className="accent-accent-600"
                          />
                          {dot}
                          {label}
                        </span>
                        {area}
                      </label>
                    );
                  }

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onPickCell?.(c)}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {dot}
                        {label}
                      </span>
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer — ưu tiên thanh cập nhật hàng loạt khi đang chọn ô. */}
          {canBulk && selecting ? (
            <div className="border-t border-line p-3">
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                disabled={selected.size === 0}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-600 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
              >
                <ListChecks className="h-4 w-4" />
                Cập nhật {selected.size} ô đã chọn
              </button>
            </div>
          ) : (
            can('lot.edit') && (
              <div className="border-t border-line p-3">
                {editing ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(lo.meta || {});
                        setEditing(false);
                      }}
                      disabled={saving}
                      className="flex-1 rounded-md border border-line py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2 disabled:opacity-60"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent-600 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Lưu
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(lo.meta || {});
                      setEditing(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-600 py-2 text-sm font-medium text-white hover:bg-accent-700"
                  >
                    <Pencil className="h-4 w-4" />
                    Cập nhật thông tin lô
                  </button>
                )}
              </div>
            )
          )}

          {/* Modal cập nhật hàng loạt */}
          {bulkOpen && (
            <BulkUpdateCellsModal
              cellCodes={cells
                .filter((c) => selected.has(c.id))
                .map((c) => cellLabel(c))}
              onClose={() => setBulkOpen(false)}
              onApply={applyBulk}
            />
          )}
        </>
      )}
    </ResponsiveSidePanel>
  );
}

function FieldRow({ label, value, editing, onChange, placeholder }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-ink-muted">{label}</span>
      {editing ? (
        <input
          type="text"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-48 rounded-md border border-line bg-surface-1 px-2 py-1 text-right text-sm text-ink-primary"
        />
      ) : (
        <span className="text-right text-sm font-medium text-ink-primary">
          {value || '—'}
        </span>
      )}
    </div>
  );
}
