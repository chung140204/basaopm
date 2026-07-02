-- =====================================================================
-- Migration: Đồng bộ ranh_thua.meta.cellCode theo bảng cell (nguồn sự thật)
-- Ngày: 2026-07
-- =====================================================================
-- Bối cảnh:
--   Có HAI cách một polygon "biết" mình là ô nào, và chúng LỆCH nhau:
--     (A) cell.ranh_thua_id  → FK gán tay, NGUỒN SỰ THẬT.
--     (B) ranh_thua.meta.cellCode → nhãn text cũ, có thể sai.
--   Ví dụ polygon 1331: cell map = DCB02-27 nhưng meta.cellCode = "DCB02-24".
--   Đo được: 59 thửa có cell → 13 thửa nhãn LỆCH (9 lệch định dạng số
--   'DCB02-1' vs 'DCB02-01'; 4 lệch thật sự do gán tay hoán vị 24↔27, 25↔26).
--
-- Quyết định (người dùng chốt): cell.ranh_thua_id là CHUẨN. Ghi đè
--   meta.cellCode = cell.cell_code cho MỌI thửa CÓ cell map tới.
--
-- Phạm vi:
--   - CHỈ sửa 59 thửa có cell (biết chắc đúng). Đồng bộ luôn 13 thửa lệch.
--   - KHÔNG đụng 1584 thửa có meta.cellCode nhưng CHƯA có cell (nhãn mồ côi):
--     không có căn cứ đối chiếu; giữ để /search vẫn tìm được ô chưa lên cell.
--     (Đã kiểm: 0 nhãn mồ côi trùng cell_code của cell khác → không map sai.)
--
-- ⚠️ CHẠY ĐƯỢC NHIỀU LẦN (IDEMPOTENT):
--   WHERE lọc thửa có meta.cellCode KHÁC cell.cell_code → sau lần đầu không
--   còn dòng nào khác → các lần sau là no-op.
-- =====================================================================

BEGIN;

UPDATE ranh_thua rt
SET meta = jsonb_set(
        COALESCE(rt.meta, '{}'::jsonb),
        '{cellCode}',
        to_jsonb(c.cell_code)
    )
FROM cell c
WHERE c.ranh_thua_id = rt.id
  AND c.deleted_at IS NULL
  -- chỉ update thửa thực sự lệch nhãn (tránh đụng thửa đã khớp)
  AND rt.meta->>'cellCode' IS DISTINCT FROM c.cell_code;

COMMIT;

-- =====================================================================
-- KIỂM TRA SAU KHI ĐỒNG BỘ
-- =====================================================================

-- (1) Số thửa CÓ cell mà nhãn còn lệch → PHẢI = 0
SELECT COUNT(*) AS thua_co_cell_con_lech
FROM ranh_thua rt
JOIN cell c ON c.ranh_thua_id = rt.id AND c.deleted_at IS NULL
WHERE rt.meta->>'cellCode' IS DISTINCT FROM c.cell_code;

-- (2) Số nhãn mồ côi còn lại (không có cell) — thông tin, không phải lỗi
SELECT COUNT(*) AS nhan_mo_coi_giu_lai
FROM ranh_thua rt
LEFT JOIN cell c ON c.ranh_thua_id = rt.id AND c.deleted_at IS NULL
WHERE rt.meta ? 'cellCode' AND c.id IS NULL;
