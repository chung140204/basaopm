import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const MAX_NAME = 120;
const MAX_DESC = 500;

export default function EditProjectModal({ project, onClose, onSave }) {
  const { can } = useAuth();
  const [tenHienThi, setTenHienThi] = useState(project.tenHienThi);
  const [moTa, setMoTa] = useState(project.moTa ?? '');
  const [chuDauTu, setChuDauTu] = useState(project.chuDauTu ?? '');
  const [viTri, setViTri] = useState(project.viTri ?? '');
  const [tyLeQH, setTyLeQH] = useState(project.tyLeQH ?? '');
  const [dienTichM2, setDienTichM2] = useState(
    project.dienTichM2 != null ? String(project.dienTichM2) : ''
  );
  const [tongDienTichHa, setTongDienTichHa] = useState(
    project.tongDienTichHa != null ? String(project.tongDienTichHa) : ''
  );
  const [thoiGianKinhDoanh, setThoiGianKinhDoanh] = useState(
    project.thoiGianKinhDoanh ?? ''
  );
  const [touched, setTouched] = useState(false);
  const nameRef = useRef(null);

  // Focus first field on open.
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on Esc.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const trimmedName = tenHienThi.trim();
  const nameError = trimmedName.length === 0;
  const isDirty =
    tenHienThi !== project.tenHienThi ||
    moTa !== (project.moTa ?? '') ||
    chuDauTu !== (project.chuDauTu ?? '') ||
    viTri !== (project.viTri ?? '') ||
    tyLeQH !== (project.tyLeQH ?? '') ||
    dienTichM2 !== (project.dienTichM2 != null ? String(project.dienTichM2) : '') ||
    tongDienTichHa !==
      (project.tongDienTichHa != null ? String(project.tongDienTichHa) : '') ||
    thoiGianKinhDoanh !== (project.thoiGianKinhDoanh ?? '');
  const canSave = isDirty && !nameError;

  const handleSave = () => {
    setTouched(true);
    if (!canSave) return;
    const toNumber = (v) => {
      const n = Number(String(v).replace(/,/g, '.').trim());
      return Number.isFinite(n) ? n : undefined;
    };
    onSave({
      ...project,
      tenHienThi: trimmedName,
      moTa,
      chuDauTu: chuDauTu.trim(),
      viTri: viTri.trim(),
      tyLeQH: tyLeQH.trim(),
      dienTichM2: dienTichM2 === '' ? undefined : toNumber(dienTichM2),
      tongDienTichHa:
        tongDienTichHa === '' ? undefined : toNumber(tongDienTichHa),
      thoiGianKinhDoanh: thoiGianKinhDoanh.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-lg bg-surface-1 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2
              id="edit-modal-title"
              className="text-lg font-semibold text-ink-primary"
            >
              Cập nhật thông tin dự án
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              {project.tenHienThi} · {project.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink-primary focus:outline-none focus:shadow-focus"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Tên hiển thị — editable */}
          <div>
            <label
              htmlFor="ten-hien-thi"
              className="mb-1.5 block text-sm font-medium text-ink-secondary"
            >
              Tên hiển thị <span className="text-danger">*</span>
            </label>
            <input
              id="ten-hien-thi"
              ref={nameRef}
              type="text"
              value={tenHienThi}
              maxLength={MAX_NAME}
              onChange={(e) => setTenHienThi(e.target.value)}
              onBlur={() => setTouched(true)}
              className={`w-full rounded-md border px-3 py-2 text-sm text-ink-primary focus:outline-none focus:shadow-focus ${
                touched && nameError
                  ? 'border-danger'
                  : 'border-line focus:border-accent-500'
              }`}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-danger">
                {touched && nameError ? 'Vui lòng nhập tên hiển thị' : ''}
              </span>
              <span className="text-xs text-ink-muted">
                {tenHienThi.length}/{MAX_NAME}
              </span>
            </div>
          </div>

          {/* Mô tả — editable */}
          <div>
            <label
              htmlFor="mo-ta"
              className="mb-1.5 block text-sm font-medium text-ink-secondary"
            >
              Mô tả
            </label>
            <textarea
              id="mo-ta"
              rows={4}
              value={moTa}
              maxLength={MAX_DESC}
              onChange={(e) => setMoTa(e.target.value)}
              className="w-full resize-none rounded-md border border-line px-3 py-2 text-sm text-ink-primary focus:border-accent-500 focus:outline-none focus:shadow-focus"
            />
            <div className="mt-1 text-right text-xs text-ink-muted">
              {moTa.length}/{MAX_DESC}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Thông tin dự án
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Chủ đầu tư */}
          <TextField
            id="chu-dau-tu"
            label="Chủ đầu tư"
            value={chuDauTu}
            onChange={setChuDauTu}
          />

          {/* Vị trí */}
          <TextField
            id="vi-tri"
            label="Vị trí"
            value={viTri}
            onChange={setViTri}
          />

          {/* Tỷ lệ QH + diện tích */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              id="ty-le-qh"
              label="Tỷ lệ QH"
              value={tyLeQH}
              onChange={setTyLeQH}
              placeholder="1/500"
            />
            <TextField
              id="dien-tich-m2"
              label="Diện tích (m²)"
              value={dienTichM2}
              onChange={setDienTichM2}
              type="number"
              placeholder="0"
            />
            <TextField
              id="tong-dien-tich-ha"
              label="Tổng diện tích (ha)"
              value={tongDienTichHa}
              onChange={setTongDienTichHa}
              type="number"
              placeholder="0"
            />
          </div>

          {/* Thời gian kinh doanh */}
          <TextField
            id="thoi-gian-kinh-doanh"
            label="Thời gian kinh doanh"
            value={thoiGianKinhDoanh}
            onChange={setThoiGianKinhDoanh}
            placeholder="Từ năm ... đến nay"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-2"
          >
            Hủy
          </button>
          {can('project.edit') && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lưu thay đổi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TextField({ id, label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-ink-secondary"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-primary focus:border-accent-500 focus:outline-none focus:shadow-focus"
      />
    </div>
  );
}
