"""Tạo bảng project + user_project (schema_project.sql) + seed 9 dự án.

Chạy: docker compose exec api python seed_projects.py
PHỤ THUỘC: app_user phải có sẵn → chạy seed_users.py TRƯỚC.
Idempotent: chạy lại không tạo trùng (ON CONFLICT).

Seed:
  9 dự án (DA-001..009) — code + tên khớp mock frontend (data/projects.js).
  Gán DA-001 cho admin@basao.com (user_project).
  Muốn gán thêm dự án cho admin nào → thêm dòng vào ASSIGNMENTS rồi chạy lại.
"""
import pathlib

from app.db import get_conn

SCHEMA = pathlib.Path(__file__).parent / "schema" / "schema_project.sql"

# (code, name) — khớp id + tenHienThi ở frontend/src/data/projects.js.
PROJECTS = [
    ("DA-001", "Khu Trung tâm Văn hóa Thể thao Du lịch và Đô thị Chí Linh"),
    ("DA-002", "Khu đô thị mới Nam Sao Đỏ"),
    ("DA-003", "Khu dân cư Phả Lại Riverside"),
    ("DA-004", "Khu nhà ở thương mại Cộng Hòa Center"),
    ("DA-005", "Khu đô thị sinh thái Văn An Garden"),
    ("DA-006", "Khu tái định cư Hoàng Tiến"),
    ("DA-007", "Khu đô thị Bến Tắm Hills"),
    ("DA-008", "Khu dân cư Thái Học mở rộng"),
    ("DA-009", "Khu phức hợp Lê Lợi Plaza"),
]

# (lot_code, project_code) — gán lô vào dự án để bản đồ lọc theo dự án.
SUBDIVISION_PROJECT = [
    ("DCB02", "DA-001"),
    ("DCB09", "DA-001"),
]

# (project_code, owner_email) — gán dự án cho admin nào được xem.
# superadmin luôn thấy hết nên không cần liệt kê.
# DEMO: gán tạm vài dự án mock cho từng admin để minh hoạ phân quyền.
ASSIGNMENTS = [
    # admin@basao.com — dự án thật DA-001 + vài mock.
    ("DA-001", "admin@basao.com"),
    ("DA-002", "admin@basao.com"),
    ("DA-003", "admin@basao.com"),
    # chungtien6b — nhóm dự án khác (DA-003 chồng lấn với admin@basao → 2 admin cùng xem).
    ("DA-003", "chungtien6b@gmail.com"),
    ("DA-004", "chungtien6b@gmail.com"),
    ("DA-005", "chungtien6b@gmail.com"),
    # cscs — nhóm dự án khác.
    ("DA-006", "cscs@gmail.com"),
    ("DA-007", "cscs@gmail.com"),
    # dhtl — nhóm dự án khác.
    ("DA-008", "dhtl@e.tlu.edu.vn"),
    ("DA-009", "dhtl@e.tlu.edu.vn"),
]


def main():
    ddl = SCHEMA.read_text(encoding="utf-8")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(ddl)

        # 1) project (idempotent theo PK code)
        for code, name in PROJECTS:
            cur.execute(
                "INSERT INTO project (code, name) VALUES (%s, %s) "
                "ON CONFLICT (code) DO NOTHING",
                (code, name),
            )
        print(f"  đã đảm bảo {len(PROJECTS)} dự án trong DB.")

        # 1b) gán lô (subdivision) vào dự án (idempotent).
        for lot_code, proj in SUBDIVISION_PROJECT:
            cur.execute(
                "UPDATE subdivision SET project_code=%s "
                "WHERE lot_code=%s AND project_code IS DISTINCT FROM %s",
                (proj, lot_code, proj),
            )
            if cur.rowcount:
                print(f"  gán lô {lot_code} → {proj}")

        # 2) user_project: tra user_id theo email rồi gán
        for code, email in ASSIGNMENTS:
            cur.execute(
                "SELECT id FROM app_user WHERE lower(email)=lower(%s) "
                "AND deleted_at IS NULL",
                (email,),
            )
            row = cur.fetchone()
            if not row:
                print(f"  CẢNH BÁO: chưa có user {email} → bỏ gán {code}")
                continue
            cur.execute(
                "INSERT INTO user_project (user_id, project_code) "
                "VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (row[0], code),
            )
            print(f"  gán {code} ↔ {email}")

        conn.commit()
    print("Done seed_projects.")


if __name__ == "__main__":
    main()
