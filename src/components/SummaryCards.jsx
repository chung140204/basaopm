import { FolderKanban, Grid3x3, LayoutGrid, Rocket } from 'lucide-react';
import { formatInteger } from '../utils/format';

const ICON_STYLES = {
  accent: 'bg-accent-100 text-accent-600',
  info: 'bg-info-bg text-info',
  violet: 'bg-violet-bg text-violet',
  success: 'bg-success-bg text-success',
};

function Card({ icon: Icon, tone, label, value, delta }) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 p-5 shadow-sm">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-md ${ICON_STYLES[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink-primary tabular">
        {value}
      </p>
      {delta && <p className="mt-1 text-xs text-ink-muted">{delta}</p>}
    </div>
  );
}

export default function SummaryCards({ projects }) {
  const visible = projects.filter((p) => p.status === 'visible');
  const tongDuAn = visible.length;
  const tongLo = visible.reduce((sum, p) => sum + p.tongSoLo, 0);
  const tongO = visible.reduce((sum, p) => sum + p.tongSoODat, 0);

  // "Đang triển khai" = đã khởi công và chưa qua mốc đưa vào kinh doanh
  // (mốc KD ở tương lai so với hôm nay).
  const today = '2026-06';
  const dangTrienKhai = visible.filter((p) => p.duaVaoKinhDoanh > today).length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        icon={FolderKanban}
        tone="accent"
        label="Tổng số dự án"
        value={formatInteger(tongDuAn)}
        delta="Đang hiển thị"
      />
      <Card
        icon={Grid3x3}
        tone="info"
        label="Tổng số lô đất"
        value={formatInteger(tongLo)}
        delta="Trên các dự án hiển thị"
      />
      <Card
        icon={LayoutGrid}
        tone="violet"
        label="Tổng số ô đất"
        value={formatInteger(tongO)}
      />
      <Card
        icon={Rocket}
        tone="success"
        label="Dự án đang triển khai"
        value={formatInteger(dangTrienKhai)}
        delta={`/ ${tongDuAn} dự án`}
      />
    </div>
  );
}
