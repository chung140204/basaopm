-- =====================================================================
-- schema_auth.sql — Bảng người dùng + phân quyền cho BasaoPM
-- =====================================================================
-- Đăng ký / đăng nhập thật (hash mật khẩu bcrypt, xác thực JWT ở app).
-- Role linh hoạt: cột text (không enum cứng) để THÊM role mới không cần
-- migrate schema. App tự định nghĩa danh sách role hợp lệ + quyền.
--   - superadmin: toàn quyền, quản lý user + đổi role.
--   - admin: nghiệp vụ thường.
--   - (có thể thêm role khác sau, vd 'viewer', 'manager'...)
-- =====================================================================

CREATE TABLE IF NOT EXISTS app_user (
    id            serial PRIMARY KEY,
    email         text NOT NULL,
    full_name     text,
    password_hash text NOT NULL,            -- bcrypt
    role          text NOT NULL DEFAULT 'admin',
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz
);

-- Email duy nhất trên bản SỐNG (soft-delete không vỡ unique). Lower-case so khớp.
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_user_email
    ON app_user (lower(email)) WHERE deleted_at IS NULL;

-- Auto cập nhật updated_at (tái dùng function trg_set_updated_at từ schema_v2 nếu có)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_set_updated_at') THEN
        DROP TRIGGER IF EXISTS set_updated_at ON app_user;
        CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_user
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;
END $$;
