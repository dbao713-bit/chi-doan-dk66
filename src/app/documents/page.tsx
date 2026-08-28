import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const categories = [
  {
    key: "all",
    label: "Tất cả",
  },
  {
    key: "van-ban",
    label: "Văn bản Đoàn",
  },
  {
    key: "thong-bao",
    label: "Thông báo",
  },
  {
    key: "ke-hoach",
    label: "Kế hoạch",
  },
  {
    key: "bien-ban",
    label: "Biên bản",
  },
  {
    key: "khac",
    label: "Tài liệu khác",
  },
];

type Announcement = {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
};

type DocumentItem = {
  id: string;
  file: string;
  title: string;
  description: string;
  category: string;
  categoryKey: string;
  type: string;
  author: string;
  createdAt: string;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createClient(url, publishableKey);
}

type DocumentsPageProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const params = await searchParams;

  const selectedCategory =
    params.category &&
    categories.some(
      (item) => item.key === params.category
    )
      ? params.category
      : "all";

  /**
   * =========================================================
   * LOAD ANNOUNCEMENTS
   * =========================================================
   *
   * Mỗi announcement tương ứng với một DOCX:
   *
   * announcement-{id}.docx
   */

  const supabase = getSupabase();

  const {
    data: announcements,
    error,
  } = await supabase
    .from("announcements")
    .select(
      "id, title, content, author, created_at"
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "[DOCUMENTS] Load announcements error:",
      error
    );
  }

  /**
   * =========================================================
   * CONVERT ANNOUNCEMENTS -> DOCUMENTS
   * =========================================================
   */

  const documents: DocumentItem[] =
    ((announcements ?? []) as Announcement[]).map(
      (announcement) => ({
        id: String(announcement.id),

        file: `announcement-${announcement.id}.docx`,

        title: announcement.title,

        description:
          announcement.content?.trim() ||
          "Tài liệu thông báo của Chi đoàn D-K66.",

        category: "Thông báo",

        categoryKey: "thong-bao",

        type: "DOCX",
        author: announcement.author,
        createdAt:
          announcement.created_at,
      })
    );

  /**
   * =========================================================
   * FILTER
   * =========================================================
   */

  const filteredDocuments =
    selectedCategory === "all"
      ? documents
      : documents.filter(
          (document) =>
            document.categoryKey ===
            selectedCategory
        );

  const selectedLabel =
    categories.find(
      (item) =>
        item.key === selectedCategory
    )?.label ?? "Tất cả";

  return (
    <main className="documents-page">
      <section className="documents-hero">
        <div className="documents-hero-inner">
          <Link
            href="/"
            className="documents-back"
          >
            ← Về trang chủ
          </Link>

          <span className="documents-eyebrow">
            CHI ĐOÀN D-K66
          </span>

          <h1>Thư viện tài liệu</h1>

          <p>
            Văn bản, thông báo và các tài liệu
            được lưu trữ phục vụ hoạt động của
            Chi đoàn.
          </p>
        </div>
      </section>

      <section className="documents-container">
        <div className="documents-header">
          <div>
            <span className="documents-label">
              DOCUMENT ARCHIVE
            </span>

            <h2>
              {selectedCategory === "all"
                ? "Tài liệu của Chi đoàn"
                : selectedLabel}
            </h2>
          </div>

          <span className="documents-count">
            {filteredDocuments.length} tài liệu
          </span>
        </div>

        <nav
          className="documents-filters"
          aria-label="Lọc tài liệu"
        >
          {categories.map((category) => {
            const href =
              category.key === "all"
                ? "/documents"
                : `/documents?category=${category.key}`;

            const active =
              selectedCategory ===
              category.key;

            return (
              <Link
                key={category.key}
                href={href}
                className={`documents-filter ${
                  active ? "active" : ""
                }`}
                aria-current={
                  active ? "page" : undefined
                }
              >
                {category.label}
              </Link>
            );
          })}
        </nav>

        {filteredDocuments.length > 0 ? (
          <div className="documents-grid">
            {filteredDocuments.map(
              (document) => {
                /**
                 * =================================================
                 * ONLYOFFICE DOCUMENT ID
                 * =================================================
                 *
                 * Không dùng:
                 *
                 * /documents/file.docx
                 *
                 * nữa.
                 *
                 * Document sẽ mở thông qua route:
                 *
                 * /edit/{documentId}
                 */

                const editorUrl =
                  `/edit/${encodeURIComponent(
                    `announcement-${document.id}`
                  )}`;

                return (
                  <article
                    className="document-item"
                    key={document.id}
                  >
                    <div className="document-item-top">
                      <div className="document-file-icon">
                        DOC
                      </div>

                      <span className="document-type">
                        {document.type}
                      </span>
                    </div>

                    <div className="document-item-body">
                      <span className="document-category">
                        {document.category}
                      </span>

                      <h3>
                        {document.title}
                      </h3>

                      <p>
                        {document.description.length >
                        180
                          ? `${document.description.substring(
                              0,
                              180
                            )}...`
                          : document.description}
                      </p>

                      <small
                         style={{
                           display: "block",
                           marginTop: "12px",
                           color: "#64748b",
                          }}
                       >
                        {document.author || "Admin"} •{" "}
                    {new Date(
                        document.createdAt
                    ).toLocaleDateString("vi-VN")}
                    </small>
                    </div>

                    <div className="document-actions">
                      <Link
                        href={editorUrl}
                        className="document-open"
                      >
                        Mở tài liệu
                        <span>↗</span>
                      </Link>

                      <a
                        href={`/api/onlyoffice/file/${encodeURIComponent(
                          `announcement-${document.id}`
                        )}`}
                        download={document.file}
                        className="document-download"
                        aria-label={`Tải ${document.title}`}
                      >
                        ↓
                      </a>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="documents-empty">
            <div className="documents-empty-icon">
              —
            </div>

            <h3>
              Chưa có tài liệu
            </h3>

            <p>
              Hiện chưa có tài liệu trong danh
              mục{" "}
              <strong>
                {selectedLabel}
              </strong>
              .
            </p>

            <Link
              href="/documents"
              className="documents-empty-link"
            >
              Xem tất cả tài liệu →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}