# Backend ranh thửa (FastAPI + PostGIS)

API phục vụ dữ liệu ranh thửa cho app frontend: vẽ polyline mọi ô + click tra thông tin thửa.

## Chạy

Cần Docker Desktop.

```bash
cd backend

# 1) Khởi động PostGIS + API
docker compose up --build -d

# 2) Nạp dữ liệu shapefile vào PostGIS (chạy 1 lần)
docker compose run --rm api python import_shp.py
```

API chạy tại http://localhost:8000

## Endpoints

| Method | URL | Mô tả |
|--------|-----|-------|
| GET | `/health` | Kiểm tra sống |
| GET | `/api/ranh-thua/layers` | Danh sách layer + center |
| GET | `/api/ranh-thua/geojson` | FeatureCollection cả lớp (vẽ polyline) |
| GET | `/api/ranh-thua/at?lat=&lng=` | Tìm thửa tại điểm click (point-in-polygon) |

### Test nhanh

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/api/ranh-thua/layers"
curl "http://localhost:8000/api/ranh-thua/at?lat=21.1229534770414&lng=106.391595592378"
curl "http://localhost:8000/api/ranh-thua/geojson" -o out.geojson
```

## Dữ liệu

- Nguồn: `_shp_seed/TruongLinh_Chialo.shp` (1736 thửa, hệ VN2000).
- `import_shp.py` reproject VN2000 → WGS84 (EPSG:4326) rồi nạp vào bảng `ranh_thua`
  (cột `geom` geometry 4326 + GiST index, `properties` jsonb).
- Thay dữ liệu mới: thay file trong `_shp_seed/` rồi chạy lại lệnh import (bảng tạo lại).

## Ghi chú Windows

- PostGIS map ra cổng **5433** (tránh đụng Postgres local nếu có) — đổi trong `docker-compose.yml` nếu cần.
- Nếu `docker compose run` báo chưa có image, chạy `docker compose build` trước.
