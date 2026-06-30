# Dựng lại Database từ đầu

Hướng dẫn dựng PostGIS + nạp toàn bộ dữ liệu cho backend ranh thửa.
Dữ liệu nằm trong volume `pgdata` của Docker (KHÔNG nằm trong git) — khi clone
repo về máy mới, làm theo các bước dưới để tái tạo.

> ⚠️ **LƯU Ý: dữ liệu nguồn đã được gỡ khỏi repo.**
> Hai thư mục `_shp_seed/` (shapefile) và `_excel/` (4 file Excel) đã bị xoá khỏi
> dự án (DB hiện hành đã nạp xong, dữ liệu sống trong volume `pgdata`).
> Quy trình dưới đây CHỈ chạy lại được nếu bạn khôi phục 2 nguồn này trước:
> - Lấy `TruongLinh_Chialo.shp` (+ .dbf/.prj/.shx) đặt vào `backend/_shp_seed/`.
> - Lấy 4 file Excel nghiệp vụ, đổi tên ASCII, đặt vào `backend/_excel/`.
> - Thêm lại mount trong `docker-compose.yml` (dòng `./_shp_seed:/app/_shp_seed:ro`)
>   HOẶC copy thủ công vào container như bước 2/5.

## Yêu cầu

- Docker Desktop
- 5 nguồn dữ liệu (đã gỡ khỏi repo — xem lưu ý ở trên):
  - `_shp_seed/TruongLinh_Chialo.shp` (+ .dbf/.prj/.shx)
  - 4 file Excel nghiệp vụ:
    - `Data tổng theo ô.xlsx`
    - `Data theo HĐ giao dịch.xlsx`
    - `Data theo tình trạng pháp lý tài chính.xlsx`
    - `Data theo tình trạng thi hành án.xlsx`

## Thứ tự phụ thuộc (QUAN TRỌNG)

```
1. docker compose up        → khởi động PostGIS + API
2. import_shp.py            → tạo bảng ranh_thua + nạp 3144 thửa (hình học)
3. build_lo.py             → gom thửa thành lô (bảng lo) + gắn lo_id
4. schema_v2.sql           → tạo các bảng nghiệp vụ (cell/contract/payment/...)
5. import_excel.py          → nạp dữ liệu nghiệp vụ từ 4 Excel (DCB02 + DCB09)
6. apply_dcb09_geom.py      → gán geom + tên + status cho 32 ô DCB09 (lô #48)
```

> Bước 4 phải chạy TRƯỚC bước 5 (import_excel ghi vào các bảng schema_v2).
> Bước 6 phải chạy SAU bước 5 (cần subdivision DCB09 + bảng cell đã có).

---

## Các bước chi tiết

### 1. Khởi động container

```bash
cd backend
docker compose up --build -d
```

PostGIS chạy ở cổng `5433`, API ở `8000`. Chờ db `healthy` rồi tiếp tục.

### 2. Nạp shapefile (ranh thửa)

```bash
docker compose run --rm api python import_shp.py
```

Tạo bảng `ranh_thua` (3144 thửa, layer `truonglinh-chialo` + `dccb-chialo`),
reproject VN2000 → WGS84.

### 3. Gom thửa thành lô

`build_lo.py` đã được COPY sẵn trong image:

```bash
docker compose exec api python build_lo.py
```

Tạo bảng `lo` (gom cụm bằng DBSCAN) + gắn `lo_id` vào từng thửa.

### 4. Áp schema nghiệp vụ (schema_v2)

`schema_v2.sql` KHÔNG được COPY vào image → áp trực tiếp vào DB:

```bash
docker compose exec -T db psql -U ranhthua -d ranhthua < schema/schema_v2.sql
```

Tạo các bảng: `subdivision, cell, contract, contract_cell, payment, mortgage,
legal_event, document`.

### 5. Nạp dữ liệu nghiệp vụ từ Excel

`import_excel.py` và 4 file Excel KHÔNG nằm trong image → copy vào container.
Lưu ý: `docker cp` lỗi với tên file Unicode → đổi tên 4 Excel sang ASCII trước:

```bash
# Trên máy host: chuẩn bị thư mục _excel với 4 file đổi tên ASCII
mkdir -p _excel
cp "../../Data tổng theo ô.xlsx"                      _excel/tong.xlsx
cp "../../Data theo HĐ giao dịch.xlsx"                _excel/hd.xlsx
cp "../../Data theo tình trạng pháp lý tài chính.xlsx" _excel/phaply.xlsx
cp "../../Data theo tình trạng thi hành án.xlsx"       _excel/tha.xlsx

# Copy script + thư mục Excel vào container, rồi chạy
docker compose cp import_excel.py api:/app/import_excel.py
docker compose cp _excel api:/app/_excel
docker compose exec api python import_excel.py
```

Nạp: 59 ô (DCB02=27 + DCB09=32), 9 HĐ, 17 thanh toán, thế chấp, THA.
`import_excel.py` là idempotent (TRUNCATE rồi nạp lại) — chạy lại được.

### 6. Gán geom cho DCB09

DCB09 nạp ở bước 5 chưa có geom. Bước này map 32 ô → 32 thửa lô #48
(theo bố cục bản vẽ) và ghi `ranh_thua_id` + centroid + tên + status:

```bash
docker compose cp apply_dcb09_geom.py api:/app/apply_dcb09_geom.py
docker compose exec api python apply_dcb09_geom.py
```

---

## Kiểm tra sau khi nạp

```bash
# Số thửa + lô
docker compose exec db psql -U ranhthua -d ranhthua -c \
  "SELECT 'ranh_thua' t, count(*) FROM ranh_thua
   UNION ALL SELECT 'lo', count(*) FROM lo
   UNION ALL SELECT 'cell', count(*) FROM cell;"
# Kỳ vọng: ranh_thua=3144, lo=49, cell=59

# API hoạt động
curl http://localhost:8000/health
curl "http://localhost:8000/api/cells?lot=DCB09"   # 32 ô, hasGeom=true
```

## Làm lại từ con số 0 (xoá sạch volume)

```bash
docker compose down -v   # -v xoá luôn volume pgdata
# rồi chạy lại từ bước 1
```
