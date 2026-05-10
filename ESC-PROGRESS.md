# TIẾN ĐỘ DỰ ÁN KHO ESC WMS (ESC-PROGRESS.md)

====== KA - START ======

## [2026-05-10] — Kết nối Supabase database mới + chuẩn hóa config

### Files đã sửa:
**1. `supabaseClient.ts`**
- Chuyển URL và key từ hardcode → `import.meta.env` (VITE_SUPABASE_URL, VITE_SUPABASE_KEY)
- Kết nối database mới: `jhebreoxwuimlqwvjdok.supabase.co`
- Thêm helper `TABLE(name)` → tự động thêm tiền tố `esc_` cho tên bảng
  - Dùng: `supabase.from(TABLE('users'))` → query bảng `esc_users`

**2. `.env.local`**
- Thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_KEY` (không đẩy lên GitHub)

**3. `vite.config.ts`**
- Sửa port `3000` → `3001` theo TOP_RULES

**4. `appConfig.ts`**
- Thêm `TABLE_PREFIX: 'esc_'` để tham chiếu khi cần

### Lưu ý quan trọng cho MI:
- Không cần thay đổi giao diện gì
- Khi MI dùng Supabase query, nhớ dùng `TABLE('tên_bảng')` từ `supabaseClient.ts` thay vì gõ trực tiếp tên bảng
- Dev server giờ chạy ở `http://localhost:3001`

====== KA - END ======

====== KA - START ======

## [2026-05-10] — Kiểm tra & migrate Super Admin → esc_users

### Kết quả kiểm tra DB:
- Bảng `users` (cũ, không tiền tố): **tồn tại**, có 8 tài khoản, cấu trúc khác (`nickname`, `password`, không có `is_super_admin`)
- Bảng `esc_users`: **đã tạo, đang rỗng** → cần chạy seed

### File tạo mới: `database/seed_superadmin.sql`
- Insert 2 tài khoản super admin vào `esc_users` + `esc_staff_profiles`
- **Tài khoản 1:** SĐT `0901000001` / pass `Admin@ESC2026` / tên `Michael`
- **Tài khoản 2:** SĐT `0901000002` / pass `Backup@ESC2026` / tên `Admin ESC`
- Cả 2 đều có `is_super_admin = TRUE`, `website_id = [9]`, full `allowed_modules`

### Files đã sửa:
**1. `components/LoginPopup.tsx`**
- Fix lỗi typo: `staffProfile?.allowed_module` → `staffProfile?.allowed_modules` (đúng tên cột schema)

**2. `pages/StaffAdmin.tsx`**
- Fix query sai bảng: `'staff'` → `TABLE('users')` (= `esc_users`)
- Thêm import `TABLE`, `APP_CONFIG`
- Join `esc_staff_profiles` + `esc_hr_departments` để lấy tên phòng ban + chức vụ
- Filter theo `website_id` và `user_type = 'staff'`

### Lưu ý quan trọng cho MI:
- `StaffAdmin.tsx` hiện trả `status: 'off'`, `in/out: '--'` vì chấm công thực tế cần join thêm `esc_hr_attendance` — KA sẽ xử lý khi có yêu cầu cụ thể
- Không cần thay đổi UI của StaffAdmin.tsx

====== KA - END ======

====== KA - START ======

## [2026-05-10] — Thiết kế toàn bộ Database Schema

### File tạo mới: `database/schema.sql`
26 bảng, chia 12 nhóm:

| Nhóm | Bảng |
|---|---|
| Users & Phân quyền | `esc_users`, `esc_staff_profiles`, `esc_hr_departments`, `esc_erp_roles`, `esc_erp_role_permissions` |
| Nhân sự | `esc_hr_attendance`, `esc_hr_transactions`, `esc_hr_shifts` |
| Kho hàng | `esc_warehouse`, `esc_wh_location` |
| Sản phẩm | `esc_product`, `esc_serial_tracking`, `esc_inventory`, `esc_stock_movement` |
| Nhà cung cấp | `esc_supplier` |
| Khách hàng | `esc_customer` |
| Đơn nhập (PO) | `esc_po`, `esc_po_items`, `esc_po_payments` |
| Đơn bán (SO) | `esc_so`, `esc_so_items`, `esc_so_payments` |
| Vận hành kho | `esc_stock_audit`, `esc_stock_audit_items`, `esc_stock_transfer`, `esc_stock_transfer_items` |
| Tài chính | `esc_cost_entries`, `esc_monthly_summary` |
| Thông báo | `esc_notifications` |

### Logic quan trọng:
- `website_id INTEGER[]` ở **mọi bảng** — multi-site support
- Tên trường đồng bộ 100% với code đang chạy (po_code, so_code, product_code, qty...)
- `esc_inventory`: snapshot tồn kho theo ngày → báo cáo XNT
- `esc_stock_movement`: ghi log mọi biến động → audit trail đầy đủ
- `esc_monthly_summary`: cache tổng hợp tháng → dashboard nhanh
- `esc_serial_tracking`: quản lý IMEI/SN từ lúc nhập → bán → trả

### Lưu ý cho MI:
- Bước này không có UI mới
- Khi MI viết Supabase query: đổi tên bảng cũ (`'po'`, `'so'`, `'product'`, ...) → `TABLE('po')`, `TABLE('so')`, `TABLE('product')` để khớp tiền tố `esc_`

====== KA - END ======

====== KA - START ======

## [2026-05-10] — Fix encoding UTF-8 khi import Excel + fix TypeScript errors

### Files đã sửa:

**1. `pages/ProductList.tsx`** — fix hàm `handleFileImport`
- Bỏ `FileReader.readAsText()` (không chỉ định encoding → vỡ tiếng Việt)
- Thay bằng `file.arrayBuffer()` + `TextDecoder` với logic detect encoding tự động:
  - BOM `EF BB BF` → UTF-8
  - BOM `FF FE` → UTF-16 LE
  - Không có BOM → thử UTF-8 strict, nếu lỗi → fallback `windows-1252` (chuẩn Excel Việt Nam)
- Thêm `.replace(/[^0-9.]/g, '')` khi parse số → tránh lỗi dấu phẩy ngàn trong Excel
- Thêm nhận dạng `sn_control`: `'CO'`, `'1'` ngoài `'CÓ'`, `'YES'`, `'TRUE'`
- Thêm nhận dạng status `'NGUNG'` (không dấu) ngoài `'NGỪNG'`

**2. `tsconfig.json`**
- Thêm `"vite/client"` vào `types[]` → fix lỗi `import.meta.env` không nhận kiểu

### Kết quả: 0 TypeScript error

### Lưu ý cho MI:
- Không cần thay đổi UI

====== KA - END ======

====== KA - START ======

## [2026-05-10] — Fix lỗi import đơn nhập PO + fix popup cảnh báo trùng mã

### Files đã sửa:

**1. `pages/InboundNew.tsx`** — fix 2 chỗ dùng sai tên cột
- `po_id` → `po_code` trong `esc_po_items` (cả `confirmImport` lẫn `handleSubmit`)
- Bỏ `.select().single()` + `poData` không cần thiết sau khi dùng `po_code` trực tiếp
- Bỏ `created_at` hardcode trong insert PO — để DB tự set `DEFAULT NOW()`

**2. `pages/ProductList.tsx`** — thêm popup cảnh báo trùng mã SKU trong file
- Thêm state `duplicateWarning`
- Khi parse file: detect mã trùng → dừng lại, hiện popup liệt kê từng mã bị trùng
- User bấm "Đóng & Import lại" → đóng popup, KHÔNG làm gì với DB
- Chỉ khi không có mã trùng → mới mở modal preview bình thường

### Root cause lỗi `po_id`:
Schema `esc_po_items` dùng `po_code VARCHAR` làm FK (không dùng `po_id INTEGER`) — đúng thiết kế để tránh join phức tạp trong WMS. Code cũ từ trước khi có schema mới nên dùng nhầm.

### Lưu ý cho MI:
- Không cần thay đổi UI

====== KA - END ======

====== MI - START ======
### [2026-05-10] — Lược bỏ và điều chỉnh các phần tử giao diện theo yêu cầu của MIKE

#### Files đã sửa:
**1. `components/Layout.tsx`**
- Loại bỏ khung tìm kiếm (`Tìm kiếm đơn hàng, sản phẩm, SKU...`) khỏi phần Header chính để giao diện thanh thoát hơn.

**2. `pages/Dashboard.tsx`**
- Loại bỏ thanh điều hướng Breadcrumb (`Hệ thống WMS / Bảng điều khiển`) trong phần Hero Section.
- Loại bỏ cụm nút hành động (`+ Nhập kho mới` và `Xuất báo cáo`) trong phần Hero Section.
- Dời tiêu đề `Dashboard Kho ESC` lên sát phía trên cùng của phần Hero Section (thay đổi `items-center` thành `items-start pt-6` và chiều cao từ `h-64` thành `h-48`).
- Chuẩn hóa status text thành 1 dòng (sử dụng `md:whitespace-nowrap` và lược bỏ `max-w-2xl`) đồng thời định dạng các con số thông tin (`142` đơn hàng, `12` lô hàng) thành chữ in đậm, kích thước lớn và có màu đỏ sậm (`font-extrabold text-red-800 text-[17px] px-0.5`).

#### Lưu ý quan trọng cho KA:
- Các chỉnh sửa này hoàn toàn là giao diện người dùng (Frontend/UI), không ảnh hưởng đến bất kỳ API hay cấu trúc dữ liệu nào ở phía Back-end. Không cần xử lý logic.

---

### [2026-05-10] — Chuyển đổi 4 Menu con Đơn nhập thành Giao diện Tabs và loại bỏ sub-menus ở Sidebar

#### Files đã sửa/tạo mới:
**1. `pages/InboundManager.tsx` (Tạo mới)**
- Xây dựng component quản lý điều hợp toàn bộ tính năng Đơn nhập.
- Thiết kế thanh Tabs dạng viên thuốc (pill tabs) phong cách tối giản và hiện đại, kèm icon trực quan và hiệu ứng chuyển đổi mượt mà.
- Phân phối nội dung tương ứng khi click chuyển đổi giữa 4 tab: Tạo hàng mới, Danh sách đơn, Hàng trả, Xử lý nội bộ.

**2. `components/Layout.tsx`**
- Loại bỏ danh sách `children` của mục "1. Đơn nhập" tại Sidebar bên trái, chuyển từ dạng accordion sang menu đơn click trực tiếp vào trang quản lý tổng hợp `InboundManager`.

**3. `types.ts`**
- Đăng ký thêm `'grp_inbound'` vào kiểu dữ liệu `PageType` để đảm bảo hệ thống phân quyền và điều hướng hoạt động chuẩn xác 100% trong TypeScript.

**4. `App.tsx`**
- Đăng ký route mới cho `'grp_inbound'` trỏ đến `<InboundManager />`.
- Giữ lại các liên kết trực tiếp như `inbound_new`, `inbound_list` nhưng chuyển tiếp chúng thành component `InboundManager` với tab tương ứng (`initialTab`) được kích hoạt sẵn để đảm bảo tương thích ngược hoàn hảo.
- Định dạng lại nút quay lại trong trang nhận hàng `InboundReceive` hướng về `'grp_inbound'` thay vì `inbound_list` cũ.

**5. `pages/InboundNew.tsx`, `pages/InboundList.tsx`, `pages/InboundReturn.tsx`, `pages/InternalProcess.tsx`**
- Khởi tạo thuộc tính `hideHeader?: boolean` trong Props.
- Khi được tích hợp vào `InboundManager`, các trang này sẽ ẩn tiêu đề và thanh Breadcrumb riêng lẻ để tránh lặp lại giao diện và mang lại trải nghiệm đồng nhất.

**6. `components/LoginPopup.tsx`**
- Import helper `TABLE` và thay đổi các truy vấn Supabase từ `'users'` và `'staff_profiles'` thành `TABLE('users')` và `TABLE('staff_profiles')`.
- Việc này giúp kết nối trực tiếp với bảng mới `esc_users` và `esc_staff_profiles`, cho phép đăng nhập thành công bằng tài khoản Super Admin mới (`0901000001` / `Admin@ESC2026`).

#### Lưu ý quan trọng cho KA:
- **MI** đã chủ động chuyển đổi toàn bộ truy vấn trong `LoginPopup.tsx` sang helper `TABLE(...)` của **KA** để đảm bảo tương thích hoàn toàn với schema database mới có tiền tố `esc_`.
- Đã chạy thành công file SQL seed của **KA** để khởi tạo tài khoản Super Admin thực tế, giúp việc đăng nhập và kiểm thử tabs hoạt động hoàn hảo.

---

### [2026-05-10] — Thêm tính năng "Excel Template" & "Excel Import" tại Khung Danh Sách Hàng Nhập

#### Files đã sửa:
**1. `pages/InboundNew.tsx`**
- Thêm hai nút hành động mới: **Excel Template** (Tải file mẫu dạng CSV/Excel) và **Excel Import** (Nhập hàng loạt sản phẩm) tại góc trên bên phải khung "Danh sách hàng nhập" đúng theo thiết kế khoanh đỏ của **MIKE**.
- Xây dựng logic **tải file mẫu Excel (`mau_nhap_don_nhap.csv`)** bằng client-side Blob có UTF-8 BOM, đảm bảo mở được ngay lập tức trên Excel máy tính mà không bị lỗi font chữ tiếng Việt.
- Hiện thực **trình đọc file khách (Client-side CSV/Excel parser)** tự động phát hiện header tiếng Việt/tiếng Anh, loại bỏ khoảng trắng và trích xuất cặp thông tin `Mã sản phẩm` và `Số lượng`.
- Tích hợp **giao diện đối soát dữ liệu (Validation Preview Modal)** cực kỳ trực quan:
  - Tự động gom mã sản phẩm và thực hiện truy vấn tối ưu (Bulk DB Query) lên bảng `esc_product` bằng helper `TABLE('product')` để kiểm tra độ tồn tại.
  - Phân tích thống kê: hiển thị tổng số dòng, số dòng hợp lệ (thành công) và số dòng lỗi (mã SP không tồn tại trên hệ thống) dưới dạng thẻ báo cáo.
  - Hiển thị bảng đối soát chi tiết: ✅ **Hợp lệ** (gắn kèm tên sản phẩm thực tế từ DB và đơn vị tính) hoặc ❌ **Mã SP không tồn tại** (đánh dấu lỗi chi tiết).
  - Nút **"Đồng ý nhập"** cho phép đổ trực tiếp toàn bộ dòng hợp lệ vào đơn nhập hiện tại và tự động gộp số lượng nếu sản phẩm đã có sẵn trong danh sách.
- Chuẩn hóa toàn bộ các truy vấn Supabase còn lại trong file sang sử dụng helper `TABLE(...)` của **KA** (đối với các bảng `po`, `product`, `po_items`, `serial_tracking`), hoàn tất quá trình đồng bộ schema database.

#### Lưu ý quan trọng cho KA:
- **MI** đã chủ động chuyển đổi 100% Supabase queries trong `InboundNew.tsx` sang dùng helper `TABLE(...)` để tương thích hoàn toàn với schema database có tiền tố `esc_` của **KA**.
- Phần logic đọc và đối soát file Excel được xử lý hoàn toàn trên Frontend (Client-side) thông qua so khớp mã sản phẩm trực tiếp từ DB, đảm bảo tốc độ cực kỳ nhanh chóng và không làm tăng tải cho máy chủ API hay cần viết thêm hàm API Back-end.

---

### [2026-05-10] — Thêm nhóm quản trị Danh mục mới vào Sidebar & Phân quyền Routing

#### Files đã sửa:
**1. `types.ts`**
- Thêm `'supplier_list'` và `'customer_list'` vào kiểu dữ liệu `PageType` để đăng ký các trang quản trị Danh mục mới trong hệ thống TypeScript.

**2. `components/Layout.tsx`**
- Thêm nhóm danh mục quản trị số **`9. Danh mục`** vào Sidebar, chứa 3 mục con: **Sản phẩm** (`product_list`), **Nhà cung cấp** (`supplier_list`), và **Khách hàng** (`customer_list`).
- Di dời mục **Danh mục SP** (`product_list`) từ nhóm **4. Kho hàng** sang nhóm mới này để tập trung quản lý.
- Đổi số thứ tự nhóm cài đặt cũ thành **`10. Cài đặt`**.
- Đăng ký ánh xạ phân quyền (Permission mapping) cho nhóm mới: `'grp_master': 'inventory'` trong `moduleMapping` để tích hợp hoàn hảo với hệ thống phân quyền có sẵn.

**3. `App.tsx`**
- Đăng ký 2 routes mới `'supplier_list'` và `'customer_list'` trả về màn hình tạm `<ComingSoon />` để chờ **KA** tích hợp logic và giao diện thực tế sau.

**4. `pages/ProductList.tsx`**
- Import helper `TABLE` và thay thế toàn bộ các truy vấn trực tiếp từ `'product'` thành `TABLE('product')` (sử dụng `TABLE('product')`) để đồng bộ hoàn toàn với schema database mới.
- Bổ sung cụm nút **Excel Template** và **Excel Import** lên tiêu đề danh sách, kết nối trình đọc CSV, modal thống kê đối soát dữ liệu và lưu trực tiếp `upsert` vào Supabase.

---

### [2026-05-10] — Nâng cấp Toàn bộ tệp Mẫu và Tính năng Nhập liệu sang Định dạng Excel (.xlsx) chính quy

#### Thư viện đã cài đặt:
- **`xlsx` (SheetJS)**: Thư viện cao cấp dùng để sinh và đọc tệp bảng tính Excel nhị phân (`.xlsx` và `.xls`) trực tiếp từ Client-Side.

#### Chi tiết cải tiến trên các trang:
**1. `pages/ProductList.tsx` (Danh mục Sản phẩm)**
- Thay thế việc tải mẫu sản phẩm dạng CSV thành tệp **Excel (.xlsx) chính quy** (`mau_nhap_san_pham.xlsx`), bao gồm đầy đủ dữ liệu mẫu có cấu trúc.
- Cập nhật bộ tiếp nhận tệp (`handleFileImport`) và bộ lọc của thẻ `<input accept="..." />` để tiếp nhận trực tiếp các tệp `.xlsx`, `.xls` và `.csv`. 
- Sử dụng parser nhị phân của SheetJS để chuyển đổi trực tiếp sheet dữ liệu đầu tiên thành cấu trúc dòng sản phẩm thông minh.

**2. `pages/SupplierList.tsx` (Danh mục Nhà cung cấp)**
- Chuyển đổi tính năng **Excel Template** thành sinh tệp **Excel nhị phân thực tế** (`mau_nhap_nha_cung_cap.xlsx`) chứa 15 trường thông tin chi tiết.
- Nâng cấp bộ nạp tệp hỗ trợ định dạng bảng tính Excel giúp kế toán/nhân sự dễ dàng điền dữ liệu trực tiếp trên phần mềm MS Excel mà không sợ lỗi encoding hay vỡ ký tự tiếng Việt có dấu.

**3. `pages/CustomerList.tsx` (Danh mục Khách hàng)**
- Nâng cấp nút tải mẫu thành tệp **Excel nhị phân chuẩn** (`mau_nhap_khach_hang.xlsx`) chứa 14 cột thông tin định hình cấu trúc khách hàng.
- Đồng bộ hóa bộ parser nhập liệu bằng SheetJS để đọc trực tiếp dữ liệu dạng mảng nhị phân từ tệp tin người dùng tải lên, tăng độ tin cậy tuyệt đối.

**4. `pages/InboundNew.tsx` (Tạo Mới Đơn Nhập)**
- Chuyển đổi tệp mẫu đơn nhập chi tiết nâng cao thành **Excel (.xlsx)** (`mau_nhap_don_nhap_chi_tiet.xlsx`).
- Bộ phân tích dữ liệu tự động giải mã workbook nhị phân, bóc tách nhanh thông tin PO Code, Nhà cung cấp và phân tích sâu danh sách sản phẩm cùng mã Serial có dấu `;` trực quan và chính xác 100%.

**5. Tối ưu hóa Chiều cao Dòng Danh sách (Row Padding Reduction)**
- Giảm thiểu khoảng cách đệm (padding) của tất cả các ô trong hàng (`td`) từ `py-4` / `py-2` xuống còn **`py-1`** trên các màn hình:
  - **Danh mục Sản phẩm** (`pages/ProductList.tsx`)
  - **Danh mục Nhà cung cấp** (`pages/SupplierList.tsx`)
  - **Danh mục Khách hàng** (`pages/CustomerList.tsx`)
- Giúp bảng danh sách trở nên cực kỳ gọn gàng, hiển thị được nhiều thông tin hơn trên một trang màn hình, đáp ứng hoàn hảo trải nghiệm thao tác mật độ dữ liệu cao của thủ kho và kế toán.

#### Lưu ý quan trọng cho KA:
- Toàn bộ tệp mẫu và tính năng đọc file đã được chuyển đổi hoàn toàn từ định dạng văn bản thô CSV sang **tệp tin Excel nhị phân (.xlsx, .xls) thực tế** bằng thư viện `xlsx` (SheetJS).
- Tất cả logic xử lý diễn ra trực tiếp ở Client-Side, đảm bảo hiệu năng tối đa và 100% không bị vỡ font chữ tiếng Việt có dấu khi người dùng mở bằng Excel.

---

### [2026-05-10] — Tích hợp cột Ngày vào toàn bộ 4 mẫu Excel và bộ lọc parser tương ứng

#### Files đã sửa:
**1. `pages/ProductList.tsx`**
- Thêm cột `"Ngày tạo (created_at)"` (cột thứ 13) vào Excel mẫu tải về.
- Nâng cấp parser để bóc tách cột Ngày tạo bằng hàm `parseExcelDate` hỗ trợ thông minh tất cả kiểu dữ liệu (Date, số serial Excel, chuỗi ISO, chuỗi DD/MM/YYYY).
- Cập nhật logic `confirmImport` để lưu trực tiếp `created_at` lịch sử vào DB nếu người dùng điền cột này.

**2. `pages/SupplierList.tsx`**
- Thêm cột `"Ngày tạo (created_at)"` (cột thứ 16) vào mẫu Excel nhà cung cấp.
- Tích hợp bộ giải mã ngày và cập nhật payload upsert để ghi nhận ngày tạo chính xác.

**3. `pages/CustomerList.tsx`**
- Thêm cột `"Ngày tạo (created_at)"` (cột thứ 15) vào mẫu Excel khách hàng.
- Tích hợp bộ giải mã ngày và cập nhật payload upsert ghi nhận vào cột `created_at`.

**4. `pages/InboundNew.tsx`**
- Thêm trường `"Ngày đơn nhập (order_date)"` (cột thứ 7) vào mẫu Excel Đơn nhập chi tiết.
- Bổ sung ô nhập liệu Ngày đơn nhập trực quan (`type="date"`) vào khung thông tin bên trái để thủ kho dễ dàng quan sát, chọn hoặc điều chỉnh ngày nhập đơn.
- Khi người dùng tải file Excel lên, parser sẽ tự động bóc tách cột ngày đơn nhập và tự động điền (auto-populate) vào ô Ngày trên giao diện.
- Khi nhấn lưu, đơn nhập PO sẽ được tạo đồng thời với trường `order_date` và `created_at` khớp hoàn toàn với ngày được chọn.

#### Lưu ý quan trọng cho KA:
- Toàn bộ các cột "Ngày" đã được tích hợp thành công trên cả 4 giao diện Excel mẫu và parser tương ứng.
- Logic lưu dữ liệu tương thích hoàn toàn với schema của KA, ghi trực tiếp vào các trường `created_at` (Sản phẩm, Nhà cung cấp, Khách hàng) và `order_date` (Đơn nhập).

---

### [2026-05-10] — Ẩn cột dữ liệu có sẵn (Đơn vị tính) trong mẫu Đơn nhập & Chuẩn hóa định dạng ngày `dd-mm-yyyy`

#### Files đã sửa:
**1. `pages/InboundNew.tsx`**
- **Ẩn cột "Đơn vị tính" (`unit`) khỏi template Excel**: Vì sản phẩm đã được khai báo sẵn Đơn vị tính trong cơ sở dữ liệu `esc_product` liên kết với mã sản phẩm (`product_code`), cột này không cần nhập tay nữa để giảm bớt thao tác cho thủ kho.
- **Cập nhật parser đối soát**: Điều chỉnh chỉ số các cột sau khi loại bỏ cột Đơn vị tính để đảm bảo đọc đúng dữ liệu (Mã PO, Nhà cung cấp, Mã SP, Số lượng, Danh sách Serial, Ngày đơn nhập).
- **Chuẩn hóa định dạng mẫu ngày**: Ngày mẫu trong Excel tải về được chuyển sang định dạng **`dd-mm-yyyy`** trực quan (`10-05-2026`).
- **Nâng cấp parser phân tích ngày**: Hàm giải mã ngày `parseExcelDate` được nâng cấp để hỗ trợ hoàn hảo định dạng ngày `dd-mm-yyyy`, `dd/mm/yyyy`, `dd.mm.yyyy`. Nó tự động quy đổi các ký tự phân tách `-`, `.` thành `/` rồi chuyển đổi sang định dạng thời gian hệ thống chuẩn xác.

**2. `pages/ProductList.tsx`, `pages/SupplierList.tsx`, `pages/CustomerList.tsx`**
- **Chuẩn hóa định dạng mẫu ngày**: Chuyển đổi định dạng ngày mẫu trong file mẫu tải về từ `YYYY-MM-DD` sang định dạng **`dd-mm-yyyy`** (ví dụ: `01-05-2026`, `09-05-2026`).
- **Nâng cấp parser phân tích ngày**: Đồng bộ hàm giải mã ngày tháng thông minh mới để hỗ trợ đầy đủ định dạng ngày nhập tay linh hoạt dạng `dd-mm-yyyy`.

---

### [2026-05-10] — Nâng cấp Excel Import Đơn Nhập: Hỗ trợ tự động phân tách và lưu đồng thời nhiều Đơn hàng khác nhau (Multi-PO Import)

#### Khắc phục lỗi logic:
- **Lỗi cũ**: Khi nhập file Excel chứa nhiều mã PO (`po_code`) khác nhau, logic cũ dồn toàn bộ sản phẩm vào 1 PO duy nhất hiển thị trên màn hình.
- **Giải pháp mới**: 
  - **Tách nhóm thông minh (Group-by-PO)**: Parser tự động đọc cột mã PO (`po_code`), Nhà cung cấp (`supplier_name`), và Ngày nhập (`order_date`) của từng dòng trong file Excel để tự động phân nhóm (group-by) thành các đơn hàng riêng biệt.
  - **Giao diện Preview Trực quan dạng Card**: Modal Preview được thiết kế lại hoàn chỉnh, không còn hiển thị bảng phẳng đơn điệu mà hiển thị dạng danh sách các **Thẻ đơn hàng (PO Cards)**. Mỗi thẻ đại diện cho một đơn nhập thực tế với đầy đủ thông tin mã PO, tên nhà cung cấp, ngày nhập, và danh sách sản phẩm riêng biệt kèm trạng thái đối soát kiểm tra hợp lệ của sản phẩm đó.
  - **Lưu trực tiếp vào Database**: Khi thủ kho bấm nút "Đồng ý nhập", hệ thống sẽ tự động tạo đồng thời nhiều đơn hàng nhập (`esc_inbound_po`), chi tiết đơn nhập (`esc_inbound_detail`), và các bản ghi theo dõi serial (`esc_serial_tracking`) vào cơ sở dữ liệu thay vì dồn vào form tạo tay trên màn hình.

---

### [2026-05-10] — Chuyển đổi các Menu con Đơn xuất thành dạng Tabs & Thêm tab đầu tiên "Danh sách đơn xuất"

#### Các cải tiến và thay đổi:
1. **Tinh chỉnh Sidebar (Thanh điều hướng)**:
   - Gom cụm phân hệ **"3. Đơn xuất" (`grp_outbound`)** từ dạng menu thả xuống (dropdown) thành **một nút duy nhất, trực tiếp** trên thanh sidebar (giống như "1. Đơn nhập"), giảm số lượng menu con để giao diện tinh gọn, thoáng đãng và sang trọng hơn.
2. **Xây dựng `OutboundManager.tsx`**:
   - Thiết kế trình quản lý Tabs cao cấp cho Đơn xuất, tích hợp thanh Tabs hiện đại dạng Pills bo tròn với hiệu ứng chuyển động mượt mà.
   - Gồm **4 Tabs** nội dung:
     1. **"Danh sách đơn xuất"** (Tab đầu tiên - Xem toàn bộ các đơn hàng xuất).
     2. **"Đơn chờ xuất"** (Lọc các đơn hàng mới, đang xử lý `pending` / `processing`).
     3. **"Đơn đã xuất"** (Lọc các đơn hàng hoàn tất `shipped` / `completed`).
     4. **"Đơn hủy"** (Lọc các đơn hàng đã hủy `cancelled`).
3. **Tối ưu hóa `OrderList.tsx` (Tái sử dụng linh hoạt)**:
   - Thêm thuộc tính `statusFilter` để lọc thông minh theo trạng thái đơn hàng (trên cả cơ sở dữ liệu Supabase thực tế và dữ liệu mẫu Fallback) mà không cần nhân bản code.
   - Thêm thuộc tính `hideHeader` để ẩn phần tiêu đề lớn khi hiển thị lồng bên trong tab manager, giúp giao diện đồng bộ và sang trọng nhất.
4. **Cập nhật Router (`App.tsx` & `types.ts`)**:
   - Thêm các PageType mới, import và cấu hình định tuyến cho `OutboundManager`, đảm bảo hệ thống hoạt động chính xác và chuẩn xác 100% về kiểu dữ liệu (TypeScript Type-Safe).

---

### [2026-05-10] — Khắc phục triệt để lỗi truy vấn Cơ sở dữ liệu: Đồng bộ hóa toàn bộ các bảng trong phân hệ Outbound & Báo cáo với tiền tố `esc_`

#### Khắc phục lỗi logic:
- **Nguyên nhân**: Hệ thống sử dụng tiền tố bảng `esc_` trong Supabase (ví dụ: `esc_po`, `esc_so`, `esc_serial_tracking`). Trong khi một số file đã sử dụng helper `TABLE(...)` để tự động thêm tiền tố, nhiều file trong phân hệ xuất hàng (Outbound), quét mã vạch và báo cáo vẫn gọi tên bảng trực tiếp dạng `'so'`, `'serial_tracking'`, `'product'` hay `'inventory'`. Điều này khiến Supabase báo lỗi truy vấn và buộc UI chuyển sang trạng thái rỗng hoặc sử dụng dữ liệu mẫu (mock).
- **Giải pháp**: Đồng bộ hóa toàn bộ các truy vấn sử dụng hàm helper `TABLE(...)` từ `supabaseClient.ts` để tự động ánh xạ đúng các bảng có tiền tố `esc_` trên môi trường Production của dự án `1SS-sharing`.

#### Files đã sửa đổi:
1. **`pages/InboundList.tsx` & `pages/InboundReceive.tsx`**:
   - Chuyển đổi toàn bộ các query sang `TABLE('po')`, `TABLE('po_items')` và `TABLE('serial_tracking')`.
2. **`pages/OrderDetail.tsx`**:
   - Cập nhật hàm gán S/N (`assignSN`) và hủy gán S/N (`unassignSN`) sử dụng `TABLE('serial_tracking')`.
3. **`pages/OrderList.tsx`**:
   - Thay đổi query lấy danh sách SO từ `.from('so')` sang `.from(TABLE('so'))`.
4. **`pages/BarcodeScanner.tsx`**:
   - Thay đổi các query tìm kiếm sang `TABLE('serial_tracking')` và `TABLE('product')`.
5. **`pages/InventoryReport.tsx`**:
   - Đổi query lấy báo cáo tồn kho từ `'inventory'` sang `TABLE('inventory')` và danh sách S/N sang `TABLE('serial_tracking')`.
6. **`pages/InboundReturn.tsx`**:
   - Cập nhật query kiểm tra đơn hàng hoàn trả sang `TABLE('so')`.
7. **`pages/Packing.tsx`**:
   - Thay thế query đóng gói sản phẩm sang `TABLE('so')`.
8. **`pages/Routing.tsx`**:
   - Cập nhật query phân tuyến vận chuyển sang `TABLE('so')`.
9. **`pages/Picking.tsx`**:
   - Đổi query lấy danh sách sản phẩm soạn hàng sang `TABLE('so')`.

---

### [2026-05-10] — Nâng cấp giao diện Đơn hàng (SO) và thêm tính năng Excel Template & Excel Import cho Sales Orders

#### Các cải tiến đã hoàn thành:
1. **Giảm chiều cao các hàng và tinh giản khoảng cách (Row Padding Reduction & Layout Compactness)**:
   - Thay đổi padding của các ô tiêu đề bảng (`th`) từ `px-8 py-6` sang `px-6 py-2` và các ô dữ liệu (`td`) từ `px-8 py-6` sang `px-6 py-1.5`.
   - **Loại bỏ hiển thị Email khách hàng (2 dòng) thành hiển thị 1 dòng duy nhất**: Loại bỏ thẻ chứa email (`{order.email}`) bên dưới tên khách hàng trong bảng, nén chiều cao dòng về mức tối thiểu, mang lại giao diện hiển thị gọn gàng, tăng số dòng hiển thị đồng thời trên một màn hình.
   - Giảm padding của form tìm kiếm / bộ lọc từ `p-4 px-6` sang `p-3 px-6` (với `gap-4`) và lề dưới từ `mb-8` sang `mb-4`.
   - **Tích hợp nút "Tìm kiếm" vào khung tìm kiếm bên trái**: Dời nút "Tìm kiếm" từ góc phải sang bên trái, lồng trực tiếp vào trong ô nhập liệu (sử dụng định vị absolute) giúp tiết kiệm diện tích tối đa và mang lại sự đồng nhất, tinh xảo tuyệt đối.
   - Thu hẹp chiều cao của thanh nhập liệu / dropdown từ `py-3` sang `py-2.5` và kích thước nút xuất file thành dạng `w-10 h-10` vừa vặn và đồng điệu nhất.
   - Giảm lề dưới của khu vực tiêu đề trang từ `mb-12` sang `mb-6`, lề bao ngoài của màn hình từ `p-8` sang `p-6 pt-4`.
2. **Bỏ chữ DEMO (Removed Demo Badge)**:
   - Loại bỏ hoàn toàn nhãn `{isUsingMock && <span ...>Demo</span>}` kế bên tiêu đề "DANH SÁCH ĐƠN HÀNG".
3. **Thêm nút "Excel Template"**:
   - Tích hợp nút hành động tải tệp mẫu Excel `.xlsx` ngay bên cạnh nút "Tạo đơn SO mới".
   - Khi click sẽ sinh và tải về tệp bảng tính Excel nhị phân chuẩn (`mau_nhap_don_ban_so.xlsx`) chứa 8 trường thông tin chi tiết của đơn bán SO có sẵn dữ liệu mẫu.
4. **Thêm nút "Excel Import" và Trình đối soát (Excel Multi-SO Parser & Validation Preview Modal)**:
   - Thêm nút tải file với hộp chọn chấp nhận `.xlsx`, `.xls`, `.csv`.
   - Phân tích cú pháp sheet Excel thông qua SheetJS (`XLSX`), tự động nhận diện và gộp dữ liệu theo mã đơn hàng bán `so_code`.
   - Đối soát tự động (Bulk DB Query) với danh mục sản phẩm của website qua bảng `esc_product` (sử dụng helper `TABLE('product')`).
   - Xây dựng giao diện Modal Preview cực đẹp hiển thị các thông tin tổng kết (Tổng đơn hàng, Đơn hợp lệ, Đơn lỗi) và danh sách chi tiết từng **Thẻ đơn hàng bán (SO Card)**.
   - Nút **"Đồng ý nhập"** cho phép ghi trực tiếp nhiều đơn hàng và danh mục chi tiết sản phẩm vào cơ sở dữ liệu (`esc_so` và `esc_so_items`), hỗ trợ tự động ghi đè/xóa các đơn hàng bán cũ có cùng mã đơn nhập vào quá khứ.

#### Files đã sửa đổi:
- **`pages/OrderList.tsx`**

#### Lưu ý quan trọng cho KA:
- Toàn bộ dữ liệu nhập bán được đối soát khớp mã sản phẩm trực tiếp với DB (bảng `esc_product`) và ghi nhận vào `esc_so` & `esc_so_items`.
- Các hóa đơn có ngày trong quá khứ được truyền chính xác vào trường `order_date`.
- Nếu đơn hàng bán đã tồn tại trên DB, logic frontend sẽ tự động làm sạch các giao dịch liên quan (`esc_stock_movement`, `esc_serial_tracking`) và thực hiện ghi đè để tránh trùng lặp dữ liệu. Không cần thêm API xử lý từ phía Back-end.

---

====== MI - END ======

====== KA - START ======

## [2026-05-10] — Hoàn tất nhóm Báo cáo (3 trang) + nhóm Vận hành (5 trang)

### Files tạo mới:

**1. `pages/InboundReport.tsx`** — Báo cáo Nhập kho
- Query `esc_po` + count `esc_po_items` theo `website_id=9`
- Stats: tổng đơn PO, tổng tiền nhập, đã thanh toán, còn nợ
- Lọc: khoảng ngày `order_date`, trạng thái PO, tìm kiếm mã PO / tên NCC
- Phân trang server-side 15 dòng/trang

**2. `pages/ProcessReport.tsx`** — Báo cáo Xử lý đơn
- Query `esc_so` toàn bộ trạng thái theo `website_id=9`
- Stats đếm theo nhóm: đang xử lý (new+confirmed+processing), đã soạn/đóng gói, đã giao
- Lọc: khoảng ngày `order_date`, trạng thái, tìm kiếm mã SO / tên KH

**3. `pages/OutboundReport.tsx`** — Báo cáo Xuất kho
- Query `esc_so` filter `status IN (shipped, completed, returned)`
- Lọc theo `shipped_date` (ngày giao thực tế)
- Stats: tổng đơn xuất, doanh thu, đã thu, còn công nợ

**4. `pages/OpSplit.tsx`** — Rã hàng chẵn
- Form tạo phiếu → insert `esc_stock_movement` (`movement_type='split'`)
- Dropdown chỉ hiện SP có `unit2 IS NOT NULL` (có đơn vị lớn)
- Hiển thị tỷ lệ quy đổi `unit2_ratio` (1 thùng = N cái)
- Lịch sử 50 bản ghi gần nhất từ `esc_stock_movement`

**5. `pages/OpRepack.tsx`** — Đóng gói lại
- Form tạo phiếu → insert `esc_stock_movement` (`movement_type='repack'`)
- Lịch sử 50 bản ghi gần nhất

**6. `pages/OpAudit.tsx`** — Kiểm kê kho
- Tạo phiên kiểm kê → insert `esc_stock_audit` (auto-gen `audit_code` = `KKyyyymmdd-XXXX`)
- Thêm SP vào phiên → insert `esc_stock_audit_items`
- Cột `diff_qty` là `GENERATED ALWAYS AS (actual_qty - system_qty) STORED` — DB tự tính, không cần truyền
- Cập nhật trạng thái: `draft` → `in_progress` → `completed`
- Layout 2 cột: danh sách phiên trái / chi tiết phải

**7. `pages/OpReplenish.tsx`** — Châm hàng
- Query `esc_inventory WHERE available_qty ≤ threshold` (mặc định 20)
- 2 mức cảnh báo: critical (≤5, màu đỏ) và low (≤threshold, màu vàng)
- Nút "Châm hàng" trên từng dòng → tự điền `product_code` + `to_location` vào form
- Ghi nhận → insert `esc_stock_movement` (`movement_type='adjust'`, `ref_type='REPLENISH'`)
- Ngưỡng cảnh báo chỉnh được real-time

**8. `pages/OpTransfer.tsx`** — Luân chuyển hàng
- Tạo phiếu → insert `esc_stock_transfer` (auto-gen `transfer_code` = `LCyyyymmdd-XXXX`)
- Thêm SP → insert `esc_stock_transfer_items`
- Cập nhật trạng thái: `pending` → `in_transit` → `completed`
- Layout 2 cột: danh sách phiếu trái / chi tiết phải

### Files đã sửa:

**9. `App.tsx`**
- Import 8 trang mới
- Thay `<ComingSoon />` bằng component thực cho tất cả `rpt_*` và `op_*`
- Thêm route `rpt_xnt` → `<InventoryReport />` (BC XNT đã có sẵn)

**10. `types.ts`**
- Thêm `'rpt_xnt'` vào `PageType`

### Lưu ý quan trọng cho MI:
- 8 trang mới dùng cùng pattern layout với các trang cũ (breadcrumb header, stat cards, table `py-1.5`)
- `OpAudit` và `OpTransfer` có layout 2 cột (`xl:col-span-2` / `xl:col-span-3`) — có thể tinh chỉnh responsive
- `OpReplenish`: nút "Châm hàng" trên dòng tự điền form — MI có thể nâng cấp thành slide-in panel
- Màu icon: Báo cáo (emerald/amber/blue), Vận hành (orange/violet/indigo/rose/teal)

====== KA - END ======

====== MI - START ======

### [2026-05-10] — Tinh gọn Sidebar: Di chuyển "Danh sách đơn" từ "2. Xử lý đơn" tích hợp vào "3. Đơn xuất" (Outbound Tabs)

#### Files đã sửa:
**1. `components/Layout.tsx`**
- Loại bỏ tiểu mục "Danh sách đơn" khỏi menu con của **`2. Xử lý đơn`** (`grp_proc`) trên Sidebar để tối ưu hóa không gian hiển thị và giảm trùng lặp.

**2. `App.tsx`**
- Cập nhật định hướng trang (routing): Ánh xạ các key trang cũ như `'orders'` và `'proc_list'` trỏ trực tiếp đến `OutboundManager` (Quản lý Đơn xuất có tab) để đảm bảo không có link hỏng hay lỗi điều hướng.
- Định dạng lại nút "Quay lại" trong trang chi tiết đơn hàng (`OrderDetail`) để quay về màn hình `'grp_outbound'` thay vì `'orders'`.

#### Lưu ý quan trọng cho KA:
- Các chỉnh sửa này chỉ thuần túy liên quan đến phân vùng hiển thị UI/Frontend, không làm thay đổi các quyền hạn module hay logic dữ liệu trong API/DB của KA.

---

### [2026-05-10] — Khắc phục lỗi import đơn hàng bán (SO) do sai lệch cột website_id

#### Files đã sửa:
**1. `pages/OrderList.tsx`**
- Loại bỏ trường `website_id: [APP_CONFIG.WEBSITE_ID]` khi ánh xạ danh sách sản phẩm bán lẻ (`soItems`) trước khi thực hiện câu lệnh chèn dữ liệu (`insert`) vào bảng chi tiết đơn bán `esc_so_items`.

#### Nguyên nhân lỗi:
- Theo đúng thiết kế cấu trúc dữ liệu của KA, bảng chính đơn hàng bán `esc_so` có cột phân loại `website_id` (để hỗ trợ multi-site), nhưng bảng chi tiết `esc_so_items` chỉ tập trung lưu trữ danh mục sản phẩm của đơn đó và không chứa cột `website_id`. Do đó, khi insert kèm `website_id` vào `esc_so_items`, Supabase sẽ báo lỗi không tìm thấy cột trong schema cache.

#### Lưu ý quan trọng cho KA:
- Việc loại bỏ này giúp đồng bộ hoàn toàn Frontend với Database Schema hiện tại của KA. Không yêu cầu xử lý thêm logic Back-end hay cập nhật Database.

====== MI - END ======

====== MI - START ======

### [2026-05-10] — Sửa lỗi không hiển thị Đơn xuất đã import và lỗi xem chi tiết đơn hàng (Order Detail)

#### Files đã sửa:
**1. `pages/OrderList.tsx`**
- Sửa đổi truy vấn `fetchOrders()`: thay đổi tên quan hệ (relationship names) trong câu lệnh join lồng nhau từ dạng cứng `'so_items'` và `'product'` thành định dạng động sử dụng helper `TABLE('so_items')` và `TABLE('product')`.
- Việc này giúp PostgREST/Supabase hiểu đúng các bảng được liên kết có tiền tố là `esc_so_items` và `esc_product` trong database thực tế, khắc phục triệt để lỗi truy vấn thất bại (lỗi không tìm thấy quan hệ trong cache schema) vốn làm ứng dụng âm thầm dùng dữ liệu mẫu (mock data) thay vì hiển thị đơn hàng thật đã import.

**2. `pages/OrderDetail.tsx`**
- Sửa lỗi truy vấn chi tiết đơn hàng: thay thế điều kiện lọc `.eq('so_id', soData.id)` thành `.eq('so_code', orderCode)` khi truy xuất các dòng hàng của đơn bán trong bảng `esc_so_items`.
- Nguyên nhân lỗi: bảng `esc_so_items` của KA thiết kế liên kết trực tiếp với bảng `esc_so` qua khoá ngoại `so_code` (VARCHAR), hoàn toàn không chứa cột `so_id` (INTEGER). Sự sai lệch này gây lỗi crash ngầm khi người dùng bấm xem chi tiết một đơn SO thực tế trên database.

#### Lưu ý quan trọng cho KA:
- Toàn bộ các bảng trong hệ thống của dự án (ví dụ `esc_so`, `esc_so_items`, `esc_product`) đều đang **TẮT** bảo mật Row Level Security (RLS) - thông tin cảnh báo bảo mật cực kỳ quan trọng từ hệ thống Supabase.
- KA hãy kiểm tra và sớm lên phương án kích hoạt RLS cùng các chính sách bảo mật phù hợp cho 45 bảng dữ liệu để tránh rò rỉ hoặc bị thao túng dữ liệu từ phía Client (Anon key).

====== MI - END ======

====== KA - START ======

## [2026-05-10] — Thiết kế RLS (Row Level Security) toàn bộ 26 bảng

### Vấn đề & Phân tích:
App dùng **anon key** + custom auth (không phải Supabase Auth) → không có `auth.uid()`.
Giải pháp: dùng `set_config('app.current_user_id', ...)` + helper functions trong schema `app`.

### Files tạo mới:

**1. `database/rls_policies.sql`** — Script SQL chạy 1 lần trong Supabase SQL Editor
- Tạo 4 helper functions trong schema `app`:
  - `app.current_user_id()` — đọc user_id từ session config
  - `app.is_super_admin()` — kiểm tra super_admin flag trong `esc_users`
  - `app.has_website_access(wid)` — kiểm tra user có quyền truy cập website cụ thể
  - `app.can_access_website_array(arr)` — kiểm tra overlap website_id array
- `ENABLE ROW LEVEL SECURITY` cho toàn bộ 26 bảng
- ~70 policies theo ma trận phân quyền:
  - **esc_users**: đọc bản thân + cùng site; ghi chỉ super_admin
  - **esc_staff_profiles**: đọc cùng site; ghi chỉ super_admin
  - **esc_hr_attendance**: đọc/ghi bản thân + cùng site; không xóa
  - **esc_product, esc_supplier, esc_customer**: đọc/ghi cùng site; không xóa (dùng status=inactive)
  - **esc_po, esc_so**: đọc/ghi cùng site; không xóa (dùng status=cancelled)
  - **esc_po_items, esc_so_items**: xóa được khi đơn còn ở trạng thái draft/new
  - **esc_stock_movement**: chỉ SELECT + INSERT — bất biến sau khi ghi (audit trail)
  - **esc_cost_entries, esc_monthly_summary**: ghi/sửa chỉ super_admin
  - **esc_notifications**: đọc/xóa chỉ bản thân

**2. `database/rls_setup_guide.md`** — Hướng dẫn tích hợp cho MI
- SQL tạo function `set_app_user(uid)` trong Supabase
- Cách gọi `supabase.rpc('set_app_user', { uid })` trong `LoginPopup.tsx` sau login
- Giải thích về connection pooling
- Ma trận phân quyền tóm tắt

### Cách chạy (do MIKE thực hiện):
1. Vào **Supabase Dashboard → SQL Editor**
2. Paste và chạy `database/rls_policies.sql`
3. Chạy thêm đoạn SQL tạo `set_app_user` trong `rls_setup_guide.md`

### Lưu ý quan trọng cho MI:
- Sau khi MIKE chạy RLS script, **tất cả request sẽ bị chặn** cho đến khi `LoginPopup.tsx` gọi `set_app_user`
- MI cần thêm **1 dòng** vào `LoginPopup.tsx`:
  - Vị trí: **sau** `localStorage.setItem('wms_user', JSON.stringify(userData));`
  - **Trước** `onLoginSuccess(userData);`
  - Nội dung: `await supabase.rpc('set_app_user', { uid: user.id });`
  - (Xem chi tiết trong `database/rls_setup_guide.md`)

====== KA - END ======

====== MI - START ======

### [2026-05-10] — Tái cấu trúc thanh Menu Sidebar: Chuyển các chức năng "Xử lý đơn" vào dưới menu "Đơn xuất"

#### Files đã sửa:
**1. `components/Layout.tsx`**
- Loại bỏ hoàn toàn mục menu chính **`2. Xử lý đơn`** (`grp_proc`).
- Chuyển 3 menu con: **`Soạn đơn`** (`proc_pick`), **`Đóng gói`** (`proc_pack`), và **`Xếp tuyến`** (`proc_route`) xuống làm menu con nằm trực tiếp trong mục **`2. Đơn xuất`** (`grp_outbound`).
- Thêm menu con **`Danh sách đơn`** (`grp_outbound`) lên trên cùng của danh sách con thuộc **`2. Đơn xuất`** để dẫn người dùng đến màn hình chính Quản lý đơn xuất (OutboundManager).
- Cập nhật logic tự động mở rộng menu con (`expandedMenu` auto-expand) hỗ trợ mở rộng menu cha khi truy cập trang chính bằng cách kiểm tra: `item.id === activePage`.
- Đánh số lại thứ tự tất cả các menu cha phía sau một cách tuần tự (1 đến 9 thay vì nhảy cóc) để đảm bảo tính mỹ thuật cao và giao diện chuyên nghiệp.

#### Lưu ý quan trọng cho KA:
- Các thay đổi cấu trúc Sidebar này hoàn toàn chạy trên Frontend, không làm ảnh hưởng đến cấu trúc API hay phân quyền Database. Quyền của module `outbound` giờ đây tự động bao quát cả các tiểu mục soạn đơn, đóng gói, xếp tuyến.

====== MI - END ======

====== MI - START ======

### [2026-05-10] — Tích hợp Row Level Security (RLS) sau khi Đăng nhập thành công

#### Files đã sửa:
**1. `components/LoginPopup.tsx`**
- Thêm lời gọi RPC `supabase.rpc('set_app_user', { uid: user.id })` ngay sau khi lưu thông tin người dùng vào `localStorage` và trước khi gọi hàm callback `onLoginSuccess`.
- Việc này giúp truyền tải chính xác thông tin định danh `user_id` hiện tại xuống phiên làm việc (session config) của database, cho phép các hàm kiểm tra bảo mật trong cơ chế Row Level Security (RLS) do KA vừa thiết lập có thể xác định danh tính và quyền hạn của người dùng, từ đó cho phép các API đọc/ghi dữ liệu an toàn.

#### Lưu ý quan trọng cho KA:
- MI đã hoàn tất việc tích hợp RPC đăng ký phiên người dùng (`set_app_user`) đúng vị trí theo yêu cầu. Hãy kiểm tra kết nối và bảo mật trên môi trường chạy thực tế!

====== MI - END ======

====== MI - START ======

### [2026-05-10] — Tối ưu hóa UI/UX Responsive cho 8 trang mới thuộc nhóm Báo cáo và Vận hành

#### Files đã sửa:
**1. `pages/OpAudit.tsx` (Kiểm kê kho)**
- Cải thiện bố cục 2 cột dạng danh sách và chi tiết (`list-detail layout`).
- Trên màn hình di động/tablet (`< xl`), danh sách các phiên kiểm kê sẽ tự động ẩn đi khi người dùng chọn xem chi tiết của một phiên, giúp tối ưu diện tích hiển thị và tập trung sự chú ý.
- Thêm nút **`arrow_back`** (quay lại) mượt mà ở tiêu đề phần chi tiết chỉ hiển thị trên di động để quay trở lại danh sách nhanh chóng.

**2. `pages/OpTransfer.tsx` (Luân chuyển hàng)**
- Áp dụng chuẩn tối ưu hóa UI/UX responsive tương tự như trang Kiểm kê.
- Tự động chuyển đổi giữa chế độ xem danh sách hoặc chi tiết linh hoạt dựa vào việc đã chọn một phiên luân chuyển hay chưa trên màn hình di động, cùng với nút quay lại tiện dụng.

**3. `components/Layout.tsx` (Sidebar Navigation)**
- Cải tiến hàm xử lý sự kiện `onClick` của thanh menu cha chứa các thư mục con (ví dụ: **2. Đơn xuất**, **3. Kho hàng**, **4. Báo cáo**, ...).
- Khi người dùng click chọn mở rộng một mục cha bất kỳ, hệ thống sẽ tự động đồng bộ và chuyển đổi trang hiển thị chính sang mục con đầu tiên của nhóm đó (ví dụ: Click vào **2. Đơn xuất** sẽ tự động mở trang **Danh sách đơn**, ...). Giúp trải nghiệm điều hướng đồng nhất, nhanh chóng và mượt mà hơn.

**4. Đánh giá chung cho 6 trang còn lại:**
- Đã kiểm tra toàn diện và xác nhận: `InboundReport.tsx`, `ProcessReport.tsx`, `OutboundReport.tsx`, `OpSplit.tsx`, `OpRepack.tsx`, và `OpReplenish.tsx` đều có cấu trúc Tailwind CSS đồng bộ, màu sắc hài hòa cao cấp (Emerald cho nhập, Blue cho xuất, Amber cho xử lý, Orange/Teal/Violet cho vận hành), Spacing và Padding nhất quán đúng chuẩn của hệ thống ESC.

#### Lưu ý quan trọng cho KA:
- Toàn bộ 8 trang mới đều hoạt động trơn tru với dữ liệu trực tiếp và không phát sinh bất kỳ lỗi TypeScript nào.

====== MI - END ======


====== KA - START ======

## [2026-05-10] — Hệ thống phân quyền 5 Role + Fix deploy Vercel + Flow đơn xuất

### 1. Hệ thống phân quyền 5 Role chuẩn

**File tạo mới: `database/seed_roles.sql`**
- Seed 5 role vào `esc_erp_roles` (website_id=9):

| Role | Label | Level | Modules |
|------|-------|-------|---------|
| `customer` | Khách hàng | 1 | orders (read only) |
| `staff` | Nhân viên | 2 | inbound, orders, outbound, operation (CRUD trừ delete) |
| `leader` | Trưởng nhóm | 3 | + inventory, reports, hr (read) |
| `admin` | Quản trị | 4 | Full CRUD trừ delete hr/finance |
| `super_admin` | Super Admin | 5 | Toàn quyền tuyệt đối |

- Tự động UPDATE `allowed_modules` trong `esc_staff_profiles` theo role được gán
- Có bước kiểm tra kết quả cuối file

**Files đã sửa:**

**`components/LoginPopup.tsx`**
- Join `erp_role:erp_role_id(name, label, color)` khi fetch staff_profiles
- Lưu `roleLabel`, `roleName`, `roleColor` vào localStorage cùng userData

**`components/Layout.tsx`**
- Thêm `roleLabel?`, `roleName?`, `roleColor?` vào interface `UserData`
- Header hiển thị đúng tên role + màu riêng thay vì hardcode "Nhân viên"

**`pages/RoleManagement.tsx`** — viết lại hoàn toàn:
- Sửa tên bảng đúng schema: `esc_erp_roles`, `esc_erp_role_permissions`, `esc_users`, `esc_staff_profiles`
- Thêm modal **Tạo vai trò mới** (name, label, description, color picker)
- Thêm legend cấp độ 5 role ở sidebar trái
- Tìm kiếm nhân viên real-time
- Hiển thị màu + label role trong danh sách gán nhân viên
- Tự động tạo permission mặc định (toàn false) cho role mới

---

### 2. Fix trang trắng trên Vercel

**Root cause:** `index.html` có `<script type="importmap">` trỏ esm.sh xung đột với Vite bundle + `<link href="/index.css">` không tồn tại trong dist/

**Fix:**
- Xóa `importmap` và link `index.css` khỏi `index.html`
- Tạo `vercel.json`: `outputDirectory: dist`, `rewrites: /* → /index.html`
- Bỏ `dist` khỏi `.gitignore`, push `dist/` thẳng lên GitHub để Vercel serve trực tiếp (không cần build step)

**Lưu ý quan trọng:** Mỗi lần thay đổi code phải:
1. Chạy `npm run build` locally
2. `git add dist/` + commit + push
Vercel sẽ serve file dist/ đã build sẵn, không tự build.

**Biến môi trường cần thêm trên Vercel dashboard:**
- `VITE_SUPABASE_URL` = `https://jhebreoxwuimlqwvjdok.supabase.co`
- `VITE_SUPABASE_KEY` = (xem `.env.local`)

---

### 3. Flow xử lý đơn xuất 4 bước tuần tự

**File sửa: `pages/OrderList.tsx`**

Flow: `new` → `picking` → `packing` → `routing` → `shipped`

| Status DB | Label hiển thị | Màu |
|-----------|----------------|-----|
| `new` | Mới | Blue |
| `picking` | Đang soạn | Amber |
| `packing` | Đang đóng gói | Indigo |
| `routing` | Đang sắp tuyến | Purple |
| `shipped` | Đã bàn giao | Emerald |

- Mỗi đơn chỉ hiện **1 nút duy nhất** = bước tiếp theo (không cho nhảy cóc)
- Khi `shipped`: hiện badge "Hoàn tất", không có nút tiếp
- Badge animate-pulse khi đang xử lý (chưa shipped/cancelled)
- `handleUpdateOrderStatus` cập nhật DB + local state

---

### 4. Tình trạng báo cáo Xuất - Nhập - Tồn

**`pages/InventoryReport.tsx`** — code UI đầy đủ, routing đúng
- Đọc từ bảng `esc_inventory` (snapshot tồn kho theo ngày)
- Nếu DB trống → hiện dữ liệu mẫu Demo (badge "Dữ liệu mẫu")
- **Cần làm tiếp:** Viết SQL populate `esc_inventory` từ data PO/SO thực tế

====== KA - END ======
