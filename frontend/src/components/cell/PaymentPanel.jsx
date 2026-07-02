// Tab "Giao dịch & thanh toán" — tách riêng từ CellDetailScreen.
// 4 nhóm: 1) Thông tin hợp đồng  2) Lộ trình thanh toán (tiến độ %)
//         3) Lộ trình thanh toán chi tiết (từng đợt)  4) Thế chấp ngân hàng.
import { Lock, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import {
  paymentProgress,
  mortgageStatusLabel,
} from '../../utils/payment';
import { Card, Row, SectionTitle, StatusBadge, val } from './cellDetailUi';
import { useAuth } from '../../auth/AuthContext';

// Mã ngắn của ô để gắn vào nhãn "Đợt N - <mã>" (phần sau '-' cuối, hoặc cả mã).
function shortCellCode(cellCode) {
  if (!cellCode) return '';
  const m = String(cellCode).match(/-([^-]+)$/);
  return m ? `${cellCode}` : cellCode;
}

export default function PaymentPanel({ p }) {
  const { can } = useAuth();
  const c = p.contract;
  const payments = p.payments || [];
  const m = p.mortgage;

  // Tổng phải TT = giá trị HĐ (nếu có) hoặc giá bán của ô.
  const totalDue = c?.totalValue ?? p.value ?? 0;
  // Chưa có lịch sử từng đợt nhưng có tổng đã trả (paid) → tính theo paid.
  const prog =
    payments.length === 0 && p.paid
      ? {
          total: totalDue,
          paid: p.paid,
          remaining: Math.max(totalDue - p.paid, 0),
          percent: totalDue > 0 ? Math.min(100, (p.paid / totalDue) * 100) : 0,
        }
      : paymentProgress(totalDue, payments);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* 1) Thông tin hợp đồng */}
      <Card>
        <div className="mb-1 flex items-center justify-between">
          <SectionTitle>Thông tin hợp đồng</SectionTitle>
          <StatusBadge layerId="business" value={p.businessStatus} />
        </div>
        <Row label="Số hợp đồng">{val(c?.code ?? p.ownershipContract)}</Row>
        <Row label="Thời gian giao dịch">
          {c?.signDate ? formatDate(c.signDate) : val(null)}
        </Row>
        <Row label="Chủ sở hữu">{val(c?.customer ?? p.currentOwner)}</Row>
        <Row label="Giá trị HĐ">
          {totalDue > 0 ? (
            <span className="tabular text-accent-700">{formatCurrency(totalDue)}</span>
          ) : (
            val(null)
          )}
        </Row>
        <Row label="Đơn giá giao dịch (m²)">
          {c?.unitPrice != null ? (
            <span className="tabular">{formatCurrency(c.unitPrice)}</span>
          ) : (
            val(null)
          )}
        </Row>
        <Row label="Bên chịu thuế">{val(c?.taxBearer)}</Row>
      </Card>

      {/* 2) Lộ trình thanh toán — tiến độ tổng thể */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>Lộ trình thanh toán</SectionTitle>
          {totalDue > 0 && (
            <span className="text-2xl font-bold text-success tabular">
              {prog.percent.toFixed(1)}%
            </span>
          )}
        </div>
        {totalDue > 0 ? (
          <>
            <p className="mb-1 text-xs text-ink-muted">Tiến độ tổng thể</p>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${prog.percent}%` }}
              />
            </div>
            <Row label="Giá trị phải TT">
              <span className="tabular">{formatCurrency(prog.total)}</span>
            </Row>
            <Row label="Đã thanh toán">
              <span className="tabular text-success">
                {formatCurrency(prog.paid)}
              </span>
            </Row>
            <Row label="Còn lại">
              <span className="tabular text-warning">
                {formatCurrency(prog.remaining)}
              </span>
            </Row>
          </>
        ) : (
          <p className="py-2 text-sm text-ink-muted">— chưa có hợp đồng —</p>
        )}
      </Card>

      {/* 3) Lộ trình thanh toán chi tiết — từng đợt */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>Lộ trình thanh toán chi tiết</SectionTitle>
          {can('cell.edit') && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Ghi nhận thanh toán
            </button>
          )}
        </div>
        {payments.length === 0 ? (
          <p className="py-2 text-sm text-ink-muted">— chưa có lần thanh toán nào —</p>
        ) : (
          <ul className="divide-y divide-line">
            {/* Stack: đợt MỚI NHẤT lên trên (đảo thứ tự hiển thị), nhưng số
                "Đợt N" vẫn theo thứ tự thời gian gốc. */}
            {payments
              .map((pay, i) => ({ pay, n: i + 1 }))
              .reverse()
              .map(({ pay, n }) => (
              <li key={n} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-2.5">
                {/* Cột trái: nhãn đợt (bỏ badge trạng thái suy ra theo yêu cầu). */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-ink-primary">
                    Đợt {n} · {shortCellCode(p.cellCode)}
                  </span>
                </div>
                {/* Cột phải: số tiền + ngày */}
                <div className="text-right">
                  <span className="block text-sm font-semibold text-success tabular">
                    {formatCurrency(pay.amount)}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {formatDate(pay.date)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 4) Thế chấp ngân hàng */}
      <Card>
        <SectionTitle>Thế chấp ngân hàng</SectionTitle>
        {/* Trạng thái nổi bật + icon khóa (như ảnh demo) */}
        <div className="my-2 flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-2 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-1 text-ink-muted">
            <Lock className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-ink-secondary">
            Tình trạng hiện tại
          </span>
          <span>
            {m?.status ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-1 px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    m.status === 'released' ? 'bg-success' : 'bg-danger'
                  }`}
                />
                {mortgageStatusLabel(m.status)}
              </span>
            ) : (
              <StatusBadge layerId="legal" value={p.collateralStatus} />
            )}
          </span>
        </div>
        {m?.borrower && <Row label="Bên đứng tên vay">{m.borrower}</Row>}
        <Row label="Tổ chức nhận thế chấp">{val(m?.lender)}</Row>
        <Row label="Mục đích thế chấp">{val(m?.purpose)}</Row>
        <Row label="Giá trị khoản vay">
          {m?.loanValue != null ? (
            <span className="tabular">{formatCurrency(m.loanValue)}</span>
          ) : (
            val(null)
          )}
        </Row>
        <Row label="Dư nợ hiện tại">
          {m?.outstanding != null ? (
            <span className="tabular">{formatCurrency(m.outstanding)}</span>
          ) : (
            val(null)
          )}
        </Row>
        <Row label="Ghi chú nội bộ">{val(m?.note)}</Row>
      </Card>
    </div>
  );
}
