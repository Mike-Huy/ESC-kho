# ROL-CONFIG — Hệ thống Phân quyền ESC WMS

> Tài liệu tham chiếu kỹ thuật cho hệ thống 3 lớp phân quyền.  
> Dùng khi debug, mở rộng, hoặc giải thích cho thành viên mới.

---

## 1. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                    NGUỒN QUYỀN (theo ưu tiên)                   │
├──────────┬──────────────────────────────────┬───────────────────┤
│ Ưu tiên  │ Nguồn                            │ Bảng DB           │
├──────────┼──────────────────────────────────┼───────────────────┤
│    0     │ Super Admin (is_super_admin=true) │ esc_users         │
│    1     │ Quyền riêng trực tiếp cho USER   │ esc_user_permissions│
│    2     │ Role được gán cho USER            │ esc_erp_role_permissions│
│ fallback │ Cache allowed_modules             │ esc_staff_profiles│
└──────────┴──────────────────────────────────┴───────────────────┘
```

**Quy tắc nền tảng:**
- Ưu tiên cao hơn → override hoàn toàn ưu tiên thấp hơn
- Khi user có `esc_user_permissions` → Role bị bỏ qua hoàn toàn
- Khi gán Role mới cho user → `esc_user_permissions` bị xóa sạch
- Super Admin không đi qua bất kỳ bảng quyền nào

---

## 2. Các bảng DB liên quan

### `esc_erp_roles` — Danh sách Role
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | BIGSERIAL | PK |
| name | VARCHAR(50) | Tên hệ thống: `staff`, `leader`, `admin`... |
| label | VARCHAR(100) | Tên hiển thị: `Nhân viên`, `Trưởng nhóm`... |
| color | VARCHAR(20) | Màu hex badge UI |
| level | INTEGER | Cấp độ (1=thấp → 5=cao) |
| website_id | INTEGER[] | Multi-site |

### `esc_erp_role_permissions` — Quyền của Role
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| role_id | BIGINT | FK → esc_erp_roles |
| module | VARCHAR(50) | Tên phân hệ |
| can_read | BOOLEAN | Xem |
| can_add | BOOLEAN | Thêm mới |
| can_edit | BOOLEAN | Sửa |
| can_delete | BOOLEAN | Xóa |
| UNIQUE | (role_id, module) | Mỗi role × module = 1 dòng |

### `esc_staff_profiles` — Hồ sơ nhân viên
| Cột liên quan | Kiểu | Mô tả |
|---------------|------|-------|
| erp_role_id | BIGINT | FK → esc_erp_roles. NULL = dùng quyền riêng |
| allowed_modules | TEXT[] | Cache module được phép vào (dùng cho sidebar) |

### `esc_user_permissions` — Quyền riêng của User ⭐ MỚI
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| user_id | BIGINT | FK → esc_users |
| module | VARCHAR(50) | Tên phân hệ |
| can_read | BOOLEAN | Xem |
| can_add | BOOLEAN | Thêm mới |
| can_edit | BOOLEAN | Sửa |
| can_delete | BOOLEAN | Xóa |
| website_id | INTEGER[] | Multi-site |
| UNIQUE | (user_id, module) | Mỗi user × module = 1 dòng |

---

## 3. Danh sách Module

| module id | Tên hiển thị |
|-----------|-------------|
| `inbound` | 1. Đơn nhập |
| `orders` | 2. Xử lý đơn |
| `outbound` | 3. Đơn xuất |
| `inventory` | 4. Kho hàng (+ 8. Danh mục) |
| `reports` | 5. Báo cáo |
| `operation` | 6. Vận hành |
| `hr` | 7. Nhân sự |
| `finance` | 8. Tài chính |
| `settings` | 9. Cài đặt |

---

## 4. Ma trận 5 Role mặc định

| Module | customer | staff | leader | admin | super_admin |
|--------|:---:|:---:|:---:|:---:|:---:|
| inbound | ✗ | CRUD* | CRUD* | CRUD | CRUD |
| orders | R | CRUD* | CRUD* | CRUD | CRUD |
| outbound | ✗ | CRUD* | CRUD* | CRUD | CRUD |
| inventory | ✗ | R | CRUD* | CRUD | CRUD |
| reports | ✗ | ✗ | R | CRU | CRUD |
| operation | ✗ | CA | CRUD* | CRUD | CRUD |
| hr | ✗ | ✗ | R | CRU | CRUD |
| finance | ✗ | ✗ | ✗ | CRU | CRUD |
| **settings** | ✗ | ✗ | ✗ | CRU | CRUD |

> `CRUD*` = Create + Read + Update, không Delete  
> `CRU` = Create + Read + Update  
> `R` = Read only  
> `CA` = Create + Add (không Edit, Delete)

---

## 5. Flow xử lý trong code

### 5a. Khi Login (`components/LoginPopup.tsx`)

```
Login thành công
  │
  ├─ is_super_admin = true?
  │   └─ YES → allowedModules = [tất cả 8 module], roleName = 'super_admin'
  │
  ├─ Có bản ghi trong esc_user_permissions?
  │   └─ YES → allowedModules = modules có can_read=true, roleName = 'custom_permissions'
  │
  ├─ Có erp_role_id trong staff_profiles?
  │   └─ YES → query esc_erp_role_permissions, allowedModules = modules có can_read=true
  │
  └─ Fallback → allowedModules từ staff_profiles.allowed_modules (cache)

→ Lưu vào localStorage: { allowedModules, roleLabel, roleName, roleColor }
→ Sidebar dùng allowedModules để ẩn/hiện menu
```

### 5b. Tab 1 — Cài ROLE (`RoleManagement.tsx` → `saveRolePermissions`)

```
Admin chọn Role → bật/tắt ô quyền → Lưu
  │
  ├─ Batch upsert esc_erp_role_permissions (8 dòng)
  │   ON CONFLICT (role_id, module) → UPDATE
  │
  └─ Tự động UPDATE allowed_modules trong esc_staff_profiles
      cho tất cả user đang dùng Role này
      (bỏ qua user có quyền riêng — has_direct_perms=true)
```

### 5c. Tab 2 — Gán ROLE cho USER (`RoleManagement.tsx` → `assignRole`)

```
Chọn User → chọn Role từ dropdown → tự động lưu
  │
  ├─ UPDATE esc_staff_profiles SET erp_role_id = roleId
  │
  ├─ DELETE esc_user_permissions WHERE user_id = userId
  │   (xóa quyền riêng → Role có hiệu lực)
  │
  └─ UPDATE esc_staff_profiles SET allowed_modules = [modules của Role]
```

> Chọn `-- Gỡ Role (giữ quyền riêng) --` → chỉ set `erp_role_id = null`,  
> không xóa `esc_user_permissions` → quyền riêng vẫn còn hiệu lực.

### 5d. Tab 3 — Gán QUYỀN riêng cho USER (`RoleManagement.tsx` → `saveUserPermissions`)

```
Chọn User → bật/tắt ô quyền → Lưu
  │
  ├─ DELETE esc_user_permissions WHERE user_id = userId (xóa cũ)
  ├─ INSERT esc_user_permissions (8 dòng mới)
  │
  ├─ UPDATE esc_staff_profiles SET erp_role_id = null
  │   (gỡ Role — quyền riêng override hoàn toàn)
  │
  └─ UPDATE esc_staff_profiles SET allowed_modules = [modules có can_read=true]
      (cập nhật cache sidebar)
```

---

## 6. Các file cần chạy SQL (thứ tự)

| Thứ tự | File | Mục đích | Chạy lại được? |
|--------|------|----------|----------------|
| 1 | `database/schema.sql` | Tạo 26 bảng cơ bản | Không (IF NOT EXISTS) |
| 2 | `database/migration_user_permissions.sql` | Tạo bảng `esc_user_permissions` + RLS | Có (idempotent) |
| 3 | `database/seed_superadmin.sql` | Tạo 2 tài khoản Super Admin | 1 lần |
| 4 | `database/seed_roles.sql` | Seed 5 role mặc định + permissions | Có (xóa rồi tạo lại) |
| 5 | `database/rls_policies.sql` | Bật RLS toàn bộ 26 bảng | Có (CREATE OR REPLACE) |
| 6 | `database/populate_inventory.sql` | Tính tồn kho từ PO/SO thực tế | Có (upsert) |

---

## 7. Checklist kiểm tra sau khi deploy

- [ ] Chạy `migration_user_permissions.sql` — bảng `esc_user_permissions` tồn tại
- [ ] Login Super Admin → vào được tất cả menu
- [ ] Login user có Role `staff` → chỉ thấy menu: Đơn nhập, Xử lý đơn, Đơn xuất, Vận hành
- [ ] Vào Tab 1, thay đổi quyền Role `staff` → Lưu → Login lại user staff → menu thay đổi đúng
- [ ] Vào Tab 2, gán Role mới cho user → Login lại → sidebar theo Role mới
- [ ] Vào Tab 3, gán quyền riêng cho user → Tab 2 hiện badge "Quyền riêng (override Role)" → Login lại → sidebar theo quyền riêng
- [ ] Vào Tab 2, gán lại Role cho user vừa có quyền riêng → `esc_user_permissions` bị xóa → Login lại → sidebar theo Role

---

## 8. Lưu ý quan trọng cho MI (Frontend)

### 8a. Đọc quyền trong component

Sau khi login, quyền được lưu trong `localStorage['wms_user']`:

```ts
const userData = JSON.parse(localStorage.getItem('wms_user') || '{}');
const allowedModules: string[] = userData.allowedModules || [];
const isSuperAdmin: boolean    = userData.isSuperAdmin || false;

// Kiểm tra quyền xem module
const canViewInbound = isSuperAdmin || allowedModules.includes('inbound');
```

### 8b. Sidebar ẩn/hiện menu

Sidebar dùng `allowedModules` để ẩn các nhóm menu. Khi thêm menu mới, cần thêm mapping vào `moduleMapping` trong `Layout.tsx`.

### 8c. Nút Thêm / Sửa / Xóa trong trang

Hiện tại `allowedModules` chỉ lưu danh sách module được xem. **Nếu muốn kiểm tra can_add / can_edit / can_delete trong UI**, cần lưu thêm object permissions đầy đủ vào localStorage lúc login. Đây là việc cần làm tiếp theo nếu MIKE yêu cầu.

### 8d. Badge trạng thái quyền trong Tab 2

- Badge **xanh** (màu Role): User đang dùng Role
- Badge **hồng** `Quyền riêng (override Role)`: User có `esc_user_permissions`, Role bị bỏ qua
- Badge **xám** `Chưa gán`: Cả hai đều trống → user không vào được module nào

### 8e. Trạng thái `has_direct_perms`

Field này được tính ở frontend lúc load (`fetchData`) bằng cách query tất cả `user_id` có trong `esc_user_permissions`. Nếu cần sync realtime thì cần thêm Supabase Realtime subscription.

---

## 9. Điều kiện edge case đã xử lý

| Tình huống | Hành vi |
|-----------|---------|
| User có `user_permissions` nhưng tất cả `can_read=false` | `allowedModules=[]`, roleName='custom_permissions', sidebar trống (đúng chủ đích) |
| Gán Role mới cho user đang có quyền riêng | Quyền riêng bị xóa, Role có hiệu lực |
| Gỡ Role (chọn `--`) cho user có quyền riêng | `erp_role_id=null`, quyền riêng vẫn còn |
| Gỡ Role cho user không có quyền riêng | `erp_role_id=null`, `allowedModules=[]` — user mất quyền vào hệ thống |
| Lưu quyền Role → các user cùng Role nhưng có quyền riêng | Không bị ảnh hưởng (`has_direct_perms` filter) |
| Super Admin | Bypass tất cả, không query bảng quyền |

---

*File này được tạo bởi KA — 2026-05-10*
