import { NextResponse } from "next/server";
import {
  createAdminClient,
  requireUser,
} from "@/lib/server-auth";

export const runtime = "nodejs";

const VALID_RESOURCE_TYPES = [
  "study",
  "reference",
  "practice",
  "exam",
  "template",
] as const;

type ResourceType =
  (typeof VALID_RESOURCE_TYPES)[number];

function isValidResourceType(
  value: string
) {
  return VALID_RESOURCE_TYPES.includes(
    value as ResourceType
  );
}

export async function GET(
  request: Request
) {
  try {
    const auth = await requireUser(
      request
    );

    const admin = createAdminClient();

    // Chỉ tài khoản đã được liên kết với đoàn viên
    // mới được sử dụng Study Hub.
    const { data: memberAccount, error: memberError } =
      await admin
        .from("member_accounts")
        .select("member_id")
        .eq(
          "auth_user_id",
          auth.user.id
        )
        .maybeSingle();

    if (memberError) {
      console.error(
        "[MEMBER STUDY HUB ACCOUNT]",
        memberError
      );

      return NextResponse.json(
        {
          error:
            "Không thể kiểm tra tài khoản đoàn viên.",
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

    const url = new URL(request.url);

    const resourceType =
      url.searchParams.get(
        "resourceType"
      ) || "";

    const subject =
      url.searchParams.get("subject") || "";

    const gradeLevel =
      url.searchParams.get("gradeLevel") || "";

    let query = admin
      .from("study_resources")
      .select(
        `
        id,
        title,
        description,
        resource_type,
        subject,
        grade_level,
        tags,
        file_name,
        mime_type,
        file_size,
        author,
        is_featured,
        is_published,
        created_at,
        updated_at
        `
      )
      .eq("is_published", true)
      .order("is_featured", {
        ascending: false,
      })
      .order("updated_at", {
        ascending: false,
      })
      .limit(200);

    if (
      resourceType &&
      isValidResourceType(resourceType)
    ) {
      query = query.eq(
        "resource_type",
        resourceType
      );
    }

    if (subject) {
      query = query.eq(
        "subject",
        subject
      );
    }

    if (gradeLevel) {
      query = query.eq(
        "grade_level",
        gradeLevel
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "[MEMBER STUDY HUB GET]",
        error
      );

      return NextResponse.json(
        {
          error:
            "Không thể tải Study Hub.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      resources: data ?? [],
    });
  } catch (error) {
    console.error(
      "[MEMBER STUDY HUB API]",
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