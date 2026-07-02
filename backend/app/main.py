"""API ranh thửa — FastAPI + PostGIS.

Endpoints:
  GET /api/ranh-thua/geojson?layer=...   → FeatureCollection cả lớp (vẽ polyline)
  GET /api/ranh-thua/at?lat&lng&layer    → point-in-polygon, trả thửa chứa điểm
  GET /api/ranh-thua/layers              → danh sách layer (tiện cho frontend bay tới)
  GET /health
Geometry trả về là WGS84 (EPSG:4326), dạng GeoJSON (lng, lat).
"""
import json

from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .db import get_conn
from . import auth as A

# Nhóm endpoint trên Swagger (/docs) — chia theo mục đích cho dễ phân biệt.
TAGS_METADATA = [
    {"name": "Xác thực", "description": "Đăng nhập, phiên hiện tại, bản đồ quyền (role/permission)."},
    {"name": "Người dùng", "description": "Quản lý tài khoản + đổi role (chỉ superadmin)."},
    {"name": "Dự án", "description": "Danh sách dự án user được xem (phân quyền theo dự án)."},
    {"name": "Ô đất", "description": "Ô nghiệp vụ (schema_v2): danh sách, chi tiết, geojson tô màu, cập nhật. Lọc theo dự án/lô."},
    {"name": "Ranh thửa", "description": "Lớp ranh thửa bản đồ: geojson, tra thửa theo điểm click, tìm kiếm, cập nhật meta."},
    {"name": "Lô", "description": "Cụm thửa (lô): geojson, chi tiết, cập nhật meta."},
    {"name": "Hệ thống", "description": "Kiểm tra sức khỏe dịch vụ."},
]

app = FastAPI(
    title="BasaoPM API",
    version="1.0.0",
    description=(
        "API quản lý bất động sản BasaoPM — xác thực, phân quyền theo dự án, "
        "dữ liệu ô đất / lô / ranh thửa cho bản đồ. Endpoint được nhóm theo "
        "mục đích ở các mục bên dưới."
    ),
    openapi_tags=TAGS_METADATA,
)

# CORS: cho phép frontend dev gọi (Vite chạy 5173; mở * cho tiện demo).
# Phải cho phép cả PUT/OPTIONS để form "Cập nhật thông tin" (lưu meta lô/thửa)
# qua được preflight — trước đây chỉ ["GET"] nên mọi thao tác Lưu bị CORS chặn.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MetaUpdate(BaseModel):
    """Payload sửa metadata quản lý (ghi đè toàn bộ object meta)."""
    meta: dict


@app.get("/health", tags=["Hệ thống"])
def health():
    return {"ok": True}


# =====================================================================
# AUTH — đăng nhập / phân quyền
# =====================================================================
class LoginIn(BaseModel):
    email: str
    password: str


class RoleUpdateIn(BaseModel):
    role: str


@app.get("/api/auth/meta", tags=["Xác thực"])
def auth_meta():
    """Danh sách role + quyền cho FE gating (không cần đăng nhập)."""
    return {
        "roles": [
            {"value": k, "label": v["label"], "permissions": v["permissions"]}
            for k, v in A.ROLES.items()
        ],
        "permissions": A.PERMISSIONS,
    }


@app.post("/api/auth/login", tags=["Xác thực"])
def login(body: LoginIn):
    with get_conn() as conn, conn.cursor() as cur:
        row = A.get_user_by_email(cur, (body.email or "").strip())
    if not row or not A.verify_password(body.password, row[5]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    user = A._row_to_user(row)
    token = A.make_token(user["id"], user["role"])
    return {"token": token, "user": user}


@app.get("/api/auth/me", tags=["Xác thực"])
def me(user: dict = Depends(A.current_user)):
    return {"user": user}


# ---- Quản lý người dùng (chỉ superadmin có quyền 'user.manage') ----------
@app.get("/api/users", tags=["Người dùng"])
def list_users(user: dict = Depends(A.require_permission("user.manage"))):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"SELECT {A._USER_COLS} FROM app_user WHERE deleted_at IS NULL "
            "ORDER BY created_at"
        )
        rows = cur.fetchall()
    return {"users": [A._row_to_user(r) for r in rows]}


@app.put("/api/users/{user_id}/role", tags=["Người dùng"])
def update_user_role(
    user_id: int,
    body: RoleUpdateIn,
    user: dict = Depends(A.require_permission("user.manage")),
):
    if body.role not in A.ROLES:
        raise HTTPException(status_code=400, detail="Role không hợp lệ")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE app_user SET role=%s WHERE id=%s AND deleted_at IS NULL",
            (body.role, user_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        conn.commit()
    return {"ok": True}


# ---- Dự án user được xem (gating tầng dự án) -----------------------------
@app.get("/api/projects", tags=["Dự án"])
def list_projects(user: dict = Depends(A.current_user)):
    """Dự án (trong DB) user được phép xem. FE lọc danh sách hiển thị theo đây.
    superadmin → mọi project; admin/viewer → project trong user_project."""
    with get_conn() as conn, conn.cursor() as cur:
        if user["role"] == "superadmin":
            cur.execute(
                "SELECT code, name FROM project WHERE is_active ORDER BY code"
            )
        else:
            cur.execute(
                "SELECT p.code, p.name FROM user_project up "
                "JOIN project p ON p.code = up.project_code "
                "WHERE up.user_id = %s AND p.is_active ORDER BY p.code",
                (user["id"],),
            )
        rows = cur.fetchall()
    return {
        "projects": [{"id": r[0], "name": r[1]} for r in rows],
        "projectIds": [r[0] for r in rows],
        "isSuperadmin": user["role"] == "superadmin",
    }


@app.get("/api/ranh-thua/layers", tags=["Ranh thửa"])
def list_layers():
    """Danh sách layer + center [lng,lat] để frontend bay tới."""
    sql = """
        SELECT layer_id,
               COUNT(*)                                   AS features,
               ST_X(ST_Centroid(ST_Collect(geom)))        AS cx,
               ST_Y(ST_Centroid(ST_Collect(geom)))        AS cy
        FROM ranh_thua
        GROUP BY layer_id
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
    return {
        "layers": [
            {"id": r[0], "features": r[1], "center": [r[2], r[3]]} for r in rows
        ]
    }


@app.get("/api/ranh-thua/geojson", tags=["Ranh thửa"])
def geojson(layer: str | None = Query(default=None)):
    """FeatureCollection toàn bộ thửa (geometry WGS84) để vẽ polyline mọi ô.

    Trạng thái tô màu (business/payment/collateral/book) GỘP từ bảng `cell`
    (nguồn sự thật) vào meta khi thửa đã kích hoạt — vì meta của thửa đã dọn,
    không còn *Status. Nhờ đó bản đồ tô đúng màu (không còn hiện "tạm thời"
    nét đứt cho ô đã bán). Thửa chưa gắn cell → giữ meta gốc.
    """
    where = "WHERE rt.layer_id = %s" if layer else ""
    params = (layer,) if layer else ()
    sql = f"""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'id', rt.id,
                    'properties', rt.properties,
                    'meta', CASE
                        WHEN c.id IS NULL THEN rt.meta
                        ELSE rt.meta || jsonb_strip_nulls(jsonb_build_object(
                            'businessStatus', c.business_status,
                            'paymentStatus', c.payment_status,
                            'collateralStatus', c.collateral_status,
                            'bookStatus', c.book_status,
                            'zone', s.zone
                        ))
                    END,
                    'geometry', ST_AsGeoJSON(rt.geom)::json
                )
            ), '[]'::json)
        )
        FROM ranh_thua rt
        LEFT JOIN cell c ON c.ranh_thua_id = rt.id AND c.deleted_at IS NULL
        LEFT JOIN subdivision s ON s.id = c.subdivision_id
        {where}
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        (result,) = cur.fetchone()
    return result


@app.get("/api/ranh-thua/at", tags=["Ranh thửa"])
def at(
    lat: float = Query(...),
    lng: float = Query(...),
    layer: str | None = Query(default=None),
):
    """Tìm thửa chứa điểm (lat,lng) — point-in-polygon bằng ST_Contains.

    Trạng thái nghiệp vụ (business/payment/collateral/book, giá trị, chủ SH)
    lấy từ bảng `cell` (NGUỒN SỰ THẬT) qua LEFT JOIN cell.ranh_thua_id=rt.id,
    KHÔNG đọc từ rt.meta (đã dọn, chỉ còn key nhận diện). LEFT JOIN nên thửa
    chưa gắn cell vẫn trả về (phần status = NULL → FE hiện trạng thái default).
    """
    cond = "ST_Contains(rt.geom, ST_SetSRID(ST_Point(%s, %s), 4326))"
    params = [lng, lat]  # ST_Point nhận (x=lng, y=lat)
    if layer:
        cond += " AND rt.layer_id = %s"
        params.append(layer)
    # LƯU Ý: 2 layer (truonglinh-chialo / dccb-chialo) có thể CHỒNG LẤN địa lý
    # → 1 điểm click rơi vào nhiều thửa. Ưu tiên thửa ĐÃ GẮN cell (có dữ liệu
    # nghiệp vụ thật) lên đầu; nếu không FE sẽ nhận nhầm thửa trống.
    sql = f"""
        SELECT rt.id, rt.layer_id, rt.properties, rt.meta,
               ST_AsGeoJSON(rt.geom)::json,
               c.business_status, c.payment_status, c.collateral_status,
               c.book_status, c.value,
               (SELECT string_agg(co.owner_name, ', ' ORDER BY co.ordinal, co.id)
                FROM cell_owner co WHERE co.cell_id = c.id) AS owner_name,
               c.cell_code
        FROM ranh_thua rt
        LEFT JOIN cell c ON c.ranh_thua_id = rt.id AND c.deleted_at IS NULL
        WHERE {cond}
        ORDER BY (c.id IS NOT NULL) DESC, rt.id
        LIMIT 1
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()

    if not row:
        return {"found": False}

    # Gộp trạng thái thật từ cell vào meta (giữ shape FE đang đọc: meta.[field]).
    # Chỉ set field không NULL để thửa chưa có cell không bị ghi đè bằng None.
    meta = dict(row[3] or {})
    cell_status = {
        "businessStatus": row[5], "paymentStatus": row[6],
        "collateralStatus": row[7], "bookStatus": row[8],
        "value": row[9], "owner": row[10], "cellCode": row[11],
    }
    meta.update({k: v for k, v in cell_status.items() if v is not None})

    return {
        "found": True,
        "layer": row[1],
        "feature": {
            "type": "Feature",
            "id": row[0],
            "properties": row[2],
            "meta": meta,  # nhận diện (rt.meta) + trạng thái thật (cell)
            "geometry": row[4],
        },
    }


@app.get("/api/ranh-thua/search", tags=["Ranh thửa"])
def search(q: str = Query(..., min_length=1), limit: int = Query(default=10)):
    """Tìm thửa theo số thửa (properties.So_thua), mã ô (meta.cellCode)
    hoặc mã lô (meta.lotCode).
    Trả về kèm geometry (để zoom/hiển thị) và bbox của từng kết quả.
    """
    # So khớp không phân biệt hoa thường, dạng "chứa".
    pattern = f"%{q.strip()}%"
    # Khớp mã lô bỏ qua dấu chấm: gõ "DCB05" hay "DC.B05" đều ra (lotCode
    # lưu dạng "DC.B05" nhưng cellCode dạng "DCB05-..").
    pattern_nodot = f"%{q.strip().replace('.', '')}%"
    # Trạng thái lấy từ cell (nguồn sự thật) qua LEFT JOIN; rt.meta chỉ còn key
    # nhận diện (cellCode/lotCode) — vẫn dùng để lọc tìm kiếm như cũ.
    sql = """
        SELECT rt.id, rt.layer_id, rt.properties, rt.meta,
               ST_AsGeoJSON(rt.geom)::json,
               ST_XMin(rt.geom), ST_YMin(rt.geom), ST_XMax(rt.geom), ST_YMax(rt.geom),
               c.business_status, c.payment_status, c.collateral_status,
               c.book_status, c.value,
               (SELECT string_agg(co.owner_name, ', ' ORDER BY co.ordinal, co.id)
                FROM cell_owner co WHERE co.cell_id = c.id) AS owner_name,
               c.cell_code
        FROM ranh_thua rt
        LEFT JOIN cell c ON c.ranh_thua_id = rt.id AND c.deleted_at IS NULL
        WHERE (rt.properties->>'So_thua')            ILIKE %s
           OR (rt.meta->>'cellCode')                 ILIKE %s
           OR (rt.meta->>'lotCode')                  ILIKE %s
           OR REPLACE(rt.meta->>'lotCode', '.', '')  ILIKE %s
        ORDER BY rt.id
        LIMIT %s
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (pattern, pattern, pattern, pattern_nodot, limit))
        rows = cur.fetchall()

    results = []
    for r in rows:
        # Gộp trạng thái thật từ cell vào meta (giữ shape FE: meta.[field]).
        meta = dict(r[3] or {})
        cell_status = {
            "businessStatus": r[9], "paymentStatus": r[10],
            "collateralStatus": r[11], "bookStatus": r[12],
            "value": r[13], "owner": r[14], "cellCode": r[15],
        }
        meta.update({k: v for k, v in cell_status.items() if v is not None})
        results.append({
            "id": r[0],
            "layer": r[1],
            "properties": r[2],
            "meta": meta,
            "geometry": r[4],
            "bbox": [r[5], r[6], r[7], r[8]],  # [minLng,minLat,maxLng,maxLat]
        })

    return {"results": results}


# ---------------------------------------------------------------- LÔ (cụm thửa)

@app.get("/api/lo/geojson", tags=["Lô"])
def lo_geojson(layer: str | None = Query(default=None)):
    """FeatureCollection hình bao tất cả lô (vẽ ranh lô + diện tích/ô con)."""
    where = "WHERE layer_id = %s" if layer else ""
    params = (layer,) if layer else ()
    sql = f"""
        SELECT json_build_object(
            'type','FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type','Feature','id', id,
                    'properties', json_build_object(
                        'cellCount', cell_count,
                        'areaTotal', round(area_total::numeric, 1),
                        'meta', meta
                    ),
                    'geometry', ST_AsGeoJSON(geom)::json
                )
            ), '[]'::json)
        )
        FROM lo {where}
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        (result,) = cur.fetchone()
    return result


@app.get("/api/lo/{lo_id}", tags=["Lô"])
def lo_detail(lo_id: int):
    """Chi tiết 1 lô: thông tin tổng + danh sách ô con (thửa) thuộc lô.

    Zone (khu) + dự án lấy từ bảng subdivision (nguồn chuẩn hoá) — nối qua
    lot_code (= lo.meta->>'loCode') và cùng layer. LEFT JOIN nên lô chưa gán
    subdivision vẫn trả về (zone/project = null → FE hiểu là "chưa gán").
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT l.id, l.layer_id, l.cell_count,
                      round(l.area_total::numeric, 1), l.meta,
                      ST_AsGeoJSON(l.geom)::json,
                      s.zone, s.project_code, p.name
               FROM lo l
               LEFT JOIN subdivision s
                      ON s.lot_code = l.meta->>'loCode'
                     AND s.lo_layer_id = l.layer_id
                     AND s.deleted_at IS NULL
               LEFT JOIN project p ON p.code = s.project_code
               WHERE l.id = %s""",
            (lo_id,),
        )
        lo = cur.fetchone()
        if not lo:
            raise HTTPException(status_code=404, detail="Không tìm thấy lô")
        cur.execute(
            """SELECT id, properties, meta,
                      round(ST_Area(geom::geography)::numeric,1) AS area
               FROM ranh_thua WHERE lo_id = %s
               ORDER BY COALESCE((meta->>'stt')::int, 1e9), id""",
            (lo_id,),
        )
        cells = cur.fetchall()
    return {
        "id": lo[0],
        "layer": lo[1],
        "cellCount": lo[2],
        "areaTotal": float(lo[3]),
        "meta": lo[4],
        "geometry": lo[5],
        "zone": lo[6],
        "projectCode": lo[7],
        "projectName": lo[8],
        "cells": [
            {"id": c[0], "properties": c[1], "meta": c[2], "area": float(c[3])}
            for c in cells
        ],
    }


@app.put("/api/lo/{lo_id}/meta", tags=["Lô"])
def update_lo_meta(
    lo_id: int,
    body: MetaUpdate,
    user: dict = Depends(A.require_permission("lot.edit")),
):
    """Sửa mã lô / mô tả / ghi chú quản lý của 1 lô."""
    sql = "UPDATE lo SET meta = %s WHERE id = %s RETURNING id"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (json.dumps(body.meta), lo_id))
        row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô")
    return {"ok": True, "id": lo_id, "meta": body.meta}


@app.put("/api/ranh-thua/{plot_id}/meta", tags=["Ranh thửa"])
def update_meta(
    plot_id: int,
    body: MetaUpdate,
    user: dict = Depends(A.require_permission("cell.edit")),
):
    """Cập nhật dữ liệu quản lý (giá, trạng thái, pháp lý...) cho 1 thửa."""
    sql = "UPDATE ranh_thua SET meta = %s WHERE id = %s RETURNING id"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (json.dumps(body.meta), plot_id))
        row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy thửa")
    return {"ok": True, "id": plot_id, "meta": body.meta}


# ============================================================ CELL (schema_v2)
# Lớp nghiệp vụ sạch: dữ liệu từ 4 file Excel, chuẩn hoá thành bảng quan hệ
# (cell/subdivision/contract/payment/mortgage/legal_event). Trả FIELD PHẲNG
# (mã FE tiếng Anh) — KHÔNG dùng meta JSONB. Endpoint cũ /api/ranh-thua giữ
# nguyên (chạy song song).

class CellUpdate(BaseModel):
    """Payload sửa thông tin nghiệp vụ 1 ô (field phẳng, partial update)."""
    value: float | None = None
    business_status: str | None = None
    payment_status: str | None = None
    collateral_status: str | None = None
    internal_legal: str | None = None
    description: str | None = None
    note: str | None = None


def _cell_payments(cur, cell_id: int) -> list:
    cur.execute(
        """SELECT amount, paid_date, method, voucher, note
           FROM payment WHERE cell_id=%s AND deleted_at IS NULL
           ORDER BY paid_date""",
        (cell_id,),
    )
    return [
        {"amount": float(r[0]), "date": r[1].isoformat() if r[1] else None,
         "method": r[2], "voucher": r[3], "note": r[4]}
        for r in cur.fetchall()
    ]


def _cell_contract(cur, cell_id: int) -> dict | None:
    cur.execute(
        """SELECT ct.code_clean, ct.customer_name, ct.sign_date,
                  ct.tax_bearer, ct.unit_price
           FROM contract_cell cc JOIN contract ct ON ct.id=cc.contract_id
           WHERE cc.cell_id=%s AND ct.deleted_at IS NULL LIMIT 1""",
        (cell_id,),
    )
    r = cur.fetchone()
    if not r:
        return None
    return {"code": r[0], "customer": r[1],
            "signDate": r[2].isoformat() if r[2] else None,
            "taxBearer": r[3], "unitPrice": float(r[4]) if r[4] is not None else None}


def _cell_mortgage(cur, cell_id: int, subdivision_id: int) -> dict | None:
    # Ưu tiên thế chấp override cấp ô; nếu không có → kế thừa cấp lô.
    cur.execute(
        """SELECT state, lender_name, borrower_name, loan_value, note, purpose,
                  holder_name
           FROM mortgage
           WHERE deleted_at IS NULL AND (cell_id=%s OR subdivision_id=%s)
           ORDER BY (cell_id IS NOT NULL) DESC LIMIT 1""",
        (cell_id, subdivision_id),
    )
    r = cur.fetchone()
    if not r:
        return None
    return {"status": r[0], "lender": r[1], "borrower": r[2],
            "loanValue": float(r[3]) if r[3] is not None else None,
            "note": r[4], "purpose": r[5], "holder": r[6]}


def _cell_owners(cur, cell_id: int) -> list:
    """Danh sách chủ sở hữu của 1 ô (bảng cell_owner) — 1 ô có thể NHIỀU chủ.
    Trả theo ordinal (thứ tự '1.A 2.B' như Excel)."""
    cur.execute(
        """SELECT owner_name, ordinal, note FROM cell_owner
           WHERE cell_id = %s ORDER BY ordinal, id""",
        (cell_id,),
    )
    return [
        {"name": o[0], "ordinal": o[1], "note": o[2]} for o in cur.fetchall()
    ]


def _row_to_cell(r: tuple) -> dict:
    """Map 1 dòng cell (SELECT cố định bên dưới) → object field phẳng cho FE."""
    (cid, cell_code, lot_code, subdivision_id, cell_no, has_geom, cx, cy,
     owner, address, area, planning, biz, book, book_no, constr,
     density, fmin, fmax, value, paid, remaining, pay, collateral,
     internal_legal, description, note, zone) = r
    return {
        "id": cid,
        "cellCode": cell_code,
        "lotCode": lot_code,
        "subdivisionId": subdivision_id,
        "zone": zone,
        "cellNo": cell_no,
        "hasGeom": has_geom,
        "centroid": [cx, cy] if cx is not None else None,
        "owner": owner,
        "address": address,
        "area": float(area) if area is not None else None,
        "planningType": planning,
        "businessStatus": biz,
        "bookStatus": book,
        "bookNo": book_no,
        "constructionStatus": constr,
        "buildDensity": float(density) if density is not None else None,
        "buildFloorMin": fmin,
        "buildFloorMax": fmax,
        "value": float(value) if value is not None else None,
        "paid": float(paid) if paid is not None else None,
        "remaining": float(remaining) if remaining is not None else None,
        "paymentStatus": pay,
        "collateralStatus": collateral,
        "internalLegal": internal_legal,
        "description": description,
        "note": note,
    }


# owner: gộp tên chủ từ bảng cell_owner (1 ô nhiều chủ → "A, B") thay cho
# cột owner_name đã bỏ. Danh sách chi tiết trả riêng qua field "owners".
_OWNER_AGG = (
    "(SELECT string_agg(co.owner_name, ', ' ORDER BY co.ordinal, co.id) "
    "FROM cell_owner co WHERE co.cell_id = c.id)"
)
_CELL_COLS = f"""
    c.id, c.cell_code, s.lot_code, c.subdivision_id, c.cell_no,
    (c.ranh_thua_id IS NOT NULL) AS has_geom,
    ST_X(c.centroid), ST_Y(c.centroid),
    {_OWNER_AGG}, c.address, c.area, c.planning_type,
    c.business_status, c.book_status, c.book_no, c.construction_status,
    c.build_density, c.build_floor_min, c.build_floor_max,
    c.value, c.paid_value, c.remaining_value, c.payment_status,
    c.collateral_status, c.internal_legal, c.description, c.note, s.zone
"""


@app.get("/api/cells", tags=["Ô đất"])
def list_cells(
    lot: str | None = Query(default=None),
    project: str | None = Query(default=None),
):
    """Danh sách ô nghiệp vụ (field phẳng). Lọc theo dự án (project=DA-001)
    hoặc mã lô (lot=DCB02). Ưu tiên project nếu có."""
    where = "WHERE c.deleted_at IS NULL"
    params: list = []
    if project:
        where += " AND s.project_code = %s"
        params.append(project)
    elif lot:
        where += " AND s.lot_code = %s"
        params.append(lot)
    sql = f"""SELECT {_CELL_COLS}
              FROM cell c JOIN subdivision s ON s.id=c.subdivision_id
              {where} ORDER BY s.lot_code, c.cell_no"""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return {"cells": [_row_to_cell(r) for r in rows]}


@app.get("/api/cells/{cell_code}", tags=["Ô đất"])
def cell_detail(cell_code: str):
    """Chi tiết 1 ô: field phẳng + contract + payments + mortgage + legal timeline."""
    sql = f"""SELECT {_CELL_COLS}
              FROM cell c JOIN subdivision s ON s.id=c.subdivision_id
              WHERE c.cell_code=%s AND c.deleted_at IS NULL LIMIT 1"""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (cell_code,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy ô")
        cell = _row_to_cell(row)
        cid = cell["id"]
        cell["owners"] = _cell_owners(cur, cid)  # danh sách chủ (1 ô nhiều chủ)
        cell["contract"] = _cell_contract(cur, cid)
        cell["payments"] = _cell_payments(cur, cid)
        cell["mortgage"] = _cell_mortgage(cur, cid, cell["subdivisionId"])
        # legal timeline: sự kiện gắn ô HOẶC lô
        cur.execute(
            """SELECT event_kind, event_date, legal_status, change_content,
                      enforce_agency
               FROM legal_event
               WHERE deleted_at IS NULL AND (cell_id=%s OR subdivision_id=%s)
               ORDER BY event_date DESC NULLS LAST""",
            (cid, cell["subdivisionId"]),
        )
        cell["legalEvents"] = [
            {"kind": e[0], "date": e[1].isoformat() if e[1] else None,
             "status": e[2], "content": e[3], "agency": e[4]}
            for e in cur.fetchall()
        ]
    return cell


@app.get("/api/cells-geojson", tags=["Ô đất"])
def cells_geojson(
    lot: str | None = Query(default=None),
    project: str | None = Query(default=None),
):
    """GeoJSON các ô ĐÃ MAP GEOM — vẽ layer tô màu theo trạng thái.
    Lọc theo dự án (project) hoặc mã lô (lot). Ưu tiên project."""
    where = "WHERE c.deleted_at IS NULL AND c.ranh_thua_id IS NOT NULL"
    params: list = []
    if project:
        where += " AND s.project_code = %s"
        params.append(project)
    elif lot:
        where += " AND s.lot_code = %s"
        params.append(lot)
    sql = f"""
        SELECT json_build_object(
            'type','FeatureCollection',
            'features', COALESCE(json_agg(json_build_object(
                'type','Feature',
                'id', c.id,
                'geometry', ST_AsGeoJSON(rt.geom)::json,
                'properties', json_build_object(
                    'cellCode', c.cell_code,
                    'lotCode', s.lot_code,
                    'subdivisionId', s.lot_code,
                    'ranhThuaId', c.ranh_thua_id,
                    'area', c.area,
                    'centroid', json_build_array(ST_X(c.centroid), ST_Y(c.centroid)),
                    'businessStatus', c.business_status,
                    'paymentStatus', c.payment_status,
                    'collateralStatus', c.collateral_status,
                    'bookStatus', c.book_status,
                    'value', c.value
                )
            )), '[]'::json)
        )
        FROM cell c
        JOIN subdivision s ON s.id=c.subdivision_id
        JOIN ranh_thua rt ON rt.id=c.ranh_thua_id
        {where}
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        (result,) = cur.fetchone()
    return result


@app.put("/api/cells/{cell_code}", tags=["Ô đất"])
def update_cell(
    cell_code: str,
    body: CellUpdate,
    user: dict = Depends(A.require_permission("cell.edit")),
):
    """Cập nhật field phẳng cho 1 ô (chỉ các field gửi lên, partial update)."""
    fields = body.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Không có field để cập nhật")
    # Whitelist cột cho an toàn (map snake_case → cột DB).
    allowed = {"value", "business_status", "payment_status", "collateral_status",
               "internal_legal", "description", "note"}
    sets, params = [], []
    for k, v in fields.items():
        if k in allowed:
            sets.append(f"{k} = %s")
            params.append(v)
    if not sets:
        raise HTTPException(status_code=400, detail="Field không hợp lệ")
    params.append(cell_code)
    sql = (f"UPDATE cell SET {', '.join(sets)} "
           f"WHERE cell_code=%s AND deleted_at IS NULL RETURNING id")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy ô")
    return {"ok": True, "cellCode": cell_code, "updated": fields}
