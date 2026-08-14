import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BUCKET = "announcement-documents";

/**
 * =========================================================
 * SUPABASE ADMIN CLIENT
 * =========================================================
 */

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL;

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Thiếu SUPABASE_URL trong biến môi trường."
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "Thiếu SUPABASE_SECRET_KEY trong biến môi trường."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * =========================================================
 * VALID DOCUMENT ID
 * =========================================================
 */

function isValidDocumentId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * =========================================================
 * GET DOCUMENT
 * =========================================================
 */

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
    /**
     * -------------------------------------------------------
     * 1. LẤY DOCUMENT ID
     * -------------------------------------------------------
     */

    const { id } =
      await context.params;

    console.log(
      "[ONLYOFFICE FILE] documentId:",
      id
    );

    /**
     * -------------------------------------------------------
     * 2. KIỂM TRA ID
     * -------------------------------------------------------
     */

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Thiếu documentId.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidDocumentId(id)) {
      return NextResponse.json(
        {
          error:
            "documentId không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * -------------------------------------------------------
     * 3. TÊN FILE
     * -------------------------------------------------------
     *
     * Ví dụ:
     *
     * id:
     * announcement-123
     *
     * =>
     *
     * announcement-123.docx
     */

    const fileName =
      `${id}.docx`;

    console.log(
      "[ONLYOFFICE FILE] bucket:",
      BUCKET
    );

    console.log(
      "[ONLYOFFICE FILE] fileName:",
      fileName
    );

    /**
     * -------------------------------------------------------
     * 4. SUPABASE ADMIN CLIENT
     * -------------------------------------------------------
     */

    const supabase =
      getSupabaseAdmin();

    /**
     * -------------------------------------------------------
     * 5. DOWNLOAD FILE TỪ SUPABASE STORAGE
     * -------------------------------------------------------
     */

    console.log(
      "[ONLYOFFICE FILE] Downloading from Supabase..."
    );

    const {
      data,
      error,
    } = await supabase.storage
      .from(BUCKET)
      .download(fileName);

    /**
     * -------------------------------------------------------
     * 6. KIỂM TRA LỖI
     * -------------------------------------------------------
     */

    if (error) {
      console.error(
        "[ONLYOFFICE FILE] Supabase download error:",
        error
      );

      return NextResponse.json(
        {
          error:
            `Không tìm thấy tài liệu ${fileName}: ${error.message}`,
        },
        {
          status: 404,
        }
      );
    }

    if (!data) {
      console.error(
        "[ONLYOFFICE FILE] Supabase không trả về file."
      );

      return NextResponse.json(
        {
          error:
            `Supabase không trả về tài liệu ${fileName}.`,
        },
        {
          status: 404,
        }
      );
    }

    /**
     * -------------------------------------------------------
     * 7. CHUYỂN BLOB → ARRAY BUFFER
     * -------------------------------------------------------
     */

    const arrayBuffer =
      await data.arrayBuffer();

    console.log(
      "[ONLYOFFICE FILE] File size:",
      arrayBuffer.byteLength,
      "bytes"
    );

    /**
     * -------------------------------------------------------
     * 8. TRẢ FILE DOCX CHO ONLYOFFICE
     * -------------------------------------------------------
     */

    return new NextResponse(
      arrayBuffer,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          "Content-Disposition":
            `inline; filename="${fileName}"`,

          "Content-Length":
            String(arrayBuffer.byteLength),

          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );

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