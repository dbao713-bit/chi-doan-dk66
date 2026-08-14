import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function isValidId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export async function POST(request: NextRequest) {
  console.log("\n========================================");
  console.log("[ANNOUNCEMENT DOCUMENT] POST");

  try {
    const body = await request.json();

    const announcementId = String(
      body?.announcementId ?? ""
    ).trim();

    console.log(
      "[ANNOUNCEMENT DOCUMENT] announcementId:",
      announcementId
    );

    if (!announcementId) {
      return NextResponse.json(
        {
          error: "Thiếu announcementId.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidId(announcementId)) {
      return NextResponse.json(
        {
          error: "announcementId không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * TEMPLATE
     * ---------------------------------------------------------
     *
     * File mẫu:
     *
     * public/documents/test-docx.docx
     */

    const templatePath = path.join(
      process.cwd(),
      "public",
      "documents",
      "test-docx.docx"
    );

    /*
     * ---------------------------------------------------------
     * TARGET
     * ---------------------------------------------------------
     *
     * Ví dụ:
     *
     * announcementId = 123
     *
     * => announcement-123.docx
     */

    const documentId =
      `announcement-${announcementId}`;

    const targetPath = path.join(
      process.cwd(),
      "public",
      "documents",
      `${documentId}.docx`
    );

    console.log(
      "[ANNOUNCEMENT DOCUMENT] template:",
      templatePath
    );

    console.log(
      "[ANNOUNCEMENT DOCUMENT] target:",
      targetPath
    );

    /*
     * ---------------------------------------------------------
     * KIỂM TRA TEMPLATE
     * ---------------------------------------------------------
     */

    try {
      await fs.access(templatePath);
    } catch {
      console.error(
        "[ANNOUNCEMENT DOCUMENT] Template không tồn tại."
      );

      return NextResponse.json(
        {
          error:
            "Không tìm thấy template public/documents/test-docx.docx.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * COPY
     * ---------------------------------------------------------
     */

    await fs.copyFile(
      templatePath,
      targetPath
    );

    const stat =
      await fs.stat(targetPath);

    console.log(
      "[ANNOUNCEMENT DOCUMENT] File created:",
      targetPath
    );

    console.log(
      "[ANNOUNCEMENT DOCUMENT] Size:",
      stat.size,
      "bytes"
    );

    /*
     * ---------------------------------------------------------
     * RESPONSE
     * ---------------------------------------------------------
     */

    return NextResponse.json({
      ok: true,

      announcementId,

      documentId,

      filePath: targetPath,
    });
  } catch (error) {
    console.error(
      "[ANNOUNCEMENT DOCUMENT] ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo tài liệu DOCX.",
      },
      {
        status: 500,
      }
    );
  }
}