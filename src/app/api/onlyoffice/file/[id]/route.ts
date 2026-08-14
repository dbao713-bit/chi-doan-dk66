import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

function isValidDocumentId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  console.log("\n========================================");
  console.log("[ONLYOFFICE FILE] GET");

  try {
    const { id } = await context.params;

    console.log(
      "[ONLYOFFICE FILE] documentId:",
      id
    );

    if (!id) {
      return NextResponse.json(
        {
          error: "Thiếu documentId.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidDocumentId(id)) {
      return NextResponse.json(
        {
          error: "documentId không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      "documents",
      `${id}.docx`
    );

    console.log(
      "[ONLYOFFICE FILE] filePath:",
      filePath
    );

    if (!fs.existsSync(filePath)) {
      console.error(
        "[ONLYOFFICE FILE] File không tồn tại:",
        filePath
      );

      return NextResponse.json(
        {
          error: `Không tìm thấy tài liệu ${id}.docx`,
        },
        {
          status: 404,
        }
      );
    }

    const fileBuffer = fs.readFileSync(
      filePath
    );

    console.log(
      "[ONLYOFFICE FILE] File size:",
      fileBuffer.length,
      "bytes"
    );

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        "Content-Disposition":
          `inline; filename="${id}.docx"`,

        "Content-Length":
          String(fileBuffer.length),

        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error(
      "[ONLYOFFICE FILE] ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể đọc tài liệu.",
      },
      {
        status: 500,
      }
    );
  }
}