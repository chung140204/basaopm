// Map id thửa ranh thửa (DB, layer truonglinh-chialo) → số ô DCB02 (1..27).
// Xác định bằng đối chiếu centroid + diện tích hình học với bản vẽ DC.B02
// (đã kiểm chứng: tỉ lệ area_geom/area_thật ổn định 1.135–1.165 cho cả 27 ô).
//
// Dùng để TÔ MÀU polyline ranh thửa thật trên bản đồ bằng dữ liệu nghiệp vụ
// tĩnh trong cellsDCB02.js (DCB02_RAW), không phụ thuộc backend meta.
export const DCB02_PLOT_TO_O = {
  1339: 1, 1290: 2, 1291: 3, 1292: 4, 1293: 5, 1294: 6, 1340: 7,
  1323: 8, 1324: 9, 1325: 10, 1326: 11, 1327: 12, 1328: 13, 1329: 14, 1330: 15,
  1335: 16, 1336: 17, 1337: 18, 1338: 19,
  1341: 20, 1342: 21, 1343: 22, 1344: 23,
  1331: 24, 1332: 25, 1333: 26, 1334: 27,
};
