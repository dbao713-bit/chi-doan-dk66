import { NextResponse } from "next/server";
import { requireUser, createAdminClient } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);

    const body = (await request.json()) as {
      newPassword?: unknown;
    };

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword.trim()
        : "";

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 8 ký tự." },
        { status: 400 }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: "Mật khẩu mới quá dài." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    /*
     * Cập nhật mật khẩu trực tiếp trên Supabase Auth.
     * Hàm này chỉ chạy ở server và không làm lộ secret key ra browser.
     */
    const { error: passwordError } =
      await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

    if (passwordError) {
      console.error(
        "[MEMBER CHANGE PASSWORD / AUTH]",
        passwordError
      );

      return NextResponse.json(
        {
          error:
            passwordError.message ||
            "Không thể cập nhật mật khẩu trên hệ thống.",
        },
        { status: 400 }
      );
    }

    /*
     * Đồng bộ trạng thái tài khoản đoàn viên.
     */
    const { error: accountError } = await admin
      .from("member_accounts")
      .update({
        must_change_password: false,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", user.id);

    if (accountError) {
      console.error(
        "[MEMBER CHANGE PASSWORD / ACCOUNT]",
        accountError
      );

      return NextResponse.json(
        {
          error:
            "Mật khẩu đã được cập nhật nhưng chưa thể đồng bộ trạng thái tài khoản. Vui lòng thử lại hoặc liên hệ Ban Chấp hành.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Đổi mật khẩu thành công.",
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error(
      "[MEMBER CHANGE PASSWORD]",
      error
    );

    return NextResponse.json(
      { error: "Không thể đổi mật khẩu." },
      { status: 500 }
    );
  }
}