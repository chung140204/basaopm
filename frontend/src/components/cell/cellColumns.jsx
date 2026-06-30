// Định nghĩa TẤT CẢ cột cho bảng "Quản lý theo ô". Người dùng bật/tắt cột nào
// muốn xem (lưu localStorage). Mỗi cột: key, label, render(p), align?, defaultOn?,
// locked? (luôn hiển thị, không cho tắt — vd Mã ô).
//   p = cell.properties (đã merge data DB qua useDbCells/buildGridCell).
import { zoneOfCell, zoneName } from '../../data/cells';
import { labelFor, getLayer } from '../../lib/layers';
import { formatM2, formatCurrency } from '../../utils/format';
import {
  labelPlanning,
  labelConstruction,
  labelBook,
} from '../../data/enumLabels';

function colorOf(layerId, value) {
  return getLayer(layerId).statuses.find((s) => s.value === value)?.fill ?? '#94A3B8';
}

// Dot màu trạng thái + nhãn (cho các cột enum có layer).
function StatusCell({ layerId, value }) {
  return (
    <span className="flex items-center gap-1.5 text-ink-secondary">
      <span
        className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: colorOf(layerId, value) }}
      />
      {labelFor(layerId, value)}
    </span>
  );
}

// Giá trị text trơn; '—' khi rỗng.
const txt = (v) => (v == null || v === '' ? '—' : v);

// Mật độ XD: số → '72,8%'; số tầng: 'min-max'.
function buildFloors(p) {
  if (p.buildFloors) return p.buildFloors; // đã dạng '2-5 tầng'
  if (p.buildFloorMin != null) return `${p.buildFloorMin}-${p.buildFloorMax} tầng`;
  return '—';
}

// align: 'left' (mặc định) | 'right' (số).
export const CELL_COLUMNS = [
  {
    key: 'cellCode',
    label: 'Mã ô',
    locked: true,
    render: (p) => <span className="font-medium text-ink-primary">{p.cellCode}</span>,
  },
  { key: 'lotCode', label: 'Mã lô', defaultOn: true, render: (p) => txt(p.lotCode) },
  {
    key: 'zone',
    label: 'Phân khu',
    defaultOn: true,
    render: (p) => zoneName(zoneOfCell(p)),
  },
  {
    key: 'area',
    label: 'Diện tích',
    align: 'right',
    defaultOn: true,
    render: (p) => <span className="tabular">{formatM2(p.area)}</span>,
  },
  {
    key: 'businessStatus',
    label: 'Kinh doanh',
    defaultOn: true,
    render: (p) => <StatusCell layerId="business" value={p.businessStatus} />,
  },
  {
    key: 'collateralStatus',
    label: 'Pháp lý',
    defaultOn: true,
    render: (p) => <StatusCell layerId="legal" value={p.collateralStatus} />,
  },
  {
    key: 'paymentStatus',
    label: 'Thanh toán',
    defaultOn: true,
    render: (p) => <StatusCell layerId="payment" value={p.paymentStatus} />,
  },
  {
    key: 'value',
    label: 'Giá trị',
    align: 'right',
    defaultOn: true,
    render: (p) => <span className="tabular">{formatCurrency(p.value)}</span>,
  },
  // ---- Các cột mở rộng (mặc định TẮT) ----
  { key: 'owner', label: 'Chủ sở hữu', render: (p) => txt(p.currentOwner ?? p.owner) },
  { key: 'address', label: 'Địa chỉ', render: (p) => txt(p.address) },
  {
    key: 'planningType',
    label: 'Loại quy hoạch',
    render: (p) => labelPlanning(p.planningType),
  },
  {
    key: 'bookStatus',
    label: 'Tình trạng sổ',
    render: (p) => labelBook(p.bookStatus),
  },
  { key: 'bookNo', label: 'Số hiệu sổ', render: (p) => txt(p.bookNo) },
  {
    key: 'constructionStatus',
    label: 'Tình trạng xây dựng',
    render: (p) => labelConstruction(p.constructionStatus),
  },
  { key: 'buildFloors', label: 'Số tầng', render: (p) => buildFloors(p) },
  {
    key: 'paid',
    label: 'Đã thanh toán',
    align: 'right',
    render: (p) =>
      p.paid != null ? <span className="tabular">{formatCurrency(p.paid)}</span> : '—',
  },
  {
    key: 'remaining',
    label: 'Còn lại',
    align: 'right',
    render: (p) =>
      p.remaining != null ? (
        <span className="tabular">{formatCurrency(p.remaining)}</span>
      ) : (
        '—'
      ),
  },
  { key: 'note', label: 'Ghi chú', render: (p) => txt(p.note) },
];

// Bộ cột bật mặc định (key list) — gồm cột locked + defaultOn.
export const DEFAULT_VISIBLE_COLUMNS = CELL_COLUMNS.filter(
  (c) => c.locked || c.defaultOn
).map((c) => c.key);
