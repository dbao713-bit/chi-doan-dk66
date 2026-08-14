import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const BUCKET = "announcement-documents";

type OnlyOfficeCallbackBody = {
  key?: string;
  status?: number;
  url?: string;
  changesurl?: string;
  token?: string;
  users?: string[];
  actions?: Array<{
    type?: number;
    userid?: string;
  }>;
  history?: unknown;
  filetype?: string;
};

type OnlyOfficeTokenPayload = {
  key?: string;
  status?: number;
  [key: string]: unknown;
};

function isValidDocumentId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * documentKey:
 *
 * oo-announcement-123-1786637787300
 *
 * =>
 *
 * documentId = announcement-123
 * version    = 1786637787300
 */
function parseDocumentKey(key: string) {
  if (!key.startsWith("oo-")) {
    throw new Error(
      `documentKey không hợp lệ: ${key}`
    );
  }

  const value = key.substring(3);

  const lastDash = value.lastIndexOf("-");

  if (lastDash <= 0) {
    throw new Error(
      `Không thể phân tích documentKey: ${key}`
    );
  }

  const documentId =
    value.substring(0, lastDash);

  const version =
    value.substring(lastDash + 1);

  if (!documentId) {
    throw new Error(
      "documentId rỗng trong documentKey."
    );
  }

  if (!version) {
    throw new Error(
      "version rỗng trong documentKey."
    );
  }

  if (!isValidDocumentId(documentId)) {
    throw new Error(
      `documentId không hợp lệ: ${documentId}`
    );
  }

  return {
    documentId,
    version,
  };
}

/**
 * =========================================================
 * SUPABASE ADMIN
 * =========================================================
 *
 * Dùng SUPABASE_SECRET_KEY ở SERVER ONLY.
 */
function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL;

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

export async function POST(
  request: NextRequest
) {
  console.log("\n========================================");
  console.log(
    "[ONLYOFFICE CALLBACK] POST"
  );

  try {
    /**
     * =======================================================
     * 1. READ BODY
     * =======================================================
     */

    const body =
      (await request.json()) as OnlyOfficeCallbackBody;

    console.log(
      "[ONLYOFFICE CALLBACK] BODY:",
      JSON.stringify(body, null, 2)
    );

    const status = body.status;
    const key = body.key;

    console.log(
      "[ONLYOFFICE CALLBACK] status:",
      status
    );

    console.log(
      "[ONLYOFFICE CALLBACK] key:",
      key
    );

    console.log(
      "[ONLYOFFICE CALLBACK] url:",
      body.url
    );

    /**
     * =======================================================
     * 2. CHECK KEY
     * =======================================================
     */

    if (!key) {
      console.error(
        "[ONLYOFFICE CALLBACK] Missing key"
      );

      return NextResponse.json(
        {
          error: 1,
        },
        {
          status: 400,
        }
      );
    }

    /**
     * =======================================================
     * 3. JWT VERIFY
     * =======================================================
     */

    const jwtSecret =
      process.env.ONLYOFFICE_JWT_SECRET;

    if (!jwtSecret) {
      console.error(
        "[ONLYOFFICE CALLBACK] Missing JWT secret"
      );

      return NextResponse.json(
        {
          error: 1,
        },
        {
          status: 500,
        }
      );
    }

    if (!body.token) {
      console.error(
        "[ONLYOFFICE CALLBACK] Missing token"
      );

      return NextResponse.json(
        {
          error: 1,
        },
        {
          status: 400,
        }
      );
    }

    let decodedToken:
      | OnlyOfficeTokenPayload
      | null = null;

    try {
      decodedToken =
        jwt.verify(
          body.token,
          jwtSecret
        ) as OnlyOfficeTokenPayload;

      console.log(
        "[ONLYOFFICE CALLBACK] JWT verified"
      );
    } catch (error) {
      console.error(
        "[ONLYOFFICE CALLBACK] JWT verification failed:",
        error
      );

      return NextResponse.json(
        {
          error: 1,
        },
        {
          status: 401,
        }
      );
    }

    /**
     * JWT key phải trùng callback key.
     */

    if (
      decodedToken.key &&
      decodedToken.key !== key
    ) {
      console.error(
        "[ONLYOFFICE CALLBACK] JWT key mismatch"
      );

      return NextResponse.json(
        {
          error: 1,
        },
        {
          status: 401,
        }
      );
    }

    /**
     * =======================================================
     * 4. ONLY SAVE STATUS 2 / 6
     * =======================================================
     */

    if (
      status !== 2 &&
      status !== 6
    ) {
      console.log(
        `[ONLYOFFICE CALLBACK] No save required for status=${status}`
      );

      return NextResponse.json({
        error: 0,
      });
    }

    /**
     * =======================================================
     * 5. PARSE DOCUMENT KEY
     * =======================================================
     */

    const {
      documentId,
      version,
    } =
      parseDocumentKey(key);

    console.log(
      "[ONLYOFFICE CALLBACK] documentId:",
      documentId
    );

    console.log(
      "[ONLYOFFICE CALLBACK] version:",
      version
    );

    /**
     * =======================================================
     * 6. CHECK ONLYOFFICE FILE URL
     * =======================================================
     */

    if (!body.url) {
      console.error(
        "[ONLYOFFICE CALLBACK] status 2/6 nhưng không có url."
      );

      return NextResponse.json(
        {
          error: 1,
        },
        {
          status: 400,
        }
      );
    }

    /**
     * =======================================================
     * 7. DOWNLOAD DOCX TỪ ONLYOFFICE
     * =======================================================
     */

    console.log(
      "[ONLYOFFICE CALLBACK] Downloading saved document..."
    );

    const response =
      await fetch(body.url, {
        method: "GET",
        cache: "no-store",
      });

    if (!response.ok) {
      throw new Error(
        `Không thể download output.docx. HTTP ${response.status}`
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    console.log(
      "[ONLYOFFICE CALLBACK] Downloaded:",
      buffer.length,
      "bytes"
    );

    if (buffer.length === 0) {
      throw new Error(
        "output.docx rỗng."
      );
    }

    /**
     * =======================================================
     * 8. SUPABASE ADMIN CLIENT
     * =======================================================
     */

    const supabase =
      getSupabaseAdmin();

    /**
     * =======================================================
     * 9. TARGET STORAGE FILE
     * =======================================================
     *
     * Ví dụ:
     *
     * announcement-documents/
     * announcement-ca60bd73-b17d-4ced-9acb-5fbc72d5730e.docx
     */

    const targetFile =
      `${documentId}.docx`;

    console.log(
      "[ONLYOFFICE CALLBACK] Storage bucket:",
      BUCKET
    );

    console.log(
      "[ONLYOFFICE CALLBACK] Storage file:",
      targetFile
    );

    /**
     * =======================================================
     * 10. UPLOAD DOCX VÀO SUPABASE STORAGE
     * =======================================================
     *
     * upsert = true:
     *
     * Nếu file đã tồn tại:
     * -> ghi đè file cũ.
     *
     * Nếu chưa tồn tại:
     * -> tạo file mới.
     */

    console.log(
      "[ONLYOFFICE CALLBACK] Uploading to Supabase Storage..."
    );

    const {
      data: uploadData,
      error: uploadError,
    } =
      await supabase.storage
        .from(BUCKET)
        .upload(
          targetFile,
          buffer,
          {
            contentType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

            upsert: true,

            cacheControl: "3600",
          }
        );

    if (uploadError) {
      console.error(
        "[ONLYOFFICE CALLBACK] Supabase upload error:",
        uploadError
      );

      throw new Error(
        `Không thể lưu DOCX vào Supabase Storage: ${uploadError.message}`
      );
    }

    console.log(
      "[ONLYOFFICE CALLBACK] Upload success:",
      uploadData
    );

    /**
     * =======================================================
     * 11. RESPONSE
     * =======================================================
     */

    console.log(
      `[ONLYOFFICE CALLBACK] Save completed successfully. status=${status}`
    );

    return NextResponse.json({
      error: 0,

      ok: true,

      documentId,

      documentKey: key,

      version,

      bucket: BUCKET,

      file: targetFile,
    });
  } catch (error) {
    console.error(
      "[ONLYOFFICE CALLBACK] ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: 1,

        message:
          error instanceof Error
            ? error.message
            : "Không thể lưu tài liệu.",
      },
      {
        status: 500,
      }
    );
  }
}