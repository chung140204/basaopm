# basaopm-demo — Frontend

Demo nền tảng quản lý & trình diễn bất động sản (BĐS) theo ô / thửa đất.
Dựng bằng **React + Vite + TailwindCSS**, bản đồ dùng **Leaflet**, biểu đồ dùng
**Recharts**.

## Yêu cầu

- Node.js 18+

## Cài đặt & chạy

```bash
npm install
cp .env.example .env   # rồi điền các biến môi trường cần thiết
npm run dev            # chạy dev server (Vite)
npm run build          # build production vào dist/
npm run preview        # xem thử bản build
```

## Biến môi trường

Xem `.env.example` để biết danh sách biến. Các biến chính:

- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps JavaScript API key.
- `VITE_API_URL_PLANNING_TILE` — endpoint tile XYZ ranh thửa (nền).
- `VITE_API_URL_RANH_THUA` — backend ranh thửa (vector: polyline + click).

> File `.env` chứa cấu hình cục bộ và **không** được commit lên git.

## Cấu trúc

```
src/
  components/   # auth, cell, dashboard, data, info, lot, map, welcome
  data/         # dữ liệu mẫu (geojson, json)
  hooks/        # React hooks
  services/     # gọi API
  utils/        # tiện ích
```

Backend (dịch vụ Python phục vụ ranh thửa) nằm ở thư mục `../backend/` —
xem `../backend/README.md`. Tài liệu API chung ở `../docs/`.
