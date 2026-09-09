# D-K66 — UPGRADE V1: CỔNG ĐOÀN VIÊN & QUẢN TRỊ HOẠT ĐỘNG

## Mục tiêu
Biến website từ một website thông tin + Dashboard thành một nền tảng vận hành Chi đoàn có dữ liệu liên thông.

## Tài sản mới
1. Tài khoản đoàn viên riêng, tách khỏi BCH/Admin.
2. Cổng đoàn viên `/portal` tối ưu mobile.
3. Cơ chế cấp tài khoản hàng loạt từ Dashboard.
4. Email chuẩn hóa `hovaten@dk66.vn`.
5. Mật khẩu khởi tạo `hovaten + năm sinh`, chỉ dùng tạm.
6. Bắt buộc đổi mật khẩu ở lần đăng nhập đầu.
7. Đăng ký hoạt động.
8. Điểm danh theo từng hoạt động.
9. Điểm hoạt động theo từng đoàn viên.
10. Lịch sử tham gia trên hồ sơ cá nhân.
11. Hộp phản ánh/góp ý.
12. Chế độ phản ánh ẩn danh.
13. Quy trình trạng thái phản ánh: Mới → Đang xử lý → Đã xử lý → Đã lưu.
14. Xuất Excel bảng điểm danh.
15. RLS và lớp server kiểm tra quyền BCH cho các phân hệ nhạy cảm.
16. Trang chủ lấy thống kê thành viên bằng RPC tổng hợp thay vì đọc danh sách hồ sơ.

## Luồng dữ liệu

Đoàn viên
  ↓
Tài khoản Supabase Auth
  ↓
member_accounts
  ↓
Hồ sơ members
  ↓
Đăng ký activity_registrations
  ↓
Điểm danh activity_attendance
  ↓
Điểm hoạt động activity_points
  ↓
Lịch sử trên /portal

Góp ý
  ↓
feedback
  ↓
Dashboard BCH
  ↓
Mới / Đang xử lý / Đã xử lý / Đã lưu

## Bảo mật
- Không lưu mật khẩu dạng plaintext trong database.
- Mật khẩu tạm chỉ được tạo lúc cấp/reset và trả về cho BCH trong phiên thao tác.
- Không cho đoàn viên truy cập Dashboard.
- API quản trị yêu cầu access token hợp lệ + staff_accounts.
- API cấp tài khoản sử dụng Supabase server key chỉ ở server.
- Đoàn viên chỉ đọc/sửa dữ liệu thuộc chính mình theo RLS.
- Góp ý ẩn danh không gắn member_id.

## Quy tắc chuẩn hóa tài khoản
Tên:
`Đinh Anh Bảo`
→ `dinhanhbao`

Email:
`dinhanhbao@dk66.vn`

Mật khẩu tạm:
`dinhanhbao2010`

Không lưu mật khẩu tạm vào bảng `member_accounts`.

## Phân vai
- `admin`: toàn quyền vận hành.
- `bch`: quản lý nghiệp vụ Chi đoàn.
- `editor`: vai trò mở rộng cho các phân hệ nội dung, có thể siết thêm permission ở phiên bản sau.
- `member`: đoàn viên, không nằm trong staff_accounts.

## Bước triển khai bắt buộc
1. Chạy migration `20260906000000_member_portal_foundation.sql`.
2. Thêm tài khoản quản trị hiện tại vào `staff_accounts` bằng `supabase/SETUP_BCH_ADMIN.sql`.
3. Kiểm tra `/admin`.
4. Kiểm tra `/dashboard`.
5. Kiểm tra `/dashboard/accounts`.
6. Chọn một đoàn viên có `birth_year` để cấp tài khoản thử nghiệm.
7. Đăng nhập `/portal`.
8. Đổi mật khẩu.
9. Đăng ký hoạt động.
10. BCH điểm danh và nhập điểm.
11. Kiểm tra lịch sử trên portal.
12. Gửi một phản ánh thường và một phản ánh ẩn danh.
