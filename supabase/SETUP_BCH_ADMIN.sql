-- D-K66: KÍCH HOẠT QUYỀN BCH CHO TÀI KHOẢN ADMIN HIỆN TẠI
--
-- 1) Đăng nhập Supabase Dashboard -> SQL Editor.
-- 2) Thay EMAIL_BCH bằng đúng email của tài khoản đang dùng tại /admin.
-- 3) Chạy câu lệnh này SAU KHI migration member portal được áp dụng.

insert into public.staff_accounts (
  auth_user_id,
  role,
  display_name,
  is_active
)
select
  id,
  'admin',
  coalesce(raw_user_meta_data->>'full_name', email),
  true
from auth.users
where email = 'EMAIL_BCH'
on conflict (auth_user_id)
do update set
  role = 'admin',
  is_active = true,
  display_name = excluded.display_name;

-- Kiểm tra:
select
  s.auth_user_id,
  u.email,
  s.role,
  s.is_active
from public.staff_accounts s
join auth.users u on u.id = s.auth_user_id
where u.email = 'EMAIL_BCH';
