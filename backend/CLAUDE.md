# CLAUDE.md — Backend (BasaoPM)

API quản lý bất động sản **BasaoPM**: xác thực, phân quyền theo dự án, dữ liệu ô đất / lô / ranh thửa cho bản đồ.

## Stack

- **FastAPI 0.115** + **uvicorn** (Python)
- **PostGIS 16-3.4** (Postgres + không gian) qua **psycopg 3** — SQL viết tay, **không dùng ORM**
- **geopandas / shapely / pyproj** cho xử lý hình học + import shapefile
- Auth: **bcrypt** (hash mật khẩu) + **PyJWT** HS256

## Chạy (Docker Compose)

```bash
docker compose up --build              # db (PostGIS) + api (FastAPI :8000)
# db expose cổng 5433 ra ngoài (tránh đụng Postgres local)
docker compose run --rm api python import_shp.py   # import dữ liệu ranh thửa
```

- API: http://localhost:8000 — Swagger UI ở **/docs** (endpoint đã nhóm theo tag).
- DB tên `ranhthua`, user/pass `ranhthua/ranhthua`.

Chạy trực tiếp (không Docker): `uvicorn app.main:app --reload` với `DATABASE_URL` trỏ về `localhost:5433`.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `DATABASE_URL` | `postgresql://ranhthua:ranhthua@localhost:5433/ranhthua` | Kết nối PostGIS |
| `JWT_SECRET` | `basaopm-dev-secret-change-me` | Bí mật ký JWT — **phải đổi khi deploy** |

## Cấu trúc

- `app/main.py` — **toàn bộ endpoint** (một file lớn ~730 dòng, nhóm theo tag Swagger: Xác thực, Người dùng, Dự án, Ô đất, Ranh thửa, Lô, Hệ thống).
- `app/auth.py` — bcrypt + JWT + **nguồn sự thật ROLES/PERMISSIONS**. FE lấy qua `GET /api/auth/meta`.
- `app/db.py` — `get_conn()` mở connection psycopg mới (caller đóng bằng `with`).
- `schema/` — DDL: `schema_auth.sql`, `schema_project.sql`, `schema_v2.sql` (ô nghiệp vụ).
- `migrations/` — SQL migration thủ công, đặt tên theo ngày (`2026_07_*.sql`).
- `*.py` ở root — script import/seed một lần: `import_shp.py`, `import_dca14.py`, `import_dca15.py`, `import_excel.py`, `build_lo.py`, `apply_dcb05.py`, `apply_dcb09_geom.py`, `seed_users.py`, `seed_projects.py`.

## Quy ước

- **Hình học trả về là WGS84 (EPSG:4326), GeoJSON (lng, lat)** — client vẽ Leaflet. Giữ đúng thứ tự này.
- **SQL viết tay + tham số hóa** (psycopg placeholder `%s`) — không nối chuỗi input để tránh SQL injection. Không thêm ORM.
- **Phân quyền**: role `superadmin` (`*`) / `admin` (chỉ xem) / `viewer`. Thêm role/quyền = sửa `ROLES` + `PERMISSIONS` trong `auth.py` (một chỗ duy nhất). Gate endpoint bằng `Depends` từ `app.auth`.
- **Domain tiếng Việt**: *ranh thửa* = ranh giới thửa (lớp bản đồ), *lô* = cụm thửa, *ô đất* = đơn vị nghiệp vụ (schema_v2). Giữ nguyên thuật ngữ trong tên endpoint/cột để khớp FE.
- CORS mở `*` (demo) + cho phép PUT/OPTIONS (form lưu meta cần preflight). Siết lại khi deploy thật.
- Comment tiếng Việt theo phong cách hiện có là chấp nhận được; giữ đồng nhất với file xung quanh.

## Zone / dự án — lưu ý

Zone/dự án của lô lưu ở bảng **`subdivision`** (không phải `lo.meta`). Panel lô đọc zone thật từ DB. Còn tồn đọng dữ liệu meta trùng lặp cần dọn — cẩn thận khi sửa logic zone.
