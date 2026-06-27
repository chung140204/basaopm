import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, KeyRound } from 'lucide-react';
import { loadGoogleMaps } from './googleLoader';
import {
  PROJECT_CENTER,
  cellLatLngPath,
  subdivisionLatLngPath,
} from '../../data/cells';

/**
 * GoogleMapCanvas — drop-in replacement for MapCanvas that renders the cells
 * on a real Google Maps basemap. Same interface (props/events) so the rest of
 * the screen does not change.
 *
 * Requires VITE_GOOGLE_MAPS_API_KEY in .env. Without a key it shows a notice.
 */
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function GoogleMapCanvas({
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
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const polysRef = useRef(new Map()); // featureId -> google Polygon
  const bordersRef = useRef([]); // subdivision polylines + labels
  const [status, setStatus] = useState(API_KEY ? 'loading' : 'no-key');

  // 1) Init the map once.
  useEffect(() => {
    if (!API_KEY) return undefined;
    let cancelled = false;

    loadGoogleMaps(API_KEY)
      .then((google) => {
        if (cancelled || !mapEl.current) return;
        const map = new google.maps.Map(mapEl.current, {
          center: PROJECT_CENTER,
          zoom: 16,
          mapTypeId: 'hybrid', // satellite + labels — good for land plots
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });
        mapRef.current = map;
        setStatus('ready');
        onMapReady?.();
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        onError?.(err);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Draw / update cell polygons.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || !window.google) return;
    const google = window.google;

    const seen = new Set();

    features.forEach((feature) => {
      const matched = filterPredicate(feature);
      const visible = !(hideUnmatched && !matched);
      const { fill, stroke } = colorResolver(feature);
      const isSelected = feature.id === selectedFeatureId;
      seen.add(feature.id);

      let poly = polysRef.current.get(feature.id);
      if (!poly) {
        poly = new google.maps.Polygon({
          paths: cellLatLngPath(feature),
          map,
        });
        poly.addListener('click', () => onFeatureClick?.(feature.id));
        poly.addListener('mouseover', () => onFeatureHover?.(feature.id));
        poly.addListener('mouseout', () => onFeatureHover?.(null));
        polysRef.current.set(feature.id, poly);
      }

      poly.setOptions({
        map: visible ? map : null,
        fillColor: fill,
        fillOpacity: matched ? 0.55 : 0.1,
        strokeColor: isSelected ? '#1D4ED8' : matched ? '#FFFFFF' : stroke,
        strokeWeight: isSelected ? 3 : 1.5,
        strokeOpacity: matched ? 1 : 0.4,
        clickable: matched,
        zIndex: isSelected ? 10 : 1,
      });
    });

    // Remove polygons no longer present.
    for (const [id, poly] of polysRef.current.entries()) {
      if (!seen.has(id)) {
        poly.setMap(null);
        polysRef.current.delete(id);
      }
    }
  }, [
    features,
    colorResolver,
    filterPredicate,
    selectedFeatureId,
    hideUnmatched,
    status,
    onFeatureClick,
    onFeatureHover,
  ]);

  // 3) Subdivision borders + labels.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || !window.google) return;
    const google = window.google;

    // Clear previous.
    bordersRef.current.forEach((o) => o.setMap(null));
    bordersRef.current = [];

    if (!showSubdivisionBorders) return;

    subdivisions.forEach((sub) => {
      const path = subdivisionLatLngPath(sub);
      const line = new google.maps.Polyline({
        path,
        map,
        strokeColor: '#FACC15',
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        icons: [
          {
            icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
            offset: '0',
            repeat: '14px',
          },
        ],
      });
      bordersRef.current.push(line);

      // Label via a marker with text.
      const labelLatLng = path[0];
      const marker = new google.maps.Marker({
        position: labelLatLng,
        map,
        label: {
          text: sub.name,
          color: '#FACC15',
          fontWeight: '700',
          fontSize: '14px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 0,
        },
      });
      bordersRef.current.push(marker);
    });
  }, [subdivisions, showSubdivisionBorders, status]);

  // 4) React to focusTarget (zoom/pan).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready' || !window.google || !focusTarget) return;
    const google = window.google;
    const bounds = new google.maps.LatLngBounds();

    if (focusTarget.featureId) {
      const f = features.find((x) => x.id === focusTarget.featureId);
      if (f) cellLatLngPath(f).forEach((p) => bounds.extend(p));
    } else if (focusTarget.bboxOfIds) {
      features
        .filter((x) => focusTarget.bboxOfIds.includes(x.id))
        .forEach((f) => cellLatLngPath(f).forEach((p) => bounds.extend(p)));
    } else if (focusTarget.bbox) {
      // Fit all features.
      features.forEach((f) =>
        cellLatLngPath(f).forEach((p) => bounds.extend(p))
      );
    }
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 80);
      if (focusTarget.featureId) {
        google.maps.event.addListenerOnce(map, 'idle', () => {
          if (map.getZoom() > 19) map.setZoom(19);
        });
      }
    }
  }, [focusTarget, features, status]);

  // ---- Render fallbacks -------------------------------------------------
  if (status === 'no-key') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-2 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100">
          <KeyRound className="h-6 w-6 text-accent-600" />
        </div>
        <p className="text-base font-medium text-ink-primary">
          Chưa cấu hình Google Maps API key
        </p>
        <p className="max-w-md text-sm text-ink-muted">
          Tạo key tại Google Cloud (bật “Maps JavaScript API”), rồi dán vào file{' '}
          <code className="rounded bg-surface-1 px-1 py-0.5 text-xs">.env</code>{' '}
          ở dòng{' '}
          <code className="rounded bg-surface-1 px-1 py-0.5 text-xs">
            VITE_GOOGLE_MAPS_API_KEY=
          </code>{' '}
          và chạy lại.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-2 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-danger" />
        <p className="text-base font-medium text-ink-primary">
          Không tải được Google Maps
        </p>
        <p className="max-w-md text-sm text-ink-muted">
          Kiểm tra API key, kết nối mạng, hoặc API key có bật “Maps JavaScript
          API” và đúng tên miền cho phép.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {status === 'loading' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-surface-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent-600" />
          <p className="text-sm text-ink-muted">Đang tải bản đồ...</p>
        </div>
      )}
      <div ref={mapEl} className="h-full w-full" />
    </div>
  );
}
