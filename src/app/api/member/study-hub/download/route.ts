import { NextResponse } from "next/server";
import {
  createAdminClient,
  requireUser,
} from "@/lib/server-auth";

export const runtime = "nodejs";

const BUCKET = "study-hub";

export async function GET(
  request: Request
) {
  try {
    const auth = await requireUser(
      request
    );

    const admin = createAdminClient();

    // Kiểm tra tài khoản có phải tài khoản
    // đoàn viên đã liên kết hay không.
    const {
      data: memberAccount,
      error: memberError,
    } = await admin
      .from("member_accounts")
      .select("member_id")
      .eq(
        "auth_user_id",
        auth.user.id
      )
      .maybeSingle();

    if (memberError) {
      console.error(
        "[STUDY HUB DOWNLOAD ACCOUNT]",
        memberError
      );

      return NextResponse.json(
        {
          error:
            "Không thể kiểm tra tài khoản.",
        },
        { status: 500 }
      );
    }

    if (!memberAccount) {
      return NextResponse.json(
        {
          error:
            "Tài khoản chưa được liên kết với đoàn viên.",
        },
        { status: 403 }
      );
    }

    const url = new URL(
      request.url
    );

    const id =
      url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Thiếu ID tài liệu.",
        },
        { status: 400 }
      );
    }

    const {
      data: resource,
      error: resourceError,
    } = await admin
      .from("study_resources")
      .select(
        `
        id,
        title,
        file_path,
        file_name,
        is_published
        `
      )
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();

    if (resourceError) {
      console.error(
        "[STUDY HUB DOWNLOAD RESOURCE]",
        resourceError
      );

      return NextResponse.json(
        {
          error:
            "Không thể tìm tài liệu.",
        },
        { status: 500 }
      );
    }

    if (!resource) {
      return NextResponse.json(
        {
          error:
            "Tài liệu không tồn tại hoặc chưa được xuất bản.",
        },
        { status: 404 }
      );
    }

    if (!resource.file_path) {
      return NextResponse.json(
        {
          error:
            "Tài liệu này chưa có file tải xuống.",
        },
        { status: 404 }
      );
    }

    const {
      data: signedData,
      error: signedError,
    } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(
        resource.file_path,
        60 * 10
      );

    if (
      signedError ||
      !signedData?.signedUrl
    ) {
      console.error(
        "[STUDY HUB SIGNED URL]",
        signedError
      );

      return NextResponse.json(
        {
          error:
            "Không thể tạo liên kết tải tài liệu.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: signedData.signedUrl,
      fileName:
        resource.file_name ||
        resource.title,
    });
  } catch (error) {
    console.error(
      "[STUDY HUB DOWNLOAD API]",
      error
    );

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi.",
      },
      { status: 500 }
    );
  }
}