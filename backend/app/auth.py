"""Xác thực + phân quyền BasaoPM.

- Hash mật khẩu bằng bcrypt.
- Token JWT (HS256) lưu user id + role; FE gắn vào header Authorization.
- ROLES + PERMISSIONS định nghĩa ở đây (nguồn sự thật cho cả gating BE lẫn FE
  qua endpoint /api/auth/meta). Thêm role mới = thêm vào ROLES + PERMISSIONS.
"""
import os
import datetime as _dt

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Header

from .db import get_conn

# --- Cấu hình JWT ---------------------------------------------------------
JWT_SECRET = os.environ.get("JWT_SECRET", "basaopm-dev-secret-change-me")
JWT_ALG = "HS256"
JWT_TTL_HOURS = 24 * 7  # token sống 7 ngày

# --- Định nghĩa ROLE + QUYỀN ---------------------------------------------
# Mỗi role có: label (hiển thị), permissions (danh sách quyền). 'superadmin'
# có '*' = mọi quyền. Thêm role mới chỉ cần khai báo ở đây.
PERMISSIONS = [
    "project.view", "project.edit", "project.hide",
    "cell.view", "cell.edit",
    "lot.view", "lot.edit",
    "user.manage",   # quản lý người dùng + đổi role
]

ROLES = {
    "superadmin": {
        "label": "Super Admin",
        "permissions": ["*"],  # toàn quyền
    },
    "admin": {
        "label": "Admin",
        "permissions": [
            # Admin CHỈ XEM (không sửa/ẩn). Chỉ superadmin mới chỉnh sửa.
            "project.view", "cell.view", "lot.view",
        ],
    },
    # Ví dụ role hạn chế (chỉ xem) — minh hoạ "có thể thêm role".
    "viewer": {
        "label": "Người xem",
        "permissions": ["project.view", "cell.view", "lot.view"],
    },
}

DEFAULT_ROLE = "admin"


def role_can(role: str, perm: str) -> bool:
    """role có quyền perm không (superadmin '*' = tất cả)."""
    r = ROLES.get(role)
    if not r:
        return False
    perms = r["permissions"]
    return "*" in perms or perm in perms


# --- Hash mật khẩu --------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, pw_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), pw_hash.encode("utf-8"))
    except Exception:
        return False


# --- JWT ------------------------------------------------------------------
def make_token(user_id: int, role: str) -> str:
    now = _dt.datetime.now(_dt.timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + _dt.timedelta(hours=JWT_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


# --- DB helpers -----------------------------------------------------------
def _row_to_user(r) -> dict:
    return {
        "id": r[0], "email": r[1], "fullName": r[2],
        "role": r[3], "isActive": r[4],
        "roleLabel": ROLES.get(r[3], {}).get("label", r[3]),
    }

_USER_COLS = "id, email, full_name, role, is_active"


def get_user_by_email(cur, email: str):
    cur.execute(
        f"SELECT {_USER_COLS}, password_hash FROM app_user "
        "WHERE lower(email)=lower(%s) AND deleted_at IS NULL AND is_active",
        (email,),
    )
    return cur.fetchone()


def get_user_by_id(cur, user_id: int):
    cur.execute(
        f"SELECT {_USER_COLS} FROM app_user "
        "WHERE id=%s AND deleted_at IS NULL AND is_active",
        (user_id,),
    )
    return cur.fetchone()


# --- FastAPI dependencies (gating) ----------------------------------------
def current_user(authorization: str = Header(default=None)) -> dict:
    """Giải token từ header Authorization: Bearer <jwt> → user dict."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Phiên đã hết hạn")
    except Exception:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    with get_conn() as conn, conn.cursor() as cur:
        row = get_user_by_id(cur, int(payload["sub"]))
    if not row:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại")
    return _row_to_user(row)


def require_permission(perm: str):
    """Dependency factory: chặn nếu user không có quyền perm."""
    def _dep(user: dict = Depends(current_user)) -> dict:
        if not role_can(user["role"], perm):
            raise HTTPException(status_code=403, detail="Không đủ quyền")
        return user
    return _dep


# --- Phân quyền theo DỰ ÁN -------------------------------------------------
def user_project_codes(cur, user: dict) -> list:
    """Danh sách code dự án user được xem.
    superadmin → mọi project active; còn lại → từ bảng user_project."""
    if user["role"] == "superadmin":
        cur.execute("SELECT code FROM project WHERE is_active ORDER BY code")
    else:
        cur.execute(
            "SELECT p.code FROM user_project up "
            "JOIN project p ON p.code = up.project_code "
            "WHERE up.user_id = %s AND p.is_active ORDER BY p.code",
            (user["id"],),
        )
    return [r[0] for r in cur.fetchall()]


def user_can_access_project(cur, user: dict, project_code: str) -> bool:
    """superadmin luôn true; còn lại check user_project."""
    if user["role"] == "superadmin":
        return True
    cur.execute(
        "SELECT 1 FROM user_project WHERE user_id = %s AND project_code = %s",
        (user["id"], project_code),
    )
    return cur.fetchone() is not None
