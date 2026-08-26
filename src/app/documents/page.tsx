import Link from "next/link";

const documents = [
  {
    file: "thong-bao.docx",
    title: "Thông báo",
    description: "Các thông báo chính thức của Chi đoàn D-K66.",
    category: "Văn bản Đoàn",
    categoryKey: "van-ban",
    type: "DOCX",
  },
  {
    file: "announcement-12345.docx",
    title: "Thông báo hoạt động",
    description:
      "Tài liệu thông báo và triển khai hoạt động của Chi đoàn.",
    category: "Thông báo",
    categoryKey: "thong-bao",
    type: "DOCX",
  },
  {
    file: "announcement-31176a56-35ec-4fcc-b211-34de71f23b66.docx",
    title: "Thông báo Chi đoàn",
    description:
      "Văn bản được lưu trữ trong hệ thống tài liệu của Chi đoàn.",
    category: "Thông báo",
    categoryKey: "thong-bao",
    type: "DOCX",
  },
  {
    file: "test-docx.docx",
    title: "Tài liệu mẫu",
    description:
      "Tài liệu kiểm thử hệ thống quản lý và hiển thị văn bản.",
    category: "Tài liệu khác",
    categoryKey: "khac",
    type: "DOCX",
  },
];

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
    params.category && categories.some((item) => item.key === params.category)
      ? params.category
      : "all";

  const filteredDocuments =
    selectedCategory === "all"
      ? documents
      : documents.filter(
          (document) => document.categoryKey === selectedCategory
        );

  const selectedLabel =
    categories.find((item) => item.key === selectedCategory)?.label ??
    "Tất cả";

  return (
    <main className="documents-page">
      <section className="documents-hero">
        <div className="documents-hero-inner">
          <Link href="/" className="documents-back">
            ← Về trang chủ
          </Link>

          <span className="documents-eyebrow">
            CHI ĐOÀN D-K66
          </span>

          <h1>Thư viện tài liệu</h1>

          <p>
            Văn bản, thông báo và các tài liệu được lưu trữ phục vụ
            hoạt động của Chi đoàn.
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
              selectedCategory === category.key;

            return (
              <Link
                key={category.key}
                href={href}
                className={`documents-filter ${
                  active ? "active" : ""
                }`}
                aria-current={active ? "page" : undefined}
              >
                {category.label}
              </Link>
            );
          })}
        </nav>

        {filteredDocuments.length > 0 ? (
          <div className="documents-grid">
            {filteredDocuments.map((document) => {
              const fileUrl = `/documents/${encodeURIComponent(
                document.file
              )}`;

              return (
                <article
                  className="document-item"
                  key={document.file}
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

                    <h3>{document.title}</h3>

                    <p>{document.description}</p>
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
                      download
                      className="document-download"
                      aria-label={`Tải ${document.title}`}
                    >
                      ↓
                    </a>
                  </div>
                </article>
              );
            })}
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
              Hiện chưa có tài liệu trong danh mục{" "}
              <strong>{selectedLabel}</strong>.
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