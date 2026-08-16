import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BUCKET = "announcement-documents";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Thiếu SUPABASE_URL."
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "Thiếu SUPABASE_SECRET_KEY."
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
  console.log(
    "[ONLYOFFICE FILE] GET"
  );

  try {
    const { id } =
      await context.params;

    console.log(
      "[ONLYOFFICE FILE] documentId:",
      id
    );

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

    const fileName =
      `${id}.docx`;

    const supabase =
      getSupabaseAdmin();

    console.log(
      "[ONLYOFFICE FILE] Downloading:",
      fileName
    );

    const {
      data,
      error,
    } =
      await supabase.storage
        .from(BUCKET)
        .download(fileName);

    if (error) {
      console.error(
        "[ONLYOFFICE FILE] Supabase error:",
        error
      );

      return NextResponse.json(
        {
          error:
            `Không tìm thấy ${fileName}: ${error.message}`,
        },
        {
          status: 404,
        }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Supabase không trả về file.",
        },
        {
          status: 404,
        }
      );
    }

    const arrayBuffer =
      await data.arrayBuffer();

    console.log(
      "[ONLYOFFICE FILE] File size:",
      arrayBuffer.byteLength
    );

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