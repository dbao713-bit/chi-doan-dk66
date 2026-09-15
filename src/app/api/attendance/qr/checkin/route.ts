import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Thiếu cấu hình Supabase server.");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getTokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function sign(value: string, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const accessToken = getTokenFromRequest(request);
    const secret = process.env.ATTENDANCE_QR_SECRET;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    if (!secret) {
      return NextResponse.json(
        { error: "Thiếu ATTENDANCE_QR_SECRET." },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from("member_accounts")
      .select("member_id,status,must_change_password")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (accountError) {
      return NextResponse.json(
        { error: accountError.message },
        { status: 500 }
      );
    }

    if (!account || account.status !== "active") {
      return NextResponse.json(
        { error: "Tài khoản đoàn viên không hợp lệ." },
        { status: 403 }
      );
    }

    if (account.must_change_password) {
      return NextResponse.json(
        { error: "Tài khoản chưa hoàn tất đổi mật khẩu." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      token?: string;
    };

    const token = String(body.token || "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Thiếu mã QR." },
        { status: 400 }
      );
    }

    const parts = token.split(".");

    if (parts.length !== 4) {
      return NextResponse.json(
        { error: "Mã QR không hợp lệ." },
        { status: 400 }
      );
    }

    const [activityId, expiresAtRaw, nonce, signature] = parts;

    if (!activityId || !expiresAtRaw || !nonce || !signature) {
      return NextResponse.json(
        { error: "Mã QR không hợp lệ." },
        { status: 400 }
      );
    }

    const expiresAt = Number(expiresAtRaw);

    if (!Number.isFinite(expiresAt)) {
      return NextResponse.json(
        { error: "Mã QR không hợp lệ." },
        { status: 400 }
      );
    }

    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { error: "Mã QR đã hết hạn." },
        { status: 400 }
      );
    }

    const payload = `${activityId}.${expiresAtRaw}.${nonce}`;
    const expectedSignature = sign(payload, secret);

    const validSignature =
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

    if (!validSignature) {
      return NextResponse.json(
        { error: "Mã QR không hợp lệ." },
        { status: 400 }
      );
    }

    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select("id,title,status")
      .eq("id", activityId)
      .maybeSingle();

    if (activityError) {
      return NextResponse.json(
        { error: activityError.message },
        { status: 500 }
      );
    }

    if (!activity) {
      return NextResponse.json(
        { error: "Không tìm thấy hoạt động." },
        { status: 404 }
      );
    }

    if (activity.status !== "ongoing") {
      return NextResponse.json(
        { error: "Hoạt động hiện không mở điểm danh." },
        { status: 400 }
      );
    }

    const { data: registration, error: registrationError } =
      await supabase
        .from("activity_registrations")
        .select("id,status")
        .eq("activity_id", activityId)
        .eq("member_id", account.member_id)
        .eq("status", "registered")
        .maybeSingle();

    if (registrationError) {
      return NextResponse.json(
        { error: registrationError.message },
        { status: 500 }
      );
    }

    if (!registration) {
      return NextResponse.json(
        {
          error:
            "Bạn chưa đăng ký tham gia hoạt động này.",
        },
        { status: 403 }
      );
    }

    const { data: existing, error: existingError } =
      await supabase
        .from("activity_attendance")
        .select("present")
        .eq("activity_id", activityId)
        .eq("member_id", account.member_id)
        .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (existing?.present) {
      return NextResponse.json({
        ok: true,
        alreadyCheckedIn: true,
        message: "Bạn đã được ghi nhận có mặt trước đó.",
        activity: {
          id: activity.id,
          title: activity.title,
        },
      });
    }

    const { error: attendanceError } = await supabase
      .from("activity_attendance")
      .upsert(
        {
          activity_id: activityId,
          member_id: account.member_id,
          present: true,
          checked_at: new Date().toISOString(),
        },
        {
          onConflict: "activity_id,member_id",
        }
      );

    if (attendanceError) {
      return NextResponse.json(
        { error: attendanceError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyCheckedIn: false,
      message: "Điểm danh thành công.",
      activity: {
        id: activity.id,
        title: activity.title,
      },
    });
  } catch (error) {
    console.error("[ATTENDANCE QR CHECKIN]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể điểm danh bằng QR.",
      },
      { status: 500 }
    );
  }
}