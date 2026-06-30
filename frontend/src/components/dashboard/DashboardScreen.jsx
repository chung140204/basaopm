import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getProjectStats } from '../../data/projectStats';
import { formatSqm, formatPercent, formatTy } from '../../utils/format';

// Colours matching the official charts (blue / red / green).
const C_RED_BOOK = '#3B82F6'; // Đã bán - có sổ (blue)
const C_NO_BOOK = '#DC2626'; // Đã bán - chưa sổ (red)
const C_UNSOLD = '#84CC16'; // Chưa bán (green)
const C_KHU_A = '#3B82F6';
const C_KHU_B = '#DC2626';

// ---- Table of the full project summary --------------------------------
const ROWS = [
  { key: 'tongQH', label: 'Tổng diện tích QH 1/500 (m²)', fmt: 'sqm' },
  { key: 'daBan', label: 'Tổng diện tích đã bán (m²)', fmt: 'sqm' },
  { key: 'daBanCoSo', label: 'Đã bán – Có sổ đỏ (m²)', fmt: 'sqm' },
  { key: 'daBanChuaSo', label: 'Đã bán – Chưa có sổ (m²)', fmt: 'sqm' },
  { key: 'chuaBan', label: 'Chưa bán (m²)', fmt: 'sqm' },
  { key: 'tyLeDaBan', label: 'Tỷ lệ đã bán / Tổng QH', fmt: 'pct' },
  { key: 'giaTriCoSo', label: 'Giá trị bán có sổ (tỷ đồng)', fmt: 'ty' },
  { key: 'giaTriChuaSo', label: 'Giá trị bán chưa sổ (tỷ đồng)', fmt: 'ty' },
];

function fmtCell(value, fmt) {
  if (fmt === 'pct') return formatPercent(value);
  if (fmt === 'ty') return formatTy(value).replace(' tỷ', '');
  return formatSqm(value);
}

function SummaryTable({ metrics }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-1 shadow-sm">
      <div className="border-b border-line px-5 py-3">
        <h3 className="text-sm font-semibold text-ink-primary">
          Tổng hợp số liệu toàn dự án
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-accent-600 text-white">
            <tr>
              <th className="px-5 py-2.5 text-left font-medium">Chỉ tiêu</th>
              <th className="px-5 py-2.5 text-right font-medium">Tổng dự án</th>
              <th className="px-5 py-2.5 text-right font-medium">Khu A</th>
              <th className="px-5 py-2.5 text-right font-medium">Khu B</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => {
              const m = metrics[row.key];
              return (
                <tr
                  key={row.key}
                  className={`border-b border-line last:border-0 ${
                    i % 2 === 1 ? 'bg-surface-2/50' : ''
                  }`}
                >
                  <td className="px-5 py-2.5 font-medium text-ink-primary">
                    {row.label}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular text-ink-secondary">
                    {fmtCell(m.total, row.fmt)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular text-ink-secondary">
                    {fmtCell(m.khuA, row.fmt)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular text-ink-secondary">
                    {fmtCell(m.khuB, row.fmt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Tooltip formatter (m²) -------------------------------------------
function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface-1 px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-ink-primary">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: p.color || p.payload.fill }}
          />
          <span className="text-ink-secondary">{p.name}:</span>
          <span className="tabular font-medium text-ink-primary">
            {formatSqm(p.value)} m²
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardScreen({ project }) {
  const stats = getProjectStats(project.id);

  const pieData = useMemo(() => {
    if (!stats) return [];
    const m = stats.metrics;
    return [
      { name: 'Đã bán – Có sổ', value: m.daBanCoSo.total, fill: C_RED_BOOK },
      { name: 'Đã bán – Chưa sổ', value: m.daBanChuaSo.total, fill: C_NO_BOOK },
      { name: 'Chưa bán', value: m.chuaBan.total, fill: C_UNSOLD },
    ];
  }, [stats]);

  const barData = useMemo(() => {
    if (!stats) return [];
    const m = stats.metrics;
    return [
      { name: 'Tổng QH', 'Khu A': m.tongQH.khuA, 'Khu B': m.tongQH.khuB },
      { name: 'Đã bán có sổ', 'Khu A': m.daBanCoSo.khuA, 'Khu B': m.daBanCoSo.khuB },
      { name: 'Đã bán chưa sổ', 'Khu A': m.daBanChuaSo.khuA, 'Khu B': m.daBanChuaSo.khuB },
      { name: 'Chưa bán', 'Khu A': m.chuaBan.khuA, 'Khu B': m.chuaBan.khuB },
    ];
  }, [stats]);

  if (!stats) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-app p-6 text-center">
        <p className="text-base font-medium text-ink-primary">
          Chưa có số liệu tổng hợp cho dự án này
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Số liệu dashboard sẽ được cập nhật khi dữ liệu ô đất được số hóa.
        </p>
      </main>
    );
  }

  const m = stats.metrics;
  const pieTotal = m.daBanCoSo.total + m.daBanChuaSo.total + m.chuaBan.total;

  return (
    <main className="flex-1 overflow-y-auto bg-app p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-ink-primary">Dashboard</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tổng quan số liệu dự án {project.tenHienThi}
        </p>
      </div>

      {/* Charts (first) */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pie: area composition */}
        <div className="rounded-lg border border-line bg-surface-1 p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-ink-primary">
            Biểu đồ 1 — Cơ cấu tổng diện tích dự án (m²)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ value }) =>
                  `${((value / pieTotal) * 100).toFixed(1).replace('.', ',')}%`
                }
                labelLine={false}
              >
                {pieData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip content={<AreaTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: Khu A vs Khu B */}
        <div className="rounded-lg border border-line bg-surface-1 p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-ink-primary">
            Biểu đồ 2 — So sánh Khu A và Khu B theo trạng thái (m²)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#475569' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
              />
              <Tooltip content={<AreaTooltip />} cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Khu A" fill={C_KHU_A} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Khu B" fill={C_KHU_B} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary table (after charts) */}
      <SummaryTable metrics={m} />
    </main>
  );
}
