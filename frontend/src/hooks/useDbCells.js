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
  // ready=false cho tới khi lần fetch đầu hoàn tất (kể cả khi backend tắt → vẫn
  // bật true để UI thôi hiện skeleton, hiển thị data tĩnh). Tránh "nhấp nháy
  // xám": mini-map chờ ready mới tô màu trạng thái.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // DCB02, DCB05, DCB09: dựng grid lưới mới từ DB (mỗi lô 1 dải y riêng).
    // Không còn merge vào mock — DCB02 giờ là grid đều như DCB09.
    Promise.all([
      getCells('DCB02'),
      getCells('DCB05'),
      getCells('DCB09'),
    ]).then(([dcb02, dcb05, dcb09]) => {
      if (cancelled) return;
      const dcb02Cells = dcb02.map((c, i) =>
        buildGridCell(c, i, 'DCB02', 'dcb02', 80)
      );
      const dcb05Cells = dcb05.map((c, i) =>
        buildGridCell(c, i, 'DCB05', 'dcb05', 400)
      );
      const dcb09Cells = dcb09.map((c, i) =>
        buildGridCell(c, i, 'DCB09', 'dcb09', 640)
      );
      setCells((prev) => {
        // Bỏ ô mock DCB02/DCB05 (nếu có) rồi thay bằng bản dựng từ DB.
        const kept = prev.filter(
          (f) =>
            f.properties.lotCode !== 'DCB02' &&
            f.properties.lotCode !== 'DCB05'
        );
        const hasDcb09 = kept.some((f) => f.properties.lotCode === 'DCB09');
        const base = [...kept, ...dcb02Cells, ...dcb05Cells];
        return hasDcb09 ? base : [...base, ...dcb09Cells];
      });
      setReady(true);
    })
    .catch(() => {
      if (!cancelled) setReady(true); // backend lỗi → vẫn bỏ skeleton, dùng data tĩnh
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return [cells, setCells, ready];
}
