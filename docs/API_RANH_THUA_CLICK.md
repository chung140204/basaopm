# API ranh thửa — query theo điểm click (cho backend)

## Bối cảnh
Frontend hiển thị ranh thửa dạng **tile PNG** (`/ranh-thua-tiles/{z}/{x}/{y}.png`) nên
không click được từng ô. Để click vào một thửa và xem thông tin, frontend cần một
endpoint **nhận tọa độ điểm click → trả về thửa chứa điểm đó** (point-in-polygon).

Dữ liệu đã có sẵn trong shapefile đã ingest (lớp `truonglinh-chialo`, 1736 features,
thuộc tính nằm trong `.dbf`). Hệ tọa độ nguồn là **VN2000** (`proj=tmerc lon_0=105.5`,
`datum D_Vietnam_2000`). Frontend gửi **WGS84 (lat/lng)** — backend cần reproject
sang VN2000 trước khi tìm.

## Endpoint cần thêm

```
GET /api/ranh-thua/at
```

### Query params
| Tên     | Kiểu   | Bắt buộc | Mô tả                                  |
|---------|--------|----------|----------------------------------------|
| `lat`   | float  | ✅       | Vĩ độ điểm click (WGS84)               |
| `lng`   | float  | ✅       | Kinh độ điểm click (WGS84)             |
| `layer` | string | ❌       | Lọc theo 1 layer; bỏ trống = mọi layer |

Ví dụ:
```
GET /api/ranh-thua/at?lat=21.1229534770414&lng=106.391595592378&layer=truonglinh-chialo
```

### Response — tìm thấy thửa (200)
```json
{
  "found": true,
  "layer": "truonglinh-chialo",
  "feature": {
    "id": "12-45",
    "properties": {
      "so_to": "12",
      "so_thua": "45",
      "dien_tich": 320.5,
      "loai_dat": "ONT",
      "dia_chi": "...",
      "...": "trả nguyên các cột trong .dbf của thửa"
    },
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[106.3915, 21.1229], ...]]
    }
  }
}
```
- `geometry`: ranh của đúng thửa đó, **đã reproject về WGS84 (lng, lat)** để frontend
  vẽ highlight (viền xanh) lên trên tile.
- `properties`: trả nguyên các cột thuộc tính trong file `.dbf` của thửa (số tờ, số
  thửa, diện tích, loại đất, chủ sử dụng... — tùy dữ liệu có gì).

### Response — click vào chỗ trống (200)
```json
{ "found": false }
```

## Ghi chú kỹ thuật cho backend
1. **Reproject**: lat/lng (EPSG:4326) → VN2000 tmerc (proj4 string đã có trong response
   của `/ingest`: `+proj=tmerc +lat_0=0 +lon_0=105.5 +k=0.9999 +x_0=500000 ...`).
2. **Point-in-polygon**: tìm feature chứa điểm. Dùng spatial index (rtree/STRtree) để
   nhanh; 1736 polygon thì kể cả quét tuyến tính cũng < vài ms.
3. **CORS**: giữ `access-control-allow-origin: *` như các endpoint hiện tại.
## Endpoint thứ 2 — GeoJSON cả lớp (để vẽ sẵn polyline mọi ô)

Frontend muốn **vẽ đường ranh (polyline) của TẤT CẢ các thửa** chứ không chỉ thửa
đang click. Cần endpoint trả toàn bộ FeatureCollection:

```
GET /api/ranh-thua/layers/{layer_id}/geojson
```

### Response (200)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "12-45",
      "properties": { "so_to": "12", "so_thua": "45", "...": "..." },
      "geometry": { "type": "Polygon", "coordinates": [[[106.39, 21.12], ...]] }
    }
  ]
}
```
- Tất cả geometry **reproject về WGS84 (lng, lat)**.
- 1736 thửa: nên nén gzip (server đã bật `content-encoding: gzip`). Nếu file lớn,
  cân nhắc trả theo bbox: `?bbox=minLng,minLat,maxLng,maxLat`.

Frontend gọi `getRanhThuaGeoJSON(layerId)` → vẽ viền mọi ô bằng L.geoJSON. Khi endpoint
này chưa có (404), frontend tự bỏ qua và chỉ hiện tile PNG — không lỗi.
