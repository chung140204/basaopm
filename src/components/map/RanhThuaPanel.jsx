import { useEffect, useMemo, useState } from 'react';
import { X, MapPin, Copy, Pencil, FileText, Check, Loader2 } from 'lucide-react';
import { labelFor, getLayer } from './layers';
import { formatCurrency, formatDate } from '../../utils/format';
import { saveRanhThuaMeta } from '../../services/planningApi';
import { mockStatusFor } from './ranhThuaMock';
import {
  paymentProgress,
  paymentMethodLabel,
  mortgageStatusLabel,
} from '../../utils/payment';

const TABS = [
  { key: 'identity', label: 'Định danh' },
  { key: 'business', label: 'Kinh doanh' },
  { key: 'legal', label: 'Pháp lý' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'docs', label: 'Hồ sơ' },
];

function colorOf(layerId, value) {
  return getLayer(layerId).statuses.find((s) => s.value === value)?.fill ?? '#94A3B8';
}

function StatusBadge({ layerId, value }) {
  if (!value) return <span className="text-sm text-ink-muted">—</span>;
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

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink-primary">
        {children}
      </span>
    </div>
  );
}

// Trường select để sửa (chế độ edit).
function SelectRow({ label, layerId, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-ink-muted">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-surface-1 px-2 py-1 text-sm text-ink-primary"
      >
        <option value="">—</option>
        {getLayer(layerId).statuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InputRow({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-ink-muted">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-40 rounded-md border border-line bg-surface-1 px-2 py-1 text-right text-sm text-ink-primary"
      />
    </div>
  );
}

function fmtArea(v) {
  if (v == null || v === '') return '—';
  return `${Number(v).toLocaleString('vi-VN')} m²`;
}

// Diện tích thửa (m²) tính từ polygon theo công thức spherical excess
// (xấp xỉ tốt cho thửa nhỏ). Dùng khi properties không có sẵn Dien_tich.
const EARTH_R = 6378137; // m
function areaOf(geometry) {
  if (!geometry) return null;
  const ring =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.coordinates?.[0]?.[0]; // MultiPolygon
  if (!ring || ring.length < 4) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    sum += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((sum * EARTH_R * EARTH_R) / 2);
}

// Tọa độ tâm thửa: trung bình các đỉnh ring ngoài (đủ chính xác cho hiển thị).
function centroidOf(geometry) {
  if (!geometry) return null;
  const ring =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.coordinates?.[0]?.[0]; // MultiPolygon
  if (!ring?.length) return null;
  let x = 0;
  let y = 0;
  for (const [lng, lat] of ring) {
    x += lng;
    y += lat;
  }
  return { lat: y / ring.length, lng: x / ring.length };
}

export default function RanhThuaPanel({ plot, onClose, onSaved, showToast }) {
  const [tab, setTab] = useState('identity');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const props = plot?.properties || {};
  const clicked = plot?.clickedAt;
  const center = centroidOf(plot?.geometry);
  // Diện tích: ƯU TIÊN số chuẩn từ Excel (meta.areaExcel) → Dien_tich shapefile
  // (nếu >0) → cuối cùng tính từ geometry (cho ô chưa có trong Excel).
  const computedArea = useMemo(() => areaOf(plot?.geometry), [plot]);
  const displayArea =
    plot?.meta?.areaExcel != null
      ? plot.meta.areaExcel
      : props.Dien_tich > 0
        ? props.Dien_tich
        : computedArea != null && computedArea > 0
          ? Math.round(computedArea * 10) / 10
          : null;
  const plotId = plot?.id;
  const hasPlot = plotId != null;
  // Trạng thái hiển thị: ưu tiên meta thật người dùng đã nhập; trường nào trống
  // thì lấy mock (khớp đúng màu đang vẽ trên bản đồ) để demo nhất quán.
  const meta = useMemo(() => {
    const m = plot?.meta || {};
    if (!hasPlot) return m;
    const mock = mockStatusFor(plotId);
    return {
      businessStatus: mock.businessStatus,
      collateralStatus: mock.collateralStatus,
      paymentStatus: mock.paymentStatus,
      ...m, // meta thật ghi đè mock
    };
  }, [plot, plotId, hasPlot]);

  // Reset khi đổi thửa.
  useEffect(() => {
    setTab('identity');
    setEditing(false);
    setDraft(meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotId]);

  // ESC để đóng (khi không đang sửa).
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && !editing && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, editing]);

  const startEdit = () => {
    setDraft(meta);
    setEditing(true);
  };

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const ok = await saveRanhThuaMeta(plotId, draft);
    setSaving(false);
    if (ok) {
      setEditing(false);
      showToast?.('Đã lưu thông tin thửa');
      onSaved?.(plotId, draft); // để MapScreen cập nhật plot hiện tại
    } else {
      showToast?.('Lưu thất bại — kiểm tra backend');
    }
  };

  // Giá trị hiển thị: ưu tiên draft khi đang sửa.
  const m = editing ? draft : meta;

  return (
    <div className="flex h-full w-[360px] flex-shrink-0 flex-col border-l border-line bg-surface-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent-600" />
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">
              {m.cellCode || `Thửa ${props.So_thua ?? plotId ?? ''}`}
            </h3>
            <p className="text-xs text-ink-muted">
              {hasPlot ? `Mã thửa #${plotId}` : 'Vị trí điểm click'}
            </p>
          </div>
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

      {/* Tọa độ điểm click */}
      {clicked && (
        <div className="border-b border-line bg-surface-2 px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-muted">Tọa độ click</span>
            <div className="flex items-center gap-1">
              <code className="text-xs font-medium text-ink-primary">
                {clicked.lat.toFixed(6)}, {clicked.lng.toFixed(6)}
              </code>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard?.writeText(`${clicked.lat}, ${clicked.lng}`)
                }
                title="Sao chép"
                className="rounded p-0.5 text-ink-muted hover:bg-surface-1"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasPlot ? (
        <div className="flex-1 px-4 py-6 text-center text-sm text-ink-muted">
          Vị trí này không nằm trong thửa nào.
        </div>
      ) : (
        <>
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
                {editing ? (
                  <>
                    <InputRow
                      label="Mã ô"
                      value={m.cellCode}
                      onChange={(v) => setField('cellCode', v)}
                      placeholder="VD: A-01"
                    />
                    <InputRow
                      label="Mô tả"
                      value={m.description}
                      onChange={(v) => setField('description', v)}
                      placeholder="Mô tả ô đất"
                    />
                  </>
                ) : (
                  <>
                    <Row label="Mã ô">{m.cellCode || '—'}</Row>
                    <Row label="Mô tả">{m.description || '—'}</Row>
                  </>
                )}
                <Row label="Số thửa">{props.So_thua ?? '—'}</Row>
                <Row label="Diện tích (đo)">{fmtArea(displayArea)}</Row>
                {/* Tạm ẩn Chiều dài / Chiều rộng theo yêu cầu. */}
                {center && (
                  <Row label="Tọa độ tâm">
                    <span className="tabular text-xs">
                      {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
                    </span>
                  </Row>
                )}
              </div>
            )}

            {tab === 'business' && (
              <div className="py-1">
                {editing ? (
                  <>
                    <SelectRow
                      label="Trạng thái KD"
                      layerId="business"
                      value={m.businessStatus}
                      onChange={(v) => setField('businessStatus', v)}
                    />
                    <InputRow
                      label="Giá bán"
                      type="number"
                      value={m.value}
                      onChange={(v) => setField('value', v ? Number(v) : '')}
                      placeholder="VNĐ"
                    />
                    <InputRow
                      label="Mã giao dịch"
                      value={m.transactionId}
                      onChange={(v) => setField('transactionId', v)}
                    />
                  </>
                ) : (
                  <>
                    <Row label="Trạng thái KD">
                      <StatusBadge layerId="business" value={m.businessStatus} />
                    </Row>
                    <Row label="Giá bán">
                      {m.value ? formatCurrency(m.value) : '—'}
                    </Row>
                    <Row label="Giao dịch">{m.transactionId || '—'}</Row>
                  </>
                )}
              </div>
            )}

            {tab === 'legal' && (
              <div className="py-1">
                {editing ? (
                  <>
                    <SelectRow
                      label="Tài sản bảo đảm"
                      layerId="legal"
                      value={m.collateralStatus}
                      onChange={(v) => setField('collateralStatus', v)}
                    />
                    <InputRow
                      label="Pháp lý nội bộ"
                      value={m.internalLegal}
                      onChange={(v) => setField('internalLegal', v)}
                    />
                  </>
                ) : (
                  <>
                    <Row label="Tài sản bảo đảm">
                      <StatusBadge layerId="legal" value={m.collateralStatus} />
                    </Row>
                    <Row label="Pháp lý nội bộ">{m.internalLegal || '—'}</Row>
                  </>
                )}
              </div>
            )}

            {tab === 'payment' && (
              <div className="py-1">
                {editing ? (
                  <>
                    <SelectRow
                      label="Tình trạng"
                      layerId="payment"
                      value={m.paymentStatus}
                      onChange={(v) => setField('paymentStatus', v)}
                    />
                    <InputRow
                      label="Giá trị HĐ"
                      type="number"
                      value={m.contractValue}
                      onChange={(v) =>
                        setField('contractValue', v ? Number(v) : '')
                      }
                      placeholder="VNĐ"
                    />
                  </>
                ) : (
                  <PaymentView m={m} />
                )}
              </div>
            )}

            {tab === 'docs' && (
              <div className="py-2">
                {editing ? (
                  <InputRow
                    label="Ghi chú hồ sơ"
                    value={m.docsNote}
                    onChange={(v) => setField('docsNote', v)}
                  />
                ) : m.docsNote ? (
                  <div className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink-secondary">
                    <FileText className="h-4 w-4 text-accent-600" />
                    <span className="truncate">{m.docsNote}</span>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-ink-muted">
                    Chưa có hồ sơ.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-line p-3">
            {editing ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="flex-1 rounded-md border border-line py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2 disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent-600 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Lưu
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-600 py-2 text-sm font-medium text-white hover:bg-accent-700"
              >
                <Pencil className="h-4 w-4" />
                Cập nhật thông tin thửa
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// View "Thanh toán" trên bản đồ — 4 nhóm theo spec (đọc từ meta).
function PaymentView({ m }) {
  const c = m.contract || {};
  const payments = m.payments || [];
  const mg = m.mortgage || {};
  // Tổng phải TT: ưu tiên hợp đồng, fallback contractValue/value.
  const totalDue = c.totalValue ?? m.contractValue ?? m.value ?? 0;
  // Nếu chưa có lịch sử từng lần nhưng có tổng đã trả (paid) → tính theo paid.
  const prog =
    payments.length === 0 && m.paid
      ? { total: totalDue, paid: m.paid, remaining: Math.max(totalDue - m.paid, 0), percent: totalDue > 0 ? Math.min(100, (m.paid / totalDue) * 100) : 0 }
      : paymentProgress(totalDue, payments);

  return (
    <div className="space-y-3">
      {/* 1) Hợp đồng */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Thông tin hợp đồng
        </p>
        <Row label="Số hợp đồng">{c.code || m.transactionId || '—'}</Row>
        <Row label="Ngày ký">
          {c.signDate ? formatDate(c.signDate) : (m.transactionDate ? formatDate(m.transactionDate) : '—')}
        </Row>
        <Row label="Khách hàng">{c.customer || m.currentOwner || '—'}</Row>
        <Row label="Tổng giá trị HĐ">{totalDue ? formatCurrency(totalDue) : '—'}</Row>
        <Row label="Bên chịu thuế">{c.taxBearer || '—'}</Row>
      </div>

      {/* 3) Lộ trình thanh toán */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Lộ trình thanh toán
        </p>
        {totalDue > 0 ? (
          <>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-green-500" style={{ width: `${prog.percent}%` }} />
            </div>
            <Row label="Đã thanh toán">
              <span className="text-green-700">{formatCurrency(prog.paid)}</span>
            </Row>
            <Row label="Còn lại">
              <span className="text-amber-700">{formatCurrency(prog.remaining)}</span>
            </Row>
            <Row label="Tỷ lệ">{prog.percent.toFixed(1)}%</Row>
          </>
        ) : (
          <p className="text-sm text-ink-muted">—</p>
        )}
      </div>

      {/* 2) Lịch sử thanh toán */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Lịch sử thanh toán
        </p>
        {payments.length === 0 ? (
          <p className="text-sm text-ink-muted">— chưa có —</p>
        ) : (
          <ul className="space-y-1.5">
            {payments.map((pay, i) => (
              <li key={i} className="rounded-md border border-line px-3 py-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-primary">{formatCurrency(pay.amount)}</span>
                  <span className="text-xs text-ink-muted">{formatDate(pay.date)}</span>
                </div>
                <div className="text-xs text-ink-muted">
                  {paymentMethodLabel(pay.method)}
                  {pay.voucher ? ` · CT: ${pay.voucher}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 4) Thế chấp ngân hàng */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Thế chấp ngân hàng
        </p>
        <Row label="Tình trạng">
          {mg.status ? mortgageStatusLabel(mg.status) : '—'}
        </Row>
        <Row label="Tổ chức nhận TC">{mg.lender || '—'}</Row>
        <Row label="Giá trị khoản vay">
          {mg.loanValue != null ? formatCurrency(mg.loanValue) : '—'}
        </Row>
        <Row label="Dư nợ">{mg.outstanding != null ? formatCurrency(mg.outstanding) : '—'}</Row>
        <Row label="Ghi chú nội bộ">{mg.note || '—'}</Row>
      </div>
    </div>
  );
}
