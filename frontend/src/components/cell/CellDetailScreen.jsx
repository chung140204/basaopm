import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  FileText,
  Scale,
  Wallet,
  CheckCircle2,
  Circle,
  FileUp,
  Image as ImageIcon,
  Trash2,
  Loader2,
} from 'lucide-react';
import { zoneOfLot, zoneName } from '../../data/cells';
import { formatM2, formatDate, formatPercent } from '../../utils/format';
import { getCellDetail } from '../../services/cellsApi';
import { Card, Row, SectionTitle, val } from './cellDetailUi';
import PaymentPanel from './PaymentPanel';
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
    ownershipContract: d.contract?.code ?? null,
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
          unitPrice: d.contract.unitPrice,
          taxBearer: d.contract.taxBearer
            ? labelTaxBearer(d.contract.taxBearer)
            : null,
        }
      : null,
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
          purpose: d.mortgage.purpose, // mục đích thế chấp (từ DB)
        }
      : null,
    // Timeline pháp lý/THA thật từ DB (legalEvents) → format LegalHistory.
    legalHistory:
      d.legalEvents && d.legalEvents.length
        ? d.legalEvents.map((e, i) => ({
            status: e.status || labelLegalKind(e.kind),
            date: e.date,
            note: e.content,
            agency: e.agency, // cơ quan thi hành án (enforce_agency từ DB)
            current: i === 0,
            tone: i === 0 ? 'current' : 'done',
          }))
        : [],
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
              <span className="flex flex-col gap-0.5 text-xs italic text-ink-muted">
                <span>{it.note || '—'}</span>
                {it.agency && (
                  <span className="not-italic text-ink-secondary">
                    CQ thi hành án: {it.agency}
                  </span>
                )}
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
  // status: 'loading' (đang gọi API) | 'ok' (có DB) | 'failed' (API null).
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState('loading');
  // Chỉ dùng DB khi đã có detail (status='ok'). Khi đang tải / API lỗi, ẩn TẤT
  // CẢ field nghiệp vụ (nested LẪN phẳng: owner/address/planningType/construction
  // /contract/legalHistory...) để KHÔNG hiện data tĩnh từ cells.js. Chỉ giữ field
  // định danh thật (mã ô/lô/diện tích) — những thứ luôn đúng từ grid.
  const p =
    status === 'ok'
      ? enrichWithDetail(base, detail)
      : {
          cellCode: base.cellCode,
          lotCode: base.lotCode,
          area: base.area,
          // nghiệp vụ: rỗng cho tới khi DB về
          currentOwner: null,
          address: null,
          ownershipContract: null,
          constructionStatus: null,
          buildDensity: null,
          buildFloors: null,
          planningType: null,
          value: null,
          paid: null,
          remaining: null,
          contract: null,
          payments: [],
          mortgage: null,
          legalHistory: [],
        };
  // Hồ sơ số hóa — quản lý cục bộ trong phiên (thêm/xóa khi tải tệp).
  const [documents, setDocuments] = useState(base.documents ?? []);

  // Kéo chi tiết theo mã ô khi mở màn / đổi ô.
  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setStatus('loading');
    if (base.cellCode) {
      fetchCellDetail(base.cellCode).then((d) => {
        if (cancelled) return;
        setDetail(d);
        setStatus(d ? 'ok' : 'failed');
      });
    } else {
      setStatus('failed');
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
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          {status === 'loading' && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải dữ liệu từ máy chủ…
            </div>
          )}
          {status === 'failed' && (
            <div className="mb-4 rounded-md border border-warning/40 bg-warning-bg px-4 py-2.5 text-sm text-warning">
              Không kết nối được máy chủ — đang hiển thị dữ liệu ngoại tuyến.
            </div>
          )}
          {tab === 'legal' && (
            <LegalTab
              p={p}
              documents={documents}
              onChangeDocuments={setDocuments}
            />
          )}
          {tab === 'payment' && <PaymentPanel p={p} />}
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
      <div className="mb-2">
        <SectionTitle>Hồ sơ số hóa</SectionTitle>
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
