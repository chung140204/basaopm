# basaopm-demo

Demo nền tảng quản lý & trình diễn bất động sản (BĐS) theo ô / thửa đất.
Dự án gồm hai phần tách biệt trong cùng một repo (monorepo):

| Thư mục     | Vai trò   | Công nghệ                                     |
| ----------- | --------- | --------------------------------------------- |
| `frontend/` | Giao diện | React + Vite + TailwindCSS, Leaflet, Recharts |
| `backend/`  | Dịch vụ   | Python (ranh thửa: vector + tile XYZ), Docker |
| `docs/`     | Tài liệu  | Tài liệu API + screenshots                    |

## Bắt đầu nhanh

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # điền các biến môi trường cần thiết
npm run dev            # chạy dev server (Vite)
```

Chi tiết: xem [`frontend/README.md`](frontend/README.md).

### Backend

```bash
cd backend
docker compose up      # chạy bằng Docker
```

Chi tiết: xem [`backend/README.md`](backend/README.md).

## Cấu trúc repo

```
frontend/   # ứng dụng React (FE)
backend/    # dịch vụ Python phục vụ ranh thửa (BE)
docs/       # tài liệu API + screenshots
```

Frontend gọi backend qua biến môi trường `VITE_API_URL_RANH_THUA`
(xem `frontend/.env.example`).
