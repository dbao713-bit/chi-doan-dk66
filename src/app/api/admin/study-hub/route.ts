import { NextResponse } from "next/server";
import {
  createAdminClient,
  requireStaff,
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

function cleanTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseResourceType(
  value: unknown
): ResourceType | null {
  const type = String(value || "").trim();

  if (
    !VALID_RESOURCE_TYPES.includes(
      type as ResourceType
    )
  ) {
    return null;
  }

  return type as ResourceType;
}

export async function GET(request: Request) {
  try {
    await requireStaff(request);

    const admin = createAdminClient();

    const url = new URL(request.url);

    const resourceType =
      url.searchParams.get(
        "resourceType"
      ) || "";

    const subject =
      url.searchParams.get("subject") || "";

    const gradeLevel =
      url.searchParams.get("gradeLevel") || "";

    const search =
      url.searchParams.get("search") || "";

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
        file_path,
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
      .order("updated_at", {
        ascending: false,
      });

    if (resourceType) {
      const valid =
        parseResourceType(resourceType);

      if (valid) {
        query = query.eq(
          "resource_type",
          valid
        );
      }
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

    if (search.trim()) {
      const keyword =
        search.trim();

      query = query.or(
        `title.ilike.%${keyword}%,description.ilike.%${keyword}%,file_name.ilike.%${keyword}%,author.ilike.%${keyword}%`
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "[STUDY HUB GET]",
        error
      );

      return NextResponse.json(
        {
          error:
            "Không thể tải dữ liệu Study Hub.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      data ?? []
    );
  } catch (error) {
    console.error(
      "[STUDY HUB GET API]",
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

export async function PATCH(
  request: Request
) {
  try {
    const staff =
      await requireStaff(request);

    const admin = createAdminClient();

    const body =
      await request.json();

    const id =
      body?.id;

    if (
      id === undefined ||
      id === null ||
      String(id).trim() === ""
    ) {
      return NextResponse.json(
        {
          error:
            "Thiếu ID tài liệu.",
        },
        { status: 400 }
      );
    }

    const resourceType =
      parseResourceType(
        body?.resourceType
      );

    if (!resourceType) {
      return NextResponse.json(
        {
          error:
            "Loại tài liệu không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const subject =
      typeof body?.subject === "string"
        ? body.subject.trim() || null
        : null;

    const gradeLevel =
      typeof body?.gradeLevel === "string"
        ? body.gradeLevel.trim() || null
        : null;

    const tags =
      cleanTags(body?.tags);

    const isFeatured =
      Boolean(body?.isFeatured);

    const isPublished =
      body?.isPublished !== false;

    const updateData = {
      resource_type: resourceType,
      subject,
      grade_level: gradeLevel,
      tags,
      is_featured: isFeatured,
      is_published: isPublished,
    };

    const {
      data,
      error,
    } = await admin
      .from("study_resources")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        id,
        title,
        description,
        resource_type,
        subject,
        grade_level,
        tags,
        file_path,
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
      .single();

    if (error) {
      console.error(
        "[STUDY HUB PATCH]",
        error
      );

      return NextResponse.json(
        {
          error:
            "Không thể cập nhật tài liệu.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      resource: data,
      updatedBy:
        staff.staff.display_name ||
        staff.staff.role,
    });
  } catch (error) {
    console.error(
      "[STUDY HUB PATCH API]",
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

export async function DELETE(
  request: Request
) {
  try {
    await requireStaff(request);

    const admin = createAdminClient();

    const body =
      await request.json();

    const id =
      body?.id;

    if (
      id === undefined ||
      id === null ||
      String(id).trim() === ""
    ) {
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
        "id,file_path"
      )
      .eq("id", id)
      .maybeSingle();

    if (resourceError) {
      return NextResponse.json(
        {
          error:
            "Không thể tìm tài liệu.",
          detail:
            resourceError.message,
        },
        { status: 500 }
      );
    }

    if (!resource) {
      return NextResponse.json(
        {
          error:
            "Tài liệu không tồn tại.",
        },
        { status: 404 }
      );
    }

    if (resource.file_path) {
      const {
        error:
          storageError,
      } = await admin.storage
        .from("study-hub")
        .remove([
          resource.file_path,
        ]);

      if (storageError) {
        console.error(
          "[STUDY HUB STORAGE DELETE]",
          storageError
        );
      }
    }

    const {
      error: deleteError,
    } = await admin
      .from("study_resources")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "[STUDY HUB DELETE]",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Không thể xóa tài liệu.",
          detail:
            deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "[STUDY HUB DELETE API]",
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