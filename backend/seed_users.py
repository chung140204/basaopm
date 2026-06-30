"""Tạo bảng app_user (schema_auth.sql) + seed 2 tài khoản mặc định.

Chạy: docker compose exec api python seed_users.py
Idempotent: chạy lại không tạo trùng (ON CONFLICT theo email).

Tài khoản mặc định:
  superadmin@basao.com / super1234  (role superadmin)
  admin@basao.com      / admin1234  (role admin)
"""
import os
import pathlib

from app.db import get_conn
from app.auth import hash_password

SCHEMA = pathlib.Path(__file__).parent / "schema" / "schema_auth.sql"

DEFAULT_USERS = [
    ("superadmin@basao.com", "Super Admin", "super1234", "superadmin"),
    ("admin@basao.com", "Quản trị viên", "admin1234", "admin"),
]


def main():
    ddl = SCHEMA.read_text(encoding="utf-8")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(ddl)
        for email, name, pw, role in DEFAULT_USERS:
            cur.execute(
                "SELECT 1 FROM app_user WHERE lower(email)=lower(%s) "
                "AND deleted_at IS NULL",
                (email,),
            )
            if cur.fetchone():
                print(f"  bỏ qua (đã có): {email}")
                continue
            cur.execute(
                "INSERT INTO app_user (email, full_name, password_hash, role) "
                "VALUES (%s,%s,%s,%s)",
                (email, name, hash_password(pw), role),
            )
            print(f"  tạo: {email}  (role {role})")
        conn.commit()
    print("Done seed_users.")


if __name__ == "__main__":
    main()
