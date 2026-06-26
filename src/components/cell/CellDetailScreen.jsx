import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Lock,
  Pencil,
  FileText,
  Upload,
  Scale,
  Wallet,
  CheckCircle2,
  Circle,
  FileUp,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { labelFor, getLayer } from '../map/layers';
import { zoneOfLot, zoneName } from '../../data/cells';
import { formatM2, formatCurrency, formatDate, formatPercent } from '../../utils/format';
import {
  paymentProgress,
  paymentMethodLabel,
  mortgageStatusLabel,
} from '../../utils/payment';
import { getCellDetail } from '../../services/cellsApi';
import {
  labelConstruction,
  labelPlanning,
  labelTaxBearer,
  labelLegalKind,
} from '../../data/enumLabels';

// Mã ô mock dùng dạng 'DCB02-1' nhưng DB lưu zero-padded 'DCB02-01'. Thử mã
// gốc trước; nếu không có (404 → null) thử lại bản pad 2 chữ số phần sau '-'.
// Nhờ vậy cả ô merge-từ-mock (DCB02) lẫn ô dựng-thẳng-từ-DB (DCB09) đều khớp.
function padCellCode(code) {
  return String(code).replace(/-(\d+)$/, (_, n) => `-${n.padStart(2, '0')}`);
}

async function fetchCellDetail(cellCode) {
  let d = await getCellDetail(cellCode);
  if (!d) {
    const padded = padCellCode(cellCode);
    if (padded !== cellCode) d = await getCellDetail(padded);
  }
  return d;
}

// Map detail từ DB (getCellDetail) → bổ sung các field nested mà UI cần
// (contract/payments/mortgage/legalHistory) + dịch enum sang tiếng Việt
// (dùng nhãn tập trung từ data/enumLabels). Trả về object properties mở rộng.
function enrichWithDetail(base, d) {
  if (!d) return base;
  return {
    ...base,
    currentOwner: d.owner ?? base.currentOwner,
    address: d.address ?? base.address,
    ownershipContract: d.contract?.code ?? base.ownershipContract,
    constructionStatus: d.constructionStatus
      ? labelConstruction(d.constructionStatus)
      : base.constructionStatus,
    planningType: d.planningType
      ? labelPlanning(d.planningType)
      : base.planningType,
    buildDensity: d.buildDensity ?? base.buildDensity,
    buildFloors:
      d.buildFloorMin != null
        ? `${d.buildFloorMin}-${d.buildFloorMax}`
        : base.buildFloors,
    value: d.value ?? base.value,
    paid: d.paid ?? base.paid,
    remaining: d.remaining ?? base.remaining,
    // Hợp đồng (tab Giao dịch)
    contract: d.contract
      ? {
          code: d.contract.code,
          signDate: d.contract.signDate,
          customer: d.contract.customer,
          totalValue: d.value,
          taxBearer: d.contract.taxBearer
            ? labelTaxBearer(d.contract.taxBearer)
            : null,
        }
      : base.contract,
    payments: (d.payments || []).map((pay) => ({
      date: pay.date,
      amount: pay.amount,
      method: pay.method,
      voucher: pay.voucher,
      note: pay.note,
    })),
    mortgage: d.mortgage
      ? {
          lender: d.mortgage.lender,
          status: d.mortgage.status,
          outstanding: d.mortgage.loanValue,
          note: d.mortgage.note,
        }
      : base.mortgage,
    // Timeline pháp lý/THA thật từ DB (legalEvents) → format LegalHistory.
    legalHistory:
      d.legalEvents && d.legalEvents.length
        ? d.legalEvents.map((e, i) => ({
            status: e.status || labelLegalKind(e.kind),
            date: e.date,
            note: e.content,
            current: i === 0,
            tone: i === 0 ? 'current' : 'done',
          }))
        : base.legalHistory,
  };
}

// Full-screen detail for a single cell ("Quản lý theo ô" flow).
// Two horizontal tabs:
//   legal:   Pháp lý & hồ sơ  (định danh + pháp lý sổ + hồ sơ)
//   payment: Giao dịch & thanh toán (hợp đồng + lộ trình + lịch sử + thế chấp)
const TABS = [
  { key: 'legal', label: 'Pháp lý & hồ sơ', icon: Scale },
  { key: 'payment', label: 'Giao dịch & thanh toán', icon: Wallet },
];

function colorOf(layerId, value) {
  return getLayer(layerId).statuses.find((s) => s.value === value)?.fill ?? '#94A3B8';
}

function StatusBadge({ layerId, value }) {
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

// Render a value, falling back to "—" when empty/null.
function val(v) {
  if (v == null || v === '') return <span className="text-ink-muted">—</span>;
  return v;
}

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

function SectionTitle({ children }) {
  return (
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      {children}
    </p>
  );
}

// Card wrapper so each section reads as a tidy block in the wider layout.
function Card({ children }) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 p-4">{children}</div>
  );
}

// Timeline lịch sử pháp lý: mỗi mốc gồm trạng thái/hồ sơ, ngày cập nhật, ghi chú.
function LegalHistory({ items }) {
  if (!items || items.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-ink-muted">
        Chưa có lịch sử pháp lý.
      </p>
    );
  }
  return (
    <div className="mt-1">
      {/* Header cột */}
      <div className="grid grid-cols-[1fr_84px_1fr] gap-3 border-b border-line pb-2 text-[11px] font-medium text-ink-muted">
        <span>Trạng thái / Hồ sơ</span>
        <span>Ngày cập nhật</span>
        <span>Ghi chú</span>
      </div>
      <ol className="divide-y divide-line">
        {items.map((it, i) => {
          const isDone = it.tone === 'done';
          return (
            <li
              key={i}
              className="grid grid-cols-[1fr_84px_1fr] items-start gap-3 py-2.5 text-sm"
            >
              <span className="flex items-start gap-2">
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
                )}
                <span className="flex flex-wrap items-center gap-1.5 font-medium text-ink-primary">
                  {it.status}
                  {it.current && (
                    <span className="rounded-full bg-accent-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                      Hiện tại
                    </span>
                  )}
                </span>
              </span>
              <span className="text-xs text-ink-muted tabular">
                {it.date ? formatDate(it.date) : '—'}
              </span>
              <span className="text-xs italic text-ink-muted">
                {it.note || '—'}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function CellDetailScreen({ feature, defaultTab = 'legal', onBack }) {
  const [tab, setTab] = useState(defaultTab);
  const base = feature.properties;
  // Chi tiết THẬT từ DB (contract/payments/mortgage/legal timeline).
  const [detail, setDetail] = useState(null);
  const p = detail ? enrichWithDetail(base, detail) : base;
  // Hồ sơ số hóa — quản lý cục bộ trong phiên (thêm/xóa khi tải tệp).
  const [documents, setDocuments] = useState(base.documents ?? []);

  // Kéo chi tiết theo mã ô khi mở màn / đổi ô.
  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    if (base.cellCode) {
      fetchCellDetail(base.cellCode).then((d) => {
        if (!cancelled) setDetail(d);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [base.cellCode]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-app">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-line bg-surface-1 px-6 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách ô
        </button>
        <div className="h-6 w-px bg-line" />
        <div>
          <h2 className="text-base font-semibold text-ink-primary">
            Chi tiết ô {p.cellCode}
          </h2>
          <p className="text-xs text-ink-muted">
            {p.lotCode} · {zoneName(zoneOfLot(p.lotCode))} · {formatM2(p.area)}
          </p>
        </div>

        <button
          type="button"
          className="ml-auto flex items-center gap-2 rounded-md bg-accent-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-700"
        >
          <Pencil className="h-4 w-4" />
          Cập nhật thông tin ô
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line bg-surface-1 px-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'text-accent-700'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          {tab === 'legal' && (
            <LegalTab
              p={p}
              documents={documents}
              onChangeDocuments={setDocuments}
            />
          )}
          {tab === 'payment' && <PaymentTab p={p} />}
        </div>
      </div>
    </div>
  );
}

// Tab "Pháp lý & hồ sơ"
function LegalTab({ p, documents, onChangeDocuments }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <SectionTitle>Thông tin định danh</SectionTitle>
        <Row label="Mã ô" locked>{p.cellCode}</Row>
        <Row label="Mã lô" locked>{p.lotCode}</Row>
        <Row label="Chủ sở hữu">{val(p.currentOwner)}</Row>
        <Row label="Số hợp đồng">{val(p.ownershipContract)}</Row>
        <Row label="Địa chỉ">{val(p.address)}</Row>
        <Row label="Diện tích" locked>
          <span className="tabular">{formatM2(p.area)}</span>
        </Row>
      </Card>

      <Card>
        <SectionTitle>Lịch sử pháp lý</SectionTitle>
        <LegalHistory items={p.legalHistory} />
      </Card>

      <Card>
        <SectionTitle>Xây dựng</SectionTitle>
        <Row label="Tình trạng xây dựng">{val(p.constructionStatus)}</Row>
        <Row label="Mật độ XD được phép">
          {p.buildDensity != null ? (
            <span className="tabular">{formatPercent(p.buildDensity)}</span>
          ) : (
            val(null)
          )}
        </Row>
        <Row label="Số tầng được phép">
          {p.buildFloors != null ? (
            <span className="tabular">{p.buildFloors} tầng</span>
          ) : (
            val(null)
          )}
        </Row>
        <Row label="Loại quy hoạch" locked>{p.planningType}</Row>
      </Card>

      <DocumentUpload
        documents={documents}
        onChange={onChangeDocuments}
      />
    </div>
  );
}

// ---- Hồ sơ số hóa: kéo-thả / chọn tệp + danh sách tệp (xóa được) ----------
const MAX_FILE_MB = 25;

function fmtFileSize(bytes) {
  if (bytes == null) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

function isImage(name = '') {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

// Ngày hôm nay dạng YYYY-MM-DD (cho ngày tải lên). Date được phép trong UI runtime.
function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function DocumentUpload({ documents, onChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || [])
      .filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024)
      .map((f) => ({
        name: f.name,
        size: f.size,
        date: todayISO(),
      }));
    if (incoming.length) onChange([...documents, ...incoming]);
  };

  const removeAt = (i) =>
    onChange(documents.filter((_, idx) => idx !== i));

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <SectionTitle>Hồ sơ số hóa</SectionTitle>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Tải lên hồ sơ"
          title="Tải lên hồ sơ"
          className="rounded-md p-1.5 text-accent-600 hover:bg-accent-50"
        >
          <Upload className="h-4 w-4" />
        </button>
      </div>

      {/* Vùng kéo-thả */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragOver
            ? 'border-accent-500 bg-accent-50'
            : 'border-line hover:border-accent-500 hover:bg-surface-2'
        }`}
      >
        <FileUp className="h-7 w-7 text-accent-600" />
        <span className="text-sm font-medium text-ink-secondary">
          Kéo thả tệp hoặc tải lên
        </span>
        <span className="text-xs text-ink-muted">
          Hỗ trợ PDF, JPG, PNG (Tối đa {MAX_FILE_MB}MB)
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ''; // cho phép chọn lại cùng tệp
        }}
      />

      {/* Danh sách tệp */}
      {documents.length > 0 && (
        <ul className="mt-3 space-y-2">
          {documents.map((d, i) => (
            <li
              key={`${d.name}-${i}`}
              className="flex items-center gap-2.5 rounded-md border border-line px-3 py-2"
            >
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md ${
                  isImage(d.name)
                    ? 'bg-info-bg text-info'
                    : 'bg-danger-bg text-danger'
                }`}
              >
                {isImage(d.name) ? (
                  <ImageIcon className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-primary">
                  {d.name}
                </p>
                <p className="text-xs text-ink-muted">
                  {[fmtFileSize(d.size), d.date ? formatDate(d.date) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Xóa ${d.name}`}
                title="Xóa"
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// Tab "Giao dịch & thanh toán" — 4 nhóm:
//   1) Hợp đồng  2) Lộ trình thanh toán  3) Lịch sử thanh toán  4) Thế chấp
function PaymentTab({ p }) {
  const c = p.contract;
  const payments = p.payments || [];
  const m = p.mortgage;
  // Lộ trình: tổng phải TT = giá trị HĐ (nếu có) hoặc giá bán.
  const totalDue = c?.totalValue ?? p.value ?? 0;
  // Nếu chưa có lịch sử từng lần nhưng có tổng đã trả (paid) → tính theo paid.
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
        <SectionTitle>Thông tin hợp đồng</SectionTitle>
        <Row label="Tình trạng KD">
          <StatusBadge layerId="business" value={p.businessStatus} />
        </Row>
        <Row label="Số hợp đồng">{val(c?.code ?? p.ownershipContract)}</Row>
        <Row label="Ngày ký">{c?.signDate ? formatDate(c.signDate) : val(null)}</Row>
        <Row label="Khách hàng">{val(c?.customer ?? p.currentOwner)}</Row>
        <Row label="Tổng giá trị HĐ">
          {c?.totalValue != null ? (
            <span className="tabular">{formatCurrency(c.totalValue)}</span>
          ) : (
            val(p.value || null)
          )}
        </Row>
        <Row label="Bên chịu thuế">{val(c?.taxBearer)}</Row>
      </Card>

      {/* 2) Lộ trình thanh toán */}
      <Card>
        <SectionTitle>Lộ trình thanh toán</SectionTitle>
        {totalDue > 0 ? (
          <>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-green-500"
                style={{ width: `${prog.percent}%` }}
              />
            </div>
            <Row label="Giá trị phải TT">
              <span className="tabular">{formatCurrency(prog.total)}</span>
            </Row>
            <Row label="Đã thanh toán">
              <span className="tabular text-green-700">{formatCurrency(prog.paid)}</span>
            </Row>
            <Row label="Còn lại">
              <span className="tabular text-amber-700">{formatCurrency(prog.remaining)}</span>
            </Row>
            <Row label="Tỷ lệ">{prog.percent.toFixed(1)}%</Row>
          </>
        ) : (
          <p className="py-2 text-sm text-ink-muted">— chưa có hợp đồng —</p>
        )}
      </Card>

      {/* 3) Lịch sử thanh toán */}
      <Card>
        <SectionTitle>Lịch sử thanh toán</SectionTitle>
        {payments.length === 0 ? (
          <p className="py-2 text-sm text-ink-muted">— chưa có lần thanh toán nào —</p>
        ) : (
          <ul className="space-y-1.5">
            {payments.map((pay, i) => (
              <li key={i} className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-primary tabular">
                    {formatCurrency(pay.amount)}
                  </span>
                  <span className="text-xs text-ink-muted">{formatDate(pay.date)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                  <span>{paymentMethodLabel(pay.method)}</span>
                  {pay.voucher && <span>· CT: {pay.voucher}</span>}
                </div>
                {pay.note && (
                  <p className="mt-0.5 text-xs text-ink-secondary">{pay.note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line py-1.5 text-xs text-ink-muted hover:bg-surface-2"
        >
          + Ghi nhận thanh toán
        </button>
      </Card>

      {/* 4) Thế chấp ngân hàng */}
      <Card>
        <SectionTitle>Thế chấp ngân hàng</SectionTitle>
        <Row label="Tình trạng thế chấp">
          {m?.status ? mortgageStatusLabel(m.status) : (
            <StatusBadge layerId="legal" value={p.collateralStatus} />
          )}
        </Row>
        <Row label="Tổ chức nhận thế chấp">{val(m?.lender)}</Row>
        <Row label="Giá trị khoản vay">
          {m?.loanValue != null ? (
            <span className="tabular">{formatCurrency(m.loanValue)}</span>
          ) : (
            val(null)
          )}
        </Row>
        <Row label="Dư nợ thế chấp">
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
