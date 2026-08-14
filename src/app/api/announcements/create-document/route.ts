import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BUCKET = "announcement-documents";
const TEMPLATE = "test-docx.docx";

function isValidId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Thiếu SUPABASE_URL trong .env.local."
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "Thiếu SUPABASE_SECRET_KEY trong .env.local."
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

export async function POST(
  request: NextRequest
) {
  console.log("\n========================================");
  console.log(
    "[ANNOUNCEMENT DOCUMENT] POST"
  );

  try {
    /**
     * =====================================================
     * 1. ĐỌC ANNOUNCEMENT ID
     * =====================================================
     */

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
          error:
            "announcementId không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * =====================================================
     * 2. DOCUMENT ID
     * =====================================================
     *
     * announcementId:
     *
     * ca60bd73-b17d-4ced-9acb-5fbc72d5730e
     *
     * =>
     *
     * announcement-ca60bd73-b17d-4ced-9acb-5fbc72d5730e.docx
     */

    const documentId =
      `announcement-${announcementId}`;

    const targetFile =
      `${documentId}.docx`;

    console.log(
      "[ANNOUNCEMENT DOCUMENT] documentId:",
      documentId
    );

    console.log(
      "[ANNOUNCEMENT DOCUMENT] template:",
      TEMPLATE
    );

    console.log(
      "[ANNOUNCEMENT DOCUMENT] target:",
      targetFile
    );

    /**
     * =====================================================
     * 3. SUPABASE ADMIN CLIENT
     * =====================================================
     */

    const supabase =
      getSupabaseAdmin();

    /**
     * =====================================================
     * 4. KIỂM TRA TEMPLATE
     * =====================================================
     */

    console.log(
      "[ANNOUNCEMENT DOCUMENT] Checking template..."
    );

    const { data: templateInfo, error: templateError } =
      await supabase.storage
        .from(BUCKET)
        .list("", {
          search: TEMPLATE,
          limit: 10,
        });

    if (templateError) {
      console.error(
        "[ANNOUNCEMENT DOCUMENT] Template list error:",
        templateError
      );

      throw new Error(
        `Không thể kiểm tra template: ${templateError.message}`
      );
    }

    const templateExists =
      templateInfo?.some(
        (file) =>
          file.name === TEMPLATE
      );

    if (!templateExists) {
      throw new Error(
        `Không tìm thấy ${TEMPLATE} trong bucket ${BUCKET}.`
      );
    }

    console.log(
      "[ANNOUNCEMENT DOCUMENT] Template exists."
    );

    /**
     * =====================================================
     * 5. COPY TEMPLATE TRONG SUPABASE STORAGE
     * =====================================================
     *
     * Từ:
     *
     * announcement-documents/test-docx.docx
     *
     * thành:
     *
     * announcement-documents/announcement-<id>.docx
     */

    console.log(
      "[ANNOUNCEMENT DOCUMENT] Copying template..."
    );

    const { data, error } =
      await supabase.storage
        .from(BUCKET)
        .copy(
          TEMPLATE,
          targetFile
        );

    if (error) {
      console.error(
        "[ANNOUNCEMENT DOCUMENT] Storage copy error:",
        error
      );

      throw new Error(
        `Không thể tạo file DOCX: ${error.message}`
      );
    }

    console.log(
      "[ANNOUNCEMENT DOCUMENT] Copy success:",
      data
    );

    /**
     * =====================================================
     * 6. RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      ok: true,

      announcementId,

      documentId,

      bucket: BUCKET,

      file: targetFile,
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