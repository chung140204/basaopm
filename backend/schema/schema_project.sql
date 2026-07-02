-- =====================================================================
-- schema_project.sql — Dự án + phân quyền user↔dự án cho BasaoPM
-- =====================================================================
-- project.code khớp id mock FE ('DA-001') và URL /projects/:projectId.
-- Gating ở TẦNG DỰ ÁN: user_project quyết định user nào VÀO được dự án nào.
--   - superadmin: bỏ qua bảng này (thấy mọi project).
--   - admin/viewer: chỉ thấy project có trong user_project của mình.
-- KHÔNG gắn project_id vào cell/ranh_thua vì 1 dự án (DA-001) hiện = toàn bộ
-- data bản đồ; gating chỉ ở việc vào được dự án (client-side, mức demo).
-- =====================================================================

CREATE TABLE IF NOT EXISTS project (
    code        text PRIMARY KEY,              -- 'DA-001' (khớp FE + URL)
    name        text NOT NULL,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Quan hệ N-N: user nào được xem dự án nào.
CREATE TABLE IF NOT EXISTS user_project (
    user_id      integer NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    project_code text    NOT NULL REFERENCES project(code) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, project_code)
);

CREATE INDEX IF NOT EXISTS ix_user_project_user ON user_project (user_id);

-- Gắn lô (subdivision) vào dự án → bản đồ + màn ô/lô lọc theo project.
-- NULL = chưa thuộc dự án nào → không hiện ở map dự án nào.
ALTER TABLE subdivision
    ADD COLUMN IF NOT EXISTS project_code text
        REFERENCES project(code) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_subdivision_project ON subdivision (project_code);

-- Auto cập nhật updated_at (tái dùng function trg_set_updated_at nếu có).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_set_updated_at') THEN
        DROP TRIGGER IF EXISTS set_updated_at ON project;
        CREATE TRIGGER set_updated_at BEFORE UPDATE ON project
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;
END $$;
