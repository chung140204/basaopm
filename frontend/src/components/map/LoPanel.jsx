import { useEffect, useState } from 'react';
import { X, Layers as LayersIcon, Pencil, Check, Loader2 } from 'lucide-react';
import { getLoDetail, saveLoMeta } from '../../services/planningApi';
import { zoneOfLot, zoneName } from '../../data/cells';
import ResponsiveSidePanel from '../common/ResponsiveSidePanel';

function fmtArea(v) {
  if (v == null) return '—';
  return `${Number(v).toLocaleString('vi-VN')} m²`;
}

/**
 * Panel xem tổng quan + sửa thông tin LÔ.
 * Hiển thị: mã lô, mô tả, ghi chú, diện tích tổng, số ô con + danh sách ô.
 */
export default function LoPanel({ loId, onClose, onPickCell, showToast }) {
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
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent-600" />
          Đang tải…
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
              {/* Phân khu — suy ra từ mã lô, chỉ đọc (theo quy hoạch). */}
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-sm text-ink-muted">Phân khu</dt>
                <dd>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          zoneOfLot(meta.loCode) === 'khu-b'
                            ? '#2563EB'
                            : '#DC2626',
                      }}
                    />
                    {zoneName(zoneOfLot(meta.loCode))}
                  </span>
                </dd>
              </div>
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
              <p className="mb-1.5 text-xs font-medium text-ink-muted">
                Các ô đất con ({lo.cells.length})
              </p>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {lo.cells.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onPickCell?.(c)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
                  >
                    <span className="text-ink-primary">
                      {c.meta?.cellCode ||
                        (c.properties?.So_thua != null
                          ? `Thửa ${c.properties.So_thua}`
                          : `Thửa #${c.id}`)}
                    </span>
                    <span className="text-xs text-ink-muted tabular">
                      {fmtArea(c.area)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
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
