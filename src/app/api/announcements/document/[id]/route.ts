import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";

export const runtime = "nodejs";

const BUCKET = "announcement-documents";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url) {
    throw new Error("Thiếu SUPABASE_URL.");
  }

  if (!secretKey) {
    throw new Error("Thiếu SUPABASE_SECRET_KEY.");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isValidId(id: string) {
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
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Thiếu announcementId.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidId(id)) {
      return NextResponse.json(
        {
          error: "announcementId không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    const documentId = `announcement-${id}`;
    const fileName = `${documentId}.docx`;

    console.log(
      "[ANNOUNCEMENT DOCUMENT HTML] Loading:",
      fileName
    );

    const supabase = getSupabaseAdmin();

    const {
      data: file,
      error: downloadError,
    } = await supabase.storage
      .from(BUCKET)
      .download(fileName);

    if (downloadError) {
      console.error(
        "[ANNOUNCEMENT DOCUMENT HTML] Download error:",
        downloadError
      );

      return NextResponse.json(
        {
          error:
            `Không thể tải tài liệu: ${downloadError.message}`,
        },
        {
          status: 404,
        }
      );
    }

    if (!file) {
      return NextResponse.json(
        {
          error: "Không tìm thấy tài liệu.",
        },
        {
          status: 404,
        }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    console.log(
      "[ANNOUNCEMENT DOCUMENT HTML] DOCX size:",
      buffer.length
    );

    const result = await mammoth.convertToHtml(
      {
        buffer,
      },
      {
        styleMap: [
          "p[style-name='Title'] => h1",
          "p[style-name='Heading 1'] => h2",
          "p[style-name='Heading 2'] => h3",
          "p[style-name='Heading 3'] => h4",
        ],
      }
    );

    const html = sanitizeHtml(result.value, {
      allowedTags: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "ul",
        "ol",
        "li",
        "blockquote",
        "table",
        "thead",
        "tbody",
        "tfoot",
        "tr",
        "th",
        "td",
        "a",
        "img",
        "span",
        "div",
      ],

      allowedAttributes: {
        a: ["href", "target", "rel"],
        img: ["src", "alt", "width", "height"],
        td: ["colspan", "rowspan"],
        th: ["colspan", "rowspan"],
        span: ["style"],
        p: ["style"],
        div: ["style"],
      },

      allowedSchemes: [
        "http",
        "https",
        "mailto",
      ],

      allowedSchemesByTag: {
        img: ["http", "https"],
      },

      transformTags: {
        a: sanitizeHtml.simpleTransform(
          "a",
          {
            target: "_blank",
            rel: "noopener noreferrer",
          },
          true
        ),
      },
    });

    return new NextResponse(
      JSON.stringify({
        ok: true,
        announcementId: id,
        documentId,
        html,
        messages: result.messages,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(
      "[ANNOUNCEMENT DOCUMENT HTML] ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể chuyển tài liệu thành HTML.",
      },
      {
        status: 500,
      }
    );
  }
}