import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const { user, client } = await requireUser(request);

    const { data: account, error: accountError } = await client
      .from("member_accounts")
      .select(`
        id,
        email,
        status,
        must_change_password,
        created_at,
        last_login_at,
        members(
          id,
          student_id,
          full_name,
          class_name,
          gender,
          birth_year,
          avatar,
          total_score,
          rating
        )
      `)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (accountError) {
      return NextResponse.json(
        { error: accountError.message },
        { status: 500 }
      );
    }

    if (!account) {
      return NextResponse.json(
        { error: "Tài khoản này chưa được liên kết với đoàn viên." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      account,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[MEMBER ME]", error);
    return NextResponse.json(
      { error: "Không thể tải tài khoản đoàn viên." },
      { status: 500 }
    );
  }
}
