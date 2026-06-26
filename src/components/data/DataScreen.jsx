import { Table2 } from 'lucide-react';

// Placeholder for Screen 4 (lot/cell detailed data tables). To be built later.
export default function DataScreen() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-app p-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2">
        <Table2 className="h-7 w-7 text-ink-muted" />
      </div>
      <h2 className="text-lg font-semibold text-ink-primary">
        Quản lý dữ liệu chi tiết
      </h2>
      <p className="mt-1 max-w-md text-sm text-ink-muted">
        Danh sách thông tin theo lô và theo ô (lọc theo phân khu / mã lô) sẽ
        được bổ sung ở bước tiếp theo.
      </p>
      <span className="mt-4 rounded-full bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700">
        Sắp ra mắt
      </span>
    </main>
  );
}
