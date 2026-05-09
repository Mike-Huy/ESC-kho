-- =============================================================
-- ESC-kho WMS — Database Schema
-- Supabase project: jhebreoxwuimlqwvjdok.supabase.co
-- Tất cả bảng có tiền tố "esc_"
-- website_id kiểu integer[] để hỗ trợ multi-site
-- =============================================================


-- ===========================================================
-- 1. USERS & PHÂN QUYỀN
-- ===========================================================

-- 1.1 Người dùng hệ thống (đăng nhập bằng SĐT + mật khẩu)
CREATE TABLE esc_users (
  id            BIGSERIAL PRIMARY KEY,
  phone         VARCHAR(20) UNIQUE NOT NULL,         -- SĐT dùng để login
  pass          TEXT NOT NULL,                        -- mật khẩu (hash hoặc plain tùy cấu hình)
  full_name     VARCHAR(100) NOT NULL,
  nick_name     VARCHAR(50),
  email         VARCHAR(100),
  avatar        TEXT,                                 -- URL ảnh (Supabase Storage)
  gender        VARCHAR(10),                          -- 'male' | 'female' | 'other'
  dob           DATE,
  id_card       VARCHAR(20),
  id_card_date  DATE,
  id_card_place VARCHAR(100),
  address       TEXT,
  user_type     VARCHAR(20) NOT NULL DEFAULT 'staff', -- 'staff' | 'admin' | 'superadmin'
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  website_id    INTEGER[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Hồ sơ nhân viên (mở rộng từ users)
CREATE TABLE esc_staff_profiles (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES esc_users(id) ON DELETE CASCADE,
  employee_code         VARCHAR(20) UNIQUE,
  dept_id               BIGINT,                       -- FK → esc_hr_departments
  position              VARCHAR(100),
  join_date             DATE,
  contract_type         VARCHAR(50),                  -- 'fulltime' | 'parttime' | 'probation'
  contract_no           VARCHAR(50),
  contract_start        DATE,
  contract_end          DATE,
  base_salary           NUMERIC(15,2) DEFAULT 0,
  salary_detail         JSONB,                        -- cấu trúc lương linh hoạt
  bhxh_no               VARCHAR(20),
  bhyt_no               VARCHAR(20),
  bhtn_no               VARCHAR(20),
  insurance_enrolled_date DATE,
  emergency_name        VARCHAR(100),
  emergency_phone       VARCHAR(20),
  emergency_rel         VARCHAR(50),
  erp_role_id           BIGINT,                       -- FK → esc_erp_roles
  is_super_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_modules       TEXT[],                       -- ['inbound','orders',...]
  notes                 TEXT,
  website_id            INTEGER[] NOT NULL DEFAULT '{}'
);

-- 1.3 Phòng ban
CREATE TABLE esc_hr_departments (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  parent_id  BIGINT REFERENCES esc_hr_departments(id),
  website_id INTEGER[] NOT NULL DEFAULT '{}'
);

-- 1.4 Vai trò ERP (phân quyền theo module)
CREATE TABLE esc_erp_roles (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,   -- 'warehouse_staff' | 'manager' | ...
  label       VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(20),
  level       INTEGER NOT NULL DEFAULT 0,
  website_id  INTEGER[] NOT NULL DEFAULT '{}'
);

-- 1.5 Quyền hạn theo role
CREATE TABLE esc_erp_role_permissions (
  id         BIGSERIAL PRIMARY KEY,
  role_id    BIGINT NOT NULL REFERENCES esc_erp_roles(id) ON DELETE CASCADE,
  module     VARCHAR(50) NOT NULL, -- 'inbound' | 'orders' | 'outbound' | 'inventory' | 'reports' | 'operation' | 'hr' | 'finance'
  can_read   BOOLEAN NOT NULL DEFAULT FALSE,
  can_add    BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit   BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  website_id INTEGER[] NOT NULL DEFAULT '{}',
  UNIQUE (role_id, module)
);


-- ===========================================================
-- 2. NHÂN SỰ
-- ===========================================================

-- 2.1 Chấm công
CREATE TABLE esc_hr_attendance (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES esc_users(id) ON DELETE CASCADE,
  work_date  DATE NOT NULL,
  check_in   TIMESTAMPTZ,
  check_out  TIMESTAMPTZ,
  status     VARCHAR(20) NOT NULL DEFAULT 'present', -- 'present' | 'absent' | 'late' | 'leave'
  is_late    BOOLEAN NOT NULL DEFAULT FALSE,
  late_fine  NUMERIC(12,2) DEFAULT 0,
  notes      TEXT,
  website_id INTEGER[] NOT NULL DEFAULT '{}',
  UNIQUE (user_id, work_date)
);

-- 2.2 Giao dịch lương / thưởng / phạt
CREATE TABLE esc_hr_transactions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES esc_users(id) ON DELETE CASCADE,
  trans_date  DATE NOT NULL,
  trans_type  VARCHAR(30) NOT NULL, -- 'salary' | 'bonus' | 'fine' | 'advance' | 'other'
  amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_by  BIGINT REFERENCES esc_users(id),
  website_id  INTEGER[] NOT NULL DEFAULT '{}'
);

-- 2.3 Ca làm việc
CREATE TABLE esc_hr_shifts (
  id          BIGSERIAL PRIMARY KEY,
  shift_name  VARCHAR(50) NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  description TEXT,
  website_id  INTEGER[] NOT NULL DEFAULT '{}'
);


-- ===========================================================
-- 3. KHO HÀNG
-- ===========================================================

-- 3.1 Kho
CREATE TABLE esc_warehouse (
  id          BIGSERIAL PRIMARY KEY,
  wh_code     VARCHAR(30) UNIQUE NOT NULL,
  wh_name     VARCHAR(100) NOT NULL,
  wh_address  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  website_id  INTEGER[] NOT NULL DEFAULT '{}'
);

-- 3.2 Vị trí trong kho
CREATE TABLE esc_wh_location (
  id                  BIGSERIAL PRIMARY KEY,
  wh_code             VARCHAR(30) NOT NULL REFERENCES esc_warehouse(wh_code),
  location_code       VARCHAR(50) UNIQUE NOT NULL,
  location_name       VARCHAR(100),
  location_upper      VARCHAR(50),              -- zone / khu vực cha
  location_length_cm  NUMERIC(8,2),
  location_width_cm   NUMERIC(8,2),
  location_height_cm  NUMERIC(8,2),
  max_weight_kg       NUMERIC(8,2),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  website_id          INTEGER[] NOT NULL DEFAULT '{}'
);


-- ===========================================================
-- 4. SẢN PHẨM
-- ===========================================================

-- 4.1 Danh mục sản phẩm
CREATE TABLE esc_product (
  id            BIGSERIAL PRIMARY KEY,
  product_code  VARCHAR(50) UNIQUE NOT NULL,   -- mã SP, khóa chính nghiệp vụ
  product_long  VARCHAR(255) NOT NULL,          -- tên đầy đủ
  product_short VARCHAR(100),                   -- tên ngắn
  brand         VARCHAR(100),
  category      VARCHAR(100),
  unit          VARCHAR(20) NOT NULL DEFAULT 'cái',
  unit2         VARCHAR(20),                    -- đơn vị phụ (thùng, lốc, ...)
  unit2_ratio   NUMERIC(10,4),                 -- 1 thùng = bao nhiêu cái
  weight_kg     NUMERIC(8,3),
  length_cm     NUMERIC(8,2),
  width_cm      NUMERIC(8,2),
  height_cm     NUMERIC(8,2),
  image         TEXT,                           -- URL ảnh từ Supabase Storage
  sn_control    BOOLEAN NOT NULL DEFAULT FALSE, -- có quản lý serial number?
  cost_price    NUMERIC(15,2) DEFAULT 0,        -- giá vốn mặc định
  sell_price    NUMERIC(15,2) DEFAULT 0,        -- giá bán mặc định
  tax_rate      NUMERIC(5,2) DEFAULT 0,         -- % thuế GTGT
  status        VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
  notes         TEXT,
  website_id    INTEGER[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 Serial Number / IMEI / Lô hàng
CREATE TABLE esc_serial_tracking (
  id            BIGSERIAL PRIMARY KEY,
  product_code  VARCHAR(50) NOT NULL REFERENCES esc_product(product_code),
  serial_number VARCHAR(100) NOT NULL,
  po_code       VARCHAR(50),                   -- nhập từ PO nào
  so_code       VARCHAR(50),                   -- xuất cho SO nào
  location_code VARCHAR(50),                   -- đang ở vị trí nào
  status        VARCHAR(20) NOT NULL DEFAULT 'available', -- 'available' | 'sold' | 'returned' | 'defective'
  received_at   TIMESTAMPTZ,
  sold_at       TIMESTAMPTZ,
  notes         TEXT,
  website_id    INTEGER[] NOT NULL DEFAULT '{}',
  UNIQUE (product_code, serial_number)
);

-- 4.3 Tồn kho tổng hợp (snapshot theo ngày)
CREATE TABLE esc_inventory (
  id             BIGSERIAL PRIMARY KEY,
  product_code   VARCHAR(50) NOT NULL REFERENCES esc_product(product_code),
  wh_code        VARCHAR(30) NOT NULL REFERENCES esc_warehouse(wh_code),
  location_code  VARCHAR(50),
  trans_date     DATE NOT NULL,
  start_qty      NUMERIC(15,4) NOT NULL DEFAULT 0,
  received_qty   NUMERIC(15,4) NOT NULL DEFAULT 0,   -- nhập trong ngày
  delivered_qty  NUMERIC(15,4) NOT NULL DEFAULT 0,   -- xuất trong ngày
  adjusted_qty   NUMERIC(15,4) NOT NULL DEFAULT 0,   -- điều chỉnh kiểm kê
  intransit_qty  NUMERIC(15,4) NOT NULL DEFAULT 0,   -- đang vận chuyển
  available_qty  NUMERIC(15,4) NOT NULL DEFAULT 0,   -- tồn khả dụng cuối ngày
  website_id     INTEGER[] NOT NULL DEFAULT '{}',
  UNIQUE (product_code, wh_code, trans_date)
);

-- 4.4 Chuyển động kho (log mỗi lần nhập/xuất/chuyển)
CREATE TABLE esc_stock_movement (
  id              BIGSERIAL PRIMARY KEY,
  movement_type   VARCHAR(30) NOT NULL, -- 'inbound' | 'outbound' | 'transfer' | 'adjust' | 'return'
  ref_type        VARCHAR(20),          -- 'PO' | 'SO' | 'ADJUST' | 'TRANSFER'
  ref_code        VARCHAR(50),          -- mã PO hoặc SO tương ứng
  product_code    VARCHAR(50) NOT NULL REFERENCES esc_product(product_code),
  wh_code         VARCHAR(30) NOT NULL,
  from_location   VARCHAR(50),
  to_location     VARCHAR(50),
  qty             NUMERIC(15,4) NOT NULL,
  unit            VARCHAR(20),
  unit_cost       NUMERIC(15,2) DEFAULT 0,
  moved_by        BIGINT REFERENCES esc_users(id),
  moved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  website_id      INTEGER[] NOT NULL DEFAULT '{}'
);


-- ===========================================================
-- 5. NHÀ CUNG CẤP
-- ===========================================================

CREATE TABLE esc_supplier (
  id              BIGSERIAL PRIMARY KEY,
  supplier_code   VARCHAR(30) UNIQUE NOT NULL,
  supplier_name   VARCHAR(200) NOT NULL,
  short_name      VARCHAR(100),
  tax_code        VARCHAR(20),
  phone           VARCHAR(20),
  email           VARCHAR(100),
  address         TEXT,
  contact_person  VARCHAR(100),
  contact_phone   VARCHAR(20),
  bank_name       VARCHAR(100),
  bank_account    VARCHAR(50),
  bank_branch     VARCHAR(100),
  payment_terms   INTEGER DEFAULT 0,           -- số ngày công nợ
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  notes           TEXT,
  website_id      INTEGER[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ===========================================================
-- 6. KHÁCH HÀNG
-- ===========================================================

CREATE TABLE esc_customer (
  id               BIGSERIAL PRIMARY KEY,
  customer_code    VARCHAR(30) UNIQUE NOT NULL,
  customer_name    VARCHAR(200) NOT NULL,
  customer_type    VARCHAR(20) DEFAULT 'retail',  -- 'retail' | 'wholesale' | 'vip'
  phone            VARCHAR(20),
  email            VARCHAR(100),
  address          TEXT,
  delivery_address TEXT,
  province         VARCHAR(100),
  district         VARCHAR(100),
  tax_code         VARCHAR(20),
  contact_person   VARCHAR(100),
  debt_limit       NUMERIC(18,2) DEFAULT 0,       -- hạn mức công nợ
  current_debt     NUMERIC(18,2) DEFAULT 0,        -- dư nợ hiện tại
  status           VARCHAR(20) NOT NULL DEFAULT 'active',
  notes            TEXT,
  website_id       INTEGER[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ===========================================================
-- 7. ĐƠN NHẬP (PURCHASE ORDER - PO)
-- ===========================================================

-- 7.1 Đầu PO
CREATE TABLE esc_po (
  id               BIGSERIAL PRIMARY KEY,
  po_code          VARCHAR(30) UNIQUE NOT NULL,
  supplier_code    VARCHAR(30) REFERENCES esc_supplier(supplier_code),
  supplier_name    VARCHAR(200),                  -- lưu cache phòng NCC bị đổi tên
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date    DATE,
  actual_delivery  DATE,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- 'draft' | 'confirmed' | 'partial' | 'received' | 'cancelled'
  wh_code          VARCHAR(30) REFERENCES esc_warehouse(wh_code),
  subtotal         NUMERIC(18,2) DEFAULT 0,
  discount_amount  NUMERIC(18,2) DEFAULT 0,
  tax_amount       NUMERIC(18,2) DEFAULT 0,
  total_amount     NUMERIC(18,2) DEFAULT 0,
  paid_amount      NUMERIC(18,2) DEFAULT 0,
  payment_status   VARCHAR(20) DEFAULT 'unpaid',  -- 'unpaid' | 'partial' | 'paid'
  payment_due_date DATE,
  note             TEXT,
  created_by       BIGINT REFERENCES esc_users(id),
  website_id       INTEGER[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.2 Chi tiết sản phẩm trong PO
CREATE TABLE esc_po_items (
  id            BIGSERIAL PRIMARY KEY,
  po_code       VARCHAR(30) NOT NULL REFERENCES esc_po(po_code) ON DELETE CASCADE,
  product_code  VARCHAR(50) NOT NULL REFERENCES esc_product(product_code),
  ordered_qty   NUMERIC(15,4) NOT NULL DEFAULT 0,
  received_qty  NUMERIC(15,4) NOT NULL DEFAULT 0,
  unit          VARCHAR(20) NOT NULL,
  unit_cost     NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_rate      NUMERIC(5,2) DEFAULT 0,
  discount_rate NUMERIC(5,2) DEFAULT 0,
  total_cost    NUMERIC(18,2) DEFAULT 0,
  location_code VARCHAR(50),                       -- vị trí put-away
  notes         TEXT
);

-- 7.3 Thanh toán PO
CREATE TABLE esc_po_payments (
  id           BIGSERIAL PRIMARY KEY,
  po_code      VARCHAR(30) NOT NULL REFERENCES esc_po(po_code),
  pay_date     DATE NOT NULL,
  amount       NUMERIC(18,2) NOT NULL,
  method       VARCHAR(30),   -- 'cash' | 'transfer' | 'check'
  reference_no VARCHAR(50),
  note         TEXT,
  created_by   BIGINT REFERENCES esc_users(id),
  website_id   INTEGER[] NOT NULL DEFAULT '{}'
);


-- ===========================================================
-- 8. ĐƠN BÁN (SALE ORDER - SO)
-- ===========================================================

-- 8.1 Đầu SO
CREATE TABLE esc_so (
  id               BIGSERIAL PRIMARY KEY,
  so_code          VARCHAR(30) UNIQUE NOT NULL,
  customer_code    VARCHAR(30) REFERENCES esc_customer(customer_code),
  customer_name    VARCHAR(200),
  customer_phone   VARCHAR(20),
  delivery_address TEXT,
  province         VARCHAR(100),
  district         VARCHAR(100),
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date    DATE,
  shipped_date     DATE,
  status           VARCHAR(20) NOT NULL DEFAULT 'new',
  -- 'new' | 'confirmed' | 'processing' | 'picked' | 'packed' | 'shipped' | 'completed' | 'returned' | 'cancelled'
  wh_code          VARCHAR(30) REFERENCES esc_warehouse(wh_code),
  subtotal         NUMERIC(18,2) DEFAULT 0,
  discount_amount  NUMERIC(18,2) DEFAULT 0,
  tax_amount       NUMERIC(18,2) DEFAULT 0,
  shipping_fee     NUMERIC(18,2) DEFAULT 0,
  total_amount     NUMERIC(18,2) DEFAULT 0,
  paid_amount      NUMERIC(18,2) DEFAULT 0,
  payment_status   VARCHAR(20) DEFAULT 'unpaid',   -- 'unpaid' | 'partial' | 'paid'
  payment_method   VARCHAR(30),
  carrier          VARCHAR(100),
  tracking_no      VARCHAR(100),
  route_name       VARCHAR(100),
  note             TEXT,
  created_by       BIGINT REFERENCES esc_users(id),
  website_id       INTEGER[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.2 Chi tiết sản phẩm trong SO
CREATE TABLE esc_so_items (
  id            BIGSERIAL PRIMARY KEY,
  so_code       VARCHAR(30) NOT NULL REFERENCES esc_so(so_code) ON DELETE CASCADE,
  product_code  VARCHAR(50) NOT NULL REFERENCES esc_product(product_code),
  qty           NUMERIC(15,4) NOT NULL DEFAULT 0,
  shipped_qty   NUMERIC(15,4) NOT NULL DEFAULT 0,
  returned_qty  NUMERIC(15,4) NOT NULL DEFAULT 0,
  unit          VARCHAR(20) NOT NULL,
  unit_price    NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_rate NUMERIC(5,2) DEFAULT 0,
  vat_rate      NUMERIC(5,2) DEFAULT 0,
  total_price   NUMERIC(18,2) DEFAULT 0,
  location_code VARCHAR(50),
  notes         TEXT
);

-- 8.3 Thanh toán SO
CREATE TABLE esc_so_payments (
  id           BIGSERIAL PRIMARY KEY,
  so_code      VARCHAR(30) NOT NULL REFERENCES esc_so(so_code),
  pay_date     DATE NOT NULL,
  amount       NUMERIC(18,2) NOT NULL,
  method       VARCHAR(30),
  reference_no VARCHAR(50),
  note         TEXT,
  created_by   BIGINT REFERENCES esc_users(id),
  website_id   INTEGER[] NOT NULL DEFAULT '{}'
);


-- ===========================================================
-- 9. VẬN HÀNH KHO
-- ===========================================================

-- 9.1 Kiểm kê kho
CREATE TABLE esc_stock_audit (
  id             BIGSERIAL PRIMARY KEY,
  audit_code     VARCHAR(30) UNIQUE NOT NULL,
  audit_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  wh_code        VARCHAR(30) REFERENCES esc_warehouse(wh_code),
  status         VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft' | 'in_progress' | 'completed'
  audited_by     BIGINT REFERENCES esc_users(id),
  approved_by    BIGINT REFERENCES esc_users(id),
  note           TEXT,
  website_id     INTEGER[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE esc_stock_audit_items (
  id              BIGSERIAL PRIMARY KEY,
  audit_code      VARCHAR(30) NOT NULL REFERENCES esc_stock_audit(audit_code),
  product_code    VARCHAR(50) NOT NULL REFERENCES esc_product(product_code),
  location_code   VARCHAR(50),
  system_qty      NUMERIC(15,4) DEFAULT 0,
  actual_qty      NUMERIC(15,4) DEFAULT 0,
  diff_qty        NUMERIC(15,4) GENERATED ALWAYS AS (actual_qty - system_qty) STORED,
  notes           TEXT
);

-- 9.2 Luân chuyển hàng giữa các vị trí
CREATE TABLE esc_stock_transfer (
  id              BIGSERIAL PRIMARY KEY,
  transfer_code   VARCHAR(30) UNIQUE NOT NULL,
  transfer_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  from_wh_code    VARCHAR(30) REFERENCES esc_warehouse(wh_code),
  to_wh_code      VARCHAR(30) REFERENCES esc_warehouse(wh_code),
  from_location   VARCHAR(50),
  to_location     VARCHAR(50),
  status          VARCHAR(20) DEFAULT 'pending',
  note            TEXT,
  created_by      BIGINT REFERENCES esc_users(id),
  website_id      INTEGER[] NOT NULL DEFAULT '{}'
);

CREATE TABLE esc_stock_transfer_items (
  id              BIGSERIAL PRIMARY KEY,
  transfer_code   VARCHAR(30) NOT NULL REFERENCES esc_stock_transfer(transfer_code),
  product_code    VARCHAR(50) NOT NULL REFERENCES esc_product(product_code),
  qty             NUMERIC(15,4) NOT NULL,
  unit            VARCHAR(20)
);


-- ===========================================================
-- 10. TÀI CHÍNH & CHI PHÍ
-- ===========================================================

-- 10.1 Chi phí vận hành (kho, bảo trì, vật tư, ...)
CREATE TABLE esc_cost_entries (
  id           BIGSERIAL PRIMARY KEY,
  cost_date    DATE NOT NULL,
  cost_type    VARCHAR(50) NOT NULL,
  -- 'warehouse' | 'operation' | 'hr' | 'supplies' | 'maintenance' | 'other'
  description  TEXT NOT NULL,
  amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
  ref_code     VARCHAR(50),        -- mã chứng từ liên quan
  wh_code      VARCHAR(30),
  created_by   BIGINT REFERENCES esc_users(id),
  website_id   INTEGER[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10.2 Báo cáo tổng hợp theo tháng (cache cho dashboard)
CREATE TABLE esc_monthly_summary (
  id               BIGSERIAL PRIMARY KEY,
  summary_month    DATE NOT NULL,               -- ngày đầu tháng (2026-05-01)
  total_po_amount  NUMERIC(18,2) DEFAULT 0,     -- tổng tiền nhập
  total_so_amount  NUMERIC(18,2) DEFAULT 0,     -- tổng doanh thu
  total_cost       NUMERIC(18,2) DEFAULT 0,     -- tổng chi phí
  gross_profit     NUMERIC(18,2) DEFAULT 0,     -- lợi nhuận gộp
  po_count         INTEGER DEFAULT 0,
  so_count         INTEGER DEFAULT 0,
  website_id       INTEGER[] NOT NULL DEFAULT '{}',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (summary_month, website_id)
);


-- ===========================================================
-- 11. THÔNG BÁO HỆ THỐNG
-- ===========================================================

CREATE TABLE esc_notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES esc_users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  ref_type    VARCHAR(30),   -- 'PO' | 'SO' | 'STOCK' | 'SYSTEM'
  ref_code    VARCHAR(50),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  website_id  INTEGER[] NOT NULL DEFAULT '{}'
);


-- ===========================================================
-- 12. INDEXES — tối ưu truy vấn thường dùng
-- ===========================================================

CREATE INDEX idx_po_website        ON esc_po            USING GIN (website_id);
CREATE INDEX idx_po_status         ON esc_po            (status);
CREATE INDEX idx_po_order_date     ON esc_po            (order_date DESC);
CREATE INDEX idx_po_items_po_code  ON esc_po_items      (po_code);

CREATE INDEX idx_so_website        ON esc_so            USING GIN (website_id);
CREATE INDEX idx_so_status         ON esc_so            (status);
CREATE INDEX idx_so_created_at     ON esc_so            (created_at DESC);
CREATE INDEX idx_so_items_so_code  ON esc_so_items      (so_code);

CREATE INDEX idx_product_website   ON esc_product       USING GIN (website_id);
CREATE INDEX idx_product_code      ON esc_product       (product_code);

CREATE INDEX idx_inventory_product ON esc_inventory     (product_code, trans_date DESC);
CREATE INDEX idx_inventory_website ON esc_inventory     USING GIN (website_id);

CREATE INDEX idx_serial_product    ON esc_serial_tracking (product_code);
CREATE INDEX idx_serial_status     ON esc_serial_tracking (status);

CREATE INDEX idx_stock_mv_ref      ON esc_stock_movement  (ref_type, ref_code);
CREATE INDEX idx_stock_mv_product  ON esc_stock_movement  (product_code, moved_at DESC);

CREATE INDEX idx_users_phone       ON esc_users           (phone);
CREATE INDEX idx_users_website     ON esc_users           USING GIN (website_id);

CREATE INDEX idx_attendance_user   ON esc_hr_attendance   (user_id, work_date DESC);
CREATE INDEX idx_cost_date         ON esc_cost_entries    (cost_date DESC);
CREATE INDEX idx_notif_user        ON esc_notifications   (user_id, is_read, created_at DESC);
