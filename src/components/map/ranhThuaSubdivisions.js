// Phân khu của lớp ranh thửa (Khu A, Khu B...).
// Đây là CẤU HÌNH CỨNG: theo yêu cầu nghiệp vụ, người dùng KHÔNG tự sửa ranh/tên
// phân khu (vì liên quan quy hoạch) — muốn đổi phải báo dev sửa file này.
//
// Mỗi khu: vùng bao (polygon [lng,lat]) để vẽ đường phân chia + nhãn ở tâm.
// Ranh giới dựa trên bbox thực của dữ liệu ranh thửa (TruongLinh_Chialo):
//   lng 106.38857 → 106.39977, lat 21.11868 → 21.12500.
// Đường chia A/B là đường dọc ở giữa (~106.3945), khớp con đường trong dự án.

const DIV_LNG = 106.3945; // kinh độ đường phân chia A | B
const MIN_LAT = 21.1184;
const MAX_LAT = 21.1253;
const MIN_LNG = 106.3883;
const MAX_LNG = 106.4001;

export const RANH_THUA_SUBDIVISIONS = [
  {
    id: 'khu-a',
    name: 'Khu A',
    color: '#DC2626', // đỏ (khớp ảnh tham chiếu)
    // Vùng bao bên trái.
    polygon: [
      [MIN_LNG, MIN_LAT],
      [DIV_LNG, MIN_LAT],
      [DIV_LNG, MAX_LAT],
      [MIN_LNG, MAX_LAT],
      [MIN_LNG, MIN_LAT],
    ],
    // Nhãn đặt ở tâm khu.
    label: [(MIN_LNG + DIV_LNG) / 2, (MIN_LAT + MAX_LAT) / 2],
  },
  {
    id: 'khu-b',
    name: 'Khu B',
    color: '#2563EB', // xanh dương (khớp ảnh tham chiếu)
    polygon: [
      [DIV_LNG, MIN_LAT],
      [MAX_LNG, MIN_LAT],
      [MAX_LNG, MAX_LAT],
      [DIV_LNG, MAX_LAT],
      [DIV_LNG, MIN_LAT],
    ],
    label: [(DIV_LNG + MAX_LNG) / 2, (MIN_LAT + MAX_LAT) / 2],
  },
];

// Đường phân chia A|B (đường dọc giữa) — vẽ đậm hơn để nổi bật.
export const RANH_THUA_DIVIDER = [
  [DIV_LNG, MIN_LAT],
  [DIV_LNG, MAX_LAT],
];
