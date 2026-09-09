import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const secretKey = process.env.SUPABASE_SECRET_KEY || "";

if (!supabaseUrl) {
  console.error("❌ Không tìm thấy SUPABASE_URL.");
  process.exit(1);
}

if (!secretKey) {
  console.error("❌ Không tìm thấy SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("");
  console.error("❌ Thiếu thông tin.");
  console.error("");
  console.error(
    'Cú pháp: node --env-file=.env.local scripts/reset-auth-password.mjs "EMAIL" "MAT_KHAU_MOI"'
  );
  console.error("");
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error("❌ Mật khẩu phải có ít nhất 8 ký tự.");
  process.exit(1);
}

console.log("");
console.log("🔎 Đang tìm tài khoản:", email);

const { data, error } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (error) {
  console.error("❌ Không thể lấy danh sách user:");
  console.error(error.message);
  process.exit(1);
}

const user = data.users.find(
  (item) => item.email?.toLowerCase() === email.toLowerCase()
);

if (!user) {
  console.error("");
  console.error("❌ Không tìm thấy tài khoản:", email);
  console.error("");
  process.exit(1);
}

console.log("✅ Tìm thấy tài khoản.");
console.log("   Email:", user.email);
console.log("   UID:", user.id);

console.log("");
console.log("🔐 Đang đặt lại mật khẩu...");

const { error: updateError } =
  await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

if (updateError) {
  console.error("");
  console.error("❌ Đổi mật khẩu thất bại:");
  console.error(updateError.message);
  console.error("");
  process.exit(1);
}

console.log("");
console.log("✅ ĐỔI MẬT KHẨU THÀNH CÔNG!");
console.log("   Email:", user.email);
console.log("   UID:", user.id);
console.log("");
console.log("Bạn có thể đăng nhập website bằng mật khẩu mới.");
console.log("");