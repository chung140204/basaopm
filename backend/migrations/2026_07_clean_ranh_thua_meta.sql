-- =====================================================================
-- Migration: Dọn dữ liệu trùng lặp trong ranh_thua.meta (jsonb)
-- Ngày: 2026-07
-- =====================================================================
-- Mục đích:
--   Cột ranh_thua.meta là BẢN CHỤP CHẾT của dữ liệu nghiệp vụ đã được
--   chuyển sang schema quan hệ mới (bảng cell / contract / payment). Bảng
--   `cell` giờ là NGUỒN SỰ THẬT (app cập nhật realtime), còn meta đang gây
--   LỆCH dữ liệu (27/59 thửa map-cell mâu thuẫn với cell).
--
--   Migration này XÓA mọi key nghiệp vụ / trạng thái / tài chính khỏi meta,
--   CHỈ GIỮ LẠI các key nhận diện mà frontend + backend còn đọc.
--
-- Cách làm (an toàn, chống sót key mới):
--   KHÔNG liệt kê key-cần-xóa (dễ sót khi phát sinh key mới). Thay vào đó
--   tính lại meta = phần rút gọn CHỈ CÒN các key trong WHITELIST, dùng
--   jsonb_object_agg lọc theo whitelist. Key nào ngoài whitelist tự bị loại.
--
-- WHITELIST (các key PHẢI GIỮ — không được xóa):
--   cellCode, lotCode, stt, areaExcel, internalLegal,
--   planningType, loCode, address
--   Lý do giữ (đã đối chiếu code thật):
--     - cellCode, lotCode : app/main.py /api/ranh-thua/search dùng
--                           meta->>'cellCode', meta->>'lotCode';
--                           FE LoPanel/RanhThuaSearch/MapScreen đọc meta.
--     - stt               : app/main.py ORDER BY (meta->>'stt')::int (lo_detail).
--     - areaExcel         : FE RanhThuaPanel.jsx hiển thị diện tích.
--     - loCode            : lô (lo.meta) dùng; giữ để nhất quán nếu xuất hiện.
--     - internalLegal, planningType, address : mô tả thửa
--                           (không phải trạng thái enum trùng với cell).
--
-- ⚠️ CHẠY ĐƯỢC NHIỀU LẦN (IDEMPOTENT):
--   Sau lần chạy đầu, meta chỉ còn key whitelist → điều kiện WHERE không
--   khớp dòng nào nữa → các lần chạy sau là no-op, kết quả bất biến.
-- =====================================================================

BEGIN;

-- Chỉ UPDATE các dòng THỰC SỰ chứa ít nhất 1 key NGOÀI whitelist
-- (tránh cập nhật thừa toàn bộ 3144 thửa).
UPDATE ranh_thua rt
SET meta = COALESCE(
        (
            -- Tính lại meta: chỉ giữ cặp key/value có key thuộc whitelist.
            SELECT jsonb_object_agg(kv.key, kv.value)
            FROM jsonb_each(rt.meta) AS kv(key, value)
            WHERE kv.key IN (
                'cellCode', 'lotCode', 'stt', 'areaExcel',
                'internalLegal', 'planningType', 'loCode', 'address'
            )
        ),
        -- Nếu lọc xong không còn key nào (agg trả NULL) → gán '{}' thay vì
        -- NULL để cột meta luôn là object hợp lệ (schema: NOT NULL DEFAULT '{}').
        '{}'::jsonb
    )
WHERE rt.meta IS NOT NULL
  -- Điều kiện: tồn tại ≥1 key trong meta KHÔNG thuộc whitelist.
  AND EXISTS (
        SELECT 1
        FROM jsonb_object_keys(rt.meta) AS k
        WHERE k NOT IN (
            'cellCode', 'lotCode', 'stt', 'areaExcel',
            'internalLegal', 'planningType', 'loCode', 'address'
        )
  );

COMMIT;

-- =====================================================================
-- KIỂM TRA SAU KHI DỌN (chạy tay để đối chiếu)
-- =====================================================================

-- (1) Số thửa còn sót key NGOÀI whitelist → PHẢI = 0
SELECT COUNT(*) AS rows_with_extra_keys
FROM ranh_thua rt
WHERE rt.meta IS NOT NULL
  AND EXISTS (
        SELECT 1
        FROM jsonb_object_keys(rt.meta) AS k
        WHERE k NOT IN (
            'cellCode', 'lotCode', 'stt', 'areaExcel',
            'internalLegal', 'planningType', 'loCode', 'address'
        )
  );

-- (2) Liệt kê mọi key còn lại trong meta (toàn bảng) + số thửa chứa key đó.
--     Kết quả chỉ được xuất hiện các key thuộc whitelist.
SELECT k AS remaining_key, COUNT(*) AS num_rows
FROM ranh_thua rt,
     LATERAL jsonb_object_keys(rt.meta) AS k
WHERE rt.meta IS NOT NULL
GROUP BY k
ORDER BY k;
