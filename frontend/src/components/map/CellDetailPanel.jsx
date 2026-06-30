import { useEffect, useState } from 'react';
import { X, Lock, Pencil, FileText, Upload } from 'lucide-react';
import { labelFor, getLayer } from '../../lib/layers';
import { SUBDIVISIONS } from '../../data/cells';
import {
  formatM2,
  formatCurrency,
  formatDate,
} from '../../utils/format';
import { getCellDetail } from '../../services/cellsApi';
import ResponsiveSidePanel from '../common/ResponsiveSidePanel';

const TABS = [
  { key: 'identity', label: 'Định danh' },
  { key: 'business', label: 'Kinh doanh' },
  { key: 'legal', label: 'Pháp lý' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'docs', label: 'Hồ sơ' },
];

// Reuse Badge by mapping our status colours through a tone wrapper.
function StatusBadge({ layerId, value }) {
  const text = labelFor(layerId, value);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: colorOf(layerId, value) }}
      />
      {text}
    </span>
  );
}

// Small local colour lookup (kept simple; mirrors layers.js fills).
function colorOf(layerId, value) {
  return getLayer(layerId).statuses.find((s) => s.value === value)?.fill ?? '#94A3B8';
}

const subName = (id) => SUBDIVISIONS.find((s) => s.id === id)?.name ?? id;

// Nhãn tiếng Việt cho các enum DB (book/construction/legal_event).
const BOOK_LABEL = {
  none: 'Chưa cấp sổ',
  issued_transferred: 'Đã có sổ - chuyển giao',
  issued_in_progress: 'Đã có sổ - đang giao dịch',
};
const CONSTRUCTION_LABEL = {
  not_handed_over: 'Chưa giao',
  built: 'Đã xây dựng',
};
const LEGAL_KIND_LABEL = {
  enforcement: 'Thi hành án',
  book_issuance: 'Cấp sổ',
  mortgage_change: 'Thay đổi thế chấp',
  status_change: 'Thay đổi trạng thái',
  other: 'Khác',
};
const bookLabel = (v) => BOOK_LABEL[v] ?? (v ? v : '—');
const constructionLabel = (v) => CONSTRUCTION_LABEL[v] ?? (v ? v : '—');
const legalKindLabel = (v) => LEGAL_KIND_LABEL[v] ?? (v ? v : 'Sự kiện');

function Row({ label, children, locked }) {
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

export default function CellDetailPanel({ feature, onClose, onEdit }) {
  const [tab, setTab] = useState('identity');
  const [detail, setDetail] = useState(null); // chi tiết DB: contract/payments/mortgage/legal
  const p = feature.properties;

  // Reset to first tab when switching cells.
  useEffect(() => setTab('identity'), [feature.id]);

  // Kéo chi tiết THẬT từ DB (contract/payments/mortgage/legal timeline) theo mã ô.
  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    if (p.cellCode) {
      getCellDetail(p.cellCode).then((d) => {
        if (!cancelled) setDetail(d);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [p.cellCode]);

  return (
    <ResponsiveSidePanel onClose={onClose} widthClass="md:w-[360px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">
            Chi tiết ô {p.cellCode}
          </h3>
          <p className="text-xs text-ink-muted">
            {p.lotCode} ·{' '}
            {subName(p.subdivisionId)}
          </p>
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

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-line px-2 py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-accent-50 text-accent-700'
                : 'text-ink-secondary hover:bg-surface-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 divide-y divide-line overflow-y-auto px-4 py-2">
        {tab === 'identity' && (
          <div className="py-1">
            <Row label="Mã ô" locked>{p.cellCode}</Row>
            <Row label="Mã lô" locked>{p.lotCode}</Row>
            <Row label="Phân khu" locked>
              {subName(p.subdivisionId)}
            </Row>
            <Row label="Diện tích" locked>
              <span className="tabular">{formatM2(p.area)}</span>
            </Row>
            <Row label="Tọa độ tâm" locked>
              <span className="tabular">
                {p.centroid[0]}, {p.centroid[1]}
              </span>
            </Row>
            <Row label="Loại quy hoạch" locked>{p.planningType}</Row>
          </div>
        )}

        {tab === 'business' && (
          <div className="py-1">
            <Row label="Trạng thái KD">
              <StatusBadge layerId="business" value={p.businessStatus} />
            </Row>
            <Row label="Chủ sở hữu">{detail?.owner ?? p.currentOwner ?? '—'}</Row>
            <Row label="Giá bán">
              <span className="tabular">{formatCurrency(p.value)}</span>
            </Row>
            <Row label="Tình trạng sổ">
              {bookLabel(detail?.bookStatus ?? p.bookStatus)}
            </Row>
            <Row label="Số hiệu sổ">{detail?.bookNo ?? p.bookNo ?? '—'}</Row>
            <Row label="Tình trạng XD">
              {constructionLabel(detail?.constructionStatus ?? p.constructionStatus)}
            </Row>
            <Row label="Mật độ XD">
              {p.buildDensity != null ? `${p.buildDensity}%` : '—'}
            </Row>
            <Row label="Số tầng">
              {detail?.buildFloorMin != null
                ? `${detail.buildFloorMin}-${detail.buildFloorMax} tầng`
                : p.buildFloors ?? '—'}
            </Row>
          </div>
        )}

        {tab === 'legal' && (
          <div className="py-1">
            <Row label="Tài sản bảo đảm" locked>
              <StatusBadge layerId="legal" value={p.collateralStatus} />
            </Row>
            <Row label="Pháp lý nội bộ">{detail?.internalLegal ?? p.internalLegal ?? '—'}</Row>
            {detail?.mortgage && (
              <>
                <Row label="Ngân hàng / tổ chức">{detail.mortgage.lender ?? '—'}</Row>
                <Row label="Bên vay">{detail.mortgage.borrower ?? '—'}</Row>
                <Row label="Tình trạng thế chấp">
                  {detail.mortgage.status === 'released' ? 'Đã giải chấp' : 'Đang thế chấp'}
                </Row>
              </>
            )}
            {/* Lịch sử pháp lý / thi hành án (timeline thật từ DB) */}
            {detail?.legalEvents?.length > 0 && (
              <div className="pt-2">
                <p className="pb-1.5 text-xs font-semibold text-ink-muted">
                  Lịch sử pháp lý / thi hành án
                </p>
                <ul className="space-y-2">
                  {detail.legalEvents.map((e, i) => (
                    <li key={i} className="rounded-md border border-line px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-ink-primary">
                          {e.status ?? legalKindLabel(e.kind)}
                        </span>
                        {e.date && (
                          <span className="text-xs text-ink-muted">
                            {formatDate(e.date)}
                          </span>
                        )}
                      </div>
                      {e.content && (
                        <p className="mt-1 text-xs text-ink-secondary">{e.content}</p>
                      )}
                      {e.agency && (
                        <p className="mt-0.5 text-xs text-ink-muted">CQ: {e.agency}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'payment' && (
          <div className="py-1">
            <Row label="Tình trạng">
              <StatusBadge layerId="payment" value={p.paymentStatus} />
            </Row>
            {detail?.contract && (
              <>
                <Row label="Số hợp đồng">{detail.contract.code ?? '—'}</Row>
                <Row label="Khách hàng">{detail.contract.customer ?? '—'}</Row>
                <Row label="Ngày ký">
                  {detail.contract.signDate ? formatDate(detail.contract.signDate) : '—'}
                </Row>
                <Row label="Bên chịu thuế">
                  {detail.contract.taxBearer === 'investor'
                    ? 'Chủ đầu tư'
                    : detail.contract.taxBearer === 'customer'
                    ? 'Khách hàng'
                    : '—'}
                </Row>
              </>
            )}
            <Row label="Giá trị HĐ">
              <span className="tabular">{formatCurrency(p.value)}</span>
            </Row>
            <Row label="Đã thanh toán">
              <span className="tabular">
                {detail?.paid != null ? formatCurrency(detail.paid) : '—'}
              </span>
            </Row>
            <Row label="Còn lại">
              <span className="tabular">
                {detail?.remaining != null ? formatCurrency(detail.remaining) : '—'}
              </span>
            </Row>
            {/* Lịch sử thanh toán (thật từ DB) */}
            {detail?.payments?.length > 0 && (
              <div className="pt-2">
                <p className="pb-1.5 text-xs font-semibold text-ink-muted">
                  Lịch sử thanh toán
                </p>
                <ul className="space-y-1.5">
                  {detail.payments.map((pay, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-xs"
                    >
                      <span className="text-ink-secondary">
                        {pay.date ? formatDate(pay.date) : '—'}
                        {pay.note ? ` · ${pay.note}` : ''}
                      </span>
                      <span className="tabular font-medium text-ink-primary">
                        {formatCurrency(pay.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'docs' && (
          <div className="py-2">
            {p.documents.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted">
                Chưa có hồ sơ số hóa.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {p.documents.map((d) => (
                  <li
                    key={d.name}
                    className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink-secondary"
                  >
                    <FileText className="h-4 w-4 text-accent-600" />
                    <span className="truncate">{d.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line py-2 text-sm text-ink-muted hover:bg-surface-2"
            >
              <Upload className="h-4 w-4" />
              Tải lên hồ sơ
            </button>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={() => onEdit(feature)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-600 py-2 text-sm font-medium text-white hover:bg-accent-700"
        >
          <Pencil className="h-4 w-4" />
          Cập nhật thông tin ô
        </button>
      </div>
    </ResponsiveSidePanel>
  );
}
