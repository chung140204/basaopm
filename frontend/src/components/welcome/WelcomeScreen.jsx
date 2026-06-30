import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronRight,
  ChevronDown,
  MapPin,
  Ruler,
  Grid3x3,
  LayoutGrid,
  Building2,
  CalendarRange,
  Plus,
  Info,
  X,
  Pencil,
  EyeOff,
  RotateCw,
  LogOut,
} from 'lucide-react';
import Badge from '../Badge';
import EditProjectModal from '../EditProjectModal';
import ConfirmDialog from '../ConfirmDialog';
import {
  formatInteger,
  formatAreaFull,
  formatMonthYear,
} from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

// Lấy 2 ký tự viết tắt từ tên/email để hiển thị trên avatar.
function initialsOf(name) {
  const s = (name || '').trim();
  if (!s) return 'U';
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'visible', label: 'Đang hiển thị' },
  { key: 'hidden', label: 'Đã ẩn' },
];

// ---- Per-card action icons --------------------------------------------
function IconButton({ icon: Icon, label, tone = 'default', onClick }) {
  const tones = {
    default: 'text-ink-secondary hover:bg-surface-2 hover:text-ink-primary',
    warning: 'text-warning hover:bg-warning-bg',
    accent: 'text-accent-600 hover:bg-accent-50',
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-md p-1.5 transition-colors focus:outline-none focus:shadow-focus ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function CardActions({ project, onEdit, onHide, onRestore }) {
  const isHidden = project.status === 'hidden';
  return (
    <div className="flex items-center gap-0.5">
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
  );
}

// ---- Project card -----------------------------------------------------
function ProjectOpenCard({ project, onOpen, onEdit, onHide, onRestore }) {
  const isHidden = project.status === 'hidden';
  const loText = project.phanRaLo?.length
    ? `${formatInteger(project.tongSoLo)} lô (${project.phanRaLo
        .map((k) => `${k.khu}: ${formatInteger(k.soLo)}`)
        .join(' · ')})`
    : `${formatInteger(project.tongSoLo)} lô`;

  const InfoItem = ({ icon: Icon, label, children }) => (
    <div className="flex min-w-0 items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-muted" />
      <div className="min-w-0">
        <span className="text-ink-muted">{label}: </span>
        <span className="text-ink-secondary">{children}</span>
      </div>
    </div>
  );

  // Click vào bất kỳ đâu trên card (trừ các nút con) đều mở dự án.
  // Các nút Sửa/Ẩn/Khôi phục đã tự gọi stopPropagation nên không kích hoạt mở.
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Mở dự án ${project.tenHienThi}`}
      onClick={() => onOpen(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(project);
        }
      }}
      className={`group flex cursor-pointer flex-col gap-4 rounded-xl border border-line bg-surface-1 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500 hover:shadow-md focus:outline-none focus-visible:border-accent-500 focus-visible:shadow-focus active:translate-y-0 lg:flex-row lg:items-center ${
        isHidden ? 'opacity-80' : ''
      }`}
    >
      {/* Title block */}
      <div className="flex items-start justify-between gap-2 lg:w-60 lg:flex-shrink-0 lg:flex-col lg:items-start lg:justify-center">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug text-ink-primary transition-colors group-hover:text-accent-700">
            {project.tenHienThi}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">{project.id}</p>
        </div>
        <div className="flex-shrink-0">
          <Badge status={project.status} />
        </div>
      </div>

      {/* Info — one item per line */}
      <div className="flex flex-1 flex-col gap-2">
        {project.chuDauTu && (
          <InfoItem icon={Building2} label="Chủ đầu tư">
            {project.chuDauTu}
          </InfoItem>
        )}
        <InfoItem icon={MapPin} label="Vị trí">
          {project.viTri}
        </InfoItem>
        <InfoItem icon={Ruler} label="Diện tích QH">
          <span className="tabular">
            {project.tyLeQH ? `${project.tyLeQH} — ` : ''}
            {formatAreaFull(project)}
          </span>
        </InfoItem>
        <InfoItem icon={Grid3x3} label="Tổng số lô">
          <span className="tabular">{loText}</span>
        </InfoItem>
        <InfoItem icon={LayoutGrid} label="Tổng số ô nhỏ">
          <span className="tabular">
            {formatInteger(project.tongSoODat)} ô
          </span>
        </InfoItem>
        <InfoItem icon={CalendarRange} label="Thời gian kinh doanh">
          {project.thoiGianKinhDoanh ??
            formatMonthYear(project.duaVaoKinhDoanh)}
        </InfoItem>
      </div>

      {/* Actions + open project */}
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3 lg:flex-shrink-0 lg:flex-col lg:items-end lg:gap-2 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        <CardActions
          project={project}
          onEdit={onEdit}
          onHide={onHide}
          onRestore={onRestore}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(project);
          }}
          tabIndex={-1}
          aria-hidden="true"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-accent-600 transition-colors group-hover:bg-accent-50 group-hover:text-accent-700"
        >
          Mở dự án
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

// ---- Contact-admin dialog (add project) -------------------------------
function ContactAdminDialog({ onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="contact-admin-title"
    >
      <div className="w-full max-w-[420px] overflow-hidden rounded-lg bg-surface-1 p-6 shadow-xl">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-info-bg">
              <Info className="h-5 w-5 text-info" />
            </div>
            <h2 id="contact-admin-title" className="text-lg font-semibold text-ink-primary">
              Liên hệ với admin
            </h2>
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
        <p className="text-sm text-ink-secondary">
          Việc thêm dự án mới liên quan đến dữ liệu quy hoạch gốc nên không thể
          tự thao tác. Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ
          khởi tạo dự án.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Screen -----------------------------------------------------------
export default function WelcomeScreen({
  projects,
  userName,
  onOpenProject,
  onSaveProject,
  onHideProject,
  onRestoreProject,
}) {
  const { logout } = useAuth();
  const [filter, setFilter] = useState('visible');
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { variant, project }
  const [userMenu, setUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Đóng menu user khi click ra ngoài.
  useEffect(() => {
    if (!userMenu) return;
    const onDocClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [userMenu]);

  const visibleCount = projects.filter((p) => p.status === 'visible').length;
  const shown = projects.filter((p) =>
    filter === 'all' ? true : p.status === filter
  );

  return (
    <div className="min-h-screen bg-app">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface-1 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-600 text-sm font-bold text-white">
            B
          </div>
          <span className="text-base font-semibold text-ink-primary">BasaoPM</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Thông báo"
            className="relative rounded-md p-2 text-ink-secondary hover:bg-surface-2"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              3
            </span>
          </button>
          <div className="relative pl-1" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenu}
              className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-surface-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
                {initialsOf(userName)}
              </div>
              <span className="text-sm font-medium text-ink-primary">{userName}</span>
              <ChevronDown
                className={`h-4 w-4 text-ink-muted transition-transform ${
                  userMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {userMenu && (
              <div
                role="menu"
                className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-line bg-surface-1 shadow-md"
              >
                <div className="border-b border-line px-3 py-2">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {userName}
                  </p>
                  <p className="text-xs text-ink-muted">Đã đăng nhập</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-danger hover:bg-danger-bg"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-ink-primary">
            Xin chào, {userName} 👋
          </h1>
          <p className="mt-2 text-base text-ink-secondary">
            Chọn một dự án để bắt đầu quản lý. Bạn đang có{' '}
            <span className="font-medium text-ink-primary">{visibleCount} dự án</span>{' '}
            đang hoạt động.
          </p>
        </div>

        {/* Toolbar row */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">
              Dự án của bạn
            </h2>
            {/* Segmented filter */}
            <div className="inline-flex rounded-md border border-line bg-surface-2 p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`rounded-[6px] px-3 py-1 text-sm font-medium transition-colors ${
                    filter === f.key
                      ? 'bg-surface-1 text-accent-700 shadow-sm'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowContactAdmin(true)}
            className="flex items-center gap-2 rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-700"
          >
            <Plus className="h-4 w-4" />
            Thêm dự án
          </button>
        </div>

        {/* List — horizontal rows */}
        <div className="flex flex-col gap-3">
          {shown.map((p) => (
            <ProjectOpenCard
              key={p.id}
              project={p}
              onOpen={onOpenProject}
              onEdit={(proj) => setEditing(proj)}
              onHide={(proj) => setConfirm({ variant: 'hide', project: proj })}
              onRestore={(proj) =>
                setConfirm({ variant: 'restore', project: proj })
              }
            />
          ))}

          {/* Add-project card — only in views that include visible projects */}
          {filter !== 'hidden' && (
            <button
              type="button"
              onClick={() => setShowContactAdmin(true)}
              className="flex items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-surface-1/60 p-4 text-center transition-colors hover:border-accent-500 hover:bg-accent-50 focus:outline-none focus:shadow-focus"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-ink-secondary">
                Thêm dự án mới
              </span>
              <span className="text-xs text-ink-muted">
                · Cần quản trị viên khởi tạo
              </span>
            </button>
          )}
        </div>

        {/* Empty state for "hidden" with none */}
        {shown.length === 0 && (
          <div className="rounded-lg border border-dashed border-line bg-surface-1 px-6 py-12 text-center">
            <p className="text-sm text-ink-muted">
              Không có dự án nào trong mục này.
            </p>
          </div>
        )}
      </main>

      {/* Overlays */}
      {showContactAdmin && (
        <ContactAdminDialog onClose={() => setShowContactAdmin(false)} />
      )}
      {editing && (
        <EditProjectModal
          key={editing.id}
          project={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            onSaveProject(updated);
            setEditing(null);
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          variant={confirm.variant}
          project={confirm.project}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.variant === 'hide') onHideProject(confirm.project);
            else onRestoreProject(confirm.project);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}
