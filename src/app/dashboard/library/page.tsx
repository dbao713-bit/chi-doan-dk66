"use client";

import { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Eye,
  EyeOff,
  GripVertical,
  CheckCircle2,
  Images,
  ImagePlus,
  ArrowUpRight,
  LayoutGrid,
  Sparkles,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type GalleryItem = {
  id: string;
  title: string | null;
  description: string | null;
  image_path: string;
  image_url: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
};

export default function LibraryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [sortOrder, setSortOrder] =
    useState("0");

  const [file, setFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState("");

  async function loadGallery() {
    setLoading(true);

    const { data, error } = await supabase
      .from("gallery")
      .select(
        `
          id,
          title,
          description,
          image_path,
          image_url,
          sort_order,
          is_visible,
          created_at
        `
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "LOAD GALLERY ERROR:",
        error
      );

      alert(
        `Không thể tải thư viện: ${error.message}`
      );
    } else {
      setItems(
        (data ?? []) as GalleryItem[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadGallery();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const objectUrl =
      URL.createObjectURL(file);

    setPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setSortOrder("0");
    setFile(null);
    setPreview("");
    setEditingId(null);
  }

  function openCreate() {
    resetForm();

    const nextOrder =
      items.length > 0
        ? Math.max(
            ...items.map(
              (item) => item.sort_order
            )
          ) + 1
        : 0;

    setSortOrder(String(nextOrder));
    setModalOpen(true);
  }

  function openEdit(item: GalleryItem) {
    setEditingId(item.id);

    setTitle(item.title ?? "");

    setDescription(
      item.description ?? ""
    );

    setSortOrder(
      String(item.sort_order)
    );

    setFile(null);
    setPreview("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  }

  async function uploadImage(
    selectedFile: File
  ) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        selectedFile.type
      )
    ) {
      throw new Error(
        "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP."
      );
    }

    const maxSize =
      8 * 1024 * 1024;

    if (
      selectedFile.size >
      maxSize
    ) {
      throw new Error(
        "Ảnh không được vượt quá 8MB."
      );
    }

    const extension =
      selectedFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const path =
      `gallery/${crypto.randomUUID()}.${extension}`;

    const { error } =
      await supabase.storage
        .from("activity-gallery")
        .upload(
          path,
          selectedFile,
          {
            cacheControl: "3600",
            upsert: false,
          }
        );

    if (error) {
      throw new Error(
        `Upload ảnh thất bại: ${error.message}`
      );
    }

    const { data } =
      supabase.storage
        .from("activity-gallery")
        .getPublicUrl(path);

    return {
      path,
      url: data.publicUrl,
    };
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (saving) return;

    if (!editingId && !file) {
      alert(
        "Vui lòng chọn hình ảnh."
      );

      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const current =
          items.find(
            (item) =>
              item.id === editingId
          );

        if (!current) {
          throw new Error(
            "Không tìm thấy ảnh cần chỉnh sửa."
          );
        }

        let imagePath =
          current.image_path;

        let imageUrl =
          current.image_url;

        if (file) {
          const uploaded =
            await uploadImage(file);

          imagePath =
            uploaded.path;

          imageUrl =
            uploaded.url;
        }

        const { error } =
          await supabase
            .from("gallery")
            .update({
              title:
                title.trim() || null,

              description:
                description.trim() ||
                null,

              image_path:
                imagePath,

              image_url:
                imageUrl,

              sort_order:
                Number(sortOrder) || 0,
            })
            .eq(
              "id",
              editingId
            );

        if (error) {
          throw new Error(
            error.message
          );
        }
      } else {
        const uploaded =
          await uploadImage(file!);

        const { error } =
          await supabase
            .from("gallery")
            .insert({
              title:
                title.trim() || null,

              description:
                description.trim() ||
                null,

              image_path:
                uploaded.path,

              image_url:
                uploaded.url,

              sort_order:
                Number(sortOrder) || 0,

              is_visible: true,
            });

        if (error) {
          throw new Error(
            error.message
          );
        }
      }

      setModalOpen(false);

      resetForm();

      await loadGallery();
    } catch (error) {
      console.error(
        "SAVE GALLERY ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Không thể lưu hình ảnh."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(
    item: GalleryItem
  ) {
    const { error } =
      await supabase
        .from("gallery")
        .update({
          is_visible:
            !item.is_visible,
        })
        .eq(
          "id",
          item.id
        );

    if (error) {
      alert(
        `Không thể thay đổi trạng thái: ${error.message}`
      );

      return;
    }

    await loadGallery();
  }

  async function handleDelete(
    item: GalleryItem
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa ảnh "${
          item.title || "này"
        }" không?`
      );

    if (!confirmed) return;

    const { error: dbError } =
      await supabase
        .from("gallery")
        .delete()
        .eq(
          "id",
          item.id
        );

    if (dbError) {
      alert(
        `Không thể xóa ảnh: ${dbError.message}`
      );

      return;
    }

    await supabase.storage
      .from("activity-gallery")
      .remove([
        item.image_path,
      ]);

    await loadGallery();
  }

  const visibleCount =
    items.filter(
      (item) => item.is_visible
    ).length;

  const hiddenCount =
    items.filter(
      (item) => !item.is_visible
    ).length;

  const editingItem =
    editingId
      ? items.find(
          (item) =>
            item.id === editingId
        )
      : null;

  return (
    <main className="dashboard-page library-dashboard">

      {/* HEADER */}

      <section className="library-hero">

        <div className="library-hero-content">

          <div className="library-hero-icon">
            <Images size={28} />
          </div>

          <div>

            <span className="dashboard-page-eyebrow">
              KHO HÌNH ẢNH
            </span>

            <h1>
              Thư viện hoạt động
            </h1>

            <p>
              Quản lý và lưu trữ những khoảnh
              khắc đáng nhớ của Chi đoàn.
            </p>

          </div>

        </div>


        <button
          type="button"
          onClick={openCreate}
          className="library-add-button"
        >
          <Plus size={19} />
          Thêm hình ảnh
        </button>

      </section>


      {/* STATS */}

      <section className="library-stats">

        <div className="library-stat-card">

          <div className="library-stat-icon">
            <Images size={21} />
          </div>

          <div>

            <span>
              TỔNG HÌNH ẢNH
            </span>

            <strong>
              {items.length}
            </strong>

          </div>

        </div>


        <div className="library-stat-card">

          <div className="library-stat-icon">
            <Eye size={21} />
          </div>

          <div>

            <span>
              ĐANG HIỂN THỊ
            </span>

            <strong>
              {visibleCount}
            </strong>

          </div>

        </div>


        <div className="library-stat-card">

          <div className="library-stat-icon">
            <EyeOff size={21} />
          </div>

          <div>

            <span>
              ĐANG ẨN
            </span>

            <strong>
              {hiddenCount}
            </strong>

          </div>

        </div>

      </section>


      {/* GALLERY */}

      <section className="library-admin-card">

        <div className="library-admin-header">

          <div>

            <div className="library-section-label">

              <LayoutGrid size={15} />

              <span>
                ACTIVITY GALLERY
              </span>

            </div>

            <h2>
              Hình ảnh hoạt động
            </h2>

            <p>
              Sắp xếp, chỉnh sửa và quản lý
              trạng thái hiển thị của hình ảnh.
            </p>

          </div>


          <div className="library-count">

            <ImageIcon size={17} />

            <strong>
              {items.length}
            </strong>

            <span>
              ảnh
            </span>

          </div>

        </div>


        {loading ? (

          <div className="library-admin-loading">

            <Loader2
              className="library-loading-icon"
              size={30}
            />

            <p>
              Đang tải thư viện...
            </p>

          </div>

        ) : items.length === 0 ? (

          <div className="library-admin-empty">

            <div className="library-admin-empty-icon">

              <ImagePlus size={42} />

            </div>


            <span className="library-empty-label">
              CHƯA CÓ DỮ LIỆU
            </span>


            <h3>
              Thư viện đang trống
            </h3>


            <p>
              Hãy bắt đầu lưu giữ những khoảnh
              khắc đáng nhớ của Chi đoàn.
            </p>


            <button
              type="button"
              onClick={openCreate}
              className="library-add-button"
            >

              <Plus size={18} />

              Thêm hình ảnh đầu tiên

            </button>

          </div>

        ) : (

          <div className="library-admin-grid">

            {items.map(
              (item, index) => (

                <article
                  key={item.id}
                  className={`library-admin-item ${
                    !item.is_visible
                      ? "library-admin-item-hidden"
                      : ""
                  }`}
                >

                  <div className="library-admin-image">

                    <img
                      src={
                        item.image_url
                      }
                      alt={
                        item.title ||
                        "Ảnh hoạt động"
                      }
                    />


                    <div className="library-image-overlay" />


                    <div className="library-image-number">

                      {String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}

                    </div>


                    <div className="library-image-status">

                      {item.is_visible ? (

                        <>
                          <Eye size={14} />
                          Hiển thị
                        </>

                      ) : (

                        <>
                          <EyeOff size={14} />
                          Đang ẩn
                        </>

                      )}

                    </div>


                    <div className="library-image-actions">

                      <button
                        type="button"
                        onClick={() =>
                          toggleVisibility(
                            item
                          )
                        }
                        title={
                          item.is_visible
                            ? "Ẩn ảnh"
                            : "Hiện ảnh"
                        }
                      >

                        {item.is_visible ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}

                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          openEdit(item)
                        }
                        title="Chỉnh sửa"
                      >

                        <Pencil size={17} />

                      </button>


                      <button
                        type="button"
                        className="danger"
                        onClick={() =>
                          handleDelete(
                            item
                          )
                        }
                        title="Xóa ảnh"
                      >

                        <Trash2 size={17} />

                      </button>

                    </div>

                  </div>


                  <div className="library-admin-content">

                    <div className="library-admin-meta">

                      <div className="library-admin-order">

                        <GripVertical
                          size={15}
                        />

                        VỊ TRÍ #
                        {item.sort_order}

                      </div>


                      <span>
                        {new Date(
                          item.created_at
                        ).toLocaleDateString(
                          "vi-VN"
                        )}
                      </span>

                    </div>


                    <h3>

                      {item.title ||
                        "Ảnh hoạt động"}

                    </h3>


                    <p>

                      {item.description ||
                        "Chưa có mô tả cho hình ảnh này."}

                    </p>


                    <button
                      type="button"
                      className="library-edit-link"
                      onClick={() =>
                        openEdit(item)
                      }
                    >

                      Chỉnh sửa ảnh

                      <ArrowUpRight
                        size={16}
                      />

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
          className="activity-modal-backdrop"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }

          }}
        >

          <div className="activity-modal library-modal">

            <div className="activity-modal-header">

              <div>

                <div className="library-modal-label">

                  <Sparkles
                    size={15}
                  />

                  {editingId
                    ? "CHỈNH SỬA HÌNH ẢNH"
                    : "THÊM HÌNH ẢNH MỚI"}

                </div>


                <h2>

                  {editingId
                    ? "Cập nhật hình ảnh"
                    : "Thêm vào thư viện"}

                </h2>


                <p>

                  {editingId
                    ? "Chỉnh sửa thông tin hoặc thay thế hình ảnh."
                    : "Lưu giữ một khoảnh khắc mới của Chi đoàn."}

                </p>

              </div>


              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="library-modal-close"
              >

                <X size={20} />

              </button>

            </div>


            <form
              onSubmit={handleSubmit}
              className="activity-form"
            >

              <div className="library-upload-box">

                <label>

                  <Upload
                    size={28}
                  />


                  <strong>

                    {file
                      ? file.name
                      : editingId
                      ? "Chọn ảnh mới nếu muốn thay thế"
                      : "Chọn hình ảnh từ máy tính"}

                  </strong>


                  <span>

                    JPG, PNG hoặc WebP · Tối đa
                    8MB

                  </span>


                  <div className="library-upload-button">

                    Chọn hình ảnh

                  </div>


                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setFile(
                        event.target.files?.[0] ??
                          null
                      )
                    }
                  />

                </label>


                {(preview ||
                  editingItem) && (

                  <div className="library-upload-preview">

                    <img
                      src={
                        preview ||
                        editingItem?.image_url ||
                        ""
                      }
                      alt="Xem trước"
                    />


                    <div className="library-preview-badge">

                      <ImageIcon
                        size={14}
                      />

                      XEM TRƯỚC

                    </div>

                  </div>

                )}

              </div>


              <div className="activity-form-grid">

                <div className="activity-form-field">

                  <label>
                    Tiêu đề hình ảnh
                  </label>

                  <input
                    value={title}
                    onChange={(event) =>
                      setTitle(
                        event.target.value
                      )
                    }
                    placeholder="Ví dụ: Sinh hoạt Chi đoàn tháng 9"
                  />

                </div>


                <div className="activity-form-field">

                  <label>
                    Thứ tự hiển thị
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>


              <div className="activity-form-field">

                <label>
                  Mô tả hình ảnh
                </label>

                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Viết mô tả ngắn về hoạt động trong hình..."
                />

              </div>


              <div className="activity-form-actions">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="activity-cancel"
                >

                  Hủy bỏ

                </button>


                <button
                  type="submit"
                  disabled={saving}
                  className="library-save-button"
                >

                  {saving ? (

                    <>

                      <Loader2
                        size={18}
                        className="library-button-loader"
                      />

                      Đang lưu...

                    </>

                  ) : (

                    <>

                      <CheckCircle2
                        size={18}
                      />

                      {editingId
                        ? "Lưu thay đổi"
                        : "Thêm vào thư viện"}

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