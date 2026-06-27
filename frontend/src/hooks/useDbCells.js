// Hook dùng chung: nạp dữ liệu ô THẬT từ DB (API schema_v2) và trộn vào mock
// CELLS — giữ geometry sơ đồ, thay số liệu nghiệp vụ bằng data Excel thật.
//   - DCB02: merge vào ô mock đã có geometry.
//   - DCB09: chưa có ô mock → dựng feature grid mới từ data DB.
// Dùng bởi cả MapScreen (bản đồ) và CellListScreen (Quản lý theo ô) để 2 màn
// hiển thị CÙNG nguồn data thật. Backend tắt → trả nguyên mock (app vẫn chạy).
import { useEffect, useState } from 'react';
import { CELLS } from '../data/cells';
import { getCells } from '../services/cellsApi';

// Chuẩn hoá mã ô để khớp DB ('DCB02-01') với mock ('DCB02-1'):
// bỏ số 0 đứng đầu phần sau dấu '-'.
export function normCellCode(code) {
  if (!code) return code;
  return String(code).replace(/-0*(\d)/, '-$1');
}

// Trộn field nghiệp vụ thật vào 1 feature mock (giữ geometry/centroid).
function mergeApiCell(feature, api) {
  const p = feature.properties;
  return {
    ...feature,
    properties: {
      ...p,
      zone: api.zone ?? p.zone, // phân khu từ DB
      area: api.area ?? p.area,
      value: api.value ?? 0,
      businessStatus: api.businessStatus ?? p.businessStatus,
      collateralStatus: api.collateralStatus ?? p.collateralStatus,
      paymentStatus: api.paymentStatus ?? p.paymentStatus,
      planningType: api.planningType ?? p.planningType,
      currentOwner: api.owner ?? p.currentOwner,
      address: api.address ?? p.address,
      paid: api.paid ?? p.paid,
      remaining: api.remaining ?? p.remaining,
      constructionStatus: api.constructionStatus ?? p.constructionStatus,
      buildDensity: api.buildDensity ?? p.buildDensity,
      buildFloors:
        api.buildFloorMin != null
          ? `${api.buildFloorMin}-${api.buildFloorMax} tầng`
          : p.buildFloors,
      bookStatus: api.bookStatus ?? p.bookStatus,
      bookNo: api.bookNo ?? p.bookNo,
      internalLegal: api.internalLegal ?? p.internalLegal,
      _source: 'db',
    },
  };
}

// Dựng feature lưới cho 1 ô DCB09 (lô chưa có toạ độ thật → grid sơ đồ).
function buildDcb09Cell(api, idx) {
  const cols = 8;
  const cw = 100;
  const ch = 80;
  const gap = 2;
  const gx = 70;
  const gy = 640;
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  const x = gx + col * (cw + gap);
  const y = gy + row * (ch + gap);
  const cx = Math.round(x + cw / 2);
  const cy = Math.round(y + ch / 2);
  return {
    id: `cell-${api.cellCode}`,
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[x, y], [x + cw, y], [x + cw, y + ch], [x, y + ch], [x, y]]],
    },
    properties: {
      cellCode: api.cellCode,
      lotCode: 'DCB09',
      subdivisionId: 'dcb09',
      zone: api.zone ?? 'khu-b', // phân khu từ DB
      centroid: [cx, cy],
      area: api.area ?? 0,
      planningType: api.planningType ?? 'Đất ở chia lô',
      value: api.value ?? 0,
      businessStatus: api.businessStatus ?? 'unsold',
      collateralStatus: api.collateralStatus ?? 'none',
      paymentStatus: api.paymentStatus ?? 'unpaid',
      transaction: null,
      internalLegal: api.internalLegal ?? '',
      documents: [],
      legalHistory: [],
      note: api.note ?? '',
      description: api.description ?? '',
      address: api.address ?? null,
      currentOwner: api.owner ?? null,
      bookStatus: api.bookStatus ?? null,
      bookNo: api.bookNo ?? null,
      constructionStatus: api.constructionStatus ?? null,
      buildDensity: api.buildDensity ?? null,
      buildFloors:
        api.buildFloorMin != null ? `${api.buildFloorMin}-${api.buildFloorMax} tầng` : null,
      contract: null,
      payments: [],
      paid: api.paid ?? 0,
      remaining: api.remaining ?? 0,
      mortgage: null,
      _source: 'db',
    },
  };
}

/**
 * Trả về mảng cells (mock) đã được trộn data thật từ DB (DCB02 + DCB09).
 * @param {Array} initial mock cells (mặc định CELLS)
 * @returns {[Array, Function]} [cells, setCells]
 */
export function useDbCells(initial = CELLS) {
  const [cells, setCells] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCells('DCB02'), getCells('DCB09')]).then(([dcb02, dcb09]) => {
      if (cancelled) return;
      const byCode = new Map(dcb02.map((c) => [normCellCode(c.cellCode), c]));
      const dcb09Cells = dcb09.map((c, i) => buildDcb09Cell(c, i));
      setCells((prev) => {
        const hasDcb09 = prev.some((f) => f.properties.lotCode === 'DCB09');
        const merged = prev.map((f) => {
          const api = byCode.get(normCellCode(f.properties.cellCode));
          return api ? mergeApiCell(f, api) : f;
        });
        return hasDcb09 ? merged : [...merged, ...dcb09Cells];
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return [cells, setCells];
}
