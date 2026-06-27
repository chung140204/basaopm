import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, AlertTriangle } from 'lucide-react';

/**
 * MapCanvas — black-box map component with a FIXED interface.
 *
 * The surrounding UI (toolbar, legend, filter, detail panel, search) only
 * talks to this component through the props/events below. The demo renders an
 * SVG mock (SvgMockProvider) from GeoJSON-like features in a 0..1000 viewBox.
 *
 * >>> To plug in the real map API later: replace the SVG rendering block with
 *     a RealMapAdapter (MapLibre / Leaflet / custom tiles) that reads the same
 *     `features`/`subdivisions` (GeoJSON) and emits the same events. Keep props
 *     & events identical and NOTHING around this component needs to change. <<<
 *
 * Props in:
 *   features, activeLayerId(unused by render but kept for adapter parity),
 *   colorResolver(feature)=>{fill,stroke}, filterPredicate(feature)=>boolean,
 *   selectedFeatureId, showSubdivisionBorders, subdivisions,
 *   focusTarget ({featureId} | {bbox:{x,y,w,h}} | null), hideUnmatched
 * Events out:
 *   onFeatureClick(id), onFeatureHover(id|null), onMapReady(), onError(err)
 */
export default function MapCanvas({
  features = [],
  colorResolver,
  filterPredicate = () => true,
  selectedFeatureId = null,
  showSubdivisionBorders = true,
  subdivisions = [],
  focusTarget = null,
  hideUnmatched = false,
  onFeatureClick,
  onFeatureHover,
  onMapReady,
  onError,
}) {
  const [ready, setReady] = useState(false);
  const [errored] = useState(false);
  const [hoverId, setHoverId] = useState(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 }); // pan/zoom transform
  const wrapRef = useRef(null);

  // Simulate async map load.
  useEffect(() => {
    const t = setTimeout(() => {
      setReady(true);
      onMapReady?.();
    }, 400);
    return () => clearTimeout(t);
  }, [onMapReady]);

  // React to focusTarget: zoom/pan to a feature or bbox.
  useEffect(() => {
    if (!focusTarget) return;
    let bbox = null;
    if (focusTarget.bbox) {
      bbox = focusTarget.bbox;
    } else if (focusTarget.featureId) {
      const f = features.find((x) => x.id === focusTarget.featureId);
      if (f) {
        const [cx, cy] = f.properties.centroid;
        bbox = { x: cx - 110, y: cy - 90, w: 220, h: 180 };
      }
    } else if (focusTarget.bboxOfIds) {
      const pts = features
        .filter((x) => focusTarget.bboxOfIds.includes(x.id))
        .map((x) => x.properties.centroid);
      if (pts.length) {
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const minX = Math.min(...xs) - 70;
        const minY = Math.min(...ys) - 60;
        bbox = {
          x: minX,
          y: minY,
          w: Math.max(...xs) - minX + 70,
          h: Math.max(...ys) - minY + 60,
        };
      }
    }
    if (!bbox) return;
    // Fit bbox into the 1000x600 viewBox.
    const vw = 1000;
    const vh = 600;
    const scale = Math.min(vw / bbox.w, vh / bbox.h, 4);
    const tx = vw / 2 - (bbox.x + bbox.w / 2) * scale;
    const ty = vh / 2 - (bbox.y + bbox.h / 2) * scale;
    setView({ scale, tx, ty });
  }, [focusTarget, features]);

  const handleZoom = (dir) => {
    setView((v) => {
      const scale = Math.min(Math.max(v.scale * (dir > 0 ? 1.25 : 0.8), 0.5), 6);
      // Zoom around the viewBox centre.
      const cx = 500;
      const cy = 300;
      const k = scale / v.scale;
      return {
        scale,
        tx: cx - (cx - v.tx) * k,
        ty: cy - (cy - v.ty) * k,
      };
    });
  };

  const polygonPoints = (feature) =>
    feature.geometry.coordinates[0].map((p) => p.join(',')).join(' ');

  const borderPath = (sub) =>
    sub.border.coordinates[0].map((p) => p.join(',')).join(' ');

  const sortedFeatures = useMemo(() => {
    // Render selected last (on top).
    return [...features].sort((a, b) => {
      if (a.id === selectedFeatureId) return 1;
      if (b.id === selectedFeatureId) return -1;
      return 0;
    });
  }, [features, selectedFeatureId]);

  if (errored) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-2 text-center">
        <AlertTriangle className="h-10 w-10 text-danger" />
        <p className="text-base font-medium text-ink-primary">
          Không tải được bản đồ
        </p>
        <p className="max-w-sm text-sm text-ink-muted">
          Đã xảy ra lỗi khi tải dữ liệu bản đồ. Vui lòng thử lại.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-line bg-surface-1 px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-[#EEF2F7]">
      {/* Loading skeleton */}
      {!ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-surface-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent-600" />
          <p className="text-sm text-ink-muted">Đang tải bản đồ...</p>
        </div>
      )}

      <svg
        viewBox="0 0 1000 600"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Bản đồ ô đất dự án"
      >
        {/* SVG patterns for colour-blind safety on key statuses (optional) */}
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
          </pattern>
        </defs>

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {/* Subdivision borders */}
          {showSubdivisionBorders &&
            subdivisions.map((sub) => (
              <g key={sub.id}>
                <polygon
                  points={borderPath(sub)}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeDasharray="8 5"
                  opacity="0.7"
                />
                <text
                  x={sub.labelPos[0]}
                  y={sub.labelPos[1]}
                  textAnchor="middle"
                  className="select-none"
                  fontSize="22"
                  fontWeight="600"
                  fill="#475569"
                >
                  {sub.name}
                </text>
              </g>
            ))}

          {/* Cells */}
          {sortedFeatures.map((feature) => {
            const matched = filterPredicate(feature);
            if (hideUnmatched && !matched) return null;

            const { fill, stroke } = colorResolver(feature);
            const isSelected = feature.id === selectedFeatureId;
            const isHover = feature.id === hoverId;
            const dim = !matched;

            return (
              <g key={feature.id}>
                <polygon
                  points={polygonPoints(feature)}
                  fill={fill}
                  stroke={isSelected ? '#1D4ED8' : isHover ? '#2563EB' : '#FFFFFF'}
                  strokeWidth={isSelected ? 2.5 : isHover ? 2 : 1}
                  opacity={dim ? 0.15 : 1}
                  style={{
                    cursor: dim ? 'default' : 'pointer',
                    transition: 'opacity 120ms, stroke 120ms',
                  }}
                  onClick={() => !dim && onFeatureClick?.(feature.id)}
                  onMouseEnter={() => {
                    if (dim) return;
                    setHoverId(feature.id);
                    onFeatureHover?.(feature.id);
                  }}
                  onMouseLeave={() => {
                    setHoverId(null);
                    onFeatureHover?.(null);
                  }}
                />
                {/* Cell code label (hidden when too small) */}
                {view.scale >= 1.4 && !dim && (
                  <text
                    x={feature.properties.centroid[0]}
                    y={feature.properties.centroid[1] + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill="rgba(255,255,255,0.95)"
                    className="pointer-events-none select-none"
                  >
                    {feature.properties.cellCode}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip (mini) */}
      {hoverId && ready && (
        <HoverTooltip
          feature={features.find((f) => f.id === hoverId)}
        />
      )}

      {/* Zoom controls (bottom-right) */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col overflow-hidden rounded-md border border-line bg-surface-1 shadow-md">
        <button
          type="button"
          aria-label="Phóng to"
          onClick={() => handleZoom(1)}
          className="flex h-9 w-9 items-center justify-center text-ink-secondary hover:bg-surface-2"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="h-px bg-line" />
        <button
          type="button"
          aria-label="Thu nhỏ"
          onClick={() => handleZoom(-1)}
          className="flex h-9 w-9 items-center justify-center text-ink-secondary hover:bg-surface-2"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function HoverTooltip({ feature }) {
  if (!feature) return null;
  return (
    <div className="pointer-events-none absolute left-4 top-20 z-10 rounded-md bg-ink-primary px-2.5 py-1.5 text-xs font-medium text-white shadow-md">
      {feature.properties.cellCode} · {feature.properties.lotCode}
    </div>
  );
}
