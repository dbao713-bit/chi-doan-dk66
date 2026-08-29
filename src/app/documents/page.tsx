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

type Category =
  | "van-ban"
  | "thong-bao"
  | "ke-hoach"
  | "bien-ban"
  | "khac";

type DocumentItem = {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  author: string | null;
  created_at: string;
};

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createClient(
    url,
    publishableKey
  );
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
      (item) =>
        item.key === params.category
    )
      ? params.category
      : "all";

  const supabase = getSupabase();

  /*
   * =========================================================
   * LOAD DOCUMENTS
   * =========================================================
   *
   * Dùng chung bảng documents với dashboard.
   */

  const {
    data,
    error,
  } = await supabase
    .from("documents")
    .select(
      `
        id,
        title,
        description,
        category,
        file_path,
        file_name,
        mime_type,
        file_size,
        author,
        created_at
      `
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "[DOCUMENTS] Load documents error:",
      error
    );
  }

  const documents =
    (data ?? []) as DocumentItem[];

  /*
   * =========================================================
   * FILTER
   * =========================================================
   */

  const filteredDocuments =
    selectedCategory === "all"
      ? documents
      : documents.filter(
          (document) =>
            document.category ===
            selectedCategory
        );

  const selectedLabel =
    categories.find(
      (item) =>
        item.key === selectedCategory
    )?.label ?? "Tất cả";

  /*
   * =========================================================
   * FILE URL
   * =========================================================
   */

  function getFileUrl(
    filePath: string
  ) {
    if (!filePath) return "#";

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    return publicUrl;
  }

  function getFileType(
    fileName: string
  ) {
    return (
      fileName
        .split(".")
        .pop()
        ?.toUpperCase() || "FILE"
    );
  }

  function formatSize(
    bytes: number | null
  ) {
    if (!bytes) return "";

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return (
    <main className="documents-page">

      {/* HERO */}

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

          <h1>
            Thư viện tài liệu
          </h1>

          <p>
            Văn bản, thông báo và các tài liệu
            được lưu trữ phục vụ hoạt động của
            Chi đoàn.
          </p>

        </div>

      </section>


      {/* CONTENT */}

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


        {/* FILTER */}

        <nav
          className="documents-filters"
          aria-label="Lọc tài liệu"
        >

          {categories.map(
            (category) => {

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
                    active
                      ? "active"
                      : ""
                  }`}
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                >
                  {category.label}
                </Link>
              );
            }
          )}

        </nav>


        {/* DOCUMENT LIST */}

        {filteredDocuments.length >
        0 ? (

          <div className="documents-grid">

            {filteredDocuments.map(
              (document) => {

                const fileUrl =
                  getFileUrl(
                    document.file_path
                  );

                const fileType =
                  getFileType(
                    document.file_name
                  );

                return (
                  <article
                    className="document-item"
                    key={document.id}
                  >

                    <div className="document-item-top">

                      <div className="document-file-icon">
                        {fileType}
                      </div>

                      <span className="document-type">
                        {fileType}
                      </span>

                    </div>


                    <div className="document-item-body">

                      <span className="document-category">
                        {
                          categories.find(
                            (item) =>
                              item.key ===
                              document.category
                          )?.label ??
                          "Tài liệu khác"
                        }
                      </span>

                      <h3>
                        {document.title}
                      </h3>

                      <p>
                        {(
                          document.description ??
                          "Chưa có mô tả tài liệu."
                        ).length > 180
                          ? `${(
                              document.description ??
                              ""
                            ).substring(
                              0,
                              180
                            )}...`
                          : document.description ??
                            "Chưa có mô tả tài liệu."}
                      </p>


                      <small
                        style={{
                          display:
                            "block",
                          marginTop:
                            "12px",
                          color:
                            "#64748b",
                        }}
                      >
                        {document.author ||
                          "Admin"}

                        {" • "}

                        {new Date(
                          document.created_at
                        ).toLocaleDateString(
                          "vi-VN"
                        )}

                        {document.file_size
                          ? ` • ${formatSize(
                              document.file_size
                            )}`
                          : ""}
                      </small>

                    </div>


                    <div className="document-actions">

                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-open"
                      >
                        Mở tài liệu
                        <span>↗</span>
                      </a>

                      <a
                        href={fileUrl}
                        download={
                          document.file_name
                        }
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