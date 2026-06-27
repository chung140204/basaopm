-- =====================================================================
-- schema_v2.sql — Schema nghiệp vụ sạch cho basaopm-demo (PostgreSQL 15 + PostGIS)
-- =====================================================================
-- BỐI CẢNH:
--   Thay cách nhồi toàn bộ dữ liệu nghiệp vụ vào cột JSONB `meta` của
--   ranh_thua/lo (anti-pattern, hardcode qua apply_*.py) bằng schema quan
--   hệ chuẩn hoá. Nguồn dữ liệu: 4 file Excel (Data tổng theo ô / HĐ giao
--   dịch / pháp lý tài chính / thi hành án).
--
-- PHẠM VI: chỉ DDL (CREATE TABLE/INDEX/CONSTRAINT). KHÔNG có script import
--   và KHÔNG sửa API ở file này.
--
-- LEGACY (KHÔNG đụng tới): ranh_thua (~1736 polygon từ shapefile), lo (geom
--   gom bằng ST_ClusterDBSCAN, bị DROP/CREATE mỗi lần build_lo.py chạy →
--   id ephemeral, KHÔNG dùng làm FK).
--
-- ---------------------------------------------------------------------
-- ERD (cardinality)
--   cell             N — 1     subdivision
--   subdivision      N — lỏng  lo           (qua lo_layer_id, KHÔNG FK)
--   cell           0..1 — 0..1 ranh_thua    (UNIQUE khi map; nullable khi chưa)
--   cell             N — N     contract     (qua contract_cell)
--   cell             1 — N     payment      (thanh toán per-ô)
--   cell|subdivision 1 — N     legal_event
--   mortgage         N — 1     subdivision  XOR  N — 1  cell
--   document         N — 1     {cell|contract|mortgage|legal_event}
--
-- ---------------------------------------------------------------------
-- MAPPING enum tiếng Việt (Excel) → mã FE (lưu DB) — khớp src/.../layers.js
--   business_status: Chưa bán→unsold | Đã bán+đã sổ→sold_red_book | Đã bán+chưa sổ→sold_no_book
--   book_status:     Chưa cấp sổ→none | Đã có sổ-chuyển giao→issued_transferred | Đã có sổ-đang giao dịch→issued_in_progress
--   planning_type:   Đất ở+DVTM→residential_commercial | Đất ở chia lô→residential_lot | Đất nhà vườn→garden_house
--   payment_status:  Đã thanh toán→paid_full | Thanh toán một phần→partial | (chưa bán→NULL/unpaid)
--   collateral_status: Thế chấp ngân hàng→mortgage_bank | (không)→none
--   construction_status: Chưa giao→not_handed_over | Đã xây dựng→built
--   tax_bearer:      Khách hàng→customer | Chủ đầu tư→investor
--   build_density "72,8%" → 72.80 ; build_floor "2-5 tầng" → min=2,max=5
--
-- ---------------------------------------------------------------------
-- QUYẾT ĐỊNH THIẾT KẾ:
--   1. Tiền (value/paid/remaining/payments) ở CELL, KHÔNG ở contract (FE phẳng per-ô).
--   2. Enum = CHECK constraint, KHÔNG PG ENUM type (app đang đổi enum; ALTER TYPE không chạy trong transaction).
--   3. book_status tách riêng khỏi business_status (giữ 32 ô "đã có sổ đang giao dịch").
--   4. KHÔNG tách party — owner/customer/lender là text phẳng (data bẩn, FE không join).
--   5. Geom lỏng: cell.ranh_thua_id nullable + centroid lưu trực tiếp (tránh crash FE khi ô chưa map polygon).
--   6. Contract N-N qua contract_cell; mã HĐ UNIQUE theo lô.
--   7. Mortgage cấp lô + override ô (XOR); legal_event gắn ô HOẶC lô; KHÔNG FK lo.id.
-- =====================================================================

-- =====================================================================
-- 0. EXTENSIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================================
-- AUDIT TRIGGER: tự cập nhật updated_at mỗi lần UPDATE
-- =====================================================================
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 1. SUBDIVISION (lô nghiệp vụ ổn định: DCB02, DCB09)
--    Liên kết LỎNG tới geom lô qua lo_layer_id (KHÔNG FK tới lo.id vì
--    build_lo.py DROP/CREATE bảng lo mỗi lần re-cluster → id bất ổn).
-- =====================================================================
CREATE TABLE subdivision (
    id            serial PRIMARY KEY,
    lot_code      text NOT NULL,                  -- 'DCB02','DCB09' (business key)
    name          text,
    zone          text,                           -- 'khu-a' | 'khu-b' (phân khu dự án)
    lo_layer_id   text,                           -- liên kết lỏng tới lo.layer_id (resolve runtime)
    description   text,
    note          text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT uq_subdivision_code UNIQUE (lot_code)
);
COMMENT ON COLUMN subdivision.lo_layer_id IS
  'Liên kết lỏng tới geom lô; KHÔNG FK vì bảng lo bị DROP/CREATE mỗi lần build_lo.py chạy';
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subdivision
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- =====================================================================
-- 2. CELL (Ô nghiệp vụ — THỰC THỂ TRUNG TÂM)
--    cell_code = business key duy nhất nối Excel↔geom. Tiền phẳng per-ô.
-- =====================================================================
CREATE TABLE cell (
    id                serial PRIMARY KEY,
    cell_code         text NOT NULL,              -- 'DCB02-01' khoá tự nhiên nối Excel↔geom
    subdivision_id    int  NOT NULL REFERENCES subdivision(id) ON DELETE RESTRICT,
    cell_no           text,                       -- 'Ô' (số thứ tự trong lô)

    -- ---- Liên kết GEOM (LỎNG, nullable) ----
    -- Mapping cell↔geom là GÁN TAY (apply_dcb02.py ID_BY_OTO), không join tự động.
    ranh_thua_id      int REFERENCES ranh_thua(id) ON DELETE SET NULL,
    -- Centroid lưu trực tiếp để FE luôn có [lng,lat] kể cả khi chưa map polygon.
    centroid          geometry(Point,4326),

    -- ---- Thuộc tính cơ bản (File 1) ----
    owner_name        text,                       -- chủ SH (text phẳng; không tách party)
    address           text,                       -- địa chỉ (nguồn: File 2; File 1 trống)
    area              numeric(12,2),              -- diện tích m² (nghiệp vụ, từ Excel)

    -- ---- Phân loại / trạng thái (mã FE; SET TAY qua EditCellModal) ----
    planning_type       text,                     -- loại đất
    business_status     text NOT NULL DEFAULT 'unsold',  -- FE set tay, KHÔNG derive-only
    book_status         text,                     -- tình trạng sổ (TÁCH RIÊNG khỏi business_status)
    book_no             text,                     -- số hiệu sổ
    construction_status text,                     -- tình trạng xây dựng

    -- Xây dựng: parse sang SỐ (FE formatPercent cần number, không phải "72,8%")
    build_density     numeric(5,2),               -- 72.80 (%) parse từ '72,8%'
    build_floor_min   smallint,                   -- 2  parse từ '2-5 tầng'
    build_floor_max   smallint,                   -- 5

    -- ---- TIỀN per-ô (THUỘC Ô, KHÔNG thuộc contract) ----
    value             numeric(18,0),              -- giá trị ô (VNĐ)
    paid_value        numeric(18,0),              -- đã thanh toán (per-ô)
    remaining_value   numeric(18,0),              -- còn lại (per-ô)
    payment_status    text,                       -- mã FE; NULL nếu chưa giao dịch
    collateral_status text NOT NULL DEFAULT 'none', -- cache phẳng để vẽ layer nhanh

    internal_legal    text,                       -- ghi chú pháp lý nội bộ (text tự do)
    description       text,
    note              text,

    -- Field hiếm dùng → JSONB hẹp (KHÔNG nhồi field chính như schema cũ)
    documents_meta    jsonb DEFAULT '[]'::jsonb,  -- tóm tắt hồ sơ cho FE
    raw_excel         jsonb DEFAULT '{}'::jsonb,  -- text Việt gốc để audit mapping

    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,

    CONSTRAINT ck_cell_business CHECK (business_status IN
        ('unsold','sold_red_book','sold_no_book')),
    CONSTRAINT ck_cell_payment CHECK (payment_status IS NULL OR payment_status IN
        ('partial','paid_full','unpaid','deposit','cancelled')),
    CONSTRAINT ck_cell_collateral CHECK (collateral_status IN
        ('none','mortgage_bank','mortgage_external','informal_sale')),
    CONSTRAINT ck_cell_book CHECK (book_status IS NULL OR book_status IN
        ('none','issued_transferred','issued_in_progress')),
    CONSTRAINT ck_cell_construction CHECK (construction_status IS NULL OR construction_status IN
        ('not_handed_over','built')),
    CONSTRAINT ck_cell_planning CHECK (planning_type IS NULL OR planning_type IN
        ('residential_commercial','residential_lot','garden_house')),
    CONSTRAINT ck_cell_density CHECK (build_density IS NULL OR build_density BETWEEN 0 AND 100),
    CONSTRAINT ck_cell_floor CHECK (build_floor_min IS NULL OR build_floor_max IS NULL
                                    OR build_floor_min <= build_floor_max)
);
COMMENT ON COLUMN cell.value IS 'Giá trị ô (VNĐ) — THUỘC Ô, không thuộc contract; HĐ nhiều ô đã chia đều per-ô';
COMMENT ON COLUMN cell.book_status IS 'Tách riêng khỏi business_status để giữ thông tin 32 ô đã có sổ đang giao dịch';
COMMENT ON COLUMN cell.centroid IS 'Lưu trực tiếp để FE luôn có [lng,lat] kể cả ô chưa map geom';

-- UNIQUE business key chỉ trên bản SỐNG (soft-delete không vỡ unique)
CREATE UNIQUE INDEX uq_cell_code ON cell(cell_code) WHERE deleted_at IS NULL;
-- 1 thửa geom chỉ 1 ô chiếm (chống ghép trùng)
CREATE UNIQUE INDEX uq_cell_ranh_thua ON cell(ranh_thua_id)
    WHERE ranh_thua_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_cell_subdivision  ON cell(subdivision_id);
CREATE INDEX ix_cell_ranh_thua    ON cell(ranh_thua_id);
CREATE INDEX ix_cell_business     ON cell(business_status)   WHERE deleted_at IS NULL;
CREATE INDEX ix_cell_collateral   ON cell(collateral_status) WHERE deleted_at IS NULL;
CREATE INDEX ix_cell_payment      ON cell(payment_status)    WHERE deleted_at IS NULL;
CREATE INDEX gix_cell_centroid    ON cell USING gist(centroid);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cell
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- =====================================================================
-- 3. CONTRACT (chỉ METADATA — tiền nằm ở cell)
--    UNIQUE theo (subdivision, code) vì mã HĐ phạm vi lô ('3/19','12/15').
-- =====================================================================
CREATE TABLE contract (
    id                serial PRIMARY KEY,
    subdivision_id    int NOT NULL REFERENCES subdivision(id) ON DELETE RESTRICT,
    code_clean        text NOT NULL,              -- '3/19','12/15' (phạm vi lô)
    code_original     text,                       -- số HĐ original
    customer_name     text,                       -- bên mua (text phẳng, không tách party)
    sign_date         date,                       -- thời gian giao dịch
    tax_amount        numeric(18,0),              -- thuế
    tax_bearer        text,                       -- 'customer' | 'investor'
    unit_price        numeric(18,0),              -- đơn giá/m²
    note              text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    CONSTRAINT ck_contract_tax_bearer CHECK (tax_bearer IS NULL OR tax_bearer IN
        ('customer','investor'))
);
COMMENT ON TABLE contract IS 'Chỉ giữ metadata HĐ; value/paid/remaining nằm ở cell (per-ô)';
-- Mã HĐ unique trong phạm vi lô ('3/19' có thể trùng giữa 2 lô)
CREATE UNIQUE INDEX uq_contract_code ON contract(subdivision_id, code_clean)
    WHERE deleted_at IS NULL;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contract
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- =====================================================================
-- 4. CONTRACT_CELL (junction N-N contract↔cell)
-- =====================================================================
CREATE TABLE contract_cell (
    contract_id   int NOT NULL REFERENCES contract(id) ON DELETE CASCADE,
    cell_id       int NOT NULL REFERENCES cell(id)     ON DELETE CASCADE,
    note          text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (contract_id, cell_id)
);
CREATE INDEX ix_contract_cell_contract ON contract_cell(contract_id);
CREATE INDEX ix_contract_cell_cell     ON contract_cell(cell_id);

-- =====================================================================
-- 5. PAYMENT (lịch sử thanh toán PER-Ô)
--    FE CellDetailPanel render payments[] theo ô; gắn cell_id.
-- =====================================================================
CREATE TABLE payment (
    id            serial PRIMARY KEY,
    cell_id       int NOT NULL REFERENCES cell(id) ON DELETE CASCADE,
    amount        numeric(18,0) NOT NULL,
    paid_date     date,
    method        text DEFAULT 'transfer',
    voucher       text,                           -- số chứng từ
    -- Phân biệt dòng tổng-từ-Excel với giao dịch thật (tránh double-count)
    source        text NOT NULL DEFAULT 'manual', -- 'excel_aggregate' | 'manual'
    note          text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT ck_payment_amount CHECK (amount >= 0),
    CONSTRAINT ck_payment_method CHECK (method IN ('cash','transfer','other')),
    CONSTRAINT ck_payment_source CHECK (source IN ('excel_aggregate','manual'))
);
CREATE INDEX ix_payment_cell ON payment(cell_id, paid_date);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payment
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- =====================================================================
-- 6. MORTGAGE (thế chấp — cấp LÔ mặc định, override Ô; XOR scope)
-- =====================================================================
CREATE TABLE mortgage (
    id              serial PRIMARY KEY,
    subdivision_id  int REFERENCES subdivision(id) ON DELETE CASCADE,  -- cấp lô
    cell_id         int REFERENCES cell(id)        ON DELETE CASCADE,  -- override ô
    state           text NOT NULL DEFAULT 'mortgaged',
    lender_name     text,                          -- 'BIDV Hải Dương' (text phẳng)
    borrower_name   text,                          -- 'Chủ dự án' / 'Công ty VGG'
    loan_value      numeric(18,0),                 -- giá trị thế chấp (File 3 thực tế: NULL)
    mortgage_type   text,                          -- 'Thế chấp ngân hàng'
    purpose         text,                          -- mục đích thế chấp
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    CONSTRAINT ck_mortgage_state CHECK (state IN ('mortgaged','released')),
    -- XOR: đúng 1 trong 2 scope (lô HOẶC ô)
    CONSTRAINT ck_mortgage_scope CHECK (
        (subdivision_id IS NOT NULL)::int + (cell_id IS NOT NULL)::int = 1
    )
);
-- 1 thế chấp cấp lô hiệu lực / lô; 1 override / ô
CREATE UNIQUE INDEX uq_mortgage_lot ON mortgage(subdivision_id)
    WHERE subdivision_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_mortgage_cell ON mortgage(cell_id)
    WHERE cell_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX ix_mortgage_subdivision ON mortgage(subdivision_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON mortgage
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- =====================================================================
-- 7. LEGAL_EVENT (timeline pháp lý/THA — gắn Ô HOẶC LÔ; có event_kind)
--    File 4: 27 dòng DCB02 cùng ngày/nội dung → sự kiện cấp LÔ.
-- =====================================================================
CREATE TABLE legal_event (
    id              serial PRIMARY KEY,
    cell_id         int REFERENCES cell(id)        ON DELETE CASCADE,
    subdivision_id  int REFERENCES subdivision(id) ON DELETE CASCADE,
    event_kind      text NOT NULL DEFAULT 'enforcement', -- phân loại sự kiện
    event_date      date,                          -- 'Thời gian cập nhật'
    legal_status    text,                          -- tình trạng pháp lý tại mốc
    change_content  text,                          -- nội dung thay đổi
    enforce_agency  text,                          -- cơ quan THA (THADSCL...)
    holder_name     text,                          -- người đứng tên (text phẳng)
    finance_org     text,                          -- tổ chức TC liên quan
    collateral_value numeric(18,0),
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    CONSTRAINT ck_legal_kind CHECK (event_kind IN
        ('enforcement','book_issuance','mortgage_change','status_change','other')),
    -- ít nhất 1 scope (ô hoặc lô)
    CONSTRAINT ck_legal_scope CHECK (cell_id IS NOT NULL OR subdivision_id IS NOT NULL)
);
CREATE INDEX ix_legal_cell        ON legal_event(cell_id, event_date DESC);
CREATE INDEX ix_legal_subdivision ON legal_event(subdivision_id, event_date DESC);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON legal_event
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- =====================================================================
-- 8. DOCUMENT (hồ sơ — polymorphic nhẹ; toàn vẹn app-enforced)
-- =====================================================================
CREATE TABLE document (
    id            serial PRIMARY KEY,
    owner_type    text NOT NULL,                  -- 'cell'|'contract'|'mortgage'|'legal_event'
    owner_id      int NOT NULL,
    file_name     text NOT NULL,
    file_url      text,
    mime_type     text,
    file_size     bigint,
    note          text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT ck_document_owner CHECK (owner_type IN
        ('cell','contract','mortgage','legal_event'))
);
CREATE INDEX ix_document_owner ON document(owner_type, owner_id);

-- =====================================================================
-- HẾT schema_v2.sql — 7 bảng nghiệp vụ mới (ranh_thua/lo giữ nguyên)
-- =====================================================================
