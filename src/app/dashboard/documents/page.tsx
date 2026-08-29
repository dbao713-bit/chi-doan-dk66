"use client";

import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Download,
  CheckCircle2,
  Search,
  Files,
  FileSpreadsheet,
  FileArchive,
  Clock3,
  Filter,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

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

const categoryLabels: Record<Category, string> = {
  "van-ban": "Văn bản Đoàn",
  "thong-bao": "Thông báo",
  "ke-hoach": "Kế hoạch",
  "bien-ban": "Biên bản",
  khac: "Tài liệu khác",
};

const categoryColors: Record<
  Category,
  {
    badge: string;
    icon: string;
    soft: string;
  }
> = {
  "van-ban": {
    badge: "documents-category-blue",
    icon: "documents-icon-blue",
    soft: "documents-soft-blue",
  },
  "thong-bao": {
    badge: "documents-category-red",
    icon: "documents-icon-red",
    soft: "documents-soft-red",
  },
  "ke-hoach": {
    badge: "documents-category-violet",
    icon: "documents-icon-violet",
    soft: "documents-soft-violet",
  },
  "bien-ban": {
    badge: "documents-category-amber",
    icon: "documents-icon-amber",
    soft: "documents-soft-amber",
  },
  khac: {
    badge: "documents-category-slate",
    icon: "documents-icon-slate",
    soft: "documents-soft-slate",
  },
};

const allowedExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
];

const maxFileSize = 15 * 1024 * 1024;

export default function DashboardDocumentsPage() {
  const [documents, setDocuments] = useState<
    DocumentItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<"all" | Category>("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [category, setCategory] =
    useState<Category>("khac");
  const [author, setAuthor] = useState("");
  const [file, setFile] =
    useState<File | null>(null);

  async function loadDocuments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, title, description, category, file_path, file_name, mime_type, file_size, author, created_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "LOAD DOCUMENTS ERROR:",
        error
      );

      alert(
        `Không thể tải tài liệu: ${error.message}`
      );
    } else {
      setDocuments(
        (data ?? []) as DocumentItem[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesSearch =
        !keyword ||
        document.title
          .toLowerCase()
          .includes(keyword) ||
        document.file_name
          .toLowerCase()
          .includes(keyword) ||
        (document.author ?? "")
          .toLowerCase()
          .includes(keyword);

      const matchesCategory =
        categoryFilter === "all" ||
        document.category === categoryFilter;

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    documents,
    search,
    categoryFilter,
  ]);

  const categoryCounts = useMemo(() => {
    return {
      all: documents.length,
      "van-ban": documents.filter(
        (item) => item.category === "van-ban"
      ).length,
      "thong-bao": documents.filter(
        (item) => item.category === "thong-bao"
      ).length,
      "ke-hoach": documents.filter(
        (item) => item.category === "ke-hoach"
      ).length,
      "bien-ban": documents.filter(
        (item) => item.category === "bien-ban"
      ).length,
      khac: documents.filter(
        (item) => item.category === "khac"
      ).length,
    };
  }, [documents]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setCategory("khac");
    setAuthor("");
    setFile(null);
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(document: DocumentItem) {
    setEditingId(document.id);
    setTitle(document.title);
    setDescription(
      document.description ?? ""
    );
    setCategory(document.category);
    setAuthor(document.author ?? "");
    setFile(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension =
      `.${selectedFile.name
        .split(".")
        .pop()
        ?.toLowerCase()}`;

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      alert(
        "File không được hỗ trợ. Hãy chọn PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX hoặc TXT."
      );

      event.target.value = "";
      return;
    }

    if (
      selectedFile.size >
      maxFileSize
    ) {
      alert(
        "Dung lượng file tối đa là 15MB."
      );

      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

async function uploadFile(selectedFile: File) {
  const extension =
    selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase() || "file";

  const fileName = `${crypto.randomUUID()}.${extension}`;

  // Không cần thêm "documents/" vì bucket đã là documents
  const path = fileName;

  console.log("UPLOAD DOCUMENT:", {
    bucket: "documents",
    path,
    fileName: selectedFile.name,
    type: selectedFile.type,
    size: selectedFile.size,
  });

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(path, selectedFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: selectedFile.type || "application/octet-stream",
    });

  if (error) {
    console.error("SUPABASE STORAGE UPLOAD ERROR:", error);

    if (
      error.message
        .toLowerCase()
        .includes("bucket not found")
    ) {
      throw new Error(
        'Không tìm thấy Storage Bucket "documents". Hãy kiểm tra bucket documents trong đúng Supabase Project mà website đang kết nối.'
      );
    }

    if (
      error.message
        .toLowerCase()
        .includes("row-level security")
    ) {
      throw new Error(
        "Supabase Storage đang chặn upload bằng RLS Policy. Hãy kiểm tra Storage Policies của bucket documents."
      );
    }

    throw new Error(
      `Upload thất bại: ${error.message}`
    );
  }

  if (!data?.path) {
    throw new Error(
      "Upload thành công nhưng Supabase không trả về đường dẫn file."
    );
  }

  return data.path;
}

async function deleteStorageFile(path: string) {
  if (!path) return;

  const cleanPath = path.replace(/^documents\//, "");

  const { error } = await supabase.storage
    .from("documents")
    .remove([cleanPath]);

  if (error) {
    console.error(
      "DELETE STORAGE ERROR:",
      error
    );
  }
}

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (saving) return;

    if (!title.trim()) {
      alert(
        "Vui lòng nhập tên tài liệu."
      );
      return;
    }

    if (!editingId && !file) {
      alert(
        "Vui lòng chọn file tài liệu."
      );
      return;
    }

    setSaving(true);

    let uploadedPath:
      | string
      | null = null;

    try {
      let filePath = "";
      let fileName = "";
      let mimeType = "";
      let fileSize = 0;

      if (file) {
        filePath =
          await uploadFile(file);

        uploadedPath = filePath;

        fileName = file.name;
        mimeType = file.type;
        fileSize = file.size;
      }

      if (editingId) {
        const current =
          documents.find(
            (item) =>
              item.id === editingId
          );

        if (!current) {
          throw new Error(
            "Không tìm thấy tài liệu."
          );
        }

        const updateData: Record<
          string,
          unknown
        > = {
          title: title.trim(),
          description:
            description.trim() ||
            null,
          category,
          author:
            author.trim() || null,
        };

        if (file) {
          updateData.file_path =
            filePath;
          updateData.file_name =
            fileName;
          updateData.mime_type =
            mimeType || null;
          updateData.file_size =
            fileSize;
        }

        const { error } =
          await supabase
            .from("documents")
            .update(updateData)
            .eq(
              "id",
              editingId
            );

        if (error) {
          throw new Error(
            error.message
          );
        }

        if (
          file &&
          current.file_path &&
          current.file_path !==
            filePath
        ) {
          await deleteStorageFile(
            current.file_path
          );
        }

        uploadedPath = null;
      } else {
        const { error } =
          await supabase
            .from("documents")
            .insert({
              title:
                title.trim(),
              description:
                description.trim() ||
                null,
              category,
              file_path:
                filePath,
              file_name:
                fileName,
              mime_type:
                mimeType || null,
              file_size:
                fileSize || null,
              author:
                author.trim() ||
                null,
            });

        if (error) {
          throw new Error(
            error.message
          );
        }

        uploadedPath = null;
      }

      setModalOpen(false);
      resetForm();

      await loadDocuments();
    } catch (error) {
      console.error(
        "SAVE DOCUMENT ERROR:",
        error
      );

      if (uploadedPath) {
        await deleteStorageFile(
          uploadedPath
        );
      }

      alert(
        error instanceof Error
          ? error.message
          : "Không thể lưu tài liệu."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    document: DocumentItem
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa "${document.title}" không?\n\nFile tài liệu cũng sẽ bị xóa khỏi hệ thống.`
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("documents")
        .delete()
        .eq(
          "id",
          document.id
        );

    if (error) {
      alert(
        `Không thể xóa: ${error.message}`
      );
      return;
    }

    await deleteStorageFile(
      document.file_path
    );

    setDocuments((current) =>
      current.filter(
        (item) =>
          item.id !== document.id
      )
    );
  }

function getFileUrl(path: string) {
  if (!path) return "#";

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("documents")
    .getPublicUrl(path);

  return publicUrl;
}

  function getFileExtension(
    name: string
  ) {
    const extension =
      name
        .split(".")
        .pop()
        ?.toUpperCase() || "FILE";

    return extension;
  }

  function formatSize(
    bytes: number | null
  ) {
    if (!bytes) return "—";

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
    <main className="dashboard-page documents-dashboard-page">

      {/* HERO */}

      <section className="documents-dashboard-hero">

        <div className="documents-dashboard-hero-glow one" />
        <div className="documents-dashboard-hero-glow two" />

        <div className="documents-dashboard-hero-content">

          <div className="documents-dashboard-kicker">
            <Files size={15} />
            KHO TRI THỨC
          </div>

          <h1>
            Quản lý tài liệu
          </h1>

          <p>
            Quản lý tập trung văn bản, thông báo,
            kế hoạch, biên bản và các tài liệu
            phục vụ hoạt động của Chi đoàn.
          </p>

          <div className="documents-dashboard-hero-actions">
            <button
              type="button"
              onClick={openCreate}
              className="documents-dashboard-primary"
            >
              <Plus size={18} />
              Thêm tài liệu
            </button>

            <span className="documents-dashboard-hero-note">
              <CheckCircle2 size={15} />
              {documents.length} tài liệu đang lưu trữ
            </span>
          </div>

        </div>

        <div className="documents-dashboard-hero-stat">
          <span>
            TỔNG TÀI LIỆU
          </span>

          <strong>
            {documents.length}
          </strong>

          <small>
            tệp trong hệ thống
          </small>
        </div>

      </section>


      {/* QUICK STATS */}

      <section className="documents-dashboard-stats">

        <button
          type="button"
          className={`documents-stat ${
            categoryFilter === "all"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setCategoryFilter("all")
          }
        >
          <div className="documents-stat-icon documents-icon-blue">
            <Files size={19} />
          </div>

          <div>
            <span>
              Tất cả
            </span>

            <strong>
              {categoryCounts.all}
            </strong>

            <small>
              tài liệu
            </small>
          </div>
        </button>

        <button
          type="button"
          className={`documents-stat ${
            categoryFilter === "van-ban"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setCategoryFilter("van-ban")
          }
        >
          <div className="documents-stat-icon documents-icon-blue">
            <FileText size={19} />
          </div>

          <div>
            <span>
              Văn bản
            </span>

            <strong>
              {categoryCounts["van-ban"]}
            </strong>

            <small>
              tệp
            </small>
          </div>
        </button>

        <button
          type="button"
          className={`documents-stat ${
            categoryFilter === "thong-bao"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setCategoryFilter(
              "thong-bao"
            )
          }
        >
          <div className="documents-stat-icon documents-icon-red">
            <Clock3 size={19} />
          </div>

          <div>
            <span>
              Thông báo
            </span>

            <strong>
              {
                categoryCounts[
                  "thong-bao"
                ]
              }
            </strong>

            <small>
              tệp
            </small>
          </div>
        </button>

        <button
          type="button"
          className={`documents-stat ${
            categoryFilter === "ke-hoach"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setCategoryFilter(
              "ke-hoach"
            )
          }
        >
          <div className="documents-stat-icon documents-icon-violet">
            <FileSpreadsheet size={19} />
          </div>

          <div>
            <span>
              Kế hoạch
            </span>

            <strong>
              {
                categoryCounts[
                  "ke-hoach"
                ]
              }
            </strong>

            <small>
              tệp
            </small>
          </div>
        </button>

        <button
          type="button"
          className={`documents-stat ${
            categoryFilter === "bien-ban"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setCategoryFilter(
              "bien-ban"
            )
          }
        >
          <div className="documents-stat-icon documents-icon-amber">
            <FileArchive size={19} />
          </div>

          <div>
            <span>
              Biên bản
            </span>

            <strong>
              {
                categoryCounts[
                  "bien-ban"
                ]
              }
            </strong>

            <small>
              tệp
            </small>
          </div>
        </button>

      </section>


      {/* CONTENT */}

      <section className="documents-dashboard-card">

        <div className="documents-dashboard-card-header">

          <div>
            <span>
              DOCUMENT LIBRARY
            </span>

            <h2>
              Danh sách tài liệu
            </h2>

            <p>
              {filteredDocuments.length}
              {" "}
              tài liệu phù hợp
            </p>
          </div>


          <div className="documents-dashboard-toolbar">

            <div className="documents-search">

              <Search size={17} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Tìm tài liệu..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}

            </div>


            <div className="documents-filter-box">

              <Filter size={15} />

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target
                      .value as
                      | "all"
                      | Category
                  )
                }
              >
                <option value="all">
                  Tất cả danh mục
                </option>

                {Object.entries(
                  categoryLabels
                ).map(
                  ([key, label]) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>

            </div>

          </div>

        </div>


        {loading ? (

          <div className="documents-admin-loading-premium">

            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                className="documents-loading-row"
                key={index}
              >
                <div />
                <div className="grow">
                  <span />
                  <small />
                </div>
                <div />
              </div>
            ))}

          </div>

        ) : filteredDocuments.length === 0 ? (

          <div className="documents-admin-empty">

            <div className="documents-admin-empty-icon">
              <FileText size={34} />
            </div>

            <span>
              DOCUMENT LIBRARY
            </span>

            <h3>
              Không tìm thấy tài liệu
            </h3>

            <p>
              Thử thay đổi từ khóa hoặc
              bộ lọc danh mục.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
              }}
              className="documents-dashboard-secondary"
            >
              Xóa bộ lọc
            </button>

          </div>

        ) : (

          <div className="documents-admin-list-premium">

            {filteredDocuments.map(
              (document, index) => (
                <article
                  key={document.id}
                  className="documents-admin-item-premium"
                >

                  <div className="documents-item-number">
                    {String(
                      index + 1
                    ).padStart(2, "0")}
                  </div>


                  <div
                    className={`documents-admin-file-icon ${
                      categoryColors[
                        document.category
                      ].icon
                    }`}
                  >
                    <FileText size={21} />

                    <span>
                      {getFileExtension(
                        document.file_name
                      )}
                    </span>
                  </div>


                  <div className="documents-admin-main">

                    <div className="documents-admin-title-row">

                      <h3>
                        {document.title}
                      </h3>

                      <span
                        className={
                          categoryColors[
                            document.category
                          ].badge
                        }
                      >
                        {
                          categoryLabels[
                            document.category
                          ]
                        }
                      </span>

                    </div>

                    <p>
                      {document.description ||
                        "Chưa có mô tả tài liệu."}
                    </p>

                    <div className="documents-admin-meta">

                      <span>
                        {document.author ||
                          "Admin"}
                      </span>

                      <i />

                      <span>
                        {formatDate(
                          document.created_at
                        )}
                      </span>

                      <i />

                      <span>
                        {formatSize(
                          document.file_size
                        )}
                      </span>

                      <i />

                      <span>
                        {document.file_name}
                      </span>

                    </div>

                  </div>


                  <div className="documents-admin-actions-premium">

                    <a
                      href={getFileUrl(
                        document.file_path
                      )}
                      target="_blank"
                      rel="noreferrer"
                      title="Mở tài liệu"
                      className="documents-action-open"
                    >
                      <Download size={16} />
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        openEdit(document)
                      }
                      title="Chỉnh sửa"
                      className="documents-action-edit"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          document
                        )
                      }
                      title="Xóa"
                      className="documents-action-delete"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>

                </article>
              )
            )}

          </div>

        )}

      </section>


      {/* MODAL */}

      {modalOpen && (
        <div
          className="documents-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="documents-modal">

            <div className="documents-modal-header">

              <div>

                <span>
                  {editingId
                    ? "CHỈNH SỬA TÀI LIỆU"
                    : "TẠO TÀI LIỆU MỚI"}
                </span>

                <h2>
                  {editingId
                    ? "Cập nhật tài liệu"
                    : "Thêm tài liệu"}
                </h2>

                <p>
                  Điền thông tin và chọn file
                  để lưu vào kho tài liệu.
                </p>

              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={handleSubmit}
              className="documents-modal-form"
            >

              <div className="documents-modal-field">

                <label>
                  Tên tài liệu
                  <span>*</span>
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Kế hoạch hoạt động tháng 9"
                />

              </div>


              <div className="documents-modal-grid">

                <div className="documents-modal-field">

                  <label>
                    Danh mục
                  </label>

                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target
                          .value as Category
                      )
                    }
                  >
                    {Object.entries(
                      categoryLabels
                    ).map(
                      ([key, label]) => (
                        <option
                          key={key}
                          value={key}
                        >
                          {label}
                        </option>
                      )
                    )}
                  </select>

                </div>


                <div className="documents-modal-field">

                  <label>
                    Người đăng
                  </label>

                  <input
                    value={author}
                    onChange={(event) =>
                      setAuthor(
                        event.target.value
                      )
                    }
                    placeholder="Admin"
                  />

                </div>

              </div>


              <div className="documents-modal-field">

                <label>
                  Mô tả
                </label>

                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Mô tả ngắn về tài liệu..."
                />

              </div>


              <div className="documents-modal-upload">

                <div className="documents-modal-upload-head">
                  <div>
                    <strong>
                      File tài liệu
                    </strong>

                    <span>
                      {editingId
                        ? "Chọn file mới nếu muốn thay thế"
                        : "Chọn file để tải lên hệ thống"}
                    </span>
                  </div>

                  <Upload size={19} />

                </div>


                <label className="documents-modal-dropzone">

                  <Upload size={28} />

                  <strong>
                    {file
                      ? file.name
                      : "Chọn file tài liệu"}
                  </strong>

                  <span>
                    {file
                      ? `${formatSize(
                          file.size
                        )} · ${file.type || "Không xác định"}`
                      : "PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT · tối đa 15MB"}
                  </span>

                  <input
                    type="file"
                    accept={allowedExtensions.join(
                      ","
                    )}
                    onChange={
                      handleFileChange
                    }
                  />

                </label>

              </div>


              <div className="documents-modal-actions">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="documents-dashboard-secondary"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="documents-dashboard-primary"
                >
                  {saving ? (
                    <>
                      <span className="documents-spinner" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingId
                        ? "Lưu thay đổi"
                        : "Thêm tài liệu"}
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </main>
  );
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}