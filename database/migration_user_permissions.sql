-- =============================================================
-- ESC-kho WMS — Migration: Tạo bảng esc_user_permissions
-- Chạy trong Supabase SQL Editor (1 lần)
-- =============================================================
-- MỤC ĐÍCH:
--   Cho phép gán quyền CRUD trực tiếp cho từng user (không qua Role).
--   Khi user có bản ghi trong bảng này → quyền riêng ưu tiên tuyệt đối,
--   Role được gán sẽ bị bỏ qua hoàn toàn trong runtime.
-- =============================================================

-- BƯỚC 1: Tạo bảng
CREATE TABLE IF NOT EXISTS esc_user_permissions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES esc_users(id) ON DELETE CASCADE,
  module     VARCHAR(50) NOT NULL,  -- 'inbound' | 'orders' | 'outbound' | 'inventory' | 'reports' | 'operation' | 'hr' | 'finance'
  can_read   BOOLEAN NOT NULL DEFAULT FALSE,
  can_add    BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit   BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  website_id INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module)
);

-- BƯỚC 2: Index để tìm nhanh theo user
CREATE INDEX IF NOT EXISTS idx_user_perms_user ON esc_user_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_website ON esc_user_permissions USING GIN (website_id);

-- BƯỚC 3: RLS
ALTER TABLE esc_user_permissions ENABLE ROW LEVEL SECURITY;

-- Super admin: toàn quyền
CREATE POLICY "user_perms_super_admin_all" ON esc_user_permissions
  FOR ALL
  USING (app.is_super_admin())
  WITH CHECK (app.is_super_admin());

-- Đọc bản thân
CREATE POLICY "user_perms_read_self" ON esc_user_permissions
  FOR SELECT
  USING (user_id = app.current_user_id());

-- Admin (level >= 4) được đọc và ghi user_permissions của website mình quản lý
-- Dùng SECURITY DEFINER function để kiểm tra level
CREATE OR REPLACE FUNCTION app.is_admin_or_above()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT r.level >= 4
      FROM esc_staff_profiles sp
      JOIN esc_erp_roles r ON r.id = sp.erp_role_id
      WHERE sp.user_id = app.current_user_id()
      LIMIT 1
    ),
    FALSE
  );
$$;

CREATE POLICY "user_perms_admin_manage" ON esc_user_permissions
  FOR ALL
  USING (
    app.is_admin_or_above()
    AND website_id @> ARRAY[(
      SELECT website_id[1]
      FROM esc_users
      WHERE id = app.current_user_id()
      LIMIT 1
    )]
  )
  WITH CHECK (
    app.is_admin_or_above()
  );

-- BƯỚC 4: Trigger tự cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_permissions_updated_at
  BEFORE UPDATE ON esc_user_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- BƯỚC 5: Kiểm tra
SELECT 'esc_user_permissions created successfully' AS status;
SELECT COUNT(*) AS row_count FROM esc_user_permissions;
