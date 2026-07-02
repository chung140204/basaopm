import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  PROJECT_CENTER,
  cellLatLngPath,
  subdivisionLatLngPath,
} from '../../data/cells';
import {
  RANH_THUA_TILE_URL,
  LOTHUA_DEFAULT_LAYER,
  loThuaTileUrl,
  getLoThuaLayers,
  getRanhThuaLayers,
  getRanhThuaGeoJSON,
  getLoGeoJSON,
} from '../../services/planningApi';
import { getLayer } from '../../lib/layers';
import { statusValue, isProvisional } from './ranhThuaStatus';
import { applyDbOverlay } from '../../data/dcb02Overlay';
import { getCellsGeoJSON } from '../../services/cellsApi';
import {
  RANH_THUA_SUBDIVISIONS,
  RANH_THUA_DIVIDER,
} from './ranhThuaSubdivisions';

/**
 * LeafletMapCanvas — drop-in replacement for MapCanvas using Leaflet with
 * Google map tiles (lyrs=m) as the basemap. Same props/events interface as
 * the SVG MapCanvas, so the rest of the screen is unchanged.
 *
 * NOTE: Using Google's tile endpoint directly is outside Google's ToS — for
 * internal demo use only. To go production, switch the tile URL to an allowed
 * provider (Google Maps JS API, OSM, Mapbox, ...).
 *
 * lyrs options: m = roadmap, y = hybrid (satellite+labels), s = satellite.
 */
const GOOGLE_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

// Style lớp lô: thường vs đang chọn (viền dày + đậm hơn).
const LO_STYLE_BASE = {
  color: '#B45309',
  weight: 2.5,
  fillColor: '#F59E0B',
  fillOpacity: 0.08,
  opacity: 0.95,
};
const LO_STYLE_SELECTED = {
  color: '#92400E',
  weight: 4,
  fillColor: '#F59E0B',
  fillOpacity: 0.22,
  opacity: 1,
};

// Đổi style các lô theo lô đang chọn — chỉ setStyle, KHÔNG vẽ lại lớp.
// loLayers: Map<id, leafletLayer>; selectedId: id lô đang chọn (hoặc null).
function applyLoHighlight(loLayers, selectedId) {
  loLayers.forEach((lyr, id) => {
    if (id === selectedId) {
      lyr.setStyle(LO_STYLE_SELECTED);
      lyr.bringToFront(); // nổi lên trên để viền đậm không bị che
    } else {
      lyr.setStyle(LO_STYLE_BASE);
    }
  });
}

function latLngToLeaflet(path) {
  return path.map((p) => [p.lat, p.lng]);
}

export default function LeafletMapCanvas({
  projectId = null, // dự án đang mở → lọc cells-geojson tô màu theo dự án
  features = [],
  colorResolver,
  filterPredicate = () => true,
  selectedFeatureId = null,
  showSubdivisionBorders = true,
  subdivisions = [],
  focusTarget = null,
  hideUnmatched = false,
  showCells = false, // hide cell polygons for now — basemap + borders only
  showRanhThua = false, // overlay tile ranh thửa (XYZ) lên basemap
  showLoThua = false, // overlay tile lô thửa (XYZ) lên basemap, bật/tắt riêng
  loThuaLayerId = LOTHUA_DEFAULT_LAYER, // layer lô thửa, mặc định 'truonglinh-lo'
  ranhThuaLayerId = null, // layer ranh thửa đang active (để query đúng layer)
  ranhThuaStatusLayer = 'business', // lớp trạng thái tô màu: business/legal/payment
  ranhThuaFilter = null, // (feature)=>bool: thửa CÓ KHỚP bộ lọc không; null = khớp hết
  ranhThuaHideUnmatched = false, // true: ẩn hẳn thửa không khớp; false: chỉ làm mờ
  showRanhThuaSubdivisions = false, // vẽ ranh phân khu A/B của ranh thửa
  showLo = false, // vẽ ranh lô (hình bao cụm thửa) + cho click
  selectedLoId = null, // id lô đang chọn → tô viền đậm để biết đang click lô nào
  onLoClick, // (loId) → mở panel lô
  onRanhThuaClick, // ({lat,lng}) → MapScreen gọi API + mở panel
  ranhThuaHighlight = null, // GeoJSON geometry của thửa đang chọn để vẽ viền
  onFeatureClick,
  onFeatureHover,
  onMapReady,
  onError,
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const cellLayerRef = useRef(null); // L.LayerGroup for cells
  const borderLayerRef = useRef(null); // L.LayerGroup for subdivisions
  const ranhThuaRef = useRef(null); // L.TileLayer ranh thửa overlay
  const loThuaRef = useRef(null); // L.TileLayer lô thửa overlay
  const ranhThuaVecRef = useRef(null); // L.GeoJSON polyline mọi ô ranh thửa
  const ranhThuaDataRef = useRef(null); // FeatureCollection đã tải (để tô lại màu)
  const ranhThuaSubRef = useRef(null); // L.LayerGroup ranh phân khu A/B
  const loRef = useRef(null); // L.GeoJSON ranh lô
  const loLayersRef = useRef(new Map()); // id lô → layer con (để đổi style khi chọn)
  const selectedLoIdRef = useRef(selectedLoId); // id lô chọn (cho callback async)
  const ranhThuaHlRef = useRef(null); // L.GeoJSON highlight thửa đang chọn
  const onRanhThuaClickRef = useRef(onRanhThuaClick); // tránh rebind handler
  const onLoClickRef = useRef(onLoClick);
  const roRef = useRef(null); // ResizeObserver giữ map khớp container
  const polyRef = useRef(new Map()); // featureId -> L.Polygon
  const [ready, setReady] = useState(false);
  const [ranhThuaDataVer, setRanhThuaDataVer] = useState(0); // tăng khi data tải xong

  // Luôn trỏ tới callback mới nhất mà không cần gỡ/gắn lại listener click.
  onRanhThuaClickRef.current = onRanhThuaClick;
  onLoClickRef.current = onLoClick;

  // 1) Init map once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return undefined;
    try {
      const map = L.map(elRef.current, {
        center: [PROJECT_CENTER.lat, PROJECT_CENTER.lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });
      L.tileLayer(GOOGLE_TILE_URL, {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
      }).addTo(map);

      cellLayerRef.current = L.layerGroup().addTo(map);
      borderLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      onMapReady?.();

      // Leaflet hay khởi tạo khi container chưa có kích thước đúng (layout flex
      // chưa ổn định) → map render lệch, tile xám, phải zoom mới hiện. Ép tính
      // lại kích thước ngay sau mount, và mỗi khi container đổi kích thước.
      const fixSize = () => map.invalidateSize();
      requestAnimationFrame(fixSize);
      setTimeout(fixSize, 150);
      const ro = new ResizeObserver(fixSize);
      ro.observe(elRef.current);
      roRef.current = ro;

      // Click trên bản đồ → đẩy tọa độ lên MapScreen để query thửa.
      // (handler giữ qua ref nên không cần rebind mỗi lần đổi prop.)
      map.on('click', (e) => {
        onRanhThuaClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    } catch (err) {
      onError?.(err);
    }

    return () => {
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Draw / update cell polygons.
  useEffect(() => {
    if (!ready || !cellLayerRef.current) return;
    const group = cellLayerRef.current;

    // Cells hidden for now → clear any existing and stop.
    if (!showCells) {
      group.clearLayers();
      polyRef.current.clear();
      return;
    }

    const seen = new Set();

    features.forEach((feature) => {
      const matched = filterPredicate(feature);
      const visible = !(hideUnmatched && !matched);
      const { fill, stroke } = colorResolver(feature);
      const isSelected = feature.id === selectedFeatureId;
      seen.add(feature.id);

      const style = {
        fillColor: fill,
        fillOpacity: matched ? 0.6 : 0.12,
        color: isSelected ? '#1D4ED8' : matched ? '#FFFFFF' : stroke,
        weight: isSelected ? 3 : 1.5,
        opacity: matched ? 1 : 0.4,
      };

      let poly = polyRef.current.get(feature.id);
      if (!poly) {
        poly = L.polygon(latLngToLeaflet(cellLatLngPath(feature)), style);
        poly.bindTooltip(
          `${feature.properties.cellCode} · ${feature.properties.lotCode}`,
          { direction: 'top', sticky: true }
        );
        poly.on('click', () => {
          if (poly.options.__matched) onFeatureClick?.(feature.id);
        });
        poly.on('mouseover', () => onFeatureHover?.(feature.id));
        poly.on('mouseout', () => onFeatureHover?.(null));
        polyRef.current.set(feature.id, poly);
      }
      poly.setStyle(style);
      poly.options.__matched = matched;

      const onMap = group.hasLayer(poly);
      if (visible && !onMap) group.addLayer(poly);
      else if (!visible && onMap) group.removeLayer(poly);

      if (isSelected) poly.bringToFront();
    });

    // Remove polygons no longer in data.
    for (const [id, poly] of polyRef.current.entries()) {
      if (!seen.has(id)) {
        group.removeLayer(poly);
        polyRef.current.delete(id);
      }
    }
  }, [
    ready,
    showCells,
    features,
    colorResolver,
    filterPredicate,
    selectedFeatureId,
    hideUnmatched,
    onFeatureClick,
    onFeatureHover,
  ]);

  // 3) Subdivision borders + labels.
  useEffect(() => {
    if (!ready || !borderLayerRef.current) return;
    const group = borderLayerRef.current;
    group.clearLayers();
    if (!showSubdivisionBorders) return;

    subdivisions.forEach((sub) => {
      const path = latLngToLeaflet(subdivisionLatLngPath(sub));
      L.polyline(path, {
        color: '#FACC15',
        weight: 2.5,
        opacity: 0.95,
        dashArray: '8 6',
      }).addTo(group);

      // Label as a divIcon marker at the first vertex.
      L.marker(path[0], {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<span style="background:rgba(15,23,42,.75);color:#FACC15;font-weight:700;font-size:12px;padding:2px 6px;border-radius:6px;white-space:nowrap;">${sub.name}</span>`,
        }),
      }).addTo(group);
    });
  }, [ready, subdivisions, showSubdivisionBorders]);

  // 3b) Ranh thửa tile overlay (XYZ). Bật/tắt bằng prop showRanhThua.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    const clearVec = () => {
      if (ranhThuaRef.current) {
        map.removeLayer(ranhThuaRef.current);
        ranhThuaRef.current = null;
      }
      if (ranhThuaVecRef.current) {
        map.removeLayer(ranhThuaVecRef.current);
        ranhThuaVecRef.current = null;
      }
    };
    clearVec();

    if (!showRanhThua) return;

    const layer = L.tileLayer(RANH_THUA_TILE_URL, {
      maxZoom: 21,
      opacity: 0.85,
    });
    layer.addTo(map);
    layer.bringToFront();
    ranhThuaRef.current = layer;

    let cancelled = false;
    getRanhThuaLayers().then((layers) => {
      if (cancelled || !layers.length || !mapRef.current) return;
      const best =
        layers.find((l) => l.id === ranhThuaLayerId) ||
        layers.reduce((a, b) => ((b.tiles ?? b.features) > (a.tiles ?? a.features) ? b : a));
      // Bay tới vùng có ranh thửa.
      const [lng, lat] = best.center || [];
      if (typeof lat === 'number' && typeof lng === 'number') {
        mapRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
      }
      // Tải geojson cả lớp; việc VẼ + tô màu + lọc làm ở effect 3d riêng.
      // Phủ dữ liệu nghiệp vụ từ DB (API /api/cells-geojson) lên feature ranh
      // thửa để tô màu trạng thái. Backend tắt → không phủ (thửa hiện trạng
      // thái mặc định), KHÔNG dùng data tĩnh nữa.
      Promise.all([
        getRanhThuaGeoJSON(best.id),
        getCellsGeoJSON(undefined, projectId), // chỉ ô của dự án đang mở
      ]).then(([geojson, cellsFC]) => {
        if (cancelled) return;
        ranhThuaDataRef.current = applyDbOverlay(geojson, cellsFC);
        setRanhThuaDataVer((v) => v + 1); // báo effect 3d vẽ lại
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ready, showRanhThua, ranhThuaLayerId, projectId]);

  // 3g) Lô thửa tile overlay (XYZ). Bật/tắt riêng bằng prop showLoThua.
  //     Dùng dạng per-layer /lo-thua-tiles/{layer}/{z}/{x}/{y}.png (merged lỗi 500).
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (loThuaRef.current) {
      map.removeLayer(loThuaRef.current);
      loThuaRef.current = null;
    }
    if (!showLoThua) return;

    const layer = L.tileLayer(loThuaTileUrl(loThuaLayerId), {
      maxZoom: 21,
      opacity: 0.85,
    });
    layer.addTo(map);
    layer.bringToFront();
    loThuaRef.current = layer;

    // Bay tới center của layer lô thửa đang bật.
    let cancelled = false;
    getLoThuaLayers().then((layers) => {
      if (cancelled || !layers.length || !mapRef.current) return;
      const target =
        layers.find((l) => l.id === loThuaLayerId) || layers[0];
      const [lng, lat] = target.center || [];
      if (typeof lat === 'number' && typeof lng === 'number') {
        mapRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, showLoThua, loThuaLayerId]);

  // 3d) Vẽ polyline ranh thửa + tô màu theo lớp trạng thái + lọc.
  //     Chạy lại khi: data tải xong, đổi lớp trạng thái, đổi bộ lọc, bật/tắt.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    // Xoá lớp vector cũ.
    if (ranhThuaVecRef.current) {
      map.removeLayer(ranhThuaVecRef.current);
      ranhThuaVecRef.current = null;
    }
    const data = ranhThuaDataRef.current;
    if (!showRanhThua || !data) return;

    const layerDef = getLayer(ranhThuaStatusLayer);

    const vec = L.geoJSON(data, {
      interactive: false, // click do map.on('click') xử lý
      // Chỉ ẩn HẲN khi bật "ẩn hẳn ô không khớp"; mặc định vẽ hết rồi làm mờ.
      filter: (f) =>
        ranhThuaHideUnmatched && ranhThuaFilter ? ranhThuaFilter(f) : true,
      style: (f) => {
        const value = statusValue(f, layerDef.field);
        const st = layerDef.statuses.find((s) => s.value === value);
        // Thửa KHÔNG khớp bộ lọc (mà không ẩn hẳn) → làm mờ để ô khớp nổi bật.
        const unmatched = ranhThuaFilter ? !ranhThuaFilter(f) : false;
        // Thửa "tạm thời" (chưa có meta thật) → viền nét đứt màu amber,
        // nền nhạt hơn, để phân biệt với thửa đã có số liệu thật.
        const provisional = isProvisional(f, layerDef.field);
        if (provisional) {
          return {
            color: '#D97706', // amber-600
            weight: 1.5,
            dashArray: '5 4',
            fillColor: st?.fill || '#CBD5E1',
            fillOpacity: unmatched ? 0.04 : 0.2,
            opacity: unmatched ? 0.2 : 0.95,
          };
        }
        return {
          color: st?.stroke || '#1D4ED8',
          weight: 1,
          fillColor: st?.fill || '#93C5FD',
          fillOpacity: unmatched ? 0.08 : 0.45,
          opacity: unmatched ? 0.2 : 0.9,
        };
      },
    });
    vec.addTo(map);
    ranhThuaVecRef.current = vec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    showRanhThua,
    ranhThuaDataVer,
    ranhThuaStatusLayer,
    ranhThuaFilter,
    ranhThuaHideUnmatched,
  ]);

  // 3e) Ranh phân khu A/B của ranh thửa (cấu hình cứng, chỉ hiển thị).
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (ranhThuaSubRef.current) {
      map.removeLayer(ranhThuaSubRef.current);
      ranhThuaSubRef.current = null;
    }
    if (!showRanhThua || !showRanhThuaSubdivisions) return;

    const group = L.layerGroup();

    RANH_THUA_SUBDIVISIONS.forEach((sub) => {
      // Vùng bao khu: viền màu đậm + nền màu mờ nhẹ để dễ phân biệt 2 khu.
      L.polygon(
        sub.polygon.map(([lng, lat]) => [lat, lng]),
        {
          color: sub.color,
          weight: 4,
          fillColor: sub.color,
          fillOpacity: 0.06,
          opacity: 1,
        }
      ).addTo(group);

      // Nhãn tên khu ở tâm.
      const [lng, lat] = sub.label;
      L.marker([lat, lng], {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html:
            `<span style="background:${sub.color};color:#fff;font-weight:800;` +
            `font-size:18px;padding:4px 14px;border-radius:8px;` +
            `box-shadow:0 1px 4px rgba(0,0,0,.3);white-space:nowrap;">` +
            `${sub.name.replace('Khu ', '')}</span>`,
          iconSize: [0, 0],
        }),
      }).addTo(group);
    });

    // Đường phân chia A | B (đậm hơn).
    L.polyline(
      RANH_THUA_DIVIDER.map(([lng, lat]) => [lat, lng]),
      { color: '#111827', weight: 2, opacity: 0.7, dashArray: '4 4' }
    ).addTo(group);

    group.addTo(map);
    group.eachLayer((l) => l.bringToFront?.()); // nổi lên trên ranh thửa
    ranhThuaSubRef.current = group;
  }, [ready, showRanhThua, showRanhThuaSubdivisions]);

  // 3f) Ranh lô (hình bao cụm thửa) — click mở panel lô.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (loRef.current) {
      map.removeLayer(loRef.current);
      loRef.current = null;
    }
    if (!showRanhThua || !showLo) return;

    let cancelled = false;
    loLayersRef.current = new Map();
    getLoGeoJSON(ranhThuaLayerId).then((geojson) => {
      if (cancelled || !geojson || !mapRef.current) return;
      const layer = L.geoJSON(geojson, {
        style: LO_STYLE_BASE,
        onEachFeature: (f, lyr) => {
          loLayersRef.current.set(f.id, lyr); // nhớ layer theo id để đổi style sau
          // Nhãn lô: ưu tiên mã lô chuẩn (meta.loCode, VD "DCA15"); lô chưa gán
          // mã → fallback "Lô #<id>".
          const loLabel = f.properties.meta?.loCode
            ? `Lô ${f.properties.meta.loCode}`
            : `Lô #${f.id}`;
          lyr.bindTooltip(
            `${loLabel} · ${f.properties.cellCount} ô · ${Math.round(
              f.properties.areaTotal
            ).toLocaleString('vi-VN')} m²`,
            { sticky: true }
          );
          lyr.on('click', (e) => {
            L.DomEvent.stopPropagation(e); // không kích hoạt click thửa
            onLoClickRef.current?.(f.id);
          });
        },
      });
      layer.addTo(mapRef.current);
      loRef.current = layer;
      // Áp highlight lô đang chọn (nếu có) ngay sau khi vẽ xong.
      applyLoHighlight(loLayersRef.current, selectedLoIdRef.current);
    });
    return () => {
      cancelled = true;
    };
    // KHÔNG phụ thuộc selectedLoId: đổi lô chọn KHÔNG tải/vẽ lại lớp lô
    // (tránh gọi lại API + dựng lại toàn bộ → lag). Highlight do effect riêng lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, showRanhThua, showLo, ranhThuaLayerId]);

  // 3f-2) Đổi style lô đang chọn — KHÔNG tải/vẽ lại, chỉ setStyle layer liên quan.
  useEffect(() => {
    selectedLoIdRef.current = selectedLoId;
    applyLoHighlight(loLayersRef.current, selectedLoId);
  }, [selectedLoId]);

  // 3c) Highlight thửa đang chọn (GeoJSON geometry trả từ API click).
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (ranhThuaHlRef.current) {
      map.removeLayer(ranhThuaHlRef.current);
      ranhThuaHlRef.current = null;
    }
    if (!ranhThuaHighlight) return;

    try {
      const gj = L.geoJSON(ranhThuaHighlight, {
        style: {
          color: '#1D4ED8',
          weight: 3,
          fillColor: '#3B82F6',
          fillOpacity: 0.25,
        },
      });
      gj.addTo(map);
      gj.bringToFront();
      ranhThuaHlRef.current = gj;
    } catch {
      // geometry lỗi → bỏ qua, không làm vỡ map.
    }
  }, [ready, ranhThuaHighlight]);

  // 4) Focus target → fit bounds.
  useEffect(() => {
    if (!ready || !mapRef.current || !focusTarget) return;
    const map = mapRef.current;
    let pts = [];

    if (focusTarget.featureId) {
      const f = features.find((x) => x.id === focusTarget.featureId);
      if (f) pts = cellLatLngPath(f);
    } else if (focusTarget.bboxOfIds) {
      features
        .filter((x) => focusTarget.bboxOfIds.includes(x.id))
        .forEach((f) => pts.push(...cellLatLngPath(f)));
    } else if (focusTarget.bbox) {
      features.forEach((f) => pts.push(...cellLatLngPath(f)));
    } else if (focusTarget.lngLatBbox) {
      // Bbox [minLng,minLat,maxLng,maxLat] từ kết quả tra cứu ranh thửa.
      const [minLng, minLat, maxLng, maxLat] = focusTarget.lngLatBbox;
      const bounds = L.latLngBounds(
        [minLat, minLng],
        [maxLat, maxLng]
      );
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 20 });
      return;
    }

    if (pts.length) {
      const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 19 });
    }
  }, [ready, focusTarget, features]);

  return <div ref={elRef} className="h-full w-full" />;
}
