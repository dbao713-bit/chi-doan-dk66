import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/* =========================================================
   CONFIG
========================================================= */

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY;

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY;

const GEMINI_MODEL = "gemini-3.7-flash";

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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AIMode =
  | "public"
  | "admin";

type AIRequest = {
  message?: unknown;
  history?: unknown;
  page?: unknown;
  mode?: unknown;
};

type IntentMap = {
  websiteInfo: boolean;
  introduction: boolean;
  founder: boolean;
  documents: boolean;
  library: boolean;
  activities: boolean;
  announcements: boolean;
  login: boolean;
  dashboard: boolean;
  onlyoffice: boolean;
  usageGuide: boolean;

  memberCount: boolean;

  latestAnnouncement: boolean;
  latestActivity: boolean;
  latestDocument: boolean;
};

type CacheItem = {
  answer: string;
  expiresAt: number;
};

type GeminiCooldown = {
  until: number;
  message: string;
};

/* =========================================================
   CACHE
========================================================= */

const answerCache =
  new Map<string, CacheItem>();

const CACHE_TTL =
  15 * 60 * 1000;

/*
  Khi Gemini trả 429, đừng tiếp tục gọi
  Gemini liên tục trong thời gian quota đang
  bị giới hạn.
*/
let geminiCooldown:
  GeminiCooldown | null = null;

/* =========================================================
   WEBSITE KNOWLEDGE
========================================================= */

const WEBSITE_KNOWLEDGE = `
WEBSITE:
Chi đoàn D-K66 – Trường THPT Hà Trung.

Mục tiêu:
- Là website của Chi đoàn D-K66.
- Cung cấp thông tin về Chi đoàn.
- Cung cấp hoạt động.
- Cung cấp thông báo.
- Cung cấp tài liệu.
- Cung cấp thư viện hình ảnh.
- Cung cấp thông tin liên hệ.
- Cung cấp khu vực quản lý cho Ban Chấp hành.

CÁC KHU VỰC:
1. Trang chủ
2. Hoạt động
3. Thông báo
4. Tài liệu
5. Thư viện
6. Liên hệ
7. Đăng nhập BCH / Admin
8. Dashboard quản trị
9. OnlyOffice cho một số chức năng tài liệu

NGƯỜI SÁNG LẬP / TẠO WEBSITE:
-P.Bí Thư Đinh Anh Bảo.

THÔNG TIN BAN CHẤP HÀNH:
- Bí thư BCH Chi đoàn D-K66: Nguyễn Thị Huyền.
- Phó Bí thư BCH Chi đoàn D-K66: Đinh Anh Bảo.
- Uỷ viên BCH Chi đoàn D-K66: Đỗ Ngọc Châu.

QUY TẮC:
- Không bịa dữ liệu.
- Không tự tạo tên đoàn viên.
- Không tự tạo số liệu.
- Không tự nhận đã thực hiện hành động nếu chưa thực hiện.
- Khi câu hỏi yêu cầu dữ liệu thực tế của hệ thống, ưu tiên dữ liệu Supabase.
- Không tiết lộ API key, secret key, token hoặc thông tin bảo mật.
- Không hướng dẫn vượt qua đăng nhập hoặc phân quyền.
`;

/* =========================================================
   NORMALIZE
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

/* =========================================================
   CACHE HELPERS
========================================================= */

function getCache(
  key: string
) {
  const item =
    answerCache.get(key);

  if (!item) {
    return null;
  }

  if (
    Date.now() >
    item.expiresAt
  ) {
    answerCache.delete(key);

    return null;
  }

  return item.answer;
}

function setCache(
  key: string,
  answer: string,
  ttl = CACHE_TTL
) {
  answerCache.set(
    key,
    {
      answer,
      expiresAt:
        Date.now() + ttl,
    }
  );

  if (
    answerCache.size >
    500
  ) {
    const firstKey =
      answerCache
        .keys()
        .next()
        .value;

    if (firstKey) {
      answerCache.delete(
        firstKey
      );
    }
  }
}

/* =========================================================
   TEXT HELPERS
========================================================= */

function hasAny(
  text: string,
  patterns: string[]
) {
  return patterns.some(
    (pattern) =>
      text.includes(pattern)
  );
}

function hasAll(
  text: string,
  patterns: string[]
) {
  return patterns.every(
    (pattern) =>
      text.includes(pattern)
  );
}

/*
  Cho phép một số câu tự nhiên hơn,
  kể cả khi người dùng không dùng đúng
  một mẫu câu cố định.
*/
function containsTopic(
  text: string,
  topics: string[]
) {
  return topics.some(
    (topic) =>
      text.includes(topic)
  );
}

/* =========================================================
   INTENT ENGINE
========================================================= */

function getIntent(
  message: string
): IntentMap {
  const q =
    normalize(message);

  const websiteInfo =
    hasAny(q, [
      "website nay la gi",
      "web nay la gi",
      "trang nay la gi",
      "website nay lam gi",
      "web nay lam gi",
      "website dung de lam gi",
      "web dung de lam gi",
      "muc dich cua website",
      "muc dich website",
    ]);

  const founder =
    hasAny(q, [
      "ai sang lap",
      "ai sang lap website",
      "ai tao ra website",
      "ai tao website",
      "ai lam ra website",
      "ai xay dung website",
      "nguoi sang lap",
      "nguoi tao ra website",
      "nguoi lam ra website",
      "website do ai tao",
      "website do ai lam",
      "website duoc tao boi ai",
      "website duoc xay dung boi ai",
      "tac gia website",
      "nguoi phat trien website",
      "ai la nguoi sang lap",
      "ai la nguoi tao",
      "ai la nguoi xay dung",
      "d ai tao website",
      "dinh anh bao tao website",
    ]);

  const introduction =
    hasAny(q, [
      "gioi thieu",
      "gioi thieu chi doan",
      "chi doan la gi",
      "d k66 la gi",
      "dk66 la gi",
      "chi doan d k66",
    ]);

  const documents =
    hasAny(q, [
      "tai lieu o dau",
      "tai lieu nam o dau",
      "tai lieu o cho nao",
      "tim tai lieu",
      "tim tai lieu o dau",
      "xem tai lieu",
      "muon xem tai lieu",
      "mo tai lieu",
      "vao tai lieu",
      "muc tai lieu",
      "kho tai lieu",
      "kho van ban",
      "van ban o dau",
      "van ban nam o dau",
      "tai lieu cua chi doan o dau",
    ]);

  const library =
    hasAny(q, [
      "thu vien o dau",
      "thu vien nam o dau",
      "tim thu vien",
      "xem thu vien",
      "muon xem thu vien",
      "muc thu vien",
      "anh o dau",
      "hinh anh o dau",
      "anh hoat dong o dau",
      "xem anh",
      "xem hinh anh",
    ]);

  const activities =
    hasAny(q, [
      "hoat dong o dau",
      "hoat dong nam o dau",
      "xem hoat dong",
      "tim hoat dong",
      "muc hoat dong",
      "danh sach hoat dong",
      "cac hoat dong",
      "hoat dong cua chi doan",
    ]);

  const announcements =
    hasAny(q, [
      "thong bao o dau",
      "thong bao nam o dau",
      "xem thong bao",
      "tim thong bao",
      "muc thong bao",
      "danh sach thong bao",
      "cac thong bao",
    ]);

  const login =
    hasAny(q, [
      "dang nhap o dau",
      "dang nhap bch",
      "dang nhap admin",
      "dang nhap",
      "vao admin",
      "vao bch",
      "login bch",
      "login admin",
      "tai khoan admin",
    ]);

  const dashboard =
    hasAny(q, [
      "dashboard o dau",
      "dashboard la gi",
      "admin o dau",
      "khu quan ly",
      "khu vuc quan ly",
      "khu vuc quan tri",
      "trang quan tri",
      "trang quan ly",
      "chuc nang dashboard",
      "dashboard co gi",
      "dashboard co nhung gi",
    ]);

  const onlyoffice =
    hasAny(q, [
      "onlyoffice la gi",
      "only office la gi",
      "onlyoffice",
      "only office",
      "soan thao o dau",
      "soan thao tai lieu",
      "trinh soan thao",
      "trinh bien soan",
      "word online",
      "chinh sua word",
    ]);

  const usageGuide =
    hasAny(q, [
      "huong dan su dung",
      "cach su dung website",
      "dung website nhu the nao",
      "su dung website nhu the nao",
      "website co nhung chuc nang gi",
      "website co nhung muc nao",
      "co nhung muc nao",
      "co nhung chuc nang nao",
      "website gom nhung gi",
    ]);

  const memberCount =
    hasAny(q, [
      "bao nhieu doan vien",
      "bao nhieu thanh vien",
      "co bao nhieu thanh vien",
      "so luong doan vien",
      "so luong thanh vien",
      "tong so doan vien",
      "tong so thanh vien",
      "quan so doan vien",
      "quan so thanh vien",
      "si so doan vien",
      "si so thanh vien",
      "chi doan co bao nhieu nguoi",
    ]);

  const latestAnnouncement =
    hasAny(q, [
      "thong bao moi nhat",
      "thong bao gan nhat",
      "thong bao gan day",
      "thong bao moi",
      "tin moi nhat",
      "tin thong bao moi",
    ]);

  const latestActivity =
    hasAny(q, [
      "hoat dong moi nhat",
      "hoat dong gan nhat",
      "hoat dong gan day",
      "su kien moi nhat",
      "su kien gan day",
      "hoat dong moi",
    ]);

  const latestDocument =
    hasAny(q, [
      "tai lieu moi nhat",
      "tai lieu gan nhat",
      "tai lieu gan day",
      "tai lieu moi",
      "van ban moi nhat",
      "van ban gan day",
    ]);

  /*
    Một số câu không có cụm cố định
    nhưng rõ ràng đang hỏi vị trí.
  */

  const documentsByTopic =
    containsTopic(q, [
      "tai lieu",
      "van ban",
      "ke hoach",
      "bien ban",
    ]) &&
    hasAny(q, [
      "dau",
      "cho nao",
      "cho nao vay",
      "o dau vay",
      "nam dau",
      "tim",
      "xem",
      "vao dau",
    ]);

  const libraryByTopic =
    containsTopic(q, [
      "thu vien",
      "hinh anh",
      "anh hoat dong",
    ]) &&
    hasAny(q, [
      "dau",
      "cho nao",
      "tim",
      "xem",
      "vao dau",
    ]);

  const activitiesByTopic =
    containsTopic(q, [
      "hoat dong",
      "su kien",
    ]) &&
    hasAny(q, [
      "dau",
      "cho nao",
      "tim",
      "xem",
      "vao dau",
    ]);

  const announcementsByTopic =
    containsTopic(q, [
      "thong bao",
    ]) &&
    hasAny(q, [
      "dau",
      "cho nao",
      "tim",
      "xem",
      "vao dau",
    ]);

  return {
    websiteInfo,
    introduction,
    founder,

    documents:
      documents ||
      documentsByTopic,

    library:
      library ||
      libraryByTopic,

    activities:
      activities ||
      activitiesByTopic,

    announcements:
      announcements ||
      announcementsByTopic,

    login,
    dashboard,
    onlyoffice,
    usageGuide,

    memberCount,
    latestAnnouncement,
    latestActivity,
    latestDocument,
  };
}

/* =========================================================
   PAGE KNOWLEDGE
========================================================= */

function getPageKnowledge(
  page: string
) {
  const p =
    normalize(page);

  if (p === "/") {
    return `
Người dùng đang ở trang chủ.

Trang chủ có:
- Giới thiệu
- Hoạt động
- Thông báo
- Tài liệu
- Thư viện
- Liên hệ
- Đăng nhập BCH / Admin
`;
  }

  if (
    p.includes("dashboard")
  ) {
    return `
Người dùng đang ở khu vực Dashboard quản trị.

Đây là khu vực dành cho Ban Chấp hành/người có quyền phù hợp.
Có các chức năng quản lý như:
- Thành viên
- Thông báo
- Hoạt động
- Tài liệu
- Thư viện
`;
  }

  if (
    p.includes("announcement")
  ) {
    return `
Người dùng đang ở khu vực Thông báo.
`;
  }

  if (
    p.includes("document")
  ) {
    return `
Người dùng đang ở khu vực Tài liệu/Soạn thảo.
Website có tích hợp OnlyOffice.
`;
  }

  if (
    p.includes("library")
  ) {
    return `
Người dùng đang ở khu vực Thư viện hình ảnh.
`;
  }

  return `
Trang hiện tại:
${page}
`;
}

/* =========================================================
   DIRECT WEBSITE ANSWERS
========================================================= */

function getDirectAnswer(
  message: string,
  page: string,
  mode: AIMode
) {
  const intent =
    getIntent(message);

  if (
    intent.founder
  ) {
    return `Website Chi đoàn D-K66 – Trường THPT Hà Trung do P.BT BCH Đinh Anh Bảo sáng lập và xây dựng.`;
  }

  if (
    intent.websiteInfo
  ) {
    return `Đây là website của Chi đoàn D-K66 – Trường THPT Hà Trung.

Website được xây dựng để cung cấp thông tin và hỗ trợ hoạt động của Chi đoàn, gồm:
• Giới thiệu
• Hoạt động
• Thông báo
• Tài liệu
• Thư viện hình ảnh
• Liên hệ
• Khu vực quản lý dành cho Ban Chấp hành`;
  }

  if (
    intent.introduction
  ) {
    return `Chi đoàn D-K66 là tập thể đoàn viên thuộc Trường THPT Hà Trung. Website được xây dựng để giới thiệu, lưu trữ và hỗ trợ quản lý thông tin, hoạt động, thông báo, tài liệu và hình ảnh của Chi đoàn.`;
  }

  if (
    intent.documents
  ) {
    return `Bạn có thể vào mục “Tài liệu” trên thanh điều hướng để xem các văn bản, kế hoạch, thông báo, biên bản và những tài liệu khác của Chi đoàn D-K66.`;
  }

  if (
    intent.library
  ) {
    return `Bạn có thể vào mục “Thư viện” trên thanh điều hướng để xem hình ảnh và những nội dung liên quan đến hoạt động của Chi đoàn.`;
  }

  if (
    intent.activities
  ) {
    return `Bạn có thể vào mục “Hoạt động” trên thanh điều hướng để xem các hoạt động và sự kiện của Chi đoàn D-K66.`;
  }

  if (
    intent.announcements
  ) {
    return `Bạn có thể vào mục “Thông báo” để xem các thông báo của Chi đoàn.

Nếu đang ở khu vực quản trị, bạn có thể quản lý thông báo trong Dashboard theo quyền tài khoản.`;
  }

  if (
    intent.login
  ) {
    return `Bạn có thể đăng nhập bằng mục “Đăng nhập BCH / Admin” trên trang chủ. Đây là khu vực dành cho Ban Chấp hành hoặc người dùng được cấp quyền quản trị.`;
  }

  if (
    intent.dashboard
  ) {
    if (
      mode === "admin"
    ) {
      return `Bạn đang ở khu vực quản lý.

Dashboard hiện có các nhóm chức năng chính như:
• Thành viên
• Thông báo
• Hoạt động
• Tài liệu
• Thư viện
• Một số chức năng quản trị khác`;
    }

    return `Dashboard là khu vực quản lý dành cho Ban Chấp hành/người dùng được cấp quyền phù hợp. Bạn cần đăng nhập để sử dụng các chức năng quản trị.`;
  }

  if (
    intent.onlyoffice
  ) {
    return `Website có tích hợp OnlyOffice để hỗ trợ xem và soạn thảo tài liệu trực tuyến. Chức năng này chủ yếu được sử dụng trong khu vực quản lý tài liệu.`;
  }

  if (
    intent.usageGuide
  ) {
    return `Website hiện có các khu vực chính:

• Giới thiệu
• Hoạt động
• Thông báo
• Tài liệu
• Thư viện
• Liên hệ
• Đăng nhập BCH / Admin

Bạn có thể hỏi mình trực tiếp về bất kỳ khu vực nào để được hướng dẫn.`;
  }

  return null;
}

/* =========================================================
   SUPABASE: MEMBER COUNT
========================================================= */

async function getMemberCount() {
  if (!supabase) {
    return null;
  }

  try {
    const result =
      await supabase
        .from("members")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        );

    if (
      result.error
    ) {
      console.error(
        "[AI/Supabase members]",
        result.error.message
      );

      return null;
    }

    return (
      result.count ??
      0
    );
  } catch (error) {
    console.error(
      "[AI/Supabase members]",
      error
    );

    return null;
  }
}

/* =========================================================
   SUPABASE: LATEST ANNOUNCEMENTS
========================================================= */

async function getLatestAnnouncements() {
  if (!supabase) {
    return [];
  }

  try {
    const result =
      await supabase
        .from("announcements")
        .select(
          "id,title,content,author,created_at"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(5);

    if (
      result.error
    ) {
      console.error(
        "[AI/Supabase announcements]",
        result.error.message
      );

      return [];
    }

    return (
      result.data ??
      []
    );
  } catch (error) {
    console.error(
      "[AI/Supabase announcements]",
      error
    );

    return [];
  }
}

/* =========================================================
   SUPABASE: LATEST ACTIVITIES
========================================================= */

async function getLatestActivities() {
  if (!supabase) {
    return [];
  }

  try {
    const result =
      await supabase
        .from("activities")
        .select(
          "id,title,description,location,start_at,end_at,status,created_at"
        )
        .order(
          "start_at",
          {
            ascending:
              false,
          }
        )
        .limit(5);

    if (
      result.error
    ) {
      console.error(
        "[AI/Supabase activities]",
        result.error.message
      );

      return [];
    }

    return (
      result.data ??
      []
    );
  } catch (error) {
    console.error(
      "[AI/Supabase activities]",
      error
    );

    return [];
  }
}

/* =========================================================
   SUPABASE: LATEST DOCUMENTS
========================================================= */

async function getLatestDocuments() {
  if (!supabase) {
    return [];
  }

  try {
    const result =
      await supabase
        .from("documents")
        .select(
          "id,title,description,category,file_name,author,created_at"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(5);

    if (
      result.error
    ) {
      console.error(
        "[AI/Supabase documents]",
        result.error.message
      );

      return [];
    }

    return (
      result.data ??
      []
    );
  } catch (error) {
    console.error(
      "[AI/Supabase documents]",
      error
    );

    return [];
  }
}

/* =========================================================
   DATABASE QUESTIONS
========================================================= */

async function getDatabaseAnswer(
  message: string
) {
  const intent =
    getIntent(message);

  /* -------------------------------------------------------
     MEMBER COUNT
  ------------------------------------------------------- */

  if (
    intent.memberCount
  ) {
    const count =
      await getMemberCount();

    if (
      count === null
    ) {
      return `Mình chưa thể đọc số lượng đoàn viên từ cơ sở dữ liệu lúc này.`;
    }

    return `Theo dữ liệu hiện tại của hệ thống, đang có ${count} thành viên/đoàn viên trong danh sách quản lý.`;
  }

  /* -------------------------------------------------------
     LATEST ANNOUNCEMENT
  ------------------------------------------------------- */

  if (
    intent.latestAnnouncement
  ) {
    const announcements =
      await getLatestAnnouncements();

    if (
      !announcements.length
    ) {
      return `Hiện tại mình chưa lấy được dữ liệu thông báo từ hệ thống.`;
    }

    const latest =
      announcements[0];

    return `Thông báo mới nhất hiện tại là:

“${latest.title}”

${latest.content || "Chưa có nội dung."}

Người đăng: ${
      latest.author ||
      "Chưa xác định"
    }

Ngày đăng: ${
      latest.created_at
        ? new Date(
            latest.created_at
          ).toLocaleDateString(
            "vi-VN"
          )
        : "Chưa xác định"
    }`;
  }

  /* -------------------------------------------------------
     LATEST ACTIVITY
  ------------------------------------------------------- */

  if (
    intent.latestActivity
  ) {
    const activities =
      await getLatestActivities();

    if (
      !activities.length
    ) {
      return `Hiện tại mình chưa lấy được dữ liệu hoạt động từ hệ thống.`;
    }

    const latest =
      activities[0];

    return `Hoạt động gần nhất trong dữ liệu hệ thống là:

“${latest.title}”

${latest.description || "Chưa có mô tả."}

Địa điểm: ${
      latest.location ||
      "Chưa cập nhật"
    }

Thời gian: ${
      latest.start_at
        ? new Date(
            latest.start_at
          ).toLocaleString(
            "vi-VN"
          )
        : "Chưa cập nhật"
    }

Trạng thái: ${
      latest.status ||
      "Chưa cập nhật"
    }`;
  }

  /* -------------------------------------------------------
     LATEST DOCUMENT
  ------------------------------------------------------- */

  if (
    intent.latestDocument
  ) {
    const documents =
      await getLatestDocuments();

    if (
      !documents.length
    ) {
      return `Hiện tại mình chưa lấy được dữ liệu tài liệu từ hệ thống.`;
    }

    const latest =
      documents[0];

    return `Tài liệu mới nhất hiện tại là:

“${latest.title}”

Loại: ${
      latest.category ||
      "Chưa xác định"
    }

Tên file: ${
      latest.file_name ||
      "Chưa xác định"
    }

Người đăng: ${
      latest.author ||
      "Chưa xác định"
    }

Ngày đăng: ${
      latest.created_at
        ? new Date(
            latest.created_at
          ).toLocaleDateString(
            "vi-VN"
          )
        : "Chưa xác định"
    }`;
  }

  return null;
}

/* =========================================================
   GEMINI COOLDOWN
========================================================= */

function getGeminiCooldown() {
  if (!geminiCooldown) {
    return null;
  }

  if (
    Date.now() >=
    geminiCooldown.until
  ) {
    geminiCooldown =
      null;

    return null;
  }

  return geminiCooldown;
}

function activateGeminiCooldown(
  retryAfterMs?: number
) {
  const safeRetry =
    Math.min(
      Math.max(
        retryAfterMs ??
          60_000,
        30_000
      ),
      10 * 60_000
    );

  geminiCooldown = {
    until:
      Date.now() +
      safeRetry,
    message:
      "AI nâng cao đang tạm đạt giới hạn sử dụng. Mình vẫn có thể trả lời các câu hỏi về website và dữ liệu hệ thống.",
  };
}

/* =========================================================
   GEMINI
========================================================= */

async function askGemini({
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
  databaseContext: string;
}) {
  if (!ai) {
    return null;
  }

  const cooldown =
    getGeminiCooldown();

  if (cooldown) {
    console.warn(
      "[AI/Gemini] Cooldown active."
    );

    return null;
  }

  const roleInstruction =
    mode === "admin"
      ? `
Bạn đang hỗ trợ Ban Chấp hành/người quản trị.
Có thể giải thích sâu về chức năng Dashboard.
Không được hướng dẫn vượt qua cơ chế phân quyền.
`
      : `
Bạn đang hỗ trợ khách truy cập website.
Chỉ hướng dẫn các chức năng công khai hoặc thông tin phù hợp.
`;

  const historyText =
    history
      .slice(-10)
      .map((item) => {
        const role =
          item.role ===
          "user"
            ? "Người dùng"
            : "Trợ lý";

        const content =
          item.content
            .trim()
            .slice(
              0,
              1200
            );

        return `${role}: ${content}`;
      })
      .join("\n");

  const prompt = `
${WEBSITE_KNOWLEDGE}

${getPageKnowledge(page)}

${roleInstruction}

DỮ LIỆU HỆ THỐNG:
${
    databaseContext ||
    "Không có dữ liệu bổ sung."
  }

LỊCH SỬ:
${
    historyText ||
    "Chưa có lịch sử."
  }

CÂU HỎI:
${message.slice(0, 3000)}

YÊU CẦU:
- Trả lời bằng tiếng Việt.
- Hiểu câu hỏi tự nhiên, kể cả thiếu dấu hoặc sai chính tả nhẹ.
- Không yêu cầu người dùng phải dùng đúng mẫu câu.
- Trả lời trực tiếp, tự nhiên.
- Không bịa dữ liệu của website.
- Nếu cần dữ liệu thực tế nhưng dữ liệu không được cung cấp, nói rõ chưa có dữ liệu.
- Không tiết lộ API key, secret, token hoặc cấu hình bảo mật.
- Không hướng dẫn vượt qua đăng nhập hoặc phân quyền.
- Nếu hướng dẫn thao tác, trình bày theo các bước rõ ràng.
- Không tự nhận đã thực hiện hành động mà hệ thống chưa thực hiện.
`;

  try {
    const interaction =
      await ai.interactions.create(
        {
          model:
            GEMINI_MODEL,
          input: prompt,
        }
      );

    return (
      interaction.output_text ||
      null
    );
  } catch (error) {
    console.error(
      "[AI/Gemini]",
      error
    );

    const errorText =
      error instanceof Error
        ? error.message
        : String(error);

    /*
      Nếu Gemini báo quota/rate limit,
      kích hoạt cooldown để không gọi
      lại vô ích trong thời gian ngắn.
    */
    if (
      /429|quota|rate.?limit|exceeded/i.test(
        errorText
      )
    ) {
      const retryMatch =
        errorText.match(
          /retry in\s+([\d.]+)s/i
        );

      const retryAfterMs =
        retryMatch
          ? Number(
              retryMatch[1]
            ) * 1000
          : 60_000;

      activateGeminiCooldown(
        retryAfterMs
      );
    }

    return null;
  }
}

/* =========================================================
   FALLBACK
========================================================= */

function getFallbackAnswer(
  mode: AIMode
) {
  if (
    mode === "admin"
  ) {
    return `Mình vẫn đang hoạt động. AI nâng cao đang tạm thời không khả dụng, nhưng mình vẫn có thể hỗ trợ các câu hỏi về Dashboard, thành viên, thông báo, hoạt động, tài liệu và OnlyOffice bằng kiến thức nội bộ của website.`;
  }

  return `Mình vẫn đang hoạt động. AI nâng cao đang tạm thời không khả dụng, nhưng mình vẫn có thể hỗ trợ bạn về website Chi đoàn D-K66, Tài liệu, Hoạt động, Thư viện, Thông báo và Đăng nhập BCH.`;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as AIRequest;

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

    const history: ChatMessage[] =
      Array.isArray(
        body.history
      )
        ? body.history.filter(
            (
              item
            ): item is ChatMessage =>
              !!item &&
              typeof item ===
                "object" &&
              "role" in item &&
              "content" in item &&
              (
                (
                  item as ChatMessage
                ).role ===
                  "user" ||
                (
                  item as ChatMessage
                ).role ===
                  "assistant"
              ) &&
              typeof (
                item as ChatMessage
              ).content ===
                "string"
          )
        : [];

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

    /* =====================================================
       CACHE KEY
       Không dùng page để tăng cache hit.
    ===================================================== */

    const cacheKey = [
      mode,
      normalize(message),
    ].join("|");

    const cached =
      getCache(cacheKey);

    if (cached) {
      console.log(
        "[AI] CACHE HIT:",
        message
      );

      return NextResponse.json({
        message:
          cached,
        source:
          "cache",
      });
    }

    /* =====================================================
       1. INTERNAL KNOWLEDGE
    ===================================================== */

    const directAnswer =
      getDirectAnswer(
        message,
        page,
        mode
      );

    if (directAnswer) {
      console.log(
        "[AI] INTERNAL:",
        message
      );

      setCache(
        cacheKey,
        directAnswer
      );

      return NextResponse.json({
        message:
          directAnswer,
        source:
          "internal",
      });
    }

    /* =====================================================
       2. SUPABASE
    ===================================================== */

    const databaseAnswer =
      await getDatabaseAnswer(
        message
      );

    if (databaseAnswer) {
      console.log(
        "[AI] DATABASE:",
        message
      );

      setCache(
        cacheKey,
        databaseAnswer,
        5 * 60 * 1000
      );

      return NextResponse.json({
        message:
          databaseAnswer,
        source:
          "supabase",
      });
    }

    /* =====================================================
       3. GEMINI
    ===================================================== */

    const cooldown =
      getGeminiCooldown();

    if (cooldown) {
      console.log(
        "[AI] GEMINI COOLDOWN:",
        message
      );

      return NextResponse.json({
        message:
          getFallbackAnswer(
            mode
          ),
        source:
          "fallback",
      });
    }

    /*
      Hiện tại chỉ gửi Gemini khi
      không có câu trả lời nội bộ/database.
    */
    const databaseContext =
      "";

    const geminiAnswer =
      await askGemini({
        message,
        history,
        page,
        mode,
        databaseContext,
      });

    if (geminiAnswer) {
      console.log(
        "[AI] GEMINI:",
        message
      );

      setCache(
        cacheKey,
        geminiAnswer,
        30 * 60 * 1000
      );

      return NextResponse.json({
        message:
          geminiAnswer,
        source:
          "gemini",
      });
    }

    /* =====================================================
       4. FALLBACK
    ===================================================== */

    console.log(
      "[AI] FALLBACK:",
      message
    );

    return NextResponse.json({
      message:
        getFallbackAnswer(
          mode
        ),
      source:
        "fallback",
    });
  } catch (error) {
    console.error(
      "[AI API]",
      error
    );

    return NextResponse.json(
      {
        message:
          "Mình gặp một vấn đề nhỏ khi xử lý câu hỏi. Bạn hãy thử lại sau ít phút.",
        source:
          "error",
      },
      {
        status: 200,
      }
    );
  }
}