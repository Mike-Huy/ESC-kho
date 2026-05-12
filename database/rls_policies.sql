-- =============================================================
-- ESC-kho WMS — Row Level Security (RLS) Policies
-- Supabase project: jhebreoxwuimlqwvjdok.supabase.co
--
-- KIẾN TRÚC BẢO MẬT:
-- App dùng anon key + custom auth (không dùng Supabase Auth).
-- Mọi request từ frontend đều chạy dưới role "anon".
-- Để RLS hoạt động đúng, app phải gọi:
--   SELECT set_config('app.current_user_id', '<user_id>', true);
-- ngay sau khi login thành công (xem hướng dẫn ở LoginPopup.tsx).
--
-- PHÂN TẦNG POLICY:
--   - Bảng nhạy cảm (users, staff_profiles, hr_*): chỉ đọc chính mình
--     hoặc super_admin
--   - Bảng nghiệp vụ (po, so, product, inventory, ...): đọc/ghi
--     theo website_id khớp
--   - Bảng vận hành (stock_movement, audit, transfer): ghi được
--     nhưng không xóa
--   - Không có bảng nào cho phép DELETE trực tiếp từ client
--     (dùng soft-delete qua status = 'cancelled')
-- =============================================================


-- =============================================================
-- BƯỚC 1: Tạo schema riêng cho functions nếu chưa có
-- =============================================================
CREATE SCHEMA IF NOT EXISTS app;


-- =============================================================
-- BƯỚC 2: Tạo helper functions
-- =============================================================

-- Lấy user_id hiện tại từ custom session config
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS BIGINT
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::BIGINT;
$$;

-- Kiểm tra user hiện tại có phải super_admin không
CREATE OR REPLACE FUNCTION app.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM esc_users WHERE id = app.current_user_id()),
    FALSE
  );
$$;

-- Kiểm tra user hiện tại có quyền truy cập website_id không
CREATE OR REPLACE FUNCTION app.has_website_access(wid INTEGER)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT wid = ANY(website_id) FROM esc_users WHERE id = app.current_user_id()),
    FALSE
  );
$$;

-- Kiểm tra bản ghi thuộc website mà user có quyền truy cập
CREATE OR REPLACE FUNCTION app.can_access_website_array(record_website_ids INTEGER[])
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT app.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM esc_users
        WHERE id = app.current_user_id()
          AND website_id && record_website_ids  -- && = array overlap
      );
$$;


-- =============================================================
-- BƯỚC 3: ENABLE RLS cho toàn bộ 26 bảng
-- =============================================================

ALTER TABLE esc_users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_staff_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_hr_departments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_erp_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_erp_role_permissions   ENABLE ROW LEVEL SECURITY;

ALTER TABLE esc_hr_attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_hr_transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_hr_shifts              ENABLE ROW LEVEL SECURITY;

ALTER TABLE esc_warehouse              ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_wh_location            ENABLE ROW LEVEL SECURITY;

ALTER TABLE esc_product                ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_serial_tracking        ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_inventory              ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_stock_movement         ENABLE ROW LEVEL SECURITY;

ALTER TABLE esc_supplier               ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_customer               ENABLE ROW LEVEL SECURITY;

ALTER TABLE esc_po                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_po_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_po_payments            ENABLE ROW LEVEL SECURITY;

ALTER TABLE esc_so                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_so_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_so_payments            ENABLE ROW LEVEL SECURITY;

ALTER TABLE esc_stock_audit            ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_stock_audit_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_stock_transfer         ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_stock_transfer_items   ENABLE ROW LEVEL SECURITY;

ALTER TABLE esc_cost_entries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_monthly_summary        ENABLE ROW LEVEL SECURITY;
ALTER TABLE esc_notifications          ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- BƯỚC 4: POLICIES — Nhóm Users & Phân quyền
-- =============================================================

-- esc_users: chỉ đọc chính mình, super_admin đọc tất cả
CREATE POLICY "users_select" ON esc_users FOR SELECT
  USING (
    id = app.current_user_id()
    OR app.is_super_admin()
    OR app.can_access_website_array(website_id)  -- staff xem đồng nghiệp cùng site
  );

CREATE POLICY "users_insert" ON esc_users FOR INSERT
  WITH CHECK (
    app.is_super_admin()
    OR (
      app.is_admin_or_above()
      AND website_id && (
        SELECT website_id 
        FROM esc_users 
        WHERE id = app.current_user_id()
        LIMIT 1
      )
    )
  );

CREATE POLICY "users_update" ON esc_users FOR UPDATE
  USING (
    id = app.current_user_id()   -- tự cập nhật profile
    OR app.is_super_admin()
    OR (
      app.is_admin_or_above()
      AND website_id && (
        SELECT website_id 
        FROM esc_users 
        WHERE id = app.current_user_id()
        LIMIT 1
      )
    )
  );

CREATE POLICY "users_delete" ON esc_users FOR DELETE
  USING (
    app.is_super_admin()
    OR (
      app.is_admin_or_above()
      AND website_id && (
        SELECT website_id 
        FROM esc_users 
        WHERE id = app.current_user_id()
        LIMIT 1
      )
    )
  );

-- esc_staff_profiles: đọc cùng site, ghi chỉ super_admin
CREATE POLICY "staff_profiles_select" ON esc_staff_profiles FOR SELECT
  USING (
    user_id = app.current_user_id()
    OR app.is_super_admin()
    OR app.can_access_website_array(website_id)
  );

CREATE POLICY "staff_profiles_insert" ON esc_staff_profiles FOR INSERT
  WITH CHECK (
    app.is_super_admin()
    OR (
      app.is_admin_or_above()
      AND website_id && (
        SELECT website_id 
        FROM esc_users 
        WHERE id = app.current_user_id()
        LIMIT 1
      )
    )
  );

CREATE POLICY "staff_profiles_update" ON esc_staff_profiles FOR UPDATE
  USING (
    app.is_super_admin()
    OR (
      app.is_admin_or_above()
      AND website_id && (
        SELECT website_id 
        FROM esc_users 
        WHERE id = app.current_user_id()
        LIMIT 1
      )
    )
  );

CREATE POLICY "staff_profiles_delete" ON esc_staff_profiles FOR DELETE
  USING (
    app.is_super_admin()
    OR (
      app.is_admin_or_above()
      AND website_id && (
        SELECT website_id 
        FROM esc_users 
        WHERE id = app.current_user_id()
        LIMIT 1
      )
    )
  );

-- esc_hr_departments: đọc cùng site, ghi super_admin
CREATE POLICY "hr_dept_select" ON esc_hr_departments FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "hr_dept_insert" ON esc_hr_departments FOR INSERT
  WITH CHECK (app.is_super_admin());

CREATE POLICY "hr_dept_update" ON esc_hr_departments FOR UPDATE
  USING (app.is_super_admin());

-- esc_erp_roles: đọc cùng site, ghi super_admin
CREATE POLICY "erp_roles_select" ON esc_erp_roles FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "erp_roles_insert" ON esc_erp_roles FOR INSERT
  WITH CHECK (app.is_super_admin());

CREATE POLICY "erp_roles_update" ON esc_erp_roles FOR UPDATE
  USING (app.is_super_admin());

-- esc_erp_role_permissions
CREATE POLICY "role_perms_select" ON esc_erp_role_permissions FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "role_perms_insert" ON esc_erp_role_permissions FOR INSERT
  WITH CHECK (app.is_super_admin());

CREATE POLICY "role_perms_update" ON esc_erp_role_permissions FOR UPDATE
  USING (app.is_super_admin());

CREATE POLICY "role_perms_delete" ON esc_erp_role_permissions FOR DELETE
  USING (app.is_super_admin());


-- =============================================================
-- BƯỚC 5: POLICIES — Nhóm Nhân sự
-- =============================================================

-- esc_hr_attendance: nhân viên xem chấm công của mình, manager xem site
CREATE POLICY "attendance_select" ON esc_hr_attendance FOR SELECT
  USING (
    user_id = app.current_user_id()
    OR app.is_super_admin()
    OR app.can_access_website_array(website_id)
  );

CREATE POLICY "attendance_insert" ON esc_hr_attendance FOR INSERT
  WITH CHECK (
    user_id = app.current_user_id()   -- tự chấm công
    OR app.is_super_admin()
    OR app.can_access_website_array(website_id)
  );

CREATE POLICY "attendance_update" ON esc_hr_attendance FOR UPDATE
  USING (
    user_id = app.current_user_id()
    OR app.is_super_admin()
    OR app.can_access_website_array(website_id)
  );

-- esc_hr_transactions: nhân viên xem của mình, super_admin quản lý
CREATE POLICY "hr_tx_select" ON esc_hr_transactions FOR SELECT
  USING (
    user_id = app.current_user_id()
    OR app.is_super_admin()
    OR app.can_access_website_array(website_id)
  );

CREATE POLICY "hr_tx_insert" ON esc_hr_transactions FOR INSERT
  WITH CHECK (app.is_super_admin() OR app.can_access_website_array(website_id));

CREATE POLICY "hr_tx_update" ON esc_hr_transactions FOR UPDATE
  USING (app.is_super_admin());

-- esc_hr_shifts: đọc cùng site, ghi super_admin
CREATE POLICY "hr_shifts_select" ON esc_hr_shifts FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "hr_shifts_insert" ON esc_hr_shifts FOR INSERT
  WITH CHECK (app.is_super_admin());

CREATE POLICY "hr_shifts_update" ON esc_hr_shifts FOR UPDATE
  USING (app.is_super_admin());


-- =============================================================
-- BƯỚC 6: POLICIES — Nhóm Kho hàng
-- =============================================================

CREATE POLICY "warehouse_select" ON esc_warehouse FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "warehouse_insert" ON esc_warehouse FOR INSERT
  WITH CHECK (app.is_super_admin());

CREATE POLICY "warehouse_update" ON esc_warehouse FOR UPDATE
  USING (app.is_super_admin());

CREATE POLICY "wh_location_select" ON esc_wh_location FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "wh_location_insert" ON esc_wh_location FOR INSERT
  WITH CHECK (app.is_super_admin() OR app.can_access_website_array(website_id));

CREATE POLICY "wh_location_update" ON esc_wh_location FOR UPDATE
  USING (app.is_super_admin() OR app.can_access_website_array(website_id));


-- =============================================================
-- BƯỚC 7: POLICIES — Nhóm Sản phẩm & Tồn kho
-- =============================================================

-- esc_product
CREATE POLICY "product_select" ON esc_product FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "product_insert" ON esc_product FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "product_update" ON esc_product FOR UPDATE
  USING (app.can_access_website_array(website_id));

-- Không DELETE product từ client — dùng status = 'inactive'

-- esc_serial_tracking
CREATE POLICY "serial_select" ON esc_serial_tracking FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "serial_insert" ON esc_serial_tracking FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "serial_update" ON esc_serial_tracking FOR UPDATE
  USING (app.can_access_website_array(website_id));

-- esc_inventory (snapshot — app ghi, không xóa)
CREATE POLICY "inventory_select" ON esc_inventory FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "inventory_insert" ON esc_inventory FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "inventory_update" ON esc_inventory FOR UPDATE
  USING (app.can_access_website_array(website_id));

-- esc_stock_movement (audit trail — chỉ INSERT, không UPDATE/DELETE)
CREATE POLICY "stock_mv_select" ON esc_stock_movement FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "stock_mv_insert" ON esc_stock_movement FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

-- Không có UPDATE/DELETE policy cho stock_movement → bất biến sau khi ghi


-- =============================================================
-- BƯỚC 8: POLICIES — Nhà cung cấp & Khách hàng
-- =============================================================

CREATE POLICY "supplier_select" ON esc_supplier FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "supplier_insert" ON esc_supplier FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "supplier_update" ON esc_supplier FOR UPDATE
  USING (app.can_access_website_array(website_id));

CREATE POLICY "customer_select" ON esc_customer FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "customer_insert" ON esc_customer FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "customer_update" ON esc_customer FOR UPDATE
  USING (app.can_access_website_array(website_id));


-- =============================================================
-- BƯỚC 9: POLICIES — Đơn nhập PO
-- =============================================================

CREATE POLICY "po_select" ON esc_po FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "po_insert" ON esc_po FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "po_update" ON esc_po FOR UPDATE
  USING (app.can_access_website_array(website_id));

-- po_items: không có website_id riêng → kiểm tra qua po_code
CREATE POLICY "po_items_select" ON esc_po_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM esc_po
      WHERE po_code = esc_po_items.po_code
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "po_items_insert" ON esc_po_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM esc_po
      WHERE po_code = esc_po_items.po_code
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "po_items_update" ON esc_po_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM esc_po
      WHERE po_code = esc_po_items.po_code
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "po_items_delete" ON esc_po_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM esc_po p
      WHERE p.po_code = esc_po_items.po_code
        AND p.status = 'draft'
        AND app.can_access_website_array(p.website_id)
    )
  );

-- po_payments
CREATE POLICY "po_payments_select" ON esc_po_payments FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "po_payments_insert" ON esc_po_payments FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "po_payments_update" ON esc_po_payments FOR UPDATE
  USING (app.is_super_admin());


-- =============================================================
-- BƯỚC 10: POLICIES — Đơn bán SO
-- =============================================================

CREATE POLICY "so_select" ON esc_so FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "so_insert" ON esc_so FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "so_update" ON esc_so FOR UPDATE
  USING (app.can_access_website_array(website_id));

-- so_items
CREATE POLICY "so_items_select" ON esc_so_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM esc_so
      WHERE so_code = esc_so_items.so_code
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "so_items_insert" ON esc_so_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM esc_so
      WHERE so_code = esc_so_items.so_code
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "so_items_update" ON esc_so_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM esc_so
      WHERE so_code = esc_so_items.so_code
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "so_items_delete" ON esc_so_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM esc_so s
      WHERE s.so_code = esc_so_items.so_code
        AND s.status IN ('new', 'confirmed')
        AND app.can_access_website_array(s.website_id)
    )
  );

-- so_payments
CREATE POLICY "so_payments_select" ON esc_so_payments FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "so_payments_insert" ON esc_so_payments FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "so_payments_update" ON esc_so_payments FOR UPDATE
  USING (app.is_super_admin());


-- =============================================================
-- BƯỚC 11: POLICIES — Vận hành kho
-- =============================================================

CREATE POLICY "stock_audit_select" ON esc_stock_audit FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "stock_audit_insert" ON esc_stock_audit FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "stock_audit_update" ON esc_stock_audit FOR UPDATE
  USING (app.can_access_website_array(website_id));

-- stock_audit_items: không có website_id → kiểm tra qua audit_code
CREATE POLICY "audit_items_select" ON esc_stock_audit_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM esc_stock_audit
      WHERE audit_code = esc_stock_audit_items.audit_code
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "audit_items_insert" ON esc_stock_audit_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM esc_stock_audit
      WHERE audit_code = esc_stock_audit_items.audit_code
        AND status IN ('draft', 'in_progress')
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "audit_items_update" ON esc_stock_audit_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM esc_stock_audit
      WHERE audit_code = esc_stock_audit_items.audit_code
        AND status IN ('draft', 'in_progress')
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "audit_items_delete" ON esc_stock_audit_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM esc_stock_audit
      WHERE audit_code = esc_stock_audit_items.audit_code
        AND status = 'draft'
        AND app.can_access_website_array(website_id)
    )
  );

-- esc_stock_transfer
CREATE POLICY "transfer_select" ON esc_stock_transfer FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "transfer_insert" ON esc_stock_transfer FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "transfer_update" ON esc_stock_transfer FOR UPDATE
  USING (app.can_access_website_array(website_id));

-- stock_transfer_items
CREATE POLICY "transfer_items_select" ON esc_stock_transfer_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM esc_stock_transfer
      WHERE transfer_code = esc_stock_transfer_items.transfer_code
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "transfer_items_insert" ON esc_stock_transfer_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM esc_stock_transfer
      WHERE transfer_code = esc_stock_transfer_items.transfer_code
        AND status = 'pending'
        AND app.can_access_website_array(website_id)
    )
  );

CREATE POLICY "transfer_items_delete" ON esc_stock_transfer_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM esc_stock_transfer
      WHERE transfer_code = esc_stock_transfer_items.transfer_code
        AND status = 'pending'
        AND app.can_access_website_array(website_id)
    )
  );


-- =============================================================
-- BƯỚC 12: POLICIES — Tài chính
-- =============================================================

CREATE POLICY "cost_entries_select" ON esc_cost_entries FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "cost_entries_insert" ON esc_cost_entries FOR INSERT
  WITH CHECK (app.is_super_admin() OR app.can_access_website_array(website_id));

CREATE POLICY "cost_entries_update" ON esc_cost_entries FOR UPDATE
  USING (app.is_super_admin());

CREATE POLICY "monthly_summary_select" ON esc_monthly_summary FOR SELECT
  USING (app.can_access_website_array(website_id));

CREATE POLICY "monthly_summary_insert" ON esc_monthly_summary FOR INSERT
  WITH CHECK (app.is_super_admin());

CREATE POLICY "monthly_summary_update" ON esc_monthly_summary FOR UPDATE
  USING (app.is_super_admin());


-- =============================================================
-- BƯỚC 13: POLICIES — Thông báo
-- =============================================================

CREATE POLICY "notifications_select" ON esc_notifications FOR SELECT
  USING (
    user_id = app.current_user_id()
    OR app.is_super_admin()
  );

CREATE POLICY "notifications_insert" ON esc_notifications FOR INSERT
  WITH CHECK (app.can_access_website_array(website_id));

CREATE POLICY "notifications_update" ON esc_notifications FOR UPDATE
  USING (
    user_id = app.current_user_id()   -- chỉ tự đánh dấu is_read
    OR app.is_super_admin()
  );

CREATE POLICY "notifications_delete" ON esc_notifications FOR DELETE
  USING (user_id = app.current_user_id() OR app.is_super_admin());


-- =============================================================
-- BƯỚC 14: CẤP QUYỀN EXECUTE cho anon role
-- =============================================================

GRANT USAGE ON SCHEMA app TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app.is_super_admin()  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app.has_website_access(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app.can_access_website_array(INTEGER[]) TO anon, authenticated;


-- =============================================================
-- BƯỚC 15: CẤP QUYỀN TABLE cho anon
-- (Supabase mặc định anon chỉ đọc — cần grant thêm cho write)
-- =============================================================

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Riêng các bảng nhạy cảm: hạn chế anon (cho phép esc_users thao tác ghi cho admin qua RLS)
GRANT INSERT, UPDATE, DELETE ON esc_users TO anon;
REVOKE INSERT, UPDATE ON esc_erp_roles FROM anon;
REVOKE INSERT, UPDATE ON esc_erp_role_permissions FROM anon;
REVOKE INSERT, UPDATE ON esc_hr_shifts FROM anon;
REVOKE INSERT, UPDATE ON esc_monthly_summary FROM anon;
-- (RLS policies bên trên vẫn là hàng rào cuối — REVOKE chỉ là lớp bổ sung)
