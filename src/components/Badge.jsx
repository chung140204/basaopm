// Status badge with a leading dot. Colour conveyed by both dot AND text
// (colour-blind safe).
const STYLES = {
  visible: {
    label: 'Đang hiển thị',
    text: 'text-success',
    bg: 'bg-success-bg',
    dot: 'bg-success',
  },
  hidden: {
    label: 'Đã ẩn',
    text: 'text-ink-secondary',
    bg: 'bg-neutral-bg',
    dot: 'bg-neutral',
  },
};

export default function Badge({ status }) {
  const s = STYLES[status] ?? STYLES.hidden;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.text} ${s.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
