import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/* =========================================================
   CONFIG
========================================================= */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// Giữ model hiện tại của project để tránh tự ý đổi model khi deploy.
const GEMINI_MODEL = "gemini-3.7-flash";

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

const supabase =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

/* =========================================================
   TYPES
========================================================= */

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AIMode = "public" | "admin";

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
  secretary: boolean;
  deputySecretary: boolean;
  committeeMember: boolean;
  bchList: boolean;
  schoolYouthUnion: boolean;
  schoolLeadership: boolean;
  address: boolean;
  contact: boolean;
  documents: boolean;
  library: boolean;
  activities: boolean;
  announcements: boolean;
  login: boolean;
  dashboard: boolean;
  onlyoffice: boolean;
  usageGuide: boolean;
  aiHelp: boolean;
  security: boolean;
  memberCount: boolean;
  maleCount: boolean;
  femaleCount: boolean;
  latestAnnouncement: boolean;
  latestActivity: boolean;
  latestDocument: boolean;
};

type CacheItem = {
  answer: string;
  expiresAt: number;
};

type GeminiState = {
  until: number;
  reason: string;
};

/* =========================================================
   CACHE / RATE LIMIT PROTECTION
========================================================= */

const answerCache = new Map<string, CacheItem>();
const CACHE_TTL = 15 * 60 * 1000;
const GEMINI_CACHE_TTL = 30 * 60 * 1000;
const DATABASE_CACHE_TTL = 5 * 60 * 1000;

let geminiState: GeminiState | null = null;

function getCache(key: string) {
  const item = answerCache.get(key);
  if (!item) return null;

  if (Date.now() >= item.expiresAt) {
    answerCache.delete(key);
    return null;
  }

  return item.answer;
}

function setCache(key: string, answer: string, ttl = CACHE_TTL) {
  answerCache.set(key, {
    answer,
    expiresAt: Date.now() + ttl,
  });

  while (answerCache.size > 500) {
    const firstKey = answerCache.keys().next().value;
    if (!firstKey) break;
    answerCache.delete(firstKey);
  }
}

function getGeminiState() {
  if (!geminiState) return null;
  if (Date.now() >= geminiState.until) {
    geminiState = null;
    return null;
  }
  return geminiState;
}

function setGeminiCooldown(ms: number, reason: string) {
  const safeMs = Math.min(Math.max(ms, 30_000), 10 * 60_000);
  geminiState = {
    until: Date.now() + safeMs,
    reason,
  };
}

/* =========================================================
   WEBSITE KNOWLEDGE
========================================================= */

const WEBSITE_KNOWLEDGE = `
THÔNG TIN CHÍNH THỨC VỀ WEBSITE

- Tên: Chi đoàn D-K66 – Trường THPT Hà Trung.
- Website phục vụ thông tin, hoạt động, thông báo, tài liệu, thư viện hình ảnh và quản lý của Chi đoàn.
- Các khu vực chính: Trang chủ, Hoạt động, Thông báo, Tài liệu, Thư viện, Liên hệ, Đăng nhập BCH / Admin và Dashboard.
- Website có tích hợp OnlyOffice cho một số chức năng tài liệu/soạn thảo.

BAN CHẤP HÀNH CHI ĐOÀN D-K66
- Bí thư BCH Chi đoàn: Nguyễn Thị Huyền.
- Phó Bí thư BCH Chi đoàn: Đinh Anh Bảo.
- Uỷ viên BCH Chi đoàn: Đỗ Ngọc Châu.

NGƯỜI SÁNG LẬP / XÂY DỰNG WEBSITE
- Website được Phó Bí thư BCH Đinh Anh Bảo sáng lập và trực tiếp xây dựng.
- Đinh Anh Bảo tham gia lên ý tưởng, thiết kế, phát triển website, Dashboard, hệ thống AI và tích hợp OnlyOffice.

THÔNG TIN ĐOÀN VIÊN
- 26 đoàn viên nam.
- 18 đoàn viên nữ.
- Tổng cộng 44 đoàn viên theo thông tin hiện được cấu hình trong knowledge.

ĐỊA CHỈ
- Chi đoàn D-K66 – Trường THPT Hà Trung.
- Địa chỉ được cấu hình: xã Hoạt Giang, tỉnh Thanh Hoá.

BAN CHẤP HÀNH ĐOÀN TRƯỜNG / BAN GIÁM HIỆU
- Thầy Trịnh Cao Cường: Bí thư BCH Đoàn trường.
- Cô Lê Thị Đạm: Phó Bí thư BCH Đoàn trường.
- Thầy Trịnh Xuân Thanh: Bí thư Đảng Bộ, Hiệu trưởng.
- Thầy Nguyễn Văn Dũng: Phó Bí thư Đảng bộ, Hiệu Phó.
- Cô Đoàn Văn Ân: Hiệu Phó.

MỤC ĐÍCH TRỢ LÝ AI
- Hướng dẫn người dùng sử dụng website.
- Giải thích các chức năng và khu vực.
- Trả lời câu hỏi về Chi đoàn khi có dữ liệu.
- Trả lời dữ liệu động từ Supabase khi hệ thống hỗ trợ.
- Hỗ trợ Ban Chấp hành/người quản trị hiểu Dashboard.
- Hỗ trợ OnlyOffice và luồng tài liệu ở mức hướng dẫn.

NGUYÊN TẮC TIN CẬY
- Ưu tiên dữ liệu thực tế từ hệ thống/Supabase.
- Sau đó ưu tiên knowledge chính thức của website.
- Không được bịa tên người, số liệu, thông báo, hoạt động hoặc tài liệu.
- Nếu không có dữ liệu thì phải nói rõ chưa có dữ liệu.
- Không tiết lộ API key, secret key, token, mật khẩu hoặc cấu hình bảo mật.
- Không hướng dẫn vượt qua đăng nhập hoặc phân quyền.
- Không tự nhận đã thực hiện hành động mà hệ thống chưa thực hiện.

PHONG CÁCH
- Luôn trả lời bằng tiếng Việt.
- Thân thiện, rõ ràng, tự nhiên.
- Câu hỏi đơn giản: trả lời ngắn gọn.
- Câu hỏi hướng dẫn: trả lời thành các bước dễ làm theo.
- Không bắt người dùng phải hỏi đúng một mẫu câu cố định.
`;

/* =========================================================
   TEXT NORMALIZATION / MATCHING
========================================================= */

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function hasAll(text: string, patterns: string[]) {
  return patterns.every((pattern) => text.includes(pattern));
}

function isQuestionAbout(text: string, subject: string[]) {
  return hasAny(text, subject);
}

function isWhereQuestion(text: string) {
  return hasAny(text, [
    "o dau",
    "cho nao",
    "nam o dau",
    "tim o dau",
    "vao dau",
    "xem o dau",
  ]);
}

function isWhoQuestion(text: string) {
  return hasAny(text, [
    "ai la",
    "ai",
    "nguoi nao",
    "ten gi",
    "cho toi biet",
    "la nguoi nao",
  ]);
}

/* =========================================================
   INTENT ENGINE
========================================================= */

function getIntent(message: string): IntentMap {
  const q = normalize(message);

  const websiteInfo = hasAny(q, [
    "website nay la gi",
    "web nay la gi",
    "trang nay la gi",
    "website nay lam gi",
    "website dung de lam gi",
    "muc dich website",
    "muc dich cua website",
    "web dung de lam gi",
  ]);

  const founder = hasAny(q, [
    "ai sang lap website",
    "ai sang lap",
    "ai tao ra website",
    "ai tao website",
    "ai lam ra website",
    "ai xay dung website",
    "ai phat trien website",
    "nguoi sang lap website",
    "nguoi sang lap",
    "nguoi tao ra website",
    "website do ai tao",
    "website do ai lam",
    "website duoc tao boi ai",
    "website duoc xay dung boi ai",
    "tac gia website",
    "ai la nguoi sang lap",
    "ai la nguoi tao website",
    "ai la nguoi xay dung website",
  ]);

  const secretary = hasAny(q, [
    "bi thu bch la ai",
    "bi thu chi doan la ai",
    "bi thu la ai",
    "ai la bi thu",
    "ai dang la bi thu",
    "ai lam bi thu",
    "nguoi dung dau chi doan la ai",
    "nguoi dung dau bch la ai",
  ]);

  const deputySecretary = hasAny(q, [
    "pho bi thu bch la ai",
    "pho bi thu chi doan la ai",
    "pho bi thu la ai",
    "ai la pho bi thu",
    "ai dang la pho bi thu",
    "ai lam pho bi thu",
  ]);

  const committeeMember = hasAny(q, [
    "uy vien bch la ai",
    "uy vien ban chap hanh la ai",
    "ai la uy vien bch",
    "ai la uy vien ban chap hanh",
    "bch co uy vien nao",
  ]);

  const bchList = hasAny(q, [
    "bch gom nhung ai",
    "ban chap hanh gom nhung ai",
    "thanh phan bch",
    "thanh phan ban chap hanh",
    "cac thanh vien bch",
    "danh sach bch",
    "bch chi doan gom ai",
  ]);

  const schoolYouthUnion = hasAny(q, [
    "bi thu doan truong",
    "pho bi thu doan truong",
    "bch doan truong",
    "ban chap hanh doan truong",
    "doan truong la ai",
    "lanh dao doan truong",
  ]);

  const schoolLeadership = hasAny(q, [
    "hieu truong la ai",
    "hieu pho la ai",
    "ban giam hieu",
    "bgh gom nhung ai",
    "hieu truong",
    "hieu pho",
  ]);

  const address = hasAny(q, [
    "dia chi chi doan",
    "dia chi truong",
    "truong o dau",
    "chi doan o dau",
    "dia diem chi doan",
    "dia chi",
  ]);

  const contact = hasAny(q, [
    "lien he",
    "contact",
    "can lien he ai",
    "muon lien he chi doan",
    "lien lac voi chi doan",
  ]);

  const introduction = hasAny(q, [
    "gioi thieu chi doan",
    "gioi thieu d k66",
    "chi doan la gi",
    "d k66 la gi",
    "dk66 la gi",
    "gioi thieu",
  ]);

  const documents =
    hasAny(q, [
      "tai lieu",
      "van ban",
      "ke hoach",
      "bien ban",
      "cong van",
    ]) && (isWhereQuestion(q) || hasAny(q, ["xem", "mo", "tim"]));

  const library =
    hasAny(q, ["thu vien", "hinh anh", "anh hoat dong", "anh"]) &&
    (isWhereQuestion(q) || hasAny(q, ["xem", "tim"]));

  const activities =
    hasAny(q, ["hoat dong", "su kien"]) &&
    (isWhereQuestion(q) || hasAny(q, ["xem", "tim"]));

  const announcements =
    hasAny(q, ["thong bao", "tin tuc"]) &&
    (isWhereQuestion(q) || hasAny(q, ["xem", "tim"]));

  const login = hasAny(q, [
    "dang nhap bch o dau",
    "dang nhap admin o dau",
    "dang nhap o dau",
    "vao admin",
    "vao bch",
    "login bch",
    "login admin",
    "tai khoan admin",
  ]);

  const dashboard = hasAny(q, [
    "dashboard la gi",
    "dashboard o dau",
    "khu quan ly",
    "khu vuc quan ly",
    "khu vuc quan tri",
    "trang quan tri",
    "trang quan ly",
    "chuc nang dashboard",
    "dashboard co gi",
    "dashboard co nhung gi",
  ]);

  const onlyoffice = hasAny(q, [
    "onlyoffice la gi",
    "only office la gi",
    "onlyoffice",
    "only office",
    "soan thao tai lieu",
    "trinh soan thao",
    "chinh sua word",
    "word online",
  ]);

  const usageGuide = hasAny(q, [
    "huong dan su dung website",
    "cach su dung website",
    "dung website nhu the nao",
    "su dung website nhu the nao",
    "website co nhung chuc nang gi",
    "website co nhung muc nao",
    "website gom nhung gi",
    "huong dan website",
  ]);

  const aiHelp = hasAny(q, [
    "ai lam duoc gi",
    "tro ly ai lam duoc gi",
    "co the hoi ai gi",
    "hoi ai duoc gi",
    "ai ho tro gi",
    "ai nay lam gi",
    "chatbot lam duoc gi",
  ]);

  const security = hasAny(q, [
    "bao mat",
    "mat khau",
    "phan quyen",
    "quyen admin",
    "quyen truy cap",
    "thong tin bao mat",
    "tai khoan co an toan khong",
  ]);

  const memberCount = hasAny(q, [
    "bao nhieu doan vien",
    "bao nhieu thanh vien",
    "co bao nhieu thanh vien",
    "so luong doan vien",
    "so luong thanh vien",
    "tong so doan vien",
    "tong so thanh vien",
    "quan so doan vien",
    "si so doan vien",
    "chi doan co bao nhieu nguoi",
  ]);

  const maleCount = hasAny(q, [
    "bao nhieu nam",
    "co bao nhieu nam",
    "so nam",
    "doan vien nam",
    "thanh vien nam",
  ]);

  const femaleCount = hasAny(q, [
    "bao nhieu nu",
    "co bao nhieu nu",
    "so nu",
    "doan vien nu",
    "thanh vien nu",
  ]);

  const latestAnnouncement = hasAny(q, [
    "thong bao moi nhat",
    "thong bao gan nhat",
    "thong bao gan day",
    "thong bao moi",
    "tin moi nhat",
    "tin thong bao moi",
    "thong bao vua dang",
  ]);

  const latestActivity = hasAny(q, [
    "hoat dong moi nhat",
    "hoat dong gan nhat",
    "hoat dong gan day",
    "su kien moi nhat",
    "su kien gan day",
    "hoat dong moi",
  ]);

  const latestDocument = hasAny(q, [
    "tai lieu moi nhat",
    "tai lieu gan nhat",
    "tai lieu gan day",
    "tai lieu moi",
    "van ban moi nhat",
    "van ban gan day",
  ]);

  return {
    websiteInfo,
    introduction,
    founder,
    secretary,
    deputySecretary,
    committeeMember,
    bchList,
    schoolYouthUnion,
    schoolLeadership,
    address,
    contact,
    documents,
    library,
    activities,
    announcements,
    login,
    dashboard,
    onlyoffice,
    usageGuide,
    aiHelp,
    security,
    memberCount,
    maleCount,
    femaleCount,
    latestAnnouncement,
    latestActivity,
    latestDocument,
  };
}

/* =========================================================
   PAGE KNOWLEDGE
========================================================= */

function getPageKnowledge(page: string) {
  const p = normalize(page);

  if (p === "/") {
    return `Người dùng đang ở trang chủ. Trang chủ có Giới thiệu, Hoạt động, Thông báo, Tài liệu, Thư viện, Liên hệ và Đăng nhập BCH / Admin.`;
  }

  if (p.includes("dashboard")) {
    return `Người dùng đang ở khu vực Dashboard quản trị. Đây là khu vực dành cho Ban Chấp hành/người có quyền phù hợp, với các nhóm chức năng như thành viên, thông báo, hoạt động, tài liệu và thư viện.`;
  }

  if (p.includes("announcement")) {
    return `Người dùng đang ở khu vực Thông báo.`;
  }

  if (p.includes("document")) {
    return `Người dùng đang ở khu vực Tài liệu/Soạn thảo. Website có tích hợp OnlyOffice.`;
  }

  if (p.includes("library")) {
    return `Người dùng đang ở khu vực Thư viện hình ảnh.`;
  }

  if (p.includes("activity")) {
    return `Người dùng đang ở khu vực Hoạt động.`;
  }

  return `Trang hiện tại: ${page}`;
}

/* =========================================================
   DIRECT ANSWERS
========================================================= */

function getDirectAnswer(message: string, mode: AIMode) {
  const q = normalize(message);
  const intent = getIntent(message);

  if (intent.founder) {
    return `Website Chi đoàn D-K66 – Trường THPT Hà Trung được P. Bí thư Đinh Anh Bảo sáng lập và trực tiếp xây dựng.`;
  }

  if (intent.secretary) {
    return `Bí thư BCH Chi đoàn D-K66 là Đ/c: Nguyễn Thị Huyền.`;
  }

  if (intent.deputySecretary) {
    return `Phó Bí thư BCH Chi đoàn D-K66 là Đ/c: Đinh Anh Bảo.`;
  }

  if (intent.committeeMember) {
    return `Uỷ viên BCH Chi đoàn D-K66 là Đ/c: Đỗ Ngọc Châu.`;
  }

  if (intent.bchList) {
    return `Ban Chấp hành Chi đoàn D-K66 hiện gồm:
• Bí thư: Nguyễn Thị Huyền
• Phó Bí thư: Đinh Anh Bảo
• Uỷ viên: Đỗ Ngọc Châu`;
  }

  if (intent.schoolYouthUnion) {
    return `Theo thông tin hiện có của website:
• Bí thư BCH Đoàn trường: Thầy Trịnh Cao Cường
• Phó Bí thư BCH Đoàn trường: Cô Lê Thị Đạm`;
  }

  if (intent.schoolLeadership) {
    return `Theo thông tin hiện có:
• Hiệu trưởng: Thầy Trịnh Xuân Thanh
• Phó Hiệu trưởng: Thầy Nguyễn Văn Dũng
• Phó Hiệu trưởng: Cô Đoàn Văn Ân`;
  }

  if (intent.address) {
    return `Địa chỉ: xã Hoạt Giang, tỉnh Thanh Hoá. Tên đơn vị: Chi đoàn D-K66 – Trường THPT Hà Trung.`;
  }

  if (intent.contact) {
    return `Bạn có thể sử dụng mục “Liên hệ” trên website để xem thông tin liên hệ được công bố của Chi đoàn.`;
  }

  if (intent.websiteInfo) {
    return `Đây là website lưu giữ kỷ niệm, và tích hợp quản lý đoàn viên của BCH Chi đoàn D-K66 – Trường THPT Hà Trung.

Website phục vụ:
• Giới thiệu Chi đoàn
• Hoạt động và sự kiện
• Thông báo
• Tài liệu
• Thư viện hình ảnh
• Liên hệ
• Khu vực quản lý dành cho BCH/Admin`;
  }

  if (intent.introduction) {
    return `Chi đoàn D-K66 là tập thể đoàn viên thuộc Trường THPT Hà Trung. Website được xây dựng để giới thiệu, lưu trữ và hỗ trợ quản lý thông tin, hoạt động, thông báo, tài liệu và hình ảnh của Chi đoàn.`;
  }

  if (intent.documents) {
    return `Bạn có thể vào mục “Tài liệu” trên thanh điều hướng để xem các văn bản, kế hoạch, biên bản và những tài liệu khác của Chi đoàn.`;
  }

  if (intent.library) {
    return `Bạn có thể vào mục “Thư viện” để xem hình ảnh và nội dung liên quan đến hoạt động của Chi đoàn.`;
  }

  if (intent.activities) {
    return `Bạn có thể vào mục “Hoạt động” để xem các hoạt động và sự kiện của Chi đoàn D-K66.`;
  }

  if (intent.announcements) {
    return `Bạn có thể vào mục “Thông báo” để xem các thông báo của Chi đoàn.`;
  }

  if (intent.login) {
    return `Bạn có thể sử dụng mục “Đăng nhập BCH / Admin” trên trang chủ để vào khu vực quản lý, với tài khoản đã được cấp quyền phù hợp.`;
  }

  if (intent.dashboard) {
    if (mode === "admin") {
      return `Bạn đang ở khu vực Dashboard quản trị.

Các nhóm chức năng chính gồm:
• Thành viên
• Thông báo
• Hoạt động
• Tài liệu
• Thư viện
• Một số chức năng quản trị khác`;
    }

    return `Dashboard là khu vực quản lý dành cho Ban Chấp hành hoặc người dùng được cấp quyền phù hợp. Bạn cần đăng nhập để sử dụng chức năng quản trị.`;
  }

  if (intent.onlyoffice) {
    return `Website có tích hợp OnlyOffice để hỗ trợ xem, soạn thảo và chỉnh sửa tài liệu trực tuyến trong một số luồng tài liệu.`;
  }

  if (intent.usageGuide) {
    return `Bạn có thể dùng website theo cách đơn giản:
1. Trang chủ: xem thông tin tổng quan.
2. Hoạt động: xem hoạt động/sự kiện.
3. Thông báo: xem tin và thông báo.
4. Tài liệu: xem tài liệu, văn bản.
5. Thư viện: xem hình ảnh.
6. Đăng nhập BCH / Admin: vào khu vực quản lý nếu có quyền.`;
  }

  if (intent.aiHelp) {
    return `Mình có thể hỗ trợ bạn về website, BCH, chức năng các mục, hướng dẫn sử dụng, thông báo, hoạt động, tài liệu, thư viện, OnlyOffice và một số dữ liệu của hệ thống.`;
  }

  if (intent.security) {
    return `Website có cơ chế đăng nhập và phân quyền cho khu vực quản trị. Trợ lý AI không cung cấp mật khẩu, secret key hoặc hướng dẫn vượt qua phân quyền.`;
  }

  // Một số câu ngắn nhưng rất rõ nghĩa.
  if (q === "bch") {
    return `BCH Chi đoàn D-K66 hiện gồm Nguyễn Thị Huyền (Bí thư), Đinh Anh Bảo (Phó Bí thư) và Đỗ Ngọc Châu (Uỷ viên).`;
  }

  if (q === "bi thu") {
    return `Bí thư BCH Chi đoàn D-K66 là Đ/c Nguyễn Thị Huyền.`;
  }

  if (q === "pho bi thu") {
    return `Phó Bí thư BCH Chi đoàn D-K66 là Đ/c: Đinh Anh Bảo.`;
  }

  if (q === "ai tao web") {
    return `Website được P. Bí thư BCH Đinh Anh Bảo sáng lập và trực tiếp xây dựng.`;
  }

  return null;
}

/* =========================================================
   SUPABASE READS
========================================================= */

async function getMemberCount() {
  if (!supabase) return null;

  try {
    const result = await supabase
      .from("members")
      .select("id", { count: "exact", head: true });

    if (result.error) {
      console.error("[AI/Supabase members]", result.error.message);
      return null;
    }

    return result.count ?? 0;
  } catch (error) {
    console.error("[AI/Supabase members]", error);
    return null;
  }
}

async function getLatestAnnouncements() {
  if (!supabase) return [];

  try {
    const result = await supabase
      .from("announcements")
      .select("id,title,content,author,created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (result.error) {
      console.error("[AI/Supabase announcements]", result.error.message);
      return [];
    }

    return result.data ?? [];
  } catch (error) {
    console.error("[AI/Supabase announcements]", error);
    return [];
  }
}

async function getLatestActivities() {
  if (!supabase) return [];

  try {
    const result = await supabase
      .from("activities")
      .select(
        "id,title,description,location,start_at,end_at,status,created_at"
      )
      .order("start_at", { ascending: false })
      .limit(5);

    if (result.error) {
      console.error("[AI/Supabase activities]", result.error.message);
      return [];
    }

    return result.data ?? [];
  } catch (error) {
    console.error("[AI/Supabase activities]", error);
    return [];
  }
}

async function getLatestDocuments() {
  if (!supabase) return [];

  try {
    const result = await supabase
      .from("documents")
      .select("id,title,description,category,file_name,author,created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (result.error) {
      console.error("[AI/Supabase documents]", result.error.message);
      return [];
    }

    return result.data ?? [];
  } catch (error) {
    console.error("[AI/Supabase documents]", error);
    return [];
  }
}

/* =========================================================
   DATABASE ANSWERS
========================================================= */

async function getDatabaseAnswer(message: string) {
  const intent = getIntent(message);

  if (intent.memberCount) {
    const count = await getMemberCount();
    if (count === null) {
      return `Hiện tại mình chưa đọc được số lượng thành viên từ cơ sở dữ liệu.`;
    }
    return `Theo dữ liệu hiện tại trong hệ thống, có ${count} thành viên/đoàn viên trong danh sách quản lý.`;
  }

  if (intent.maleCount) {
    // Knowledge hiện có số liệu tĩnh; không giả định cột giới tính của DB khi chưa biết schema.
    return `Theo thông tin hiện được cấu hình cho website: có 26 đoàn viên nam.`;
  }

  if (intent.femaleCount) {
    return `Theo thông tin hiện được cấu hình cho website: có 18 đoàn viên nữ.`;
  }

  if (intent.latestAnnouncement) {
    const announcements = await getLatestAnnouncements();
    if (!announcements.length) {
      return `Hiện tại mình chưa lấy được dữ liệu thông báo từ hệ thống.`;
    }

    const latest = announcements[0];
    return `Thông báo mới nhất hiện tại là:

“${latest.title}”

${latest.content || "Chưa có nội dung."}

Người đăng: ${latest.author || "Chưa xác định"}
Ngày đăng: ${latest.created_at ? new Date(latest.created_at).toLocaleDateString("vi-VN") : "Chưa xác định"}`;
  }

  if (intent.latestActivity) {
    const activities = await getLatestActivities();
    if (!activities.length) {
      return `Hiện tại mình chưa lấy được dữ liệu hoạt động từ hệ thống.`;
    }

    const latest = activities[0];
    return `Hoạt động gần nhất trong dữ liệu hệ thống là:

“${latest.title}”

${latest.description || "Chưa có mô tả."}

Địa điểm: ${latest.location || "Chưa cập nhật"}
Thời gian: ${latest.start_at ? new Date(latest.start_at).toLocaleString("vi-VN") : "Chưa cập nhật"}
Trạng thái: ${latest.status || "Chưa cập nhật"}`;
  }

  if (intent.latestDocument) {
    const documents = await getLatestDocuments();
    if (!documents.length) {
      return `Hiện tại mình chưa lấy được dữ liệu tài liệu từ hệ thống.`;
    }

    const latest = documents[0];
    return `Tài liệu mới nhất hiện tại là:

“${latest.title}”

Loại: ${latest.category || "Chưa xác định"}
Tên file: ${latest.file_name || "Chưa xác định"}
Người đăng: ${latest.author || "Chưa xác định"}
Ngày đăng: ${latest.created_at ? new Date(latest.created_at).toLocaleDateString("vi-VN") : "Chưa xác định"}`;
  }

  return null;
}

/* =========================================================
   GEMINI
========================================================= */

function isRateLimitError(errorText: string) {
  return /429|quota|rate.?limit|too many requests|resource exhausted|exceeded/i.test(
    errorText
  );
}

function isRetryableError(errorText: string) {
  return /503|502|500|timeout|timed out|temporar|network|fetch failed|overloaded/i.test(
    errorText
  );
}

function getRetryAfterMs(errorText: string) {
  const seconds = errorText.match(/retry in\s+([\d.]+)s/i)?.[1];
  if (!seconds) return 120_000;
  return Math.round(Number(seconds) * 1000);
}

async function callGemini(prompt: string) {
  if (!ai) return null;

  const state = getGeminiState();
  if (state) return null;

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const interaction = await ai.interactions.create({
        model: GEMINI_MODEL,
        input: prompt,
      });

      const answer = interaction.output_text?.trim();
      if (answer) return answer;
      return null;
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      console.error(`[AI/Gemini] attempt ${attempt}:`, errorText);

      if (isRateLimitError(errorText)) {
        const retryAfter = getRetryAfterMs(errorText);
        setGeminiCooldown(retryAfter, "rate_limit");
        return null;
      }

      if (!isRetryableError(errorText) || attempt === maxAttempts) {
        return null;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, attempt === 1 ? 700 : 1400)
      );
    }
  }

  return null;
}

async function askGemini({
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
  const state = getGeminiState();
  if (!ai || state) return null;

  const roleInstruction =
    mode === "admin"
      ? `Bạn đang hỗ trợ Ban Chấp hành/người quản trị. Có thể giải thích sâu về Dashboard và thao tác quản lý ở mức hợp lệ. Không hướng dẫn vượt quyền.`
      : `Bạn đang hỗ trợ khách truy cập. Ưu tiên hướng dẫn các chức năng công khai và thông tin của website.`;

  const historyText = history
    .slice(-8)
    .map((item) => {
      const role = item.role === "user" ? "Người dùng" : "Trợ lý";
      return `${role}: ${item.content.trim().slice(0, 900)}`;
    })
    .join("\n");

  const prompt = `
${WEBSITE_KNOWLEDGE}

${getPageKnowledge(page)}

${roleInstruction}

LỊCH SỬ GẦN NHẤT:
${historyText || "Chưa có lịch sử."}

CÂU HỎI HIỆN TẠI:
${message.slice(0, 2500)}

YÊU CẦU:
- Trả lời bằng tiếng Việt.
- Hiểu cách hỏi tự nhiên, thiếu dấu, viết tắt hoặc sai chính tả nhẹ.
- Không yêu cầu người dùng phải dùng một mẫu câu cố định.
- Trả lời trực tiếp, thân thiện và vừa đủ chi tiết.
- Với thông tin đã có trong WEBSITE_KNOWLEDGE, phải ưu tiên đúng thông tin đó.
- Không được bịa dữ liệu website, tên người, số liệu, thông báo, hoạt động hoặc tài liệu.
- Khi câu hỏi cần dữ liệu động nhưng không có dữ liệu được cung cấp, nói rõ điều đó.
- Không tiết lộ API key, secret key, token, mật khẩu hay cấu hình bảo mật.
- Không hướng dẫn vượt qua đăng nhập/phân quyền.
- Không tự nhận đã thực hiện hành động mà hệ thống chưa thực hiện.
`;

  return callGemini(prompt);
}

/* =========================================================
   INTELLIGENT FALLBACK
========================================================= */

function getIntelligentFallback(message: string, mode: AIMode) {
  const q = normalize(message);

  // Thử lại direct answer một lần cuối để không trả về thông báo lỗi chung.
  const direct = getDirectAnswer(message, mode);
  if (direct) return direct;

  if (hasAny(q, ["website", "web", "chi doan"])) {
    return `Mình chưa thể xử lý câu hỏi này bằng AI nâng cao lúc này, nhưng mình vẫn có thể hỗ trợ các thông tin về Chi đoàn D-K66, BCH, chức năng website, Tài liệu, Hoạt động, Thông báo, Thư viện và Dashboard.`;
  }

  return `Mình chưa có đủ dữ liệu để trả lời chính xác câu hỏi này. Bạn có thể hỏi mình về Chi đoàn D-K66, BCH, website, Hoạt động, Thông báo, Tài liệu, Thư viện hoặc cách sử dụng Dashboard.`;
}

/* =========================================================
   POST
========================================================= */

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AIRequest;

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    const page = typeof body.page === "string" ? body.page : "/";
    const mode: AIMode = body.mode === "admin" ? "admin" : "public";

    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history.filter(
          (item): item is ChatMessage =>
            !!item &&
            typeof item === "object" &&
            "role" in item &&
            "content" in item &&
            ((item as ChatMessage).role === "user" ||
              (item as ChatMessage).role === "assistant") &&
            typeof (item as ChatMessage).content === "string"
        )
      : [];

    if (!message) {
      return NextResponse.json(
        { error: "Tin nhắn không được để trống." },
        { status: 400 }
      );
    }

    const normalizedMessage = normalize(message);
    const cacheKey = `${mode}|${normalizedMessage}`;

    const cached = getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ message: cached, source: "cache" });
    }

    /* 1. Trả lời từ knowledge nội bộ */
    const directAnswer = getDirectAnswer(message, mode);
    if (directAnswer) {
      setCache(cacheKey, directAnswer);
      return NextResponse.json({ message: directAnswer, source: "internal" });
    }

    /* 2. Trả lời dữ liệu thực từ Supabase/knowledge số liệu */
    const databaseAnswer = await getDatabaseAnswer(message);
    if (databaseAnswer) {
      setCache(cacheKey, databaseAnswer, DATABASE_CACHE_TTL);
      return NextResponse.json({
        message: databaseAnswer,
        source: "supabase",
      });
    }

    /* 3. Gemini chỉ dành cho câu hỏi mở */
    const geminiAnswer = await askGemini({
      message,
      history,
      page,
      mode,
    });

    if (geminiAnswer) {
      setCache(cacheKey, geminiAnswer, GEMINI_CACHE_TTL);
      return NextResponse.json({
        message: geminiAnswer,
        source: "gemini",
      });
    }

    /* 4. Gemini lỗi/quota nhưng hệ thống vẫn phải trả lời hữu ích */
    const fallback = getIntelligentFallback(message, mode);
    return NextResponse.json({
      message: fallback,
      source: "fallback",
    });
  } catch (error) {
    console.error("[AI API]", error);

    return NextResponse.json(
      {
        message:
          "Mình chưa xử lý được câu hỏi này. Bạn hãy thử hỏi lại theo cách tự nhiên hơn về website Chi đoàn D-K66.",
        source: "error",
      },
      { status: 200 }
    );
  }
}
