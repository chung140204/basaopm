import {
  MapPin,
  Building2,
  Ruler,
  CalendarRange,
  Eye,
  Pencil,
  EyeOff,
  RotateCw,
  LayoutGrid,
  Grid3x3,
} from 'lucide-react';
import Badge from './Badge';
import {
  formatInteger,
  formatAreaFull,
  formatMonthYear,
} from '../utils/format';

function InfoItem({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-muted" />
      <div className="min-w-0">
        <span className="block text-xs text-ink-muted">{label}</span>
        <span className="text-ink-secondary">{children}</span>
      </div>
    </div>
  );
}

function IconButton({ icon: Icon, label, tone = 'default', onClick }) {
  const tones = {
    default: 'text-ink-secondary hover:bg-surface-2 hover:text-ink-primary',
    warning: 'text-warning hover:bg-warning-bg',
    accent: 'text-accent-600 hover:bg-accent-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 transition-colors focus:outline-none focus:shadow-focus ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function ProjectCard({ project, onEdit, onHide, onRestore }) {
  const isHidden = project.status === 'hidden';

  // Build the lot text: "50 lô (Khu A: 31 · Khu B: 19)"
  const loText = project.phanRaLo?.length
    ? `${formatInteger(project.tongSoLo)} lô (${project.phanRaLo
        .map((k) => `${k.khu}: ${formatInteger(k.soLo)}`)
        .join(' · ')})`
    : `${formatInteger(project.tongSoLo)} lô`;

  // Business time: prefer free-text range if present.
  const kdText =
    project.thoiGianKinhDoanh ?? formatMonthYear(project.duaVaoKinhDoanh);

  return (
    <div
      className={`flex flex-col gap-4 rounded-lg border border-line bg-surface-1 p-4 shadow-sm transition-shadow hover:shadow-md lg:flex-row lg:items-center ${
        isHidden ? 'opacity-80' : ''
      }`}
    >
      {/* Title block */}
      <div className="flex min-w-0 items-start justify-between gap-3 lg:w-64 lg:flex-shrink-0 lg:flex-col lg:items-start lg:justify-center">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug text-ink-primary">
            {project.tenHienThi}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">{project.id}</p>
        </div>
        <Badge status={project.status} />
      </div>

      {/* Info items — laid out horizontally */}
      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
        {project.chuDauTu && (
          <InfoItem icon={Building2} label="Chủ đầu tư">
            {project.chuDauTu}
          </InfoItem>
        )}
        <InfoItem icon={MapPin} label="Vị trí">
          {project.viTri}
        </InfoItem>
        <InfoItem icon={Ruler} label="Diện tích QH">
          {project.tyLeQH ? `${project.tyLeQH} — ` : ''}
          <span className="tabular">{formatAreaFull(project)}</span>
        </InfoItem>
        <InfoItem icon={Grid3x3} label="Tổng số lô">
          <span className="tabular">{loText}</span>
        </InfoItem>
        <InfoItem icon={LayoutGrid} label="Tổng số ô nhỏ">
          <span className="tabular">{formatInteger(project.tongSoODat)} ô</span>
        </InfoItem>
        <InfoItem icon={CalendarRange} label="Thời gian kinh doanh">
          {kdText}
        </InfoItem>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 border-t border-line pt-3 lg:flex-shrink-0 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
        <IconButton icon={Eye} label="Xem chi tiết" />
        {isHidden ? (
          <IconButton
            icon={RotateCw}
            label="Khôi phục dự án"
            tone="accent"
            onClick={() => onRestore(project)}
          />
        ) : (
          <>
            <IconButton
              icon={Pencil}
              label="Sửa thông tin"
              onClick={() => onEdit(project)}
            />
            <IconButton
              icon={EyeOff}
              label="Ẩn dự án"
              tone="warning"
              onClick={() => onHide(project)}
            />
          </>
        )}
      </div>
    </div>
  );
}
