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
 * VALID DOCUMENT ID
 * =========================================================
 */

function isValidDocumentId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * =========================================================
 * GET PUBLIC APP URL
 * =========================================================
 *
 * Đây là URL của Next.js/Vercel.
 *
 * KHÔNG phải URL OnlyOffice.
 */

function getAppPublicUrl() {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL;

  if (!url) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SITE_URL."
    );
  }

  return url.replace(/\/+$/, "");
}

/**
 * =========================================================
 * GET ONLYOFFICE SERVER URL
 * =========================================================
 *
 * Đây là URL public của OnlyOffice Docker
 * thông qua Cloudflare Tunnel.
 */

function getOnlyOfficeServerUrl() {
  const url =
    process.env.ONLYOFFICE_URL;

  if (!url) {
    throw new Error(
      "Thiếu ONLYOFFICE_URL."
    );
  }

  return url.replace(/\/+$/, "");
}

/**
 * =========================================================
 * GET CONFIG
 * =========================================================
 */

export async function GET(
  request: NextRequest
) {
  console.log("\n========================================");
  console.log(
    "[ONLYOFFICE CONFIG] GET started"
  );

  try {
    /**
     * =======================================================
     * 1. REQUEST PARAMETERS
     * =======================================================
     */

    const { searchParams } =
      new URL(request.url);

    const documentId =
      searchParams.get("documentId");

    const documentTitle =
      searchParams.get(
        "documentTitle"
      ) || "Thông báo.docx";

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
     * =======================================================
     * 2. VALIDATE DOCUMENT ID
     * =======================================================
     */

    if (!documentId) {
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

    if (
      !isValidDocumentId(
        documentId
      )
    ) {
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
     * =======================================================
     * 3. JWT SECRET
     * =======================================================
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
     * =======================================================
     * 4. SUPABASE
     * =======================================================
     */

    const supabase =
      getSupabaseAdmin();

    /**
     * =======================================================
     * 5. FILE NAME
     * =======================================================
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
     * =======================================================
     * 6. CHECK FILE IN SUPABASE STORAGE
     * =======================================================
     */

    const {
      data: files,
      error: listError,
    } =
      await supabase.storage
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
      "[ONLYOFFICE CONFIG] File exists."
    );

    /**
     * =======================================================
     * 7. DOCUMENT KEY
     * =======================================================
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
     * =======================================================
     * 8. URLS
     * =======================================================
     *
     * APP:
     *
     * https://cd-dk66-thpthatrung-thanhhoa-vn.vercel.app
     *
     * ONLYOFFICE:
     *
     * https://twice-pty-manufactured-penny.trycloudflare.com
     */

    const appPublicUrl =
      getAppPublicUrl();

    const onlyOfficeServerUrl =
      getOnlyOfficeServerUrl();

    console.log(
      "[ONLYOFFICE CONFIG] appPublicUrl:",
      appPublicUrl
    );

    console.log(
      "[ONLYOFFICE CONFIG] onlyOfficeServerUrl:",
      onlyOfficeServerUrl
    );

    /**
     * =======================================================
     * 9. DOCUMENT URL
     * =======================================================
     *
     * ONLYOFFICE sẽ gọi URL này để tải DOCX.
     *
     * URL này PHẢI trỏ về Vercel.
     */

    const documentUrl =
      `${appPublicUrl}/api/onlyoffice/file/${documentId}`;

    console.log(
      "[ONLYOFFICE CONFIG] documentUrl:",
      documentUrl
    );

    /**
     * =======================================================
     * 10. CALLBACK URL
     * =======================================================
     *
     * ONLYOFFICE sẽ gọi callback này
     * sau khi người dùng lưu tài liệu.
     *
     * URL này PHẢI trỏ về Vercel.
     */

    const callbackUrl =
      `${appPublicUrl}/api/onlyoffice/callback`;

    console.log(
      "[ONLYOFFICE CONFIG] callbackUrl:",
      callbackUrl
    );

    /**
     * =======================================================
     * 11. ONLYOFFICE CONFIG
     * =======================================================
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

      /**
       * desktop:
       *
       * OnlyOffice editor chạy trong trình duyệt.
       */

      type: "desktop",
    };

    console.log(
      "[ONLYOFFICE CONFIG] config created"
    );

    /**
     * =======================================================
     * 12. JWT
     * =======================================================
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
     * =======================================================
     * 13. RESPONSE
     * =======================================================
     *
     * documentServerUrl:
     *
     * -> trình duyệt dùng URL này để
     *    kết nối tới OnlyOffice Docker.
     *
     * config.document.url:
     *
     * -> OnlyOffice dùng URL Vercel
     *    để lấy DOCX.
     *
     * config.editorConfig.callbackUrl:
     *
     * -> OnlyOffice dùng URL Vercel
     *    để callback khi lưu.
     */

    return NextResponse.json({
      ok: true,

      config: {
        ...config,

        token,
      },

      documentServerUrl:
        onlyOfficeServerUrl,

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