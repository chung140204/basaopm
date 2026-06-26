// Aggregated project statistics (by AREA, m²) — matches the official
// "Tổng hợp số liệu toàn dự án" sheet. Keyed by project id.
// Values are in m² unless noted (giá trị in tỷ đồng).

// NOTE: DA-001 hiện dùng MOCK DATA cho dashboard (theo bảng số liệu mẫu),
// chưa nối số liệu thực từ dữ liệu ô đất. Khi số hóa xong sẽ thay bằng
// số liệu tính từ cells/lots.
export const PROJECT_STATS = {
  'DA-001': {
    tyLeQH: '1/500',
    // Each metric: { total, khuA, khuB }
    metrics: {
      tongQH: { total: 191858.0, khuA: 125984.0, khuB: 65874.0 },
      daBan: { total: 113775.9, khuA: 69918.0, khuB: 43858.0 },
      daBanCoSo: { total: 49720.4, khuA: 29403.4, khuB: 20317.0 },
      daBanChuaSo: { total: 64055.0, khuA: 41114.4, khuB: 22940.6 },
      chuaBan: { total: 78083.5, khuA: 55467.1, khuB: 22616.4 },
      // Tỷ lệ đã bán / tổng QH (%)
      tyLeDaBan: { total: 59.3, khuA: 55.5, khuB: 66.5 },
      // Giá trị (tỷ đồng)
      giaTriCoSo: { total: 239.6, khuA: 134.1, khuB: 105.5 },
      giaTriChuaSo: { total: 552.8, khuA: 363.0, khuB: 189.7 },
    },
  },
};

export function getProjectStats(projectId) {
  return PROJECT_STATS[projectId] ?? null;
}
