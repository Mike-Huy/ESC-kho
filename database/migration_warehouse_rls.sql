-- =============================================================
-- ESC-kho WMS — Migration: Kích hoạt RLS cho Kho & Vị Trí
-- Chạy trong Supabase để kích hoạt bảo mật cấp dòng
-- =============================================================

-- BƯỚC 1: Kích hoạt Row Level Security (RLS) cho esc_warehouse và esc_wh_location
ALTER TABLE public.esc_warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esc_wh_location ENABLE ROW LEVEL SECURITY;

-- BƯỚC 2: Thêm chính sách xóa (DELETE) cho esc_warehouse
-- Cho phép super admin hoặc user có quyền truy cập website_id thực hiện xóa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'esc_warehouse' 
      AND policyname = 'warehouse_delete'
  ) THEN
    CREATE POLICY warehouse_delete ON public.esc_warehouse FOR DELETE
      USING (app.is_super_admin() OR app.can_access_website_array(website_id));
  END IF;
END $$;

-- BƯỚC 3: Thêm chính sách xóa (DELETE) cho esc_wh_location
-- Cho phép super admin hoặc user có quyền truy cập website_id thực hiện xóa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'esc_wh_location' 
      AND policyname = 'wh_location_delete'
  ) THEN
    CREATE POLICY wh_location_delete ON public.esc_wh_location FOR DELETE
      USING (app.is_super_admin() OR app.can_access_website_array(website_id));
  END IF;
END $$;

-- BƯỚC 4: Xác nhận hoàn tất
SELECT 'Kích hoạt RLS cho esc_warehouse và esc_wh_location thành công!' AS status;
