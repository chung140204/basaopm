"""API ranh thửa — FastAPI + PostGIS.

Endpoints:
  GET /api/ranh-thua/geojson?layer=...   → FeatureCollection cả lớp (vẽ polyline)
  GET /api/ranh-thua/at?lat&lng&layer    → point-in-polygon, trả thửa chứa điểm
  GET /api/ranh-thua/layers              → danh sách layer (tiện cho frontend bay tới)
  GET /health
Geometry trả về là WGS84 (EPSG:4326), dạng GeoJSON (lng, lat).
"""
import json

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .db import get_conn

app = FastAPI(title="Ranh Thua API", version="1.0.0")

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


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/ranh-thua/layers")
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


@app.get("/api/ranh-thua/geojson")
def geojson(layer: str | None = Query(default=None)):
    """FeatureCollection toàn bộ thửa (geometry WGS84) để vẽ polyline mọi ô."""
    where = "WHERE layer_id = %s" if layer else ""
    params = (layer,) if layer else ()
    sql = f"""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'id', id,
                    'properties', properties,
                    'meta', meta,
                    'geometry', ST_AsGeoJSON(geom)::json
                )
            ), '[]'::json)
        )
        FROM ranh_thua
        {where}
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        (result,) = cur.fetchone()
    return result


@app.get("/api/ranh-thua/at")
def at(
    lat: float = Query(...),
    lng: float = Query(...),
    layer: str | None = Query(default=None),
):
    """Tìm thửa chứa điểm (lat,lng) — point-in-polygon bằng ST_Contains."""
    cond = "ST_Contains(geom, ST_SetSRID(ST_Point(%s, %s), 4326))"
    params = [lng, lat]  # ST_Point nhận (x=lng, y=lat)
    if layer:
        cond += " AND layer_id = %s"
        params.append(layer)
    sql = f"""
        SELECT id, layer_id, properties, meta, ST_AsGeoJSON(geom)::json
        FROM ranh_thua
        WHERE {cond}
        LIMIT 1
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()

    if not row:
        return {"found": False}

    return {
        "found": True,
        "layer": row[1],
        "feature": {
            "type": "Feature",
            "id": row[0],
            "properties": row[2],
            "meta": row[3],  # dữ liệu quản lý nghiệp vụ
            "geometry": row[4],
        },
    }


@app.get("/api/ranh-thua/search")
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
    sql = """
        SELECT id, layer_id, properties, meta,
               ST_AsGeoJSON(geom)::json,
               ST_XMin(geom), ST_YMin(geom), ST_XMax(geom), ST_YMax(geom)
        FROM ranh_thua
        WHERE (properties->>'So_thua')            ILIKE %s
           OR (meta->>'cellCode')                 ILIKE %s
           OR (meta->>'lotCode')                  ILIKE %s
           OR REPLACE(meta->>'lotCode', '.', '')  ILIKE %s
        ORDER BY id
        LIMIT %s
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (pattern, pattern, pattern, pattern_nodot, limit))
        rows = cur.fetchall()

    return {
        "results": [
            {
                "id": r[0],
                "layer": r[1],
                "properties": r[2],
                "meta": r[3],
                "geometry": r[4],
                "bbox": [r[5], r[6], r[7], r[8]],  # [minLng,minLat,maxLng,maxLat]
            }
            for r in rows
        ]
    }


# ---------------------------------------------------------------- LÔ (cụm thửa)

@app.get("/api/lo/geojson")
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


@app.get("/api/lo/{lo_id}")
def lo_detail(lo_id: int):
    """Chi tiết 1 lô: thông tin tổng + danh sách ô con (thửa) thuộc lô."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT id, layer_id, cell_count, round(area_total::numeric,1),
                      meta, ST_AsGeoJSON(geom)::json
               FROM lo WHERE id = %s""",
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
        "cells": [
            {"id": c[0], "properties": c[1], "meta": c[2], "area": float(c[3])}
            for c in cells
        ],
    }


@app.put("/api/lo/{lo_id}/meta")
def update_lo_meta(lo_id: int, body: MetaUpdate):
    """Sửa mã lô / mô tả / ghi chú quản lý của 1 lô."""
    sql = "UPDATE lo SET meta = %s WHERE id = %s RETURNING id"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (json.dumps(body.meta), lo_id))
        row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô")
    return {"ok": True, "id": lo_id, "meta": body.meta}


@app.put("/api/ranh-thua/{plot_id}/meta")
def update_meta(plot_id: int, body: MetaUpdate):
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
        """SELECT state, lender_name, borrower_name, loan_value, note
           FROM mortgage
           WHERE deleted_at IS NULL AND (cell_id=%s OR subdivision_id=%s)
           ORDER BY (cell_id=%s) DESC LIMIT 1""",
        (cell_id, subdivision_id, cell_id),
    )
    r = cur.fetchone()
    if not r:
        return None
    return {"status": r[0], "lender": r[1], "borrower": r[2],
            "loanValue": float(r[3]) if r[3] is not None else None, "note": r[4]}


def _row_to_cell(r: tuple) -> dict:
    """Map 1 dòng cell (SELECT cố định bên dưới) → object field phẳng cho FE."""
    (cid, cell_code, lot_code, subdivision_id, cell_no, has_geom, cx, cy,
     owner, address, area, planning, biz, book, book_no, constr,
     density, fmin, fmax, value, paid, remaining, pay, collateral,
     internal_legal, description, note) = r
    return {
        "id": cid,
        "cellCode": cell_code,
        "lotCode": lot_code,
        "subdivisionId": subdivision_id,
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


_CELL_COLS = """
    c.id, c.cell_code, s.lot_code, c.subdivision_id, c.cell_no,
    (c.ranh_thua_id IS NOT NULL) AS has_geom,
    ST_X(c.centroid), ST_Y(c.centroid),
    c.owner_name, c.address, c.area, c.planning_type,
    c.business_status, c.book_status, c.book_no, c.construction_status,
    c.build_density, c.build_floor_min, c.build_floor_max,
    c.value, c.paid_value, c.remaining_value, c.payment_status,
    c.collateral_status, c.internal_legal, c.description, c.note
"""


@app.get("/api/cells")
def list_cells(lot: str | None = Query(default=None)):
    """Danh sách ô nghiệp vụ (field phẳng). Lọc theo mã lô (lot=DCB02)."""
    where = "WHERE c.deleted_at IS NULL"
    params: list = []
    if lot:
        where += " AND s.lot_code = %s"
        params.append(lot)
    sql = f"""SELECT {_CELL_COLS}
              FROM cell c JOIN subdivision s ON s.id=c.subdivision_id
              {where} ORDER BY s.lot_code, c.cell_no"""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return {"cells": [_row_to_cell(r) for r in rows]}


@app.get("/api/cells/{cell_code}")
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


@app.get("/api/cells-geojson")
def cells_geojson(lot: str | None = Query(default=None)):
    """GeoJSON các ô ĐÃ MAP GEOM (DCB02) — vẽ layer tô màu theo trạng thái."""
    where = "WHERE c.deleted_at IS NULL AND c.ranh_thua_id IS NOT NULL"
    params: list = []
    if lot:
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
                    'area', c.area,
                    'centroid', json_build_array(ST_X(c.centroid), ST_Y(c.centroid)),
                    'businessStatus', c.business_status,
                    'paymentStatus', c.payment_status,
                    'collateralStatus', c.collateral_status,
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


@app.put("/api/cells/{cell_code}")
def update_cell(cell_code: str, body: CellUpdate):
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
