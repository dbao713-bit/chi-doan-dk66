import { NextResponse } from "next/server";
import { createAdminClient, requireStaff } from "@/lib/server-auth";

export const runtime = "nodejs";

const BUCKET = "study-hub";

const ALLOWED_TYPES = new Set([
  "application/pdf",

  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  "text/plain",

  "image/jpeg",
  "image/png",
  "image/webp",

  "application/zip",
]);

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function removeExtension(name: string) {
  return name.replace(/\.[^/.]+$/, "");
}

export async function POST(request: Request) {
  try {
    await requireStaff(request);

    const admin = createAdminClient();

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Vui lòng chọn tài liệu." },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "File rỗng hoặc không hợp lệ." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Dung lượng file tối đa là 30MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Định dạng chưa được hỗ trợ. Hãy dùng PDF, Word, Excel, PowerPoint, TXT, ảnh hoặc ZIP.",
        },
        { status: 400 }
      );
    }

    const title =
      cleanText(formData.get("title")) ||
      removeExtension(file.name) ||
      "Tài liệu mới";

    const description = cleanText(formData.get("description"));

    const resourceType =
      cleanText(formData.get("resourceType")) || "study";

    const subject = cleanText(formData.get("subject")) || null;

    const gradeLevel = cleanText(formData.get("gradeLevel")) || null;

    const tags = cleanTags(cleanText(formData.get("tags")));

    const isFeatured =
      cleanText(formData.get("isFeatured")) === "true";

    const isPublished =
      cleanText(formData.get("isPublished")) !== "false";

    const validResourceTypes = [
      "study",
      "reference",
      "practice",
      "exam",
      "template",
    ];

    if (!validResourceTypes.includes(resourceType)) {
      return NextResponse.json(
        { error: "Loại tài liệu không hợp lệ." },
        { status: 400 }
      );
    }

    const originalName = file.name || "document";
    const sanitizedName = safeFileName(originalName) || "document";

    const id = crypto.randomUUID();

    const filePath = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${id}-${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("[STUDY HUB UPLOAD]", uploadError);

      return NextResponse.json(
        {
          error: "Không thể tải file lên Storage.",
          detail: uploadError.message,
        },
        { status: 500 }
      );
    }

    const { data, error: insertError } = await admin
      .from("study_resources")
      .insert({
        title,
        description: description || null,
        resource_type: resourceType,
        subject,
        grade_level: gradeLevel,
        tags,
        file_path: filePath,
        file_name: originalName,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
        is_featured: isFeatured,
        is_published: isPublished,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[STUDY HUB DB INSERT]", insertError);

      // Nếu database lỗi thì xóa file vừa upload để tránh file mồ côi
      await admin.storage.from(BUCKET).remove([filePath]);

      return NextResponse.json(
        {
          error: "File đã upload nhưng không thể lưu thông tin tài liệu.",
          detail: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      resource: data,
    });
  } catch (error) {
    console.error("[STUDY HUB UPLOAD API]", error);

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi tải tài liệu.",
      },
      { status: 500 }
    );
  }
}