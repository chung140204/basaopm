# CLAUDE.md — Frontend (BasaoPM)

Frontend cho hệ quản lý bất động sản **BasaoPM** — bản đồ ranh thửa / lô / ô đất, phân quyền theo dự án.

## Stack

- **React 18** + **Vite 5** (JavaScript, `.jsx` — không dùng TypeScript)
- **Tailwind CSS 3** cho styling (không dùng CSS module / styled-components)
- **react-router-dom 7** cho routing
- **Leaflet 1.9** (bản đồ vector/tile) + Google Maps loader (`components/map/googleLoader.js`)
- **recharts 3** cho biểu đồ dashboard
- **lucide-react** cho icon

## Lệnh

```bash
npm install
npm run dev       # Vite dev server → http://localhost:5173 (host:true, cho phép tunnel)
npm run build     # build production → dist/
npm run preview   # xem thử bản build
```

Không có test runner / linter cấu hình sẵn. Đừng bịa lệnh `npm test`, `npm run lint`.

## Biến môi trường (Vite `import.meta.env`)

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `VITE_API_URL_RANH_THUA` | `http://localhost:8000` | Backend FastAPI (ranh thửa/lô/ô/auth) |
| `VITE_API_URL_PLANNING_TILE` | `https://api-planning-basata.basao.com` | Tile nền raster cũ |

Backend mặc định chạy Docker ở cổng **8000**. Khi share qua Cloudflare Tunnel, set `VITE_API_URL_RANH_THUA` sang URL tunnel của backend.

## Cấu trúc `src/`

- `App.jsx`, `main.jsx` — entry + router
- `auth/AuthContext.jsx` — context xác thực, giữ JWT + user hiện tại
- `services/` — **mọi lời gọi API đi qua đây** (`authApi.js`, `cellsApi.js`, `planningApi.js`). Thêm endpoint mới thì thêm ở đây, không fetch trực tiếp trong component.
  - `authApi.js` export `authHeader()` — dùng để gắn token vào request.
- `components/` — chia theo màn hình/tính năng: `map/`, `lot/` (lô), `cell/` (ô đất), `dashboard/`, `auth/`, `info/`, `data/`, `welcome/`, `common/` (component tái dùng).
- `hooks/` — `useDbCells.js` (load ô từ DB), `useProjectAccess.js` (phân quyền dự án)
- `data/` — mock/seed data + nhãn enum (`enumLabels.js`)
- `lib/layers.js` — cấu hình lớp bản đồ
- `utils/` — `format.js`, `payment.js`, `usePersistentState.js`

## Quy ước

- **Domain tiếng Việt**: *ranh thửa* = ranh giới thửa đất (lớp bản đồ), *lô* = cụm thửa, *ô đất*/*cell* = đơn vị nghiệp vụ (schema_v2). Giữ nguyên thuật ngữ này trong tên biến/API để khớp backend.
- **Phân quyền**: role `superadmin` / `admin` / `viewer`; quyền xem còn theo từng dự án (`useProjectAccess`). Kiểm tra quyền trước khi render action sửa/xóa.
- Comment trong code viết tiếng Việt theo phong cách hiện có là chấp nhận được (khớp codebase); text UI tiếng Việt.

## Màu sắc — BẮT BUỘC

Mọi thay đổi UI phải dùng đúng palette thương hiệu trong [../color.md](../color.md):

- **Blue `#003AD6`** (`accent-500`) — màu tương tác chính (nút primary, link, active)
- **Dark Navy `#000D6D`** (`accent-700`) — header, sidebar, hover/active đậm
- **Mint Green `#43F0A4`** (`mint-500`) — accent phụ, badge, highlight (dùng tiết kiệm)

Dùng token Tailwind `accent-*` / `mint-*` (đã calibrate trong `tailwind.config.js`), không hard-code hex rời rạc. Focus ring: `0 0 0 3px rgba(0,58,214,.35)`.
