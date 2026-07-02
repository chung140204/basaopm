// Skeleton loading dùng chung — khung xương shimmer mượt (class .skeleton định
// nghĩa animation trong index.css). Dùng thay spinner/"Đang tải…" cho các panel
// và màn danh sách để trải nghiệm chờ mượt hơn.

/** 1 khối skeleton cơ bản. `className` để chỉnh kích thước (w/h) + bo góc. */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

/** 1 dòng "nhãn — giá trị" (giống <Row>): nhãn ngắn bên trái, giá trị bên phải. */
export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3.5 w-32" />
    </div>
  );
}

/** N dòng skeleton liên tiếp (danh sách field trong panel). */
export function SkeletonRows({ count = 5 }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

/** 1 thẻ card skeleton (tiêu đề + vài dòng) — cho layout dạng card. */
export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <Skeleton className="mb-3 h-4 w-40" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-full" />
        ))}
      </div>
    </div>
  );
}
