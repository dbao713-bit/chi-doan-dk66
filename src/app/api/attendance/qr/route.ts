import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;
const ATTENDANCE_QR_SECRET =
  process.env.ATTENDANCE_QR_SECRET!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    console.log("[QR DEBUG] POST /api/attendance/qr");

    const authHeader =
      request.headers.get("authorization");

    const accessToken =
      authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";

    console.log(
      "[QR DEBUG] accessToken:",
      Boolean(accessToken)
    );

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Thiếu access token.",
        },
        { status: 401 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      console.error(
        "[QR DEBUG] Missing Supabase env"
      );

      return NextResponse.json(
        {
          error:
            "Thiếu cấu hình Supabase server.",
        },
        { status: 500 }
      );
    }

    if (!ATTENDANCE_QR_SECRET) {
      console.error(
        "[QR DEBUG] Missing ATTENDANCE_QR_SECRET"
      );

      return NextResponse.json(
        {
          error:
            "Thiếu ATTENDANCE_QR_SECRET.",
        },
        { status: 500 }
      );
    }

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken
    );

    console.log("[QR DEBUG] user:", user);
    console.log(
      "[QR DEBUG] userError:",
      userError
    );

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    /*
     * KIỂM TRA BCH / ADMIN
     *
     * staff_accounts dùng:
     * - auth_user_id
     * - role
     * - is_active
     */
    const {
      data: staff,
      error: staffError,
    } = await supabase
      .from("staff_accounts")
      .select(
        "auth_user_id, role, display_name, is_active"
      )
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    console.log("[QR DEBUG] staff:", staff);
    console.log(
      "[QR DEBUG] staffError:",
      staffError
    );

    if (staffError) {
      console.error(
        "[QR DEBUG] staff query failed:",
        staffError
      );

      return NextResponse.json(
        {
          error:
            "Không thể kiểm tra quyền BCH/Admin.",
          detail: staffError.message,
        },
        { status: 500 }
      );
    }

    if (!staff) {
      return NextResponse.json(
        {
          error:
            "Tài khoản không có quyền BCH/Admin.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const activityId =
  typeof body?.activityId === "string"
    ? body.activityId.trim()
    : "";

    console.log(
      "[QR DEBUG] activityId:",
      activityId
    );

    if (!activityId) {
      return NextResponse.json(
        {
          error:
            "Thiếu hoặc sai activityId.",
        },
        { status: 400 }
      );
    }

    const {
      data: activity,
      error: activityError,
    } = await supabase
      .from("activities")
      .select(
        "id, title, status"
      )
      .eq("id", activityId)
      .maybeSingle();

    console.log(
      "[QR DEBUG] activity:",
      activity
    );

    console.log(
      "[QR DEBUG] activityError:",
      activityError
    );

    if (activityError) {
      return NextResponse.json(
        {
          error:
            "Không thể đọc hoạt động.",
          detail: activityError.message,
        },
        { status: 500 }
      );
    }

    if (!activity) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy hoạt động.",
        },
        { status: 404 }
      );
    }

    if (
  activity.status !== "ongoing" &&
  activity.status !== "scheduled"
) {
  return NextResponse.json(
    {
      error:
        "Hoạt động hiện không thể mở điểm danh.",
      status: activity.status,
    },
    { status: 400 }
  );
}

    /*
     * QR có hiệu lực 2 phút
     */
    const expiresAt =
      Date.now() + 10 * 60 * 1000;

    const nonce =
      crypto.randomBytes(16).toString("hex");

    const payload =
      `${activityId}.${expiresAt}.${nonce}`;

    const signature =
      crypto
        .createHmac(
          "sha256",
          ATTENDANCE_QR_SECRET
        )
        .update(payload)
        .digest("hex");

    const token =
      `${payload}.${signature}`;

    console.log(
      "[QR DEBUG] QR created successfully"
    );

    return NextResponse.json({
      ok: true,
      token,
      expiresAt,
      activity: {
        id: activity.id,
        title: activity.title,
      },
    });
  } catch (error) {
    console.error(
      "[QR DEBUG] INTERNAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể tạo mã QR điểm danh.",
        detail:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}