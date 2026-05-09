-- =============================================================
-- ESC-kho WMS — Fix schema + Seed Super Admin
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- =============================================================

-- BƯỚC 1: Thêm cột còn thiếu vào esc_users
ALTER TABLE esc_users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- BƯỚC 2: Xóa nếu đã tồn tại để tránh lỗi duplicate
DELETE FROM esc_staff_profiles
WHERE user_id IN (
  SELECT id FROM esc_users WHERE phone IN ('0901000001', '0901000002')
);
DELETE FROM esc_users WHERE phone IN ('0901000001', '0901000002');

-- BƯỚC 3: Insert Super Admin vào esc_users
INSERT INTO esc_users (phone, pass, full_name, nick_name, user_type, is_active, is_super_admin, website_id)
VALUES
  ('0901000001', 'Admin@ESC2026',  'Michael',   'michael',   'staff', TRUE, TRUE, ARRAY[9]),
  ('0901000002', 'Backup@ESC2026', 'Admin ESC', 'admin_esc', 'staff', TRUE, TRUE, ARRAY[9]);

-- BƯỚC 4: Insert profile tương ứng vào esc_staff_profiles
INSERT INTO esc_staff_profiles (user_id, is_super_admin, allowed_modules, website_id)
SELECT
  id,
  TRUE,
  ARRAY['inbound','orders','outbound','inventory','reports','operation','hr','finance'],
  ARRAY[9]
FROM esc_users
WHERE phone IN ('0901000001', '0901000002');

-- BƯỚC 5: Kiểm tra kết quả
SELECT u.id, u.phone, u.full_name, u.is_super_admin, u.website_id, sp.allowed_modules
FROM esc_users u
LEFT JOIN esc_staff_profiles sp ON sp.user_id = u.id
WHERE u.phone IN ('0901000001', '0901000002');
