-- =============================================================
-- ESC-kho WMS — Patch: Thêm module 'settings' vào các role
-- Chạy trong Supabase SQL Editor (chạy 1 lần, idempotent)
-- =============================================================
-- Lý do: Module 'settings' (9. Cài đặt) được thêm vào sidebar
-- nhưng chưa có trong esc_erp_role_permissions.
-- Chỉ admin (level 4) và super_admin (level 5) được vào Cài đặt.
-- Các role còn lại (customer, staff, leader) không được vào.
-- =============================================================

DO $$
DECLARE
  id_admin  BIGINT;
  id_super  BIGINT;
BEGIN
  SELECT id INTO id_admin FROM esc_erp_roles WHERE name = 'admin'       AND website_id @> ARRAY[9];
  SELECT id INTO id_super FROM esc_erp_roles WHERE name = 'super_admin' AND website_id @> ARRAY[9];

  -- admin: xem + sửa Cài đặt (không xóa role/quyền)
  IF id_admin IS NOT NULL THEN
    INSERT INTO esc_erp_role_permissions (role_id, module, can_read, can_add, can_edit, can_delete, website_id)
    VALUES (id_admin, 'settings', TRUE, TRUE, TRUE, FALSE, ARRAY[9])
    ON CONFLICT (role_id, module) DO UPDATE SET
      can_read   = TRUE,
      can_add    = TRUE,
      can_edit   = TRUE,
      can_delete = FALSE;
  END IF;

  -- super_admin: toàn quyền Cài đặt
  IF id_super IS NOT NULL THEN
    INSERT INTO esc_erp_role_permissions (role_id, module, can_read, can_add, can_edit, can_delete, website_id)
    VALUES (id_super, 'settings', TRUE, TRUE, TRUE, TRUE, ARRAY[9])
    ON CONFLICT (role_id, module) DO UPDATE SET
      can_read   = TRUE,
      can_add    = TRUE,
      can_edit   = TRUE,
      can_delete = TRUE;
  END IF;

  -- Debug: nếu không tìm thấy role thì raise notice
  IF id_admin IS NULL THEN RAISE NOTICE 'WARN: role admin không tìm thấy với website_id @> ARRAY[9]'; END IF;
  IF id_super IS NULL THEN RAISE NOTICE 'WARN: role super_admin không tìm thấy với website_id @> ARRAY[9]'; END IF;

  -- customer, staff, leader: không có quyền settings (insert FALSE nếu chưa có)
  INSERT INTO esc_erp_role_permissions (role_id, module, can_read, can_add, can_edit, can_delete, website_id)
  SELECT id, 'settings', FALSE, FALSE, FALSE, FALSE, ARRAY[9]
  FROM esc_erp_roles
  WHERE name IN ('customer', 'staff', 'leader') AND website_id @> ARRAY[9]
  ON CONFLICT (role_id, module) DO NOTHING;

END $$;

-- Cập nhật allowed_modules cache cho admin (thêm 'settings')
UPDATE esc_staff_profiles sp
SET allowed_modules = array_append(
  array_remove(allowed_modules, 'settings'), -- tránh duplicate
  'settings'
)
FROM esc_erp_roles r
WHERE sp.erp_role_id = r.id
  AND r.name = 'admin'
  AND r.website_id @> ARRAY[9];

-- Cập nhật allowed_modules cache cho super_admin (thêm 'settings')
UPDATE esc_staff_profiles sp
SET allowed_modules = array_append(
  array_remove(allowed_modules, 'settings'),
  'settings'
)
FROM esc_erp_roles r
WHERE sp.erp_role_id = r.id
  AND r.name = 'super_admin'
  AND r.website_id @> ARRAY[9];

-- Kiểm tra kết quả
SELECT r.name, r.label, p.module, p.can_read, p.can_add, p.can_edit, p.can_delete
FROM esc_erp_roles r
JOIN esc_erp_role_permissions p ON p.role_id = r.id
WHERE p.module = 'settings' AND r.website_id @> ARRAY[9]
ORDER BY r.level;
