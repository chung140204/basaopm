import { MapPin, Eye, Pencil, EyeOff, RotateCw, FolderSearch } from 'lucide-react';
import Badge from './Badge';
import { useAuth } from '../auth/AuthContext';
import {
  formatInteger,
  formatAreaFull,
  formatMonthYear,
} from '../utils/format';

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

function EmptyState({ onClearFilters }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2">
        <FolderSearch className="h-7 w-7 text-ink-muted" />
      </div>
      <p className="text-base font-medium text-ink-primary">
        Không tìm thấy dự án phù hợp
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-4 rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-2"
      >
        Xóa bộ lọc
      </button>
    </div>
  );
}

const TH = 'px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-muted';

export default function ProjectTable({
  projects,
  total,
  onEdit,
  onHide,
  onRestore,
  onClearFilters,
}) {
  const { can } = useAuth();
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface-1 shadow-sm">
        <EmptyState onClearFilters={onClearFilters} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-1 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="border-b border-line bg-surface-2">
            <tr className="text-left">
              <th className={TH}>Tên dự án</th>
              <th className={TH}>Vị trí</th>
              <th className={`${TH} text-right`}>Diện tích QH</th>
              <th className={`${TH} text-center`}>Khởi công</th>
              <th className={`${TH} text-center`}>Đưa vào KD</th>
              <th className={`${TH} text-right`}>Số lô</th>
              <th className={`${TH} text-right`}>Số ô đất</th>
              <th className={`${TH} text-center`}>Trạng thái</th>
              <th className={`${TH} text-center`}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const isHidden = p.status === 'hidden';
              return (
                <tr
                  key={p.id}
                  className={`border-b border-line transition-colors last:border-0 hover:bg-accent-50 ${
                    isHidden ? 'opacity-80' : ''
                  }`}
                >
                  {/* Tên + mã */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-primary">
                      {p.tenHienThi}
                    </div>
                    <div className="text-xs text-ink-muted">{p.id}</div>
                  </td>
                  {/* Vị trí */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-ink-secondary">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-ink-muted" />
                      <span className="max-w-[180px] truncate" title={p.viTri}>
                        {p.viTri}
                      </span>
                    </div>
                  </td>
                  {/* Diện tích */}
                  <td className="whitespace-nowrap px-4 py-3 text-right text-ink-primary tabular">
                    {formatAreaFull(p)}
                  </td>
                  {/* Khởi công */}
                  <td className="px-4 py-3 text-center text-ink-secondary tabular">
                    {formatMonthYear(p.khoiCong)}
                  </td>
                  {/* Đưa vào KD */}
                  <td className="px-4 py-3 text-center text-ink-secondary tabular">
                    {formatMonthYear(p.duaVaoKinhDoanh)}
                  </td>
                  {/* Số lô */}
                  <td className="px-4 py-3 text-right text-ink-primary tabular">
                    {formatInteger(p.tongSoLo)}
                  </td>
                  {/* Số ô đất */}
                  <td className="px-4 py-3 text-right text-ink-primary tabular">
                    {formatInteger(p.tongSoODat)}
                  </td>
                  {/* Trạng thái */}
                  <td className="px-4 py-3 text-center">
                    <Badge status={p.status} />
                  </td>
                  {/* Hành động */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <IconButton icon={Eye} label="Xem chi tiết" />
                      {isHidden
                        ? can('project.hide') && (
                            <IconButton
                              icon={RotateCw}
                              label="Khôi phục dự án"
                              tone="accent"
                              onClick={() => onRestore(p)}
                            />
                          )
                        : (
                          <>
                            {can('project.edit') && (
                              <IconButton
                                icon={Pencil}
                                label="Sửa thông tin"
                                onClick={() => onEdit(p)}
                              />
                            )}
                            {can('project.hide') && (
                              <IconButton
                                icon={EyeOff}
                                label="Ẩn dự án"
                                tone="warning"
                                onClick={() => onHide(p)}
                              />
                            )}
                          </>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination summary */}
      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-muted">
        <span>
          Hiển thị <span className="font-medium text-ink-secondary">{projects.length}</span> / {total} dự án
        </span>
      </div>
    </div>
  );
}
