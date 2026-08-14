import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

function isValidDocumentId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      documentId: string;
    }>;
  }
) {
  console.log("\n========================================");
  console.log("[ONLYOFFICE DELETE] DELETE started");

  try {
    const { documentId } = await params;

    console.log(
      "[ONLYOFFICE DELETE] documentId:",
      documentId
    );

    /**
     * ---------------------------------------------------------
     * VALIDATE DOCUMENT ID
     * ---------------------------------------------------------
     */

    if (!documentId) {
      return NextResponse.json(
        {
          error: "Thiếu documentId.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidDocumentId(documentId)) {
      return NextResponse.json(
        {
          error: "documentId không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * ---------------------------------------------------------
     * FILE PATH
     * ---------------------------------------------------------
     */

    const filePath = path.join(
      process.cwd(),
      "public",
      "documents",
      `${documentId}.docx`
    );

    console.log(
      "[ONLYOFFICE DELETE] filePath:",
      filePath
    );

    /**
     * ---------------------------------------------------------
     * CHECK FILE
     * ---------------------------------------------------------
     */

    if (!fs.existsSync(filePath)) {
      console.log(
        "[ONLYOFFICE DELETE] File không tồn tại."
      );

      return NextResponse.json({
        ok: true,
        deleted: false,
        message: "File DOCX không tồn tại.",
      });
    }

    /**
     * ---------------------------------------------------------
     * DELETE
     * ---------------------------------------------------------
     */

    fs.unlinkSync(filePath);

    console.log(
      "[ONLYOFFICE DELETE] File deleted successfully."
    );

    return NextResponse.json({
      ok: true,
      deleted: true,
      documentId,
    });
  } catch (error) {
    console.error(
      "[ONLYOFFICE DELETE ERROR]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể xóa file DOCX.",
      },
      {
        status: 500,
      }
    );
  }
}