import { useState } from 'react';
import { Pencil, EyeOff, RotateCw, Building2, MapPin, Ruler, Grid3x3, LayoutGrid, CalendarRange, Hash } from 'lucide-react';
import Badge from '../Badge';
import EditProjectModal from '../EditProjectModal';
import ConfirmDialog from '../ConfirmDialog';
import {
  formatInteger,
  formatAreaFull,
  formatMonthYear,
} from '../../utils/format';

function Field({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-surface-2">
        <Icon className="h-4 w-4 text-ink-muted" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-ink-primary">{children}</p>
      </div>
    </div>
  );
}

export default function ProjectInfoScreen({ project, onSave, onHide, onRestore }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'hide' | 'restore'

  const loText = project.phanRaLo?.length
    ? `${formatInteger(project.tongSoLo)} lô (${project.phanRaLo
        .map((k) => `${k.khu}: ${formatInteger(k.soLo)}`)
        .join(' · ')})`
    : `${formatInteger(project.tongSoLo)} lô`;

  const isHidden = project.status === 'hidden';

  return (
    <main className="flex-1 overflow-y-auto bg-app p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink-primary">
            Thông tin dự án
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Thông tin tổng quan và quản lý dự án
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-md border border-line bg-surface-1 px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2"
          >
            <Pencil className="h-4 w-4" />
            Sửa thông tin
          </button>
          {isHidden ? (
            <button
              type="button"
              onClick={() => setConfirm('restore')}
              className="flex items-center gap-2 rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
            >
              <RotateCw className="h-4 w-4" />
              Khôi phục
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm('hide')}
              className="flex items-center gap-2 rounded-md border border-line bg-surface-1 px-4 py-2 text-sm font-medium text-warning hover:bg-warning-bg"
            >
              <EyeOff className="h-4 w-4" />
              Ẩn dự án
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl space-y-4">
        {/* Identity card */}
        <div className="rounded-lg border border-line bg-surface-1 p-5 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-ink-primary">
                {project.tenHienThi}
              </h3>
              <p className="mt-0.5 text-sm text-ink-muted">{project.id}</p>
            </div>
            <Badge status={project.status} />
          </div>
          {project.moTa && (
            <p className="mt-2 text-sm text-ink-secondary">{project.moTa}</p>
          )}
        </div>

        {/* Detail grid */}
        <div className="rounded-lg border border-line bg-surface-1 p-5 shadow-sm">
          <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {project.chuDauTu && (
              <Field icon={Building2} label="Chủ đầu tư">
                {project.chuDauTu}
              </Field>
            )}
            <Field icon={MapPin} label="Vị trí">
              {project.viTri}
            </Field>
            <Field icon={Ruler} label={`Tổng diện tích quy hoạch${project.tyLeQH ? ` ${project.tyLeQH}` : ''}`}>
              {formatAreaFull(project)}
            </Field>
            <Field icon={Grid3x3} label="Tổng số lô">
              {loText}
            </Field>
            <Field icon={LayoutGrid} label="Tổng số ô nhỏ">
              {formatInteger(project.tongSoODat)} ô
            </Field>
            <Field icon={CalendarRange} label="Thời gian kinh doanh">
              {project.thoiGianKinhDoanh ??
                formatMonthYear(project.duaVaoKinhDoanh)}
            </Field>
            <Field icon={Hash} label="Mã dự án">
              {project.id}
            </Field>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {editing && (
        <EditProjectModal
          project={project}
          onClose={() => setEditing(false)}
          onSave={(updated) => {
            onSave(updated);
            setEditing(false);
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          variant={confirm}
          project={project}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm === 'hide') onHide(project);
            else onRestore(project);
            setConfirm(null);
          }}
        />
      )}
    </main>
  );
}
