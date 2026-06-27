import { getLayer } from '../../lib/layers';

function colorOf(layerId, value) {
  return getLayer(layerId).statuses.find((s) => s.value === value)?.fill ?? '#94A3B8';
}

// Mini-map of a lot's shape: draws each child cell polygon, coloured by
// business status. Fits the lot bbox into the given pixel box with padding.
export default function LotShape({ lot, width = 220, height = 120, showLabels = true }) {
  const { bbox, cells } = lot;
  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  // Uniform scale to preserve aspect ratio; guard against zero-size bbox.
  const scale = Math.min(
    innerW / (bbox.w || 1),
    innerH / (bbox.h || 1)
  );
  // Centre the drawing in the box.
  const offsetX = pad + (innerW - bbox.w * scale) / 2;
  const offsetY = pad + (innerH - bbox.h * scale) / 2;

  const project = (x, y) => [
    offsetX + (x - bbox.minX) * scale,
    offsetY + (y - bbox.minY) * scale,
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      role="img"
      aria-label={`Hình dáng lô ${lot.lotCode}`}
    >
      {cells.map((c) => {
        const pts = c.geometry.coordinates[0]
          .map(([x, y]) => project(x, y).join(','))
          .join(' ');
        const [cx, cy] = project(...c.properties.centroid);
        const fill = colorOf('business', c.properties.businessStatus);
        return (
          <g key={c.id}>
            <polygon
              points={pts}
              fill={fill}
              fillOpacity={0.85}
              stroke="#ffffff"
              strokeWidth={1}
            />
            {showLabels && scale > 0.08 && (
              <text
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                className="fill-white"
                style={{ fontSize: Math.min(10, scale * 18), fontWeight: 600 }}
              >
                {c.properties.cellCode.split('-').slice(-1)[0]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
