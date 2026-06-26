import { useEffect, useState } from 'react';
import { X, Info, Upload, FileText } from 'lucide-react';
import { getLayer } from './layers';
import { SUBDIVISIONS } from '../../data/cells';
import { formatInteger } from '../../utils/format';

const subName = (id) => SUBDIVISIONS.find((s) => s.id === id)?.name ?? id;

const BUSINESS_OPTIONS = getLayer('business').statuses;

const INTERNAL_LEGAL_OPTIONS = [
  'Chưa cấp sổ - Không đủ điều kiện',
  'Chưa cấp sổ - Đủ điều kiện',
  'Đang làm thủ tục cấp sổ',
  'Đã cấp sổ đỏ',
];

export default function EditCellModal({ feature, onClose, onSave, onDirtyClose }) {
  const p = feature.properties;
  const [value, setValue] = useState(String(p.value ?? ''));
  const [businessStatus, setBusinessStatus] = useState(p.businessStatus);
  const [internalLegal, setInternalLegal] = useState(p.internalLegal);
  const [description, setDescription] = useState(p.description ?? '');
  const [note, setNote] = useState(p.note ?? '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && attemptClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, businessStatus, internalLegal, description, note]);

  const numericValue = Number(value.replace(/[^\d]/g, ''));
  const valueError = value.trim() === '' || Number.isNaN(numericValue) || numericValue < 0;

  const isDirty =
    String(p.value) !== String(numericValue) ||
    businessStatus !== p.businessStatus ||
    internalLegal !== p.internalLegal ||
    description !== (p.description ?? '') ||
    note !== (p.note ?? '');

  const canSave = isDirty && !valueError;

  const attemptClose = () => {
    if (isDirty) onDirtyClose();
    else onClose();
  };

  const handleSave = () => {
    setTouched(true);
    if (!canSave) return;
    onSave({
      ...feature,
      properties: {
        ...p,
        value: numericValue,
        businessStatus,
        internalLegal,
        description,
        note,
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && attemptClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-cell-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-lg bg-surface-1 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id="edit-cell-title" className="text-lg font-semibold text-ink-primary">
              Cập nhật ô {p.cellCode}
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              {p.lotCode} · {subName(p.subdivisionId)}
            </p>
          </div>
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Đóng"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Info banner */}
          <div className="flex items-start gap-2 rounded-md bg-info-bg/60 p-3 text-xs text-ink-secondary">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
            <span>
              Chỉ các trường dưới đây được sửa. Quy hoạch, diện tích, tọa độ,
              ranh giới, vị trí: liên hệ quản trị viên để thay đổi.
            </span>
          </div>

          {/* Giá bán */}
          <div>
            <label htmlFor="gia-ban" className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Giá bán <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                id="gia-ban"
                type="text"
                inputMode="numeric"
                value={value === '' ? '' : formatInteger(numericValue)}
                onChange={(e) => setValue(e.target.value)}
                className={`w-full rounded-md border px-3 py-2 pr-8 text-sm text-ink-primary focus:outline-none focus:shadow-focus ${
                  touched && valueError ? 'border-danger' : 'border-line focus:border-accent-500'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                đ
              </span>
            </div>
            {touched && valueError && (
              <p className="mt-1 text-xs text-danger">Vui lòng nhập giá bán hợp lệ</p>
            )}
          </div>

          {/* Trạng thái KD */}
          <div>
            <label htmlFor="kd" className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Trạng thái kinh doanh <span className="text-danger">*</span>
            </label>
            <select
              id="kd"
              value={businessStatus}
              onChange={(e) => setBusinessStatus(e.target.value)}
              className="w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink-primary focus:border-accent-500 focus:outline-none focus:shadow-focus"
            >
              {BUSINESS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pháp lý nội bộ */}
          <div>
            <label htmlFor="pl" className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Pháp lý nội bộ
            </label>
            <select
              id="pl"
              value={internalLegal}
              onChange={(e) => setInternalLegal(e.target.value)}
              className="w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink-primary focus:border-accent-500 focus:outline-none focus:shadow-focus"
            >
              {!INTERNAL_LEGAL_OPTIONS.includes(internalLegal) && (
                <option value={internalLegal}>{internalLegal}</option>
              )}
              {INTERNAL_LEGAL_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Mô tả */}
          <div>
            <label htmlFor="mota" className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Mô tả
            </label>
            <textarea
              id="mota"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-md border border-line px-3 py-2 text-sm text-ink-primary focus:border-accent-500 focus:outline-none focus:shadow-focus"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label htmlFor="ghichu" className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Ghi chú
            </label>
            <textarea
              id="ghichu"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-none rounded-md border border-line px-3 py-2 text-sm text-ink-primary focus:border-accent-500 focus:outline-none focus:shadow-focus"
            />
          </div>

          {/* Hồ sơ số hóa */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Hồ sơ số hóa
            </span>
            <div className="space-y-1.5">
              {p.documents.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink-secondary"
                >
                  <FileText className="h-4 w-4 text-accent-600" />
                  <span className="truncate">{d.name}</span>
                </div>
              ))}
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line py-2 text-sm text-ink-muted hover:bg-surface-2"
              >
                <Upload className="h-4 w-4" />
                Tải lên hồ sơ
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={attemptClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
