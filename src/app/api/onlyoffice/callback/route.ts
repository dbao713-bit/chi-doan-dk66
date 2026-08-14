import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

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
 * documentKey có dạng:
 *
 * oo-test-docx-1786637787300
 *
 * Ta cần lấy:
 *
 * test-docx
 *
 * và version:
 *
 * 1786637787300
 *
 * Vì documentId có thể chứa dấu "-"
 * nên KHÔNG dùng split("-") đơn giản.
 *
 * Ta lấy phần sau "oo-" và tách
 * phần version cuối cùng.
 */
function parseDocumentKey(key: string) {
  if (!key.startsWith("oo-")) {
    throw new Error(
      `documentKey không hợp lệ: ${key}`
    );
  }

  const value =
    key.substring(3);

  const lastDash =
    value.lastIndexOf("-");

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

export async function POST(
  request: NextRequest
) {
  console.log("\n========================================");
  console.log(
    "[ONLYOFFICE CALLBACK] POST"
  );

  try {
    /**
     * ---------------------------------------------------------
     * READ BODY
     * ---------------------------------------------------------
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
     * ---------------------------------------------------------
     * BASIC VALIDATION
     * ---------------------------------------------------------
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
     * ---------------------------------------------------------
     * JWT VERIFY
     * ---------------------------------------------------------
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
     * Kiểm tra key trong JWT phải trùng
     * key trong callback body.
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
     * ---------------------------------------------------------
     * STATUS
     * ---------------------------------------------------------
     *
     * ONLYOFFICE callback:
     *
     * 1 = document opened
     * 2 = document ready for saving
     * 3 = saving error
     * 4 = document closed without changes
     * 6 = force save
     *
     * Ta chỉ cần download khi:
     *
     * status === 2
     *
     * hoặc:
     *
     * status === 6
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
     * ---------------------------------------------------------
     * PARSE DOCUMENT KEY
     * ---------------------------------------------------------
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
     * ---------------------------------------------------------
     * URL
     * ---------------------------------------------------------
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
     * ---------------------------------------------------------
     * TARGET FILE
     * ---------------------------------------------------------
     */

    const documentsDir =
      path.join(
        process.cwd(),
        "public",
        "documents"
      );

    /**
     * Đảm bảo thư mục tồn tại.
     */

    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(
        documentsDir,
        {
          recursive: true,
        }
      );
    }

    const targetPath =
      path.join(
        documentsDir,
        `${documentId}.docx`
      );

    console.log(
      "[ONLYOFFICE CALLBACK] Target:",
      targetPath
    );

    /**
     * ---------------------------------------------------------
     * DOWNLOAD OUTPUT DOCX
     * ---------------------------------------------------------
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
     * ---------------------------------------------------------
     * SAVE FILE
     * ---------------------------------------------------------
     */

    fs.writeFileSync(
      targetPath,
      buffer
    );

    console.log(
      "[ONLYOFFICE CALLBACK] File saved:",
      targetPath
    );

    /**
     * ---------------------------------------------------------
     * VERIFY FILE
     * ---------------------------------------------------------
     */

    const savedStat =
      fs.statSync(targetPath);

    console.log(
      "[ONLYOFFICE CALLBACK] Size:",
      savedStat.size,
      "bytes"
    );

    console.log(
      "[ONLYOFFICE CALLBACK] Saved file size:",
      savedStat.size
    );

    console.log(
      `[ONLYOFFICE CALLBACK] Save completed successfully. status=${status}`
    );

    /**
     * ---------------------------------------------------------
     * RESPONSE
     * ---------------------------------------------------------
     */

    return NextResponse.json({
      error: 0,
    });
  } catch (error) {
    console.error(
      "[ONLYOFFICE CALLBACK] ERROR:",
      error
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
}