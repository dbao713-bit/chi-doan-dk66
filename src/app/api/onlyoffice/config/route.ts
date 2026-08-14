import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const BUCKET = "announcement-documents";

/**
 * =========================================================
 * SUPABASE ADMIN CLIENT
 * =========================================================
 */

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

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
 * ONLYOFFICE NETWORK URL
 * =========================================================
 */

function getOnlyOfficeHostUrl() {
  return (
    process.env.ONLYOFFICE_PUBLIC_URL ||
    "http://host.docker.internal:3000"
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
 * GET CONFIG
 * =========================================================
 */

export async function GET(request: NextRequest) {
  console.log("\n========================================");
  console.log("[ONLYOFFICE CONFIG] GET started");

  try {
    const { searchParams } =
      new URL(request.url);

    /**
     * -------------------------------------------------------
     * DOCUMENT
     * -------------------------------------------------------
     */

    const documentId =
      searchParams.get("documentId");

    const documentTitle =
      searchParams.get("documentTitle") ||
      "Thông báo.docx";

    /**
     * -------------------------------------------------------
     * MODE
     * -------------------------------------------------------
     */

    const mode =
      searchParams.get("mode") === "view"
        ? "view"
        : "edit";

    const editable =
      mode === "edit";

    console.log(
      "[ONLYOFFICE CONFIG] documentId:",
      documentId
    );

    console.log(
      "[ONLYOFFICE CONFIG] documentTitle:",
      documentTitle
    );

    console.log(
      "[ONLYOFFICE CONFIG] mode:",
      mode
    );

    console.log(
      "[ONLYOFFICE CONFIG] editable:",
      editable
    );

    /**
     * -------------------------------------------------------
     * CHECK DOCUMENT ID
     * -------------------------------------------------------
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
     * JWT SECRET
     * -------------------------------------------------------
     */

    const jwtSecret =
      process.env.ONLYOFFICE_JWT_SECRET;

    if (!jwtSecret) {
      return NextResponse.json(
        {
          error:
            "Server chưa cấu hình ONLYOFFICE_JWT_SECRET.",
        },
        {
          status: 500,
        }
      );
    }

    /**
     * -------------------------------------------------------
     * SUPABASE
     * -------------------------------------------------------
     */

    const supabase =
      getSupabaseAdmin();

    /**
     * -------------------------------------------------------
     * FILE NAME
     * -------------------------------------------------------
     *
     * Ví dụ:
     *
     * documentId:
     * announcement-ca60bd73-b17d-4ced-9acb-5fbc72d5730e
     *
     * file:
     * announcement-ca60bd73-b17d-4ced-9acb-5fbc72d5730e.docx
     */

    const fileName =
      `${documentId}.docx`;

    console.log(
      "[ONLYOFFICE CONFIG] bucket:",
      BUCKET
    );

    console.log(
      "[ONLYOFFICE CONFIG] fileName:",
      fileName
    );

    /**
     * -------------------------------------------------------
     * KIỂM TRA FILE TRONG SUPABASE STORAGE
     * -------------------------------------------------------
     */

    const {
      data: files,
      error: listError,
    } = await supabase.storage
      .from(BUCKET)
      .list("", {
        search: fileName,
        limit: 100,
      });

    if (listError) {
      console.error(
        "[ONLYOFFICE CONFIG] Storage list error:",
        listError
      );

      return NextResponse.json(
        {
          error:
            `Không thể kiểm tra file trong Supabase Storage: ${listError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    const fileExists =
      files?.some(
        (file) =>
          file.name === fileName
      );

    if (!fileExists) {
      console.error(
        "[ONLYOFFICE CONFIG] File không tồn tại:",
        fileName
      );

      return NextResponse.json(
        {
          error:
            `Không tìm thấy ${fileName} trong bucket ${BUCKET}.`,
        },
        {
          status: 404,
        }
      );
    }

    console.log(
      "[ONLYOFFICE CONFIG] File exists in Supabase Storage."
    );

    /**
     * -------------------------------------------------------
     * DOCUMENT KEY
     * -------------------------------------------------------
     *
     * Không dùng fs.statSync nữa vì DOCX nằm trên
     * Supabase Storage.
     *
     * Dùng timestamp để tạo key.
     */

    const version =
      Date.now();

    const documentKey =
      `oo-${documentId}-${version}`;

    console.log(
      "[ONLYOFFICE CONFIG] version:",
      version
    );

    console.log(
      "[ONLYOFFICE CONFIG] documentKey:",
      documentKey
    );

    /**
     * -------------------------------------------------------
     * ONLYOFFICE DOCUMENT SERVER
     * -------------------------------------------------------
     */

    const documentServerUrl =
      process.env.ONLYOFFICE_URL ||
      "http://localhost:8080";

    console.log(
      "[ONLYOFFICE CONFIG] documentServerUrl:",
      documentServerUrl
    );

    /**
     * -------------------------------------------------------
     * PUBLIC URL
     * -------------------------------------------------------
     *
     * ONLYOFFICE sẽ dùng URL này để:
     *
     * 1. Tải DOCX
     * 2. Gọi callback
     */

    const publicBaseUrl =
      getOnlyOfficeHostUrl();

    console.log(
      "[ONLYOFFICE CONFIG] publicBaseUrl:",
      publicBaseUrl
    );

    /**
     * -------------------------------------------------------
     * DOCUMENT URL
     * -------------------------------------------------------
     */

    const documentUrl =
      `${publicBaseUrl}/api/onlyoffice/file/${documentId}`;

    console.log(
      "[ONLYOFFICE CONFIG] documentUrl:",
      documentUrl
    );

    /**
     * -------------------------------------------------------
     * CALLBACK URL
     * -------------------------------------------------------
     */

    const callbackUrl =
      `${publicBaseUrl}/api/onlyoffice/callback`;

    console.log(
      "[ONLYOFFICE CONFIG] callbackUrl:",
      callbackUrl
    );

    /**
     * -------------------------------------------------------
     * ONLYOFFICE CONFIG
     * -------------------------------------------------------
     */

    const config = {
      document: {
        fileType: "docx",

        key: documentKey,

        title: documentTitle,

        url: documentUrl,

        permissions: {
          edit: editable,

          download: true,

          print: true,

          review: false,

          comment: false,

          chat: false,
        },
      },

      documentType: "word",

      editorConfig: {
        mode,

        lang: "vi",

        callbackUrl,
      },

      type: "desktop",
    };

    console.log(
      "[ONLYOFFICE CONFIG] config created"
    );

    /**
     * -------------------------------------------------------
     * JWT
     * -------------------------------------------------------
     */

    const token =
      jwt.sign(
        config,
        jwtSecret
      );

    console.log(
      "[ONLYOFFICE CONFIG] JWT created"
    );

    /**
     * -------------------------------------------------------
     * RESPONSE
     * -------------------------------------------------------
     */

    return NextResponse.json({
      ok: true,

      config: {
        ...config,

        token,
      },

      documentServerUrl,

      mode,

      editable,
    });

  } catch (error) {
    console.error(
      "[ONLYOFFICE CONFIG ERROR]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo ONLYOFFICE config.",
      },
      {
        status: 500,
      }
    );
  }
}