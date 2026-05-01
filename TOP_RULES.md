# DỰ ÁN KHO ESC WMS - QUY TẮC TỐI CAO (TOP RULES)

Tệp này chứa các quy định bắt buộc mà AI Assistant (Antigravity) phải đọc và tuân thủ tuyệt đối trong mọi yêu cầu xử lý code cho dự án này.

## 1. Cấu hình Hệ thống (System Configuration)
- **Localhost Port**: Luôn sử dụng port `3001` cho môi trường phát triển (đã cấu hình trong `vite.config.ts`).
- **Supabase**: Kết nối với dự án `zrjwslcxbfefzjlgctci.supabase.co`. Mọi thay đổi về database phải đồng bộ với schema của dự án này.
- **Vercel**: Khi deploy, phải đảm bảo các biến môi trường (Environment Variables) như `GEMINI_API_KEY` được thiết lập.
- **Ngôn ngữ**: Khi trao đổi trong Anti Gravity, lúc bạn xử lý, suy luận, .... thì có thể dùng tiếng Anh, nhưng khi thông báo kết quả thực hiện thì phải dùng tiếng Việt
- **Tên trường dữ liệu**: Các tên gọi các trường trong code phải tuân thủ theo tên đã tạo trong supabase chứ không nên tạo thêm trường tên khác (ví dụ : supabase đã có cột "qty" thì không được tạo thêm cột "quantity" hay các code phải dùng "qty")
- **website_id**: luôn là dữ liệu mảng để có thể cấu hình nhiều website dùng chung dữ liệu, nhập website_id của website nào muốn truy cập bảng đó
- **super admin**: Account superadmin phải được mở full quyền xử lý website và database

## 2. Giao diện & Trải nghiệm người dùng (UI/UX)
- **Logo**: Luôn sử dụng file `/ESC__logo-01.jpg` làm logo chính thức và icon trình duyệt.
- **Thẩm mỹ**: Ưu tiên thiết kế hiện đại, premium, sử dụng CSS/Tailwind sạch sẽ, micro-animations mượt mà.
- **Ngôn ngữ**: Toàn bộ giao diện người dùng phải sử dụng **Tiếng Việt**
- **Định dạng ngày**: Ở giao diện thể hiện trên màn hình front-end và back-end luôn là định dạng dd/mm/yyyy, nhưng trong template excel để import vào hệ thống thì sẽ là trường text ddmmyyyy, phần code sẽ tự nhận diện đúng ngày, tháng, năm
- **Định dạng giờ**: Áp dụng múi giờ Việt Nam (GMT+7) cho toàn website và các tool back-end theo định dạng hh:mm:ss 
 

## 3. Bảo mật & Xác thực (Security & Auth)
- **Đăng nhập**: Mọi phiên làm việc phải thông qua màn hình Login xác thực số điện thoại và mật khẩu từ bảng `users`.
- **Phân quyền**: Tuân thủ nghiêm ngặt bảng `staff_profiles` (is_super_admin hoặc allowed_module) để hiển thị/ẩn các chức năng tương ứng.
- **Thông tin nhạy cảm**: Tuyệt đối không đẩy các mã khóa API (như Gemini key) trực tiếp lên GitHub (để trong `.env.local`).

## 4. Quản lý Code & GitHub
- **GitHub Desktop**: Hỗ trợ người dùng push code thông qua GitHub Desktop. 
- **Gitignore**: Luôn giữ `.env.local` và `node_modules` trong file `.gitignore`.

## 5. Quản lý sản phẩm (có thể viết tắt SP hay sp)
- **Thông tin sản phẩm**: luôn lấy data từ bảng 'product' trong supabase và trường product_code là khóa chính để đối chiếu mọi thông tin khác của sản phẩm
- **Hình ảnh sản phẩm**: luôn lấy ảnh từ bucket của supabase, admmin có thể duyệt ảnh từ trong giao diện web, size tự co giãn để luôn thể hiện theo 1 chuẩn chung của toàn website
- 

## 6. Đơn hàng mua (PO) 
- **Mã đơn hàng**: dù đang ở giao diện nào, menu nào, khi bấm vào mã đơn sẽ mở ra trang chi tiết PO
-

---
*Ghi chú cho AI: Bạn phải luôn kiểm tra tệp này trước khi thực hiện bất kỳ thay đổi nào để đảm bảo tính nhất quán của toàn bộ dự án.*
