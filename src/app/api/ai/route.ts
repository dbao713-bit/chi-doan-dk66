import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/* =========================================================
   AI ROUTE — CHI ĐOÀN D-K66
   FAST PATH + AI-FIRST + RAG-LIKE CONTEXT + SUPABASE + CACHE
========================================================= */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   CONFIG
========================================================= */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODELS = [
  ...new Set(
    [
      process.env.GEMINI_MODEL,
      "gemini-3.6-flash",
    ].filter(Boolean)
  ),
] as string[];

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY;

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    })
  : null;

const supabase =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

/* =========================================================
   TYPES
========================================================= */

type AIMode = "public" | "admin";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AIRequest = {
  message?: unknown;
  history?: unknown;
  page?: unknown;
  mode?: unknown;
};

type DatabaseContext = {
  members?: string;
  announcements?: string;
  activities?: string;
  documents?: string;
};

type CacheItem = {
  value: string;
  expiresAt: number;
};

type GeminiHealth = {
  unavailableUntil: number;
  reason: string;
};

type GeminiFailureReason =
  | "missing_api_key"
  | "rate_limit"
  | "quota_exceeded"
  | "service_unavailable"
  | "timeout"
  | "network"
  | "model_not_found"
  | "unknown";

type GeminiCallResult =
  | {
      ok: true;
      answer: string;
      model: string;
    }
  | {
      ok: false;
      reason: GeminiFailureReason;
      retryAfterMs?: number;
      detail?: string;
    };

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_MESSAGE_LENGTH = 5000;

const MAX_HISTORY_MESSAGES = 12;

const MAX_HISTORY_ITEM_LENGTH = 1200;

const CACHE_TTL = 10 * 60 * 1000;

const DATABASE_CACHE_TTL = 2 * 60 * 1000;

const GEMINI_CACHE_TTL = 20 * 60 * 1000;

const GEMINI_COOLDOWN_MIN = 30 * 1000;

const GEMINI_COOLDOWN_MAX = 5 * 60 * 1000;

const AI_RATE_LIMIT_WINDOW_MS =
  Number(process.env.AI_RATE_LIMIT_WINDOW_MS) ||
  60 * 1000;

const AI_RATE_LIMIT_MAX_REQUESTS =
  Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS) ||
  15;

const GEMINI_RETRY_DELAYS = [700, 1600];

const GEMINI_SHORT_RETRY_MAX_MS = 3000;

/* =========================================================
   MEMORY CACHE
========================================================= */

const responseCache =
  new Map<string, CacheItem>();

const rateLimitBuckets =
  new Map<string, RateLimitBucket>();

let geminiHealth: GeminiHealth | null = null;

function getCache(
  key: string
): string | null {
  const item =
    responseCache.get(key);

  if (!item) {
    return null;
  }

  if (
    Date.now() >=
    item.expiresAt
  ) {
    responseCache.delete(key);
    return null;
  }

  return item.value;
}

function setCache(
  key: string,
  value: string,
  ttl: number = CACHE_TTL
) {
  responseCache.set(
    key,
    {
      value,
      expiresAt:
        Date.now() + ttl,
    }
  );

  /*
   * Tránh memory cache tăng vô hạn.
   */
  while (
    responseCache.size > 300
  ) {
    const firstKey =
      responseCache
        .keys()
        .next()
        .value;

    if (!firstKey) {
      break;
    }

    responseCache.delete(
      firstKey
    );
  }
}

function clearExpiredCache() {
  const now = Date.now();

  for (
    const [key, item]
    of responseCache.entries()
  ) {
    if (
      item.expiresAt <= now
    ) {
      responseCache.delete(key);
    }
  }
}


/* =========================================================
   REQUEST RATE LIMIT
   Chống spam ở tầng API theo IP.
   Lưu ý: đây là bộ giới hạn in-memory theo từng Vercel instance.
   Nó có tác dụng ngay mà không cần thêm database.
========================================================= */

function getClientIp(
  request: Request
) {
  const forwarded =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwarded) {
    return (
      forwarded
        .split(",")[0]
        ?.trim() ||
      "unknown"
    );
  }

  return (
    request.headers.get(
      "x-real-ip"
    ) ||
    request.headers.get(
      "cf-connecting-ip"
    ) ||
    "unknown"
  );
}

function checkRateLimit(
  key: string
) {
  const now = Date.now();

  const current =
    rateLimitBuckets.get(key);

  if (
    !current ||
    now >= current.resetAt
  ) {
    const bucket: RateLimitBucket = {
      count: 1,
      resetAt:
        now +
        AI_RATE_LIMIT_WINDOW_MS,
    };

    rateLimitBuckets.set(
      key,
      bucket
    );

    return {
      allowed: true,
      remaining:
        Math.max(
          AI_RATE_LIMIT_MAX_REQUESTS -
            1,
          0
        ),
      retryAfterSeconds: 0,
    };
  }

  if (
    current.count >=
    AI_RATE_LIMIT_MAX_REQUESTS
  ) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            (current.resetAt -
              now) /
              1000
          )
        ),
    };
  }

  current.count += 1;

  rateLimitBuckets.set(
    key,
    current
  );

  return {
    allowed: true,
    remaining:
      Math.max(
        AI_RATE_LIMIT_MAX_REQUESTS -
          current.count,
        0
      ),
    retryAfterSeconds: 0,
  };
}

function clearExpiredRateLimits() {
  const now = Date.now();

  for (
    const [key, bucket]
    of rateLimitBuckets.entries()
  ) {
    if (
      bucket.resetAt <= now
    ) {
      rateLimitBuckets.delete(
        key
      );
    }
  }
}

/* =========================================================
   GEMINI HEALTH / COOLDOWN
========================================================= */

function getGeminiHealth() {
  if (!geminiHealth) {
    return null;
  }

  if (
    Date.now() >=
    geminiHealth.unavailableUntil
  ) {
    geminiHealth = null;
    return null;
  }

  return geminiHealth;
}

function setGeminiCooldown(
  milliseconds: number,
  reason: string
) {
  const safeDuration =
    Math.min(
      Math.max(
        milliseconds,
        GEMINI_COOLDOWN_MIN
      ),
      GEMINI_COOLDOWN_MAX
    );

  geminiHealth = {
    unavailableUntil:
      Date.now() +
      safeDuration,
    reason,
  };
}

/* =========================================================
   TEXT UTILITIES
========================================================= */

function normalize(
  text: string
) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /đ/g,
      "d"
    )
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function hasAny(
  text: string,
  keywords: string[]
) {
  return keywords.some(
    (keyword) =>
      text.includes(keyword)
  );
}

function truncate(
  value:
    | string
    | null
    | undefined,
  maxLength: number
) {
  if (!value) {
    return "";
  }

  if (
    value.length <=
    maxLength
  ) {
    return value;
  }

  return `${value.slice(
    0,
    maxLength
  )}...`;
}

function cleanText(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
}

function unique<T>(
  items: T[]
) {
  return [
    ...new Set(items),
  ];
}

/* =========================================================
   CACHE KEY
========================================================= */

function createCacheKey(
  message: string,
  mode: AIMode
) {
  const normalized =
    normalize(message);

  return `${mode}:${normalized}`;
}

/* =========================================================
   WEBSITE CORE KNOWLEDGE
========================================================= */

const WEBSITE_KNOWLEDGE = `
# DANH TÍNH WEBSITE

Tên website:
Chi đoàn D-K66 – Trường THPT Hà Trung.

Website được xây dựng nhằm:
- Lưu giữ thông tin và kỷ niệm của Chi đoàn.
- Giới thiệu Chi đoàn D-K66.
- Quản lý đoàn viên.
- Đăng tải hoạt động.
- Đăng tải thông báo.
- Quản lý tài liệu.
- Lưu trữ thư viện hình ảnh.
- Hỗ trợ Ban Chấp hành quản lý công việc.

Các khu vực chính:
- Trang chủ.
- Giới thiệu.
- Hoạt động.
- Thông báo.
- Tài liệu.
- Thư viện.
- Liên hệ.
- Đăng nhập BCH/Admin.
- Dashboard quản trị.

# BAN CHẤP HÀNH CHI ĐOÀN D-K66

Bí thư:
Nguyễn Thị Huyền.

Phó Bí thư:
Đinh Anh Bảo.

Uỷ viên BCH:
Đỗ Ngọc Châu.

# NGƯỜI XÂY DỰNG WEBSITE

Website Chi đoàn D-K66 được Đinh Anh Bảo sáng lập và trực tiếp xây dựng.

Đinh Anh Bảo tham gia:
- Lên ý tưởng.
- Thiết kế giao diện.
- Phát triển website.
- Xây dựng Dashboard.
- Phát triển hệ thống AI.
- Tích hợp các chức năng quản lý.
- Tích hợp OnlyOffice.

# THÔNG TIN ĐOÀN VIÊN

Thông tin cấu hình hiện có:
- 26 đoàn viên nam.
- 18 đoàn viên nữ.
- Tổng cộng 44 đoàn viên.

Nếu dữ liệu Supabase khác với thông tin cấu hình thì ưu tiên dữ liệu Supabase.

# ĐỊA CHỈ

Chi đoàn D-K66 – Trường THPT Hà Trung.

Địa chỉ được cấu hình:
Xã Hoạt Giang, tỉnh Thanh Hoá.

# ĐOÀN TRƯỜNG

Bí thư BCH Đoàn trường:
Thầy Trịnh Cao Cường.

Phó Bí thư BCH Đoàn trường:
Cô Lê Thị Đạm.

# BAN GIÁM HIỆU

Hiệu trưởng:
Thầy Trịnh Xuân Thanh.

Phó Hiệu trưởng:
Thầy Nguyễn Văn Dũng.

Phó Hiệu trưởng:
Cô Đoàn Văn Ân.

# CÔNG NGHỆ WEBSITE

Website có:
- Next.js.
- Supabase.
- Vercel.
- Gemini AI.
- OnlyOffice trong một số luồng tài liệu.

# MỤC ĐÍCH CỦA TRỢ LÝ AI

Trợ lý AI có hai vai trò:

1. Trợ lý thông minh của website Chi đoàn D-K66.
Có thể trả lời về:
- Chi đoàn.
- BCH.
- Đoàn viên.
- Hoạt động.
- Thông báo.
- Tài liệu.
- Thư viện.
- Website.
- Dashboard.
- OnlyOffice.

2. Trợ lý AI tổng quát.
Nếu người dùng hỏi kiến thức ngoài website như:
- Học tập.
- Lập trình.
- Toán.
- Văn.
- Lịch sử.
- Khoa học.
- Công nghệ.
- Cuộc sống.
- Viết nội dung.
- Phân tích.
- Giải thích.

Thì vẫn trả lời bằng năng lực AI tổng quát.

# NGUYÊN TẮC ĐỘ CHÍNH XÁC

Ưu tiên theo thứ tự:

1. Dữ liệu động được cung cấp từ Supabase.
2. Thông tin chính thức trong WEBSITE_KNOWLEDGE.
3. Kiến thức tổng quát của mô hình AI.

Không được bịa:
- Tên người.
- Số liệu Chi đoàn.
- Hoạt động.
- Thông báo.
- Tài liệu.
- Sự kiện.

Nếu không có dữ liệu website thì nói rõ không có dữ liệu.

# BẢO MẬT

Không tiết lộ:
- API key.
- Secret key.
- Access token.
- JWT secret.
- Mật khẩu.
- Cookie.
- Thông tin xác thực.
- Cấu hình bí mật.

Không hướng dẫn vượt qua:
- Đăng nhập.
- Phân quyền.
- Xác thực.

# PHONG CÁCH

- Luôn trả lời bằng tiếng Việt trừ khi người dùng yêu cầu ngôn ngữ khác.
- Tự nhiên như một trợ lý AI hiện đại.
- Không nói máy móc.
- Không liên tục nhắc lại "tôi là AI của website".
- Không ép người dùng phải hỏi đúng mẫu.
- Hiểu tiếng Việt không dấu.
- Hiểu viết tắt.
- Hiểu lỗi chính tả nhẹ.
- Hiểu ngữ cảnh từ các tin nhắn trước.
- Với câu hỏi đơn giản: trả lời ngắn.
- Với câu hỏi phức tạp: giải thích đầy đủ.
- Nếu câu hỏi mơ hồ: cố gắng suy luận trước khi yêu cầu làm rõ.
`;

/* =========================================================
   SYSTEM INSTRUCTION
========================================================= */

const SYSTEM_INSTRUCTION = `
Bạn là "Trợ lý AI D-K66", một trợ lý AI hiện đại được tích hợp trên website Chi đoàn D-K66 – Trường THPT Hà Trung.

Bạn không phải chatbot keyword đơn giản.

Bạn phải suy luận ý nghĩa câu hỏi theo ngữ cảnh tự nhiên.

Bạn có khả năng:
- Trả lời thông tin về Chi đoàn D-K66.
- Sử dụng dữ liệu hệ thống được cung cấp trong context.
- Hướng dẫn sử dụng website.
- Giải thích Dashboard.
- Trả lời kiến thức tổng quát ngoài phạm vi website.
- Giải quyết các vấn đề học tập, công nghệ, lập trình và đời sống.

QUY TẮC QUAN TRỌNG:

1. Không tự giới hạn mình chỉ trả lời câu hỏi về website.

2. Nếu người dùng hỏi một vấn đề tổng quát:
Hãy trả lời như một AI thông minh bình thường.

3. Nếu người dùng hỏi về Chi đoàn:
Ưu tiên dữ liệu trong context.

4. Nếu người dùng hỏi về dữ liệu động:
Chỉ sử dụng dữ liệu Supabase được cung cấp.

5. Không bịa dữ liệu nội bộ.

6. Không trả lời kiểu:
"Mình chỉ có thể hỗ trợ..."
trừ khi thực sự cần thiết.

7. Không nói:
"Mình chưa được huấn luyện..."
hoặc
"Mình không xử lý được câu này..."
nếu câu hỏi là kiến thức tổng quát mà bạn có thể trả lời.

8. Khi người dùng hỏi tiếp một câu liên quan đến câu trả lời trước:
Phải đọc lịch sử hội thoại để hiểu ngữ cảnh.

9. Nếu người dùng viết:
- không dấu
- viết tắt
- sai chính tả nhẹ

hãy tự suy luận ý định.

10. Không tiết lộ thông tin bí mật hệ thống.

11. Không tự nhận đã thao tác trên hệ thống nếu bạn chỉ đang tư vấn.

12. Không cần nhắc lại toàn bộ context.

13. Trả lời trực tiếp vào vấn đề.

14. Có thể sử dụng markdown nhẹ:
- tiêu đề
- danh sách
- in đậm
- code block

nhưng không lạm dụng.

MỤC TIÊU:
Mang lại trải nghiệm gần với Gemini hoặc ChatGPT:
thông minh, tự nhiên, hiểu ngữ cảnh, hữu ích và linh hoạt.
`;

/* =========================================================
   PAGE CONTEXT
========================================================= */

function getPageContext(
  page: string
) {
  const p =
    normalize(page || "/");

  if (
    p === "/" ||
    p === ""
  ) {
    return `
NGỮ CẢNH TRANG:
Người dùng đang ở trang chủ website.
`;
  }

  if (
    p.includes("dashboard")
  ) {
    return `
NGỮ CẢNH TRANG:
Người dùng đang ở Dashboard quản trị.
`;
  }

  if (
    p.includes("announcement")
  ) {
    return `
NGỮ CẢNH TRANG:
Người dùng đang xem khu vực Thông báo.
`;
  }

  if (
    p.includes("activity")
  ) {
    return `
NGỮ CẢNH TRANG:
Người dùng đang xem khu vực Hoạt động.
`;
  }

  if (
    p.includes("document")
  ) {
    return `
NGỮ CẢNH TRANG:
Người dùng đang ở khu vực Tài liệu.
`;
  }

  if (
    p.includes("library")
  ) {
    return `
NGỮ CẢNH TRANG:
Người dùng đang ở khu vực Thư viện.
`;
  }

  return `
NGỮ CẢNH TRANG:
Trang hiện tại: ${page}
`;
}

/* =========================================================
   FAST PATH
   CÂU HỎI TĨNH / CHẮC CHẮN
   KHÔNG QUERY SUPABASE
   KHÔNG GỌI GEMINI
========================================================= */

function getFastPathAnswer(
  message: string
): string | null {
  const q =
    normalize(message);

  /*
   * =======================================================
   * BÍ THƯ BCH
   * =======================================================
   */

  const askingSecretary =
    hasAny(q, [
      "bi thu",
      "bi thu bch",
      "bi thu ban chap hanh",
    ]);

  const askingWho =
    hasAny(q, [
      "la ai",
      "ai",
      "nguoi nao",
      "nguoi gi",
      "ten gi",
      "la nguoi nao",
    ]);

  if (
    askingSecretary &&
    askingWho &&
    !q.includes("pho bi thu")
  ) {
    return (
      "Bí thư BCH Chi đoàn D-K66 là " +
      "Nguyễn Thị Huyền."
    );
  }

  /*
   * Trường hợp người dùng chỉ hỏi:
   * "Bí thư?"
   */

  if (
    q === "bi thu"
  ) {
    return (
      "Bí thư BCH Chi đoàn D-K66 là " +
      "Nguyễn Thị Huyền."
    );
  }

  /*
   * =======================================================
   * PHÓ BÍ THƯ BCH
   * =======================================================
   */

  const askingViceSecretary =
    hasAny(q, [
      "pho bi thu",
      "pho bi thu bch",
      "pho bi thu ban chap hanh",
    ]);

  if (
    askingViceSecretary &&
    askingWho
  ) {
    return (
      "Phó Bí thư BCH Chi đoàn D-K66 là " +
      "Đinh Anh Bảo."
    );
  }

  if (
    q === "pho bi thu"
  ) {
    return (
      "Phó Bí thư BCH Chi đoàn D-K66 là " +
      "Đinh Anh Bảo."
    );
  }

  /*
   * =======================================================
   * UỶ VIÊN BCH
   * =======================================================
   */

  const askingCommitteeMember =
    hasAny(q, [
      "uy vien",
      "uy vien bch",
      "uy vien ban chap hanh",
      "uy vien cua bch",
    ]);

  if (
    askingCommitteeMember &&
    askingWho
  ) {
    return (
      "Uỷ viên BCH Chi đoàn D-K66 là " +
      "Đỗ Ngọc Châu."
    );
  }

  /*
   * =======================================================
   * TOÀN BỘ BCH
   * =======================================================
   */

  const askingCommittee =
    hasAny(q, [
      "bch",
      "ban chap hanh",
    ]);

  const askingList =
    hasAny(q, [
      "gom nhung ai",
      "gom ai",
      "co nhung ai",
      "co ai",
      "danh sach",
      "thanh phan",
      "bao gom nhung ai",
      "bao gom ai",
    ]);

  if (
    askingCommittee &&
    askingList
  ) {
    return `Ban Chấp hành Chi đoàn D-K66 gồm:

• Bí thư: Nguyễn Thị Huyền
• Phó Bí thư: Đinh Anh Bảo
• Uỷ viên BCH: Đỗ Ngọc Châu`;
  }

  /*
   * =======================================================
   * NGƯỜI XÂY DỰNG WEBSITE
   * =======================================================
   */

  if (
    hasAny(q, [
      "ai tao website",
      "ai lam website",
      "ai xay dung website",
      "nguoi sang lap website",
      "ai sang lap website",
      "website do ai tao",
      "website do ai xay dung",
    ])
  ) {
    return (
      "Website Chi đoàn D-K66 được " +
      "Đinh Anh Bảo sáng lập và trực tiếp xây dựng."
    );
  }

  /*
   * =======================================================
   * WEBSITE LÀ GÌ
   * =======================================================
   */

  if (
    hasAny(q, [
      "website nay la gi",
      "web nay la gi",
      "chi doan d k66 la gi",
      "dk66 la gi",
      "website dung de lam gi",
    ])
  ) {
    return `Đây là website của Chi đoàn D-K66 – Trường THPT Hà Trung.

Website được xây dựng để giới thiệu Chi đoàn, lưu giữ thông tin và kỷ niệm, quản lý đoàn viên, hoạt động, thông báo, tài liệu, thư viện hình ảnh và hỗ trợ Ban Chấp hành.`;
  }

  /*
   * =======================================================
   * ĐỊA CHỈ
   * =======================================================
   */

  if (
    hasAny(q, [
      "chi doan o dau",
      "chi doan nam o dau",
      "dia chi chi doan",
      "truong ha trung o dau",
    ])
  ) {
    return (
      "Chi đoàn D-K66 – Trường THPT Hà Trung, " +
      "địa chỉ được cấu hình tại xã Hoạt Giang, tỉnh Thanh Hoá."
    );
  }

  /*
   * =======================================================
   * SỐ LƯỢNG ĐOÀN VIÊN CẤU HÌNH
   *
   * Lưu ý:
   * Đây chỉ là fast path cho dữ liệu cấu hình.
   * Nếu câu hỏi cần dữ liệu động chính xác,
   * hệ thống vẫn có thể dùng Supabase.
   * =======================================================
   */

  if (
    hasAny(q, [
      "tong so doan vien la bao nhieu",
      "chi doan co bao nhieu doan vien",
      "co bao nhieu doan vien",
    ])
  ) {
    return (
      "Theo thông tin cấu hình hiện tại, " +
      "Chi đoàn D-K66 có tổng cộng 44 đoàn viên."
    );
  }

  return null;
}

/* =========================================================
   QUERY CLASSIFICATION
========================================================= */

type QueryTopic =
  | "member"
  | "announcement"
  | "activity"
  | "document"
  | "website"
  | "general";

function classifyQuery(
  message: string
): QueryTopic[] {
  const q =
    normalize(message);

  const topics: QueryTopic[] = [];

  if (
    hasAny(q, [
      "doan vien",
      "thanh vien",
      "quan so",
      "si so",
      "bao nhieu nguoi",
      "bao nhieu nam",
      "bao nhieu nu",
      "gioi tinh",
      "thanh vien chi doan",
    ])
  ) {
    topics.push(
      "member"
    );
  }

  if (
    hasAny(q, [
      "thong bao",
      "tin moi",
      "tin tuc",
      "thong tin moi",
      "thong bao moi",
    ])
  ) {
    topics.push(
      "announcement"
    );
  }

  if (
    hasAny(q, [
      "hoat dong",
      "su kien",
      "chuong trinh",
      "ke hoach hoat dong",
    ])
  ) {
    topics.push(
      "activity"
    );
  }

  if (
    hasAny(q, [
      "tai lieu",
      "van ban",
      "file",
      "cong van",
      "bien ban",
      "ke hoach",
      "onlyoffice",
    ])
  ) {
    topics.push(
      "document"
    );
  }

  if (
    hasAny(q, [
      "chi doan",
      "d k66",
      "dk66",
      "bch",
      "website",
      "dashboard",
      "doan truong",
      "truong thpt ha trung",
      "bi thu",
      "pho bi thu",
    ])
  ) {
    topics.push(
      "website"
    );
  }

  if (!topics.length) {
    topics.push(
      "general"
    );
  }

  return unique(topics);
}

/* =========================================================
   SUPABASE — MEMBERS
========================================================= */

async function getMemberContext() {
  if (!supabase) {
    return null;
  }

  try {
    const result =
      await supabase
        .from("members")
        .select("*")
        .limit(100);

    if (result.error) {
      console.error(
        "[AI members]",
        result.error.message
      );

      return null;
    }

    const members =
      result.data || [];

    if (!members.length) {
      return `
DỮ LIỆU ĐOÀN VIÊN:
Hiện chưa có dữ liệu đoàn viên trong bảng members.
`;
    }

    const total =
      members.length;

    /*
     * Tự dò các cột giới tính phổ biến.
     */

    const genderValues =
      members.map(
        (member: any) => {
          return String(
            member.gender ||
              member.sex ||
              member.gioi_tinh ||
              ""
          )
            .toLowerCase()
            .trim();
        }
      );

    const male =
      genderValues.filter(
        (gender) =>
          [
            "male",
            "nam",
            "m",
          ].includes(
            gender
          )
      ).length;

    const female =
      genderValues.filter(
        (gender) =>
          [
            "female",
            "nu",
            "nữ",
            "f",
          ].includes(
            gender
          )
      ).length;

    const sampleMembers =
      members
        .slice(0, 30)
        .map(
          (
            member: any,
            index: number
          ) => {
            const name =
              member.full_name ||
              member.name ||
              member.ho_ten ||
              "Chưa rõ tên";

            const role =
              member.role ||
              member.position ||
              member.chuc_vu ||
              "";

            return `${index + 1}. ${name}${
              role
                ? ` — ${role}`
                : ""
            }`;
          }
        )
        .join("\n");

    return `
DỮ LIỆU ĐOÀN VIÊN TỪ SUPABASE:

Tổng số bản ghi:
${total}

Số nam phát hiện được:
${male || "Chưa xác định"}

Số nữ phát hiện được:
${female || "Chưa xác định"}

Danh sách mẫu:
${sampleMembers}
`;
  } catch (error) {
    console.error(
      "[AI member context]",
      error
    );

    return null;
  }
}

/* =========================================================
   SUPABASE — ANNOUNCEMENTS
========================================================= */

async function getAnnouncementContext() {
  if (!supabase) {
    return null;
  }

  try {
    const result =
      await supabase
        .from("announcements")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(10);

    if (result.error) {
      console.error(
        "[AI announcements]",
        result.error.message
      );

      return null;
    }

    const announcements =
      result.data || [];

    if (
      !announcements.length
    ) {
      return `
DỮ LIỆU THÔNG BÁO:
Hiện chưa có thông báo.
`;
    }

    const text =
      announcements
        .map(
          (
            item: any,
            index: number
          ) => {
            return `
THÔNG BÁO ${index + 1}

Tiêu đề:
${
  item.title ||
  "Không có tiêu đề"
}

Nội dung:
${truncate(
  item.content ||
    item.description ||
    "",
  1500
)}

Người đăng:
${
  item.author ||
  "Chưa xác định"
}

Ngày:
${
  item.created_at ||
  "Chưa xác định"
}
`;
          }
        )
        .join(
          "\n---\n"
        );

    return `
DỮ LIỆU THÔNG BÁO MỚI NHẤT:

${text}
`;
  } catch (error) {
    console.error(
      "[AI announcement context]",
      error
    );

    return null;
  }
}

/* =========================================================
   SUPABASE — ACTIVITIES
========================================================= */

async function getActivityContext() {
  if (!supabase) {
    return null;
  }

  try {
    const result =
      await supabase
        .from("activities")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(10);

    if (result.error) {
      console.error(
        "[AI activities]",
        result.error.message
      );

      return null;
    }

    const activities =
      result.data || [];

    if (
      !activities.length
    ) {
      return `
DỮ LIỆU HOẠT ĐỘNG:
Hiện chưa có hoạt động.
`;
    }

    const text =
      activities
        .map(
          (
            item: any,
            index: number
          ) => {
            return `
HOẠT ĐỘNG ${index + 1}

Tên:
${
  item.title ||
  "Chưa có tên"
}

Mô tả:
${truncate(
  item.description ||
    item.content ||
    "",
  1500
)}

Địa điểm:
${
  item.location ||
  "Chưa cập nhật"
}

Thời gian bắt đầu:
${
  item.start_at ||
  "Chưa cập nhật"
}

Thời gian kết thúc:
${
  item.end_at ||
  "Chưa cập nhật"
}

Trạng thái:
${
  item.status ||
  "Chưa cập nhật"
}
`;
          }
        )
        .join(
          "\n---\n"
        );

    return `
DỮ LIỆU HOẠT ĐỘNG:

${text}
`;
  } catch (error) {
    console.error(
      "[AI activity context]",
      error
    );

    return null;
  }
}

/* =========================================================
   SUPABASE — DOCUMENTS
========================================================= */

async function getDocumentContext() {
  if (!supabase) {
    return null;
  }

  try {
    const result =
      await supabase
        .from("documents")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(10);

    if (result.error) {
      console.error(
        "[AI documents]",
        result.error.message
      );

      return null;
    }

    const documents =
      result.data || [];

    if (
      !documents.length
    ) {
      return `
DỮ LIỆU TÀI LIỆU:
Hiện chưa có tài liệu.
`;
    }

    const text =
      documents
        .map(
          (
            item: any,
            index: number
          ) => {
            return `
TÀI LIỆU ${index + 1}

Tên:
${
  item.title ||
  "Chưa có tên"
}

Mô tả:
${truncate(
  item.description ||
    "",
  1000
)}

Loại:
${
  item.category ||
  "Chưa xác định"
}

Tên file:
${
  item.file_name ||
  "Chưa xác định"
}

Người đăng:
${
  item.author ||
  "Chưa xác định"
}

Ngày:
${
  item.created_at ||
  "Chưa xác định"
}
`;
          }
        )
        .join(
          "\n---\n"
        );

    return `
DỮ LIỆU TÀI LIỆU:

${text}
`;
  } catch (error) {
    console.error(
      "[AI document context]",
      error
    );

    return null;
  }
}

/* =========================================================
   BUILD DATABASE CONTEXT
========================================================= */

async function getRelevantDatabaseContext(
  message: string
): Promise<DatabaseContext> {
  const topics =
    classifyQuery(
      message
    );

  const context:
    DatabaseContext = {};

  const tasks:
    Promise<void>[] = [];

  if (
    topics.includes(
      "member"
    )
  ) {
    tasks.push(
      getMemberContext().then(
        (value) => {
          if (value) {
            context.members =
              value;
          }
        }
      )
    );
  }

  if (
    topics.includes(
      "announcement"
    )
  ) {
    tasks.push(
      getAnnouncementContext().then(
        (value) => {
          if (value) {
            context.announcements =
              value;
          }
        }
      )
    );
  }

  if (
    topics.includes(
      "activity"
    )
  ) {
    tasks.push(
      getActivityContext().then(
        (value) => {
          if (value) {
            context.activities =
              value;
          }
        }
      )
    );
  }

  if (
    topics.includes(
      "document"
    )
  ) {
    tasks.push(
      getDocumentContext().then(
        (value) => {
          if (value) {
            context.documents =
              value;
          }
        }
      )
    );
  }

  /*
   * Nếu là câu hỏi website tổng quát,
   * không cần query DB để giảm latency.
   */

  await Promise.all(
    tasks
  );

  return context;
}

function serializeDatabaseContext(
  context: DatabaseContext
) {
  const values = [
    context.members,
    context.announcements,
    context.activities,
    context.documents,
  ].filter(Boolean);

  if (!values.length) {
    return `
Không có dữ liệu động nào được tải cho câu hỏi này.
`;
  }

  return values.join(
    "\n\n"
  );
}

/* =========================================================
   CONVERSATION HISTORY
========================================================= */

function sanitizeHistory(
  history: ChatMessage[]
) {
  return history
    .slice(
      -MAX_HISTORY_MESSAGES
    )
    .map(
      (item) => ({
        role: item.role,
        content:
          cleanText(
            item.content
          ).slice(
            0,
            MAX_HISTORY_ITEM_LENGTH
          ),
      })
    )
    .filter(
      (item) =>
        item.content.length >
        0
    );
}

function formatHistory(
  history: ChatMessage[]
) {
  if (!history.length) {
    return "Chưa có lịch sử hội thoại.";
  }

  return history
    .map((item) => {
      const role =
        item.role === "user"
          ? "NGƯỜI DÙNG"
          : "TRỢ LÝ";

      return `${role}: ${item.content}`;
    })
    .join(
      "\n\n"
    );
}

/* =========================================================
   ERROR DETECTION
========================================================= */

function getErrorText(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return String(error);
}

function isRateLimitError(
  errorText: string
) {
  return /429|quota|rate.?limit|resource exhausted|too many requests/i.test(
    errorText
  );
}

function isRetryableError(
  errorText: string
) {
  return /500|502|503|504|timeout|timed out|temporar|network|fetch failed|overloaded/i.test(
    errorText
  );
}

function getRetryAfterMs(
  errorText: string
) {
  const match =
    errorText.match(
      /retry in\s+([\d.]+)\s*s/i
    );

  if (!match?.[1]) {
    return 60_000;
  }

  const seconds =
    Number(match[1]);

  if (
    !Number.isFinite(
      seconds
    )
  ) {
    return 60_000;
  }

  return Math.round(
    seconds * 1000
  );
}


function classifyGeminiFailure(
  errorText: string
): GeminiFailureReason {
  if (
    /404|not[_\s-]?found|model.*not.*found/i.test(
      errorText
    )
  ) {
    return "model_not_found";
  }

  if (
    /quota[_\s-]?exceeded|daily quota|per day|requests per day|rpd/i.test(
      errorText
    )
  ) {
    return "quota_exceeded";
  }

  if (
    isRateLimitError(
      errorText
    )
  ) {
    return "rate_limit";
  }

  if (
    /503|service.?unavailable|overloaded|temporar.*unavailable/i.test(
      errorText
    )
  ) {
    return "service_unavailable";
  }

  if (
    /504|deadline.?exceeded|timeout|timed out/i.test(
      errorText
    )
  ) {
    return "timeout";
  }

  if (
    /network|fetch failed|econn|enotfound|socket/i.test(
      errorText
    )
  ) {
    return "network";
  }

  return "unknown";
}

function getGeminiErrorMessage(
  reason: GeminiFailureReason,
  retryAfterMs?: number
) {
  const retrySeconds =
    retryAfterMs
      ? Math.max(
          1,
          Math.ceil(
            retryAfterMs /
              1000
          )
        )
      : null;

  switch (reason) {
    case "missing_api_key":
      return "Hệ thống AI chưa được cấu hình khóa Gemini trên máy chủ.";

    case "quota_exceeded":
      return "AI đã đạt hạn mức sử dụng hiện tại của dự án Gemini. Các thiết bị dùng chung website sẽ cùng bị ảnh hưởng cho đến khi hạn mức được khôi phục hoặc dự án được nâng cấp quota/Paid Tier.";

    case "rate_limit":
      return retrySeconds
        ? `Gemini đang giới hạn tần suất yêu cầu. Vui lòng thử lại sau khoảng ${retrySeconds} giây.`
        : "Gemini đang giới hạn tần suất yêu cầu. Vui lòng chờ một chút rồi thử lại.";

    case "service_unavailable":
      return "Dịch vụ Gemini hiện đang quá tải hoặc tạm thời không khả dụng. Hệ thống đã thử lại nhưng chưa thành công.";

    case "timeout":
      return "Gemini mất quá nhiều thời gian để xử lý yêu cầu. Hãy thử gửi câu hỏi ngắn hơn hoặc thử lại sau.";

    case "network":
      return "Máy chủ website tạm thời không kết nối được tới Gemini. Vui lòng thử lại sau.";

    case "model_not_found":
      return "Mô hình Gemini đang cấu hình hiện không khả dụng. Quản trị viên cần kiểm tra biến GEMINI_MODEL.";

    default:
      return "Gemini gặp lỗi không xác định. Vui lòng thử lại sau ít phút.";
  }
}

/* =========================================================
   GEMINI CALL
========================================================= */

async function callGemini(
  prompt: string
): Promise<GeminiCallResult> {
  if (!ai) {
    console.error(
      "[AI] GEMINI_API_KEY chưa được cấu hình"
    );

    return {
      ok: false,
      reason: "missing_api_key",
    };
  }

  const health =
    getGeminiHealth();

  if (health) {
    console.warn(
      "[AI] Gemini đang cooldown:",
      health.reason
    );

    return {
      ok: false,
      reason:
        health.reason ===
        "quota_exceeded"
          ? "quota_exceeded"
          : "rate_limit",
      retryAfterMs:
        Math.max(
          0,
          health.unavailableUntil -
            Date.now()
        ),
    };
  }

  let lastFailure:
    GeminiCallResult = {
      ok: false,
      reason: "unknown",
    };

  for (
    const model of GEMINI_MODELS
  ) {
    let attempt = 0;

    while (
      attempt <=
      GEMINI_RETRY_DELAYS.length
    ) {
      try {
        const interaction =
          await ai.interactions.create({
            model,
            input: prompt,
          });

        const answer =
          interaction.output_text?.trim();

        if (answer) {
          return {
            ok: true,
            answer,
            model,
          };
        }

        lastFailure = {
          ok: false,
          reason: "unknown",
          detail:
            "Gemini trả về phản hồi rỗng.",
        };

        break;
      } catch (error) {
        const errorText =
          getErrorText(
            error
          );

        const reason =
          classifyGeminiFailure(
            errorText
          );

        const retryAfterMs =
          isRateLimitError(
            errorText
          )
            ? getRetryAfterMs(
                errorText
              )
            : undefined;

        console.error(
          `[AI Gemini model ${model} attempt ${attempt + 1}]`,
          errorText
        );

        lastFailure = {
          ok: false,
          reason,
          retryAfterMs,
          detail:
            truncate(
              errorText,
              500
            ),
        };

        /*
         * 404 model:
         * Không retry cùng model.
         * Chuyển sang model dự phòng.
         */
        if (
          reason ===
          "model_not_found"
        ) {
          break;
        }

        /*
         * Daily/project quota:
         * Retry không giúp ích.
         */
        if (
          reason ===
          "quota_exceeded"
        ) {
          setGeminiCooldown(
            GEMINI_COOLDOWN_MAX,
            "quota_exceeded"
          );

          return lastFailure;
        }

        /*
         * Rate limit:
         * Chỉ retry ngay nếu Google yêu cầu chờ rất ngắn.
         * Nếu phải chờ lâu, trả lỗi rõ ràng để tránh treo request.
         */
        if (
          reason ===
          "rate_limit"
        ) {
          const waitMs =
            retryAfterMs ??
            60_000;

          if (
            waitMs >
            GEMINI_SHORT_RETRY_MAX_MS
          ) {
            setGeminiCooldown(
              waitMs,
              "rate_limit"
            );

            return lastFailure;
          }
        }

        /*
         * Các lỗi không nên retry.
         */
        if (
          ![
            "rate_limit",
            "service_unavailable",
            "timeout",
            "network",
          ].includes(reason)
        ) {
          break;
        }

        if (
          attempt >=
          GEMINI_RETRY_DELAYS.length
        ) {
          break;
        }

        const baseDelay =
          GEMINI_RETRY_DELAYS[
            attempt
          ] ??
          1000;

        const delay =
          reason ===
            "rate_limit" &&
          retryAfterMs
            ? Math.min(
                retryAfterMs,
                GEMINI_SHORT_RETRY_MAX_MS
              )
            : baseDelay;

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              delay
            )
        );

        attempt += 1;
        continue;
      }
    }
  }

  return lastFailure;
}

/* =========================================================
   BUILD AI PROMPT
========================================================= */

function buildPrompt({
  message,
  history,
  page,
  mode,
  databaseContext,
}: {
  message: string;
  history: ChatMessage[];
  page: string;
  mode: AIMode;
  databaseContext: DatabaseContext;
}) {
  const modeInstruction =
    mode === "admin"
      ? `
CHẾ ĐỘ HIỆN TẠI:
Admin/BCH.

Người dùng có thể được hướng dẫn sâu hơn về Dashboard và quản trị.
Tuy nhiên vẫn phải tôn trọng bảo mật và phân quyền.
`
      : `
CHẾ ĐỘ HIỆN TẠI:
Khách truy cập công khai.

Không giả định người dùng có quyền quản trị.
`;

  return `
${SYSTEM_INSTRUCTION}

==================================================

THÔNG TIN CHÍNH THỨC WEBSITE

${WEBSITE_KNOWLEDGE}

==================================================

${getPageContext(
  page
)}

==================================================

${modeInstruction}

==================================================

DỮ LIỆU ĐỘNG TỪ HỆ THỐNG

${serializeDatabaseContext(
  databaseContext
)}

==================================================

LỊCH SỬ HỘI THOẠI

${formatHistory(
  history
)}

==================================================

CÂU HỎI MỚI CỦA NGƯỜI DÙNG

${message}

==================================================

HƯỚNG DẪN TRẢ LỜI CUỐI CÙNG

Hãy trả lời trực tiếp câu hỏi mới nhất.

Nếu câu hỏi liên quan dữ liệu Chi đoàn:
- Ưu tiên dữ liệu động được cung cấp.
- Sau đó dùng thông tin chính thức.

Nếu câu hỏi không liên quan website:
- Trả lời như một AI tổng quát thông minh.
- Không từ chối chỉ vì nó ngoài phạm vi Chi đoàn.

Nếu người dùng đang hỏi tiếp vấn đề trước đó:
- Sử dụng lịch sử hội thoại.

Nếu không chắc chắn về dữ liệu nội bộ:
- Nói rõ mức độ không chắc chắn.
- Không bịa.

Trả lời tự nhiên, hữu ích và thông minh.
`;
}

/* =========================================================
   AI REQUEST
========================================================= */

async function askAI({
  message,
  history,
  page,
  mode,
}: {
  message: string;
  history: ChatMessage[];
  page: string;
  mode: AIMode;
}) {
  /*
   * Chỉ query đúng dữ liệu liên quan.
   * Các query chạy song song.
   */

  const databaseContext =
    await getRelevantDatabaseContext(
      message
    );

  const prompt =
    buildPrompt({
      message,
      history,
      page,
      mode,
      databaseContext,
    });

  return callGemini(
    prompt
  );
}

/* =========================================================
   LOCAL FALLBACK
========================================================= */

function getLocalFallback(
  message: string
) {
  const q =
    normalize(message);

  /*
   * Chỉ fallback cho các thông tin cực kỳ chắc chắn.
   * Không biến fallback thành chatbot keyword lớn.
   */

  if (
    hasAny(q, [
      "bi thu chi doan",
      "bi thu bch",
      "ai la bi thu",
    ])
  ) {
    return `Bí thư BCH Chi đoàn D-K66 là Đ/c Nguyễn Thị Huyền.`;
  }

  if (
    hasAny(q, [
      "pho bi thu",
      "ai la pho bi thu",
    ])
  ) {
    return `Phó Bí thư BCH Chi đoàn D-K66 là Đ/c Đinh Anh Bảo.`;
  }

  if (
    hasAny(q, [
      "uy vien bch",
      "uy vien ban chap hanh",
    ])
  ) {
    return `Uỷ viên BCH Chi đoàn D-K66 là Đ/c Đỗ Ngọc Châu.`;
  }

  if (
    hasAny(q, [
      "bch gom ai",
      "ban chap hanh gom ai",
      "danh sach bch",
    ])
  ) {
    return `Ban Chấp hành Chi đoàn D-K66 hiện gồm:

• Bí thư: Nguyễn Thị Huyền
• Phó Bí thư: Đinh Anh Bảo
• Uỷ viên BCH: Đỗ Ngọc Châu`;
  }

  if (
    hasAny(q, [
      "ai tao website",
      "ai lam website",
      "ai xay dung website",
      "nguoi sang lap website",
    ])
  ) {
    return `Website Chi đoàn D-K66 được Đinh Anh Bảo sáng lập và trực tiếp xây dựng.`;
  }

  if (
    hasAny(q, [
      "website nay la gi",
      "website dung de lam gi",
    ])
  ) {
    return `Đây là website của Chi đoàn D-K66 – Trường THPT Hà Trung, được xây dựng để giới thiệu, lưu giữ thông tin và kỷ niệm, quản lý đoàn viên, hoạt động, thông báo, tài liệu, thư viện hình ảnh và hỗ trợ công việc của Ban Chấp hành.`;
  }

  return null;
}

/* =========================================================
   VALIDATE REQUEST
========================================================= */

function parseRequestBody(
  body: AIRequest
) {
  const message =
    typeof body.message ===
    "string"
      ? body.message.trim()
      : "";

  const page =
    typeof body.page ===
    "string"
      ? body.page
      : "/";

  const mode: AIMode =
    body.mode === "admin"
      ? "admin"
      : "public";

  const rawHistory =
    Array.isArray(
      body.history
    )
      ? body.history
      : [];

  const history:
    ChatMessage[] =
    rawHistory.filter(
      (
        item
      ): item is ChatMessage => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return false;
        }

        const value =
          item as Partial<ChatMessage>;

        return (
          (
            value.role ===
              "user" ||
            value.role ===
              "assistant"
          ) &&
          typeof value.content ===
            "string"
        );
      }
    );

  return {
    message,
    page,
    mode,
    history:
      sanitizeHistory(
        history
      ),
  };
}

/* =========================================================
   POST API
========================================================= */

export async function POST(
  request: Request
) {
  try {
    clearExpiredCache();
    clearExpiredRateLimits();

    const body =
      (await request.json()) as AIRequest;

    const {
      message,
      page,
      mode,
      history,
    } =
      parseRequestBody(
        body
      );

    /*
     * Validation
     */

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Tin nhắn không được để trống.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      message.length >
      MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json(
        {
          error:
            `Tin nhắn quá dài. Giới hạn hiện tại là ${MAX_MESSAGE_LENGTH} ký tự.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * CACHE
     * =====================================================
     */

    const cacheKey =
      createCacheKey(
        message,
        mode
      );

    const cached =
      getCache(
        cacheKey
      );

    if (cached) {
      console.log(
        "[AI] CACHE HIT:",
        message
      );

      return NextResponse.json({
        message: cached,
        source: "cache",
      });
    }

    /*
     * =====================================================
     * FAST PATH
     *
     * Đây là phần quan trọng.
     *
     * Câu hỏi chắc chắn về website sẽ:
     *
     * POST
     *   ↓
     * CACHE
     *   ↓
     * FAST PATH
     *   ↓
     * RETURN
     *
     * Không query Supabase.
     * Không gọi Gemini.
     * Không cần build prompt.
     * =====================================================
     */

    const fastAnswer =
      getFastPathAnswer(
        message
      );

    if (fastAnswer) {
      console.log(
        "[AI] FAST PATH:",
        message
      );

      setCache(
        cacheKey,
        fastAnswer,
        CACHE_TTL
      );

      return NextResponse.json({
        message:
          fastAnswer,
        source:
          "fast_path",
      });
    }

    /*
     * =====================================================
     * RATE LIMIT CHỐNG SPAM
     *
     * Chỉ áp dụng trước khi gọi Gemini.
     * Cache và Fast Path không tiêu tốn quota Gemini.
     * =====================================================
     */

    const clientIp =
      getClientIp(
        request
      );

    const rateLimit =
      checkRateLimit(
        `${mode}:${clientIp}`
      );

    if (!rateLimit.allowed) {
      console.warn(
        "[AI] LOCAL RATE LIMIT:",
        clientIp
      );

      return NextResponse.json(
        {
          error:
            `Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${rateLimit.retryAfterSeconds} giây.`,
          message:
            `Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${rateLimit.retryAfterSeconds} giây.`,
          source:
            "rate_limited",
          errorCode:
            "LOCAL_RATE_LIMIT",
          retryAfterSeconds:
            rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(
                rateLimit.retryAfterSeconds
              ),
          },
        }
      );
    }

    /*
     * =====================================================
     * AI
     * =====================================================
     */

    const result =
      await askAI({
        message,
        history,
        page,
        mode,
      });

    if (result.ok) {
      console.log(
        "[AI] GEMINI:",
        message,
        "MODEL:",
        result.model
      );

      setCache(
        cacheKey,
        result.answer,
        GEMINI_CACHE_TTL
      );

      return NextResponse.json({
        message:
          result.answer,
        source:
          "ai",
        model:
          result.model,
      });
    }

    /*
     * =====================================================
     * LOCAL FALLBACK
     *
     * Nếu Gemini lỗi nhưng câu hỏi thuộc dữ liệu website
     * mà hệ thống biết chắc chắn, vẫn trả lời được.
     * =====================================================
     */

    const localAnswer =
      getLocalFallback(
        message
      );

    if (localAnswer) {
      console.log(
        "[AI] LOCAL FALLBACK:",
        message,
        "REASON:",
        result.reason
      );

      setCache(
        cacheKey,
        localAnswer,
        DATABASE_CACHE_TTL
      );

      return NextResponse.json({
        message:
          localAnswer,
        source:
          "local_fallback",
        aiStatus:
          result.reason,
      });
    }

    /*
     * =====================================================
     * PRECISE AI ERROR
     * =====================================================
     */

    const errorMessage =
      getGeminiErrorMessage(
        result.reason,
        result.retryAfterMs
      );

    const retryAfterSeconds =
      result.retryAfterMs
        ? Math.max(
            1,
            Math.ceil(
              result.retryAfterMs /
                1000
            )
          )
        : undefined;

    const status =
      result.reason ===
        "rate_limit" ||
      result.reason ===
        "quota_exceeded"
        ? 429
        : result.reason ===
            "missing_api_key"
          ? 503
          : 200;

    return NextResponse.json(
      {
        message:
          errorMessage,
        error:
          errorMessage,
        source:
          "unavailable",
        errorCode:
          result.reason,
        retryAfterSeconds,
      },
      {
        status,
        headers:
          retryAfterSeconds
            ? {
                "Retry-After":
                  String(
                    retryAfterSeconds
                  ),
              }
            : undefined,
      }
    );
  } catch (error) {
    console.error(
      "[AI API ERROR]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Đã xảy ra lỗi khi xử lý yêu cầu. Bạn hãy thử gửi lại câu hỏi.",
        source:
          "error",
      },
      {
        status: 200,
      }
    );
  }
}

/* =========================================================
   GET HEALTH CHECK
========================================================= */

export async function GET() {
  return NextResponse.json({
    status: "ok",
    aiConfigured:
      Boolean(
        GEMINI_API_KEY
      ),
    supabaseConfigured:
      Boolean(
        SUPABASE_URL &&
          SUPABASE_SECRET_KEY
      ),
    models:
      GEMINI_MODELS,
    geminiCooldown:
      Boolean(
        getGeminiHealth()
      ),
    cacheSize:
      responseCache.size,
    localRateLimit: {
      maxRequests:
        AI_RATE_LIMIT_MAX_REQUESTS,
      windowMs:
        AI_RATE_LIMIT_WINDOW_MS,
      activeBuckets:
        rateLimitBuckets.size,
    },
  });
}