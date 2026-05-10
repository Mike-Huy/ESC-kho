-- =============================================================
-- ESC-kho WMS — Seed 5 Roles chuẩn
-- Chạy trong Supabase SQL Editor
-- website_id = 9 (Kho ESC)
-- =============================================================

-- BƯỚC 1: Xóa roles cũ nếu có (tránh duplicate)
DELETE FROM esc_erp_role_permissions
WHERE role_id IN (
  SELECT id FROM esc_erp_roles WHERE website_id @> ARRAY[9]
);
DELETE FROM esc_erp_roles WHERE website_id @> ARRAY[9];

-- BƯỚC 2: Insert 5 roles chuẩn
INSERT INTO esc_erp_roles (name, label, description, color, level, website_id)
VALUES
  ('customer',   'Khách hàng',  'Chỉ xem đơn hàng của mình, không thao tác kho',                    '#64748b', 1, ARRAY[9]),
  ('staff',      'Nhân viên',   'Thực hiện nhập/xuất/kiểm kê kho hàng ngày',                        '#3b82f6', 2, ARRAY[9]),
  ('leader',     'Trưởng nhóm', 'Quản lý nhóm, xem báo cáo, duyệt thao tác vận hành',              '#8b5cf6', 3, ARRAY[9]),
  ('admin',      'Quản trị',    'Quản lý nhân sự, tài chính, cấu hình hệ thống trong website',      '#f59e0b', 4, ARRAY[9]),
  ('super_admin','Super Admin',  'Toàn quyền hệ thống, quản lý đa website, không giới hạn',         '#ef4444', 5, ARRAY[9]);

-- BƯỚC 3: Lấy IDs vừa tạo vào biến tạm
DO $$
DECLARE
  id_customer   BIGINT;
  id_staff      BIGINT;
  id_leader     BIGINT;
  id_admin      BIGINT;
  id_super      BIGINT;
BEGIN
  SELECT id INTO id_customer   FROM esc_erp_roles WHERE name = 'customer'   AND website_id @> ARRAY[9];
  SELECT id INTO id_staff      FROM esc_erp_roles WHERE name = 'staff'      AND website_id @> ARRAY[9];
  SELECT id INTO id_leader     FROM esc_erp_roles WHERE name = 'leader'     AND website_id @> ARRAY[9];
  SELECT id INTO id_admin      FROM esc_erp_roles WHERE name = 'admin'      AND website_id @> ARRAY[9];
  SELECT id INTO id_super      FROM esc_erp_roles WHERE name = 'super_admin'AND website_id @> ARRAY[9];

  -- ===========================================================
  -- BƯỚC 4: Cấu hình quyền CRUD cho từng role × module
  -- Modules: inbound | orders | outbound | inventory | reports | operation | hr | finance
  -- ===========================================================

  -- ----- CUSTOMER (level 1) -----
  -- Chỉ xem đơn bán (orders), không có gì khác
  INSERT INTO esc_erp_role_permissions (role_id, module, can_read, can_add, can_edit, can_delete, website_id) VALUES
    (id_customer, 'inbound',   FALSE, FALSE, FALSE, FALSE, ARRAY[9]),
    (id_customer, 'orders',    TRUE,  FALSE, FALSE, FALSE, ARRAY[9]),
    (id_customer, 'outbound',  FALSE, FALSE, FALSE, FALSE, ARRAY[9]),
    (id_customer, 'inventory', FALSE, FALSE, FALSE, FALSE, ARRAY[9]),
    (id_customer, 'reports',   FALSE, FALSE, FALSE, FALSE, ARRAY[9]),
    (id_customer, 'operation', FALSE, FALSE, FALSE, FALSE, ARRAY[9]),
    (id_customer, 'hr',        FALSE, FALSE, FALSE, FALSE, ARRAY[9]),
    (id_customer, 'finance',   FALSE, FALSE, FALSE, FALSE, ARRAY[9]);

  -- ----- STAFF (level 2) -----
  -- Thao tác nhập/xuất/tồn kho hàng ngày, không xóa, không quản lý
  INSERT INTO esc_erp_role_permissions (role_id, module, can_read, can_add, can_edit, can_delete, website_id) VALUES
    (id_staff, 'inbound',   TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_staff, 'orders',    TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_staff, 'outbound',  TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_staff, 'inventory', TRUE,  FALSE, FALSE, FALSE, ARRAY[9]),
    (id_staff, 'reports',   FALSE, FALSE, FALSE, FALSE, ARRAY[9]),
    (id_staff, 'operation', TRUE,  TRUE,  FALSE, FALSE, ARRAY[9]),
    (id_staff, 'hr',        FALSE, FALSE, FALSE, FALSE, ARRAY[9]),
    (id_staff, 'finance',   FALSE, FALSE, FALSE, FALSE, ARRAY[9]);

  -- ----- LEADER (level 3) -----
  -- Thêm: xem báo cáo, duyệt/sửa vận hành, xem nhân sự
  INSERT INTO esc_erp_role_permissions (role_id, module, can_read, can_add, can_edit, can_delete, website_id) VALUES
    (id_leader, 'inbound',   TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_leader, 'orders',    TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_leader, 'outbound',  TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_leader, 'inventory', TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_leader, 'reports',   TRUE,  FALSE, FALSE, FALSE, ARRAY[9]),
    (id_leader, 'operation', TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_leader, 'hr',        TRUE,  FALSE, FALSE, FALSE, ARRAY[9]),
    (id_leader, 'finance',   FALSE, FALSE, FALSE, FALSE, ARRAY[9]);

  -- ----- ADMIN (level 4) -----
  -- Full CRUD mọi thứ trừ xóa tài chính/nhân sự (bảo toàn audit trail)
  INSERT INTO esc_erp_role_permissions (role_id, module, can_read, can_add, can_edit, can_delete, website_id) VALUES
    (id_admin, 'inbound',   TRUE,  TRUE,  TRUE,  TRUE,  ARRAY[9]),
    (id_admin, 'orders',    TRUE,  TRUE,  TRUE,  TRUE,  ARRAY[9]),
    (id_admin, 'outbound',  TRUE,  TRUE,  TRUE,  TRUE,  ARRAY[9]),
    (id_admin, 'inventory', TRUE,  TRUE,  TRUE,  TRUE,  ARRAY[9]),
    (id_admin, 'reports',   TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_admin, 'operation', TRUE,  TRUE,  TRUE,  TRUE,  ARRAY[9]),
    (id_admin, 'hr',        TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]),
    (id_admin, 'finance',   TRUE,  TRUE,  TRUE,  FALSE, ARRAY[9]);

  -- ----- SUPER ADMIN (level 5) -----
  -- Toàn quyền tuyệt đối, kể cả xóa
  INSERT INTO esc_erp_role_permissions (role_id, module, can_read, can_add, can_edit, can_delete, website_id) VALUES
    (id_super, 'inbound',   TRUE, TRUE, TRUE, TRUE, ARRAY[9]),
    (id_super, 'orders',    TRUE, TRUE, TRUE, TRUE, ARRAY[9]),
    (id_super, 'outbound',  TRUE, TRUE, TRUE, TRUE, ARRAY[9]),
    (id_super, 'inventory', TRUE, TRUE, TRUE, TRUE, ARRAY[9]),
    (id_super, 'reports',   TRUE, TRUE, TRUE, TRUE, ARRAY[9]),
    (id_super, 'operation', TRUE, TRUE, TRUE, TRUE, ARRAY[9]),
    (id_super, 'hr',        TRUE, TRUE, TRUE, TRUE, ARRAY[9]),
    (id_super, 'finance',   TRUE, TRUE, TRUE, TRUE, ARRAY[9]);

END $$;

-- =============================================================
-- BƯỚC 5: Cập nhật allowed_modules cho staff_profiles theo role
-- =============================================================

-- customer: chỉ orders
UPDATE esc_staff_profiles sp
SET allowed_modules = ARRAY['orders']
FROM esc_erp_roles r
WHERE sp.erp_role_id = r.id
  AND r.name = 'customer'
  AND r.website_id @> ARRAY[9];

-- staff: inbound, orders, outbound, operation
UPDATE esc_staff_profiles sp
SET allowed_modules = ARRAY['inbound','orders','outbound','operation']
FROM esc_erp_roles r
WHERE sp.erp_role_id = r.id
  AND r.name = 'staff'
  AND r.website_id @> ARRAY[9];

-- leader: + inventory, reports, hr
UPDATE esc_staff_profiles sp
SET allowed_modules = ARRAY['inbound','orders','outbound','inventory','reports','operation','hr']
FROM esc_erp_roles r
WHERE sp.erp_role_id = r.id
  AND r.name = 'leader'
  AND r.website_id @> ARRAY[9];

-- admin: tất cả
UPDATE esc_staff_profiles sp
SET allowed_modules = ARRAY['inbound','orders','outbound','inventory','reports','operation','hr','finance']
FROM esc_erp_roles r
WHERE sp.erp_role_id = r.id
  AND r.name = 'admin'
  AND r.website_id @> ARRAY[9];

-- super_admin: tất cả
UPDATE esc_staff_profiles sp
SET allowed_modules = ARRAY['inbound','orders','outbound','inventory','reports','operation','hr','finance']
FROM esc_erp_roles r
WHERE sp.erp_role_id = r.id
  AND r.name = 'super_admin'
  AND r.website_id @> ARRAY[9];

-- =============================================================
-- BƯỚC 6: Kiểm tra kết quả
-- =============================================================
SELECT
  r.name,
  r.label,
  r.level,
  r.color,
  p.module,
  p.can_read  AS "Xem",
  p.can_add   AS "Thêm",
  p.can_edit  AS "Sửa",
  p.can_delete AS "Xóa"
FROM esc_erp_roles r
JOIN esc_erp_role_permissions p ON p.role_id = r.id
WHERE r.website_id @> ARRAY[9]
ORDER BY r.level, p.module;
