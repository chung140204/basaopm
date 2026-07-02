// Hook dùng chung: nạp ô THẬT của 1 DỰ ÁN từ DB (API /api/cells?project=),
// dựng grid sơ đồ (mỗi lô 1 dải y). KHÔNG còn trộn mock — chỉ ô thật của dự án.
// Dùng bởi MapScreen (bản đồ), CellListScreen, LotListScreen để cùng nguồn data.
// Dự án rỗng / backend lỗi → mảng rỗng (bản đồ + màn ô trống).
import { useEffect, useState } from 'react';
import { getCells } from '../services/cellsApi';

// Chuẩn hoá mã ô để khớp DB ('DCB02-01') với mock ('DCB02-1'):
// bỏ số 0 đứng đầu phần sau dấu '-'.
export function normCellCode(code) {
  if (!code) return code;
  return String(code).replace(/-0*(\d)/, '-$1');
}

// Dựng feature lưới cho 1 ô từ DB (lô dùng grid sơ đồ — bố cục lưới đều,
// không có toạ độ bản vẽ). gy = mép trên của lưới (mỗi lô 1 dải y riêng).
function buildGridCell(api, idx, lotCode, subdivisionId, gy) {
  const cols = 8;
  const cw = 100;
  const ch = 80;
  const gap = 2;
  const gx = 70;
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
      lotCode,
      subdivisionId,
      zone: api.zone ?? null, // phân khu THẬT từ DB (null nếu chưa gán)
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

// Dải y giữa các lô (mỗi lô 1 dải riêng để grid không chồng theo y).
const GY_STEP = 400;

/**
 * Trả về mảng cells THẬT của 1 DỰ ÁN (từ DB), dựng grid theo lô.
 *   - Gọi 1 lần GET /api/cells?project=<projectId> → mọi ô của dự án.
 *   - Group theo lotCode → mỗi lô 1 dải y → dựng grid đều.
 *   - Dự án rỗng / chưa có data → [] (bản đồ + màn ô trống).
 * @param {string} projectId mã dự án ('DA-001'); rỗng → không fetch.
 * @param {Array} initial giá trị khởi tạo (mặc định []; truyền [] để khỏi nháy mock).
 * @returns {[Array, Function, boolean]} [cells, setCells, ready]
 */
export function useDbCells(projectId, initial = []) {
  const [cells, setCells] = useState(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setCells([]);
      setReady(true);
      return undefined;
    }
    let cancelled = false;
    setReady(false);
    getCells(undefined, projectId)
      .then((all) => {
        if (cancelled) return;
        // Group ô theo mã lô.
        const byLot = new Map();
        for (const c of all) {
          if (!byLot.has(c.lotCode)) byLot.set(c.lotCode, []);
          byLot.get(c.lotCode).push(c);
        }
        const lotCodes = [...byLot.keys()].sort();
        const feats = [];
        lotCodes.forEach((lotCode, li) => {
          const gy = 80 + li * GY_STEP; // mỗi lô 1 dải y
          const subId = lotCode.toLowerCase();
          byLot
            .get(lotCode)
            .forEach((c, i) => feats.push(buildGridCell(c, i, lotCode, subId, gy)));
        });
        setCells(feats); // dự án rỗng → feats = [] → trống
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setCells([]);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return [cells, setCells, ready];
}
