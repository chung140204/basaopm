// UI nguyên thủy dùng chung cho màn chi tiết ô (CellDetailScreen + PaymentPanel).
// Tách ra đây để 2 component cùng dùng mà không tạo vòng import.
import { Lock } from 'lucide-react';
import { labelFor, getLayer } from '../../lib/layers';

// Màu chấm trạng thái theo layer (legal/business/...).
function colorOf(layerId, value) {
  return getLayer(layerId).statuses.find((s) => s.value === value)?.fill ?? '#94A3B8';
}

// Chip trạng thái: chấm màu + nhãn (vd "Đã bán - chưa có sổ").
export function StatusBadge({ layerId, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: colorOf(layerId, value) }}
      />
      {labelFor(layerId, value)}
    </span>
  );
}

// Render giá trị, fallback "—" khi rỗng/null.
export function val(v) {
  if (v == null || v === '') return <span className="text-ink-muted">—</span>;
  return v;
}

// Một dòng nhãn ↔ giá trị (giá trị canh phải). locked → hiện ổ khóa.
export function Row({ label, children, locked }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="flex items-center gap-1 text-sm text-ink-muted">
        {label}
        {locked && <Lock className="h-3 w-3" />}
      </span>
      <span className="text-right text-sm font-medium text-ink-primary">
        {children}
      </span>
    </div>
  );
}

// Tiêu đề nhỏ in hoa của mỗi nhóm.
export function SectionTitle({ children }) {
  return (
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      {children}
    </p>
  );
}

// Khối thẻ bao quanh mỗi nhóm nội dung.
export function Card({ children }) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 p-4">{children}</div>
  );
}
