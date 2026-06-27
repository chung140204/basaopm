// Lô (land lots) are derived from CELLS by grouping on `lotCode`.
// A lot = a list of contiguous cells. Its shape is the union of its cells'
// geometries; its total area is the sum of cell areas.
import { CELLS, SUBDIVISIONS, zoneOfLot, zoneName } from './cells';

// Bounding box over a set of cell features (viewBox space, y down).
function bboxOf(cells) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) {
    for (const [x, y] of c.geometry.coordinates[0]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

const subName = (id) => SUBDIVISIONS.find((s) => s.id === id)?.name ?? id;

// Sum cell areas grouped by a property field → { value: areaM2 }.
// Used for "diện tích theo tình trạng" breakdowns on each lot.
function areaByField(cells, field) {
  const acc = {};
  for (const c of cells) {
    const key = c.properties[field];
    acc[key] = (acc[key] ?? 0) + (c.properties.area ?? 0);
  }
  return acc;
}

// Build the derived lot list once at module load.
export function buildLots(cells = CELLS) {
  const byCode = new Map();
  for (const c of cells) {
    const code = c.properties.lotCode;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(c);
  }

  const lots = [];
  for (const [code, cells] of byCode) {
    // Order cells left→right, top→bottom for a stable display.
    cells.sort((a, b) => {
      const [ax, ay] = a.properties.centroid;
      const [bx, by] = b.properties.centroid;
      return ay - by || ax - bx;
    });
    const subdivisionId = cells[0].properties.subdivisionId;
    const zoneId = zoneOfLot(code);
    const totalArea = cells.reduce((s, c) => s + (c.properties.area ?? 0), 0);
    lots.push({
      id: `lot-${code}`,
      lotCode: code,
      subdivisionId,
      subdivisionName: subName(subdivisionId),
      zoneId, // 'khu-a' | 'khu-b'
      zoneName: zoneName(zoneId),
      cells, // contiguous cell features (already ordered)
      cellCount: cells.length,
      totalArea,
      // Diện tích theo tình trạng (m² theo từng nhóm trạng thái).
      areaByBusiness: areaByField(cells, 'businessStatus'), // kinh doanh
      areaByLegal: areaByField(cells, 'collateralStatus'), // pháp lý định danh / thế chấp
      areaByPayment: areaByField(cells, 'paymentStatus'), // pháp lý - tài chính
      bbox: bboxOf(cells),
      // Editable management fields (defaults; overridden by user edits in App state).
      description: '',
      note: '',
    });
  }

  // Stable order: by subdivision then lot code.
  lots.sort(
    (a, b) =>
      a.subdivisionId.localeCompare(b.subdivisionId) ||
      a.lotCode.localeCompare(b.lotCode)
  );
  return lots;
}

export const LOTS = buildLots();
