import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

/**
 * ---------------------------------------------------------
 * ONLYOFFICE NETWORK URL
 * ---------------------------------------------------------
 *
 * ONLYOFFICE chạy trong Docker.
 *
 * Docker gọi Next.js thông qua:
 *
 * http://host.docker.internal:3000
 *
 * ---------------------------------------------------------
 */

function getOnlyOfficeHostUrl() {
  return (
    process.env.ONLYOFFICE_PUBLIC_URL ||
    "http://host.docker.internal:3000"
  );
}

/**
 * ---------------------------------------------------------
 * VALID DOCUMENT ID
 * ---------------------------------------------------------
 */

function isValidDocumentId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * ---------------------------------------------------------
 * GET CONFIG
 * ---------------------------------------------------------
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
     *
     * edit:
     *   Cho phép chỉnh sửa.
     *
     * view:
     *   Chỉ xem.
     *
     * Mặc định là edit để không phá
     * các trang cũ đang sử dụng Editor.
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
     * FILE PATH
     * -------------------------------------------------------
     */

    const filePath =
      path.join(
        process.cwd(),
        "public",
        "documents",
        `${documentId}.docx`
      );

    console.log(
      "[ONLYOFFICE CONFIG] filePath:",
      filePath
    );

    /**
     * -------------------------------------------------------
     * CHECK FILE
     * -------------------------------------------------------
     */

    if (!fs.existsSync(filePath)) {
      console.error(
        "[ONLYOFFICE CONFIG] File không tồn tại:",
        filePath
      );

      return NextResponse.json(
        {
          error:
            `Không tìm thấy tài liệu ${documentId}.docx`,
        },
        {
          status: 404,
        }
      );
    }

    /**
     * -------------------------------------------------------
     * FILE VERSION
     * -------------------------------------------------------
     *
     * Dùng mtime của file để tạo document key.
     *
     * Khi callback lưu DOCX mới:
     *
     * public/documents/<documentId>.docx
     *
     * mtime thay đổi.
     *
     * documentKey cũng thay đổi.
     */

    const stat =
      fs.statSync(filePath);

    const version =
      Math.floor(stat.mtimeMs);

    console.log(
      "[ONLYOFFICE CONFIG] version:",
      version
    );

    /**
     * -------------------------------------------------------
     * DOCUMENT KEY
     * -------------------------------------------------------
     */

    const documentKey =
      `oo-${documentId}-${version}`;

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
     * ONLYOFFICE Docker sẽ dùng URL này
     * để lấy DOCX và gọi callback.
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
          /**
           * EDIT:
           *
           * edit page:
           * true
           *
           * detail page:
           * false
           */

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
        /**
         * edit:
         *
         * Có thể sửa DOCX.
         *
         * view:
         *
         * Chỉ xem DOCX.
         */

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