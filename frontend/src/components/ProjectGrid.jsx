import { FolderSearch } from 'lucide-react';
import ProjectCard from './ProjectCard';

function EmptyState({ onClearFilters }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface-1 px-6 py-16 text-center shadow-sm">
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

export default function ProjectGrid({
  projects,
  total,
  onEdit,
  onHide,
  onRestore,
  onClearFilters,
}) {
  return (
    <div>
      <div className="flex flex-col gap-3">
        {projects.length === 0 ? (
          <EmptyState onClearFilters={onClearFilters} />
        ) : (
          projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={onEdit}
              onHide={onHide}
              onRestore={onRestore}
            />
          ))
        )}
      </div>
      {projects.length > 0 && (
        <p className="mt-4 text-sm text-ink-muted">
          Hiển thị{' '}
          <span className="font-medium text-ink-secondary">
            {projects.length}
          </span>{' '}
          / {total} dự án
        </p>
      )}
    </div>
  );
}
