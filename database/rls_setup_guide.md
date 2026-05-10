# Hướng dẫn tích hợp RLS vào Frontend

## Tại sao cần bước này?

Supabase RLS policies dùng hàm `app.current_user_id()` để biết user nào đang thao tác.
Vì dự án này dùng **custom auth** (không phải Supabase Auth), app phải tự báo cho DB
biết user_id sau khi login bằng cách gọi `set_config`.

---

## Thay đổi cần thực hiện trong `LoginPopup.tsx`

Sau khi xác thực thành công (sau dòng `localStorage.setItem`), thêm đoạn sau:

```typescript
// Báo cho DB biết user hiện tại (cần cho RLS policies)
await supabase.rpc('set_app_user', { uid: user.id });
```

### Tạo hàm `set_app_user` trong Supabase (chạy 1 lần trong SQL Editor):

```sql
CREATE OR REPLACE FUNCTION set_app_user(uid BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', uid::TEXT, false);
  -- false = áp dụng cho toàn bộ connection (không chỉ transaction hiện tại)
END;
$$;

GRANT EXECUTE ON FUNCTION set_app_user(BIGINT) TO anon, authenticated;
```

---

## Lưu ý quan trọng về Supabase connection pooling

Supabase dùng connection pool (PgBouncer). `set_config` với `is_local=false`
chỉ tồn tại trong 1 connection session. Khi connection bị pool tái sử dụng,
config bị reset.

**Giải pháp thực tế cho production:**

Tạo một wrapper trong `supabaseClient.ts` để tự động gọi `set_app_user`
trước mỗi request quan trọng, hoặc dùng Supabase **Row Level Security
với service_role key trên backend** và chỉ expose API qua Edge Functions.

---

## Kiến trúc bảo mật theo tầng (Defense in Depth)

```
[Client]
   │  anon key (public) — chỉ đọc được dữ liệu qua RLS
   │
   ▼
[Supabase RLS]
   │  Kiểm tra app.current_user_id() + website_id
   │  Chặn cross-site data leakage
   │
   ▼
[Database]
   │  GRANT/REVOKE ở tầng table
   │  Không có DELETE trực tiếp cho nghiệp vụ chính
```

---

## Tóm tắt ma trận phân quyền

| Nhóm bảng          | SELECT | INSERT | UPDATE | DELETE |
|--------------------|--------|--------|--------|--------|
| esc_users          | ✅ bản thân / cùng site | ❌ chỉ super_admin | ✅ bản thân / super_admin | ❌ |
| esc_staff_profiles | ✅ cùng site | ❌ chỉ super_admin | ❌ chỉ super_admin | ❌ |
| esc_hr_attendance  | ✅ bản thân / cùng site | ✅ bản thân / cùng site | ✅ bản thân / cùng site | ❌ |
| esc_product        | ✅ cùng site | ✅ cùng site | ✅ cùng site | ❌ (dùng status=inactive) |
| esc_po / esc_so    | ✅ cùng site | ✅ cùng site | ✅ cùng site | ❌ (dùng status=cancelled) |
| esc_po_items       | ✅ qua PO | ✅ qua PO | ✅ qua PO | ✅ chỉ khi PO=draft |
| esc_so_items       | ✅ qua SO | ✅ qua SO | ✅ qua SO | ✅ chỉ khi SO=new/confirmed |
| esc_stock_movement | ✅ cùng site | ✅ cùng site | ❌ bất biến | ❌ bất biến |
| esc_cost_entries   | ✅ cùng site | ✅ cùng site | ❌ chỉ super_admin | ❌ |
| esc_notifications  | ✅ bản thân | ✅ cùng site | ✅ bản thân | ✅ bản thân |
