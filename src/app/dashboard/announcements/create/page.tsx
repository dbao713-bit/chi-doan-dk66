"use client";

import Editor from "@/components/Editor";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  FileImage,
  FileText,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";

export default function CreateAnnouncementPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("Admin");
  const [image, setImage] = useState<File | null>(null);

  const [announcementId, setAnnouncementId] =
    useState<string | null>(null);

  const [documentId, setDocumentId] =
    useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  /**
   * =========================================================
   * CHỌN ẢNH
   * =========================================================
   */

  function handleImageChange(
    file: File | null
  ) {
    if (!file) {
      setImage(null);
      setImagePreview(null);
      return;
    }

    setImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  }

  function removeImage() {
    setImage(null);
    setImagePreview(null);
  }

  /**
   * =========================================================
   * TẠO THÔNG BÁO
   * =========================================================
   */

  async function handleCreateAnnouncement(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề!");
      return;
    }

    if (!author.trim()) {
      alert("Vui lòng nhập người đăng!");
      return;
    }

    setCreating(true);

    try {
      /**
       * -------------------------------------------------------
       * 1. UPLOAD ẢNH
       * -------------------------------------------------------
       */

      let imageUrl = "";

      if (image) {
        const fileName =
          `${Date.now()}-${image.name}`;

        const { error: uploadError } =
          await supabase.storage
            .from("announcement-images")
            .upload(
              fileName,
              image
            );

        if (uploadError) {
          throw new Error(
            `Không thể upload ảnh: ${uploadError.message}`
          );
        }

        const { data } =
          supabase.storage
            .from("announcement-images")
            .getPublicUrl(
              fileName
            );

        imageUrl =
          data.publicUrl;
      }

      /**
       * -------------------------------------------------------
       * 2. TẠO ANNOUNCEMENT
       * -------------------------------------------------------
       */

      console.log(
        "[ANNOUNCEMENT CREATE] Creating database record..."
      );

      const { data, error } =
        await supabase
          .from("announcements")
          .insert([
            {
              title:
                title.trim(),
              content: "",
              image:
                imageUrl,
              author:
                author.trim(),
            },
          ])
          .select("id")
          .single();

      if (error) {
        throw new Error(
          `Không thể tạo announcement: ${error.message}`
        );
      }

      if (!data?.id) {
        throw new Error(
          "Supabase không trả về ID announcement."
        );
      }

      const newAnnouncementId =
        String(data.id);

      console.log(
        "[ANNOUNCEMENT CREATE] Created:",
        newAnnouncementId
      );

      /**
       * -------------------------------------------------------
       * 3. TẠO DOCX
       * -------------------------------------------------------
       */

      console.log(
        "[ANNOUNCEMENT CREATE] Creating DOCX..."
      );

      const documentResponse =
        await fetch(
          "/api/announcements/create-document",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              announcementId:
                newAnnouncementId,
            }),
          }
        );

      const documentData =
        await documentResponse.json();

      if (!documentResponse.ok) {
        throw new Error(
          documentData?.error ||
            "Không thể tạo tài liệu DOCX."
        );
      }

      if (!documentData?.documentId) {
        throw new Error(
          "API không trả về documentId."
        );
      }

      console.log(
        "[ANNOUNCEMENT CREATE] DOCX created:",
        documentData.documentId
      );

      /**
       * -------------------------------------------------------
       * LƯU STATE
       * -------------------------------------------------------
       */

      setAnnouncementId(
        newAnnouncementId
      );

      setDocumentId(
        documentData.documentId
      );
    } catch (error) {
      console.error(
        "[ANNOUNCEMENT CREATE ERROR]",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Không thể tạo thông báo."
      );
    } finally {
      setCreating(false);
    }
  }

  /**
   * =========================================================
   * HOÀN TẤT
   * =========================================================
   */

  function handleFinish() {
    router.push(
      "/dashboard/announcements"
    );

    router.refresh();
  }

  /**
   * =========================================================
   * MÀN HÌNH SOẠN THẢO
   * =========================================================
   */

  if (
    announcementId &&
    documentId
  ) {
    return (
      <main className="announcement-editor-page">
        <div className="announcement-editor-shell">

          <div className="announcement-editor-topbar">

            <div className="announcement-editor-heading">

              <div className="announcement-editor-icon">
                <FileText size={21} />
              </div>

              <div>
                <div className="announcement-editor-kicker">
                  TRÌNH SOẠN THẢO THÔNG BÁO
                </div>

                <h1>
                  {title}
                </h1>

                <p>
                  Đang chỉnh sửa nội dung thông báo
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="announcement-finish-button"
            >
              <Check size={17} />
              Hoàn tất
            </button>

          </div>

          <div className="announcement-editor-info">

            <div>
              <span>ANNOUNCEMENT ID</span>
              <strong>
                #{announcementId}
              </strong>
            </div>

            <div>
              <span>DOCUMENT ID</span>
              <strong>
                #{documentId}
              </strong>
            </div>

            <div className="announcement-editor-status">
              <i />
              Đang lưu nội dung
            </div>

          </div>

          <div className="announcement-editor-frame">
            <Editor
              documentId={
                documentId
              }
              documentTitle={`${title}.docx`}
              height="calc(100vh - 245px)"
              width="100%"
            />
          </div>

        </div>

        <style jsx global>{`
          .announcement-editor-page {
            min-height: calc(100vh - 70px);
            padding: 28px;
            background:
              radial-gradient(
                circle at top right,
                rgba(37, 99, 235, 0.08),
                transparent 30%
              ),
              #f4f7fb;
          }

          .announcement-editor-shell {
            width: 100%;
            max-width: 1700px;
            margin: 0 auto;
          }

          .announcement-editor-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 22px 26px;
            border: 1px solid #e4e9f0;
            border-radius: 22px 22px 0 0;
            background: #ffffff;
            box-shadow:
              0 8px 30px rgba(15, 23, 42, 0.06);
          }

          .announcement-editor-heading {
            display: flex;
            align-items: center;
            gap: 15px;
            min-width: 0;
          }

          .announcement-editor-icon {
            width: 48px;
            height: 48px;
            flex: 0 0 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 15px;
            color: #2563eb;
            background: #eff6ff;
          }

          .announcement-editor-kicker {
            margin-bottom: 4px;
            color: #2563eb;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.15em;
          }

          .announcement-editor-heading h1 {
            margin: 0;
            overflow: hidden;
            color: #172033;
            font-size: 21px;
            font-weight: 800;
            line-height: 1.25;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .announcement-editor-heading p {
            margin: 4px 0 0;
            color: #8a94a6;
            font-size: 12px;
          }

          .announcement-finish-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 44px;
            padding: 0 19px;
            flex: 0 0 auto;
            border: 1px solid #bde4cc;
            border-radius: 12px;
            color: #198754;
            background: #effbf3;
            font-family: inherit;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .announcement-finish-button:hover {
            transform: translateY(-1px);
            background: #dcf7e5;
            box-shadow:
              0 7px 18px rgba(25, 135, 84, 0.12);
          }

          .announcement-editor-info {
            display: flex;
            align-items: center;
            gap: 30px;
            padding: 12px 22px;
            border: 1px solid #e4e9f0;
            border-top: 0;
            background: #fafbfd;
          }

          .announcement-editor-info > div {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .announcement-editor-info span {
            color: #98a1af;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.08em;
          }

          .announcement-editor-info strong {
            color: #475569;
            font-size: 11px;
          }

          .announcement-editor-status {
            margin-left: auto;
            color: #64748b;
            font-size: 11px;
          }

          .announcement-editor-status i {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #22c55e;
            box-shadow:
              0 0 0 4px rgba(34, 197, 94, 0.10);
          }

          .announcement-editor-frame {
            overflow: hidden;
            margin-top: 12px;
            border: 1px solid #dfe5ed;
            border-radius: 18px;
            background: #ffffff;
            box-shadow:
              0 15px 40px rgba(15, 23, 42, 0.08);
          }

          @media (max-width: 700px) {
            .announcement-editor-page {
              padding: 12px;
            }

            .announcement-editor-topbar {
              padding: 16px;
            }

            .announcement-editor-heading h1 {
              max-width: 220px;
            }

            .announcement-editor-info {
              flex-wrap: wrap;
              gap: 10px 18px;
            }

            .announcement-editor-status {
              margin-left: 0;
            }
          }
        `}</style>
      </main>
    );
  }

  /**
   * =========================================================
   * FORM TẠO THÔNG BÁO
   * =========================================================
   */

  return (
    <main className="announcement-create-page">

      <div className="announcement-create-container">

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="announcement-create-hero">

          <div className="announcement-create-hero-bg" />

          <div className="announcement-create-hero-content">

            <div className="announcement-create-breadcrumb">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/dashboard/announcements"
                  )
                }
              >
                <ArrowLeft size={15} />
                Thông báo
              </button>

              <span>/</span>

              <strong>
                Thêm thông báo
              </strong>
            </div>

            <div className="announcement-create-title-row">

              <div className="announcement-create-main-icon">
                <Bell size={27} />
              </div>

              <div>
                <div className="announcement-create-eyebrow">
                  TRUNG TÂM THÔNG BÁO
                </div>

                <h1>
                  Tạo thông báo mới
                </h1>

                <p>
                  Tạo nội dung thông báo và chuẩn bị
                  tài liệu để đăng tải lên hệ thống.
                </p>
              </div>

            </div>

            <div className="announcement-create-steps">

              <div className="announcement-create-step active">
                <span>1</span>
                <div>
                  <b>Thông tin</b>
                  <small>Thông tin cơ bản</small>
                </div>
              </div>

              <div className="announcement-create-step-line" />

              <div className="announcement-create-step">
                <span>2</span>
                <div>
                  <b>Soạn thảo</b>
                  <small>Nội dung thông báo</small>
                </div>
              </div>

              <div className="announcement-create-step-line" />

              <div className="announcement-create-step">
                <span>3</span>
                <div>
                  <b>Hoàn tất</b>
                  <small>Lưu thông báo</small>
                </div>
              </div>

            </div>

          </div>

          <div className="announcement-create-hero-card">

            <Sparkles size={20} />

            <span>
              KHỞI TẠO
            </span>

            <strong>
              Thông báo mới
            </strong>

            <p>
              Điền thông tin bên dưới để bắt đầu.
            </p>

          </div>

        </section>

        {/* ===================================================
            CONTENT
        =================================================== */}

        <form
          onSubmit={
            handleCreateAnnouncement
          }
          className="announcement-create-layout"
        >

          {/* =================================================
              LEFT
          ================================================= */}

          <div className="announcement-create-left">

            <section className="announcement-create-card">

              <div className="announcement-create-card-header">

                <div className="announcement-create-card-icon blue">
                  <FileText size={19} />
                </div>

                <div>
                  <h2>
                    Thông tin thông báo
                  </h2>

                  <p>
                    Nhập những thông tin cơ bản cho
                    thông báo của bạn.
                  </p>
                </div>

              </div>

              <div className="announcement-create-fields">

                {/* TIÊU ĐỀ */}

                <div className="announcement-field">

                  <label>
                    Tiêu đề thông báo
                    <em>*</em>
                  </label>

                  <div className="announcement-input-wrap">
                    <Pencil size={17} />

                    <input
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                      placeholder="Nhập tiêu đề thông báo..."
                      autoComplete="off"
                    />
                  </div>

                  <small>
                    Tiêu đề nên ngắn gọn và thể hiện
                    rõ nội dung chính.
                  </small>

                </div>

                {/* NGƯỜI ĐĂNG */}

                <div className="announcement-field">

                  <label>
                    Người đăng
                    <em>*</em>
                  </label>

                  <div className="announcement-input-wrap">
                    <UserRound size={17} />

                    <input
                      value={author}
                      onChange={(e) =>
                        setAuthor(
                          e.target.value
                        )
                      }
                      placeholder="Nhập tên người đăng..."
                      autoComplete="off"
                    />
                  </div>

                  <small>
                    Tên người hoặc đơn vị chịu trách
                    nhiệm đăng thông báo.
                  </small>

                </div>

              </div>

            </section>

            {/* =================================================
                IMAGE
            ================================================= */}

            <section className="announcement-create-card">

              <div className="announcement-create-card-header">

                <div className="announcement-create-card-icon purple">
                  <ImageIcon size={19} />
                </div>

                <div>
                  <h2>
                    Ảnh đại diện
                  </h2>

                  <p>
                    Thêm hình ảnh giúp thông báo nổi bật
                    hơn trong danh sách.
                  </p>
                </div>

              </div>

              {!imagePreview ? (
                <label className="announcement-upload-box">

                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) =>
                      handleImageChange(
                        e.target.files?.[0] ??
                          null
                      )
                    }
                  />

                  <div className="announcement-upload-icon">
                    <Upload size={23} />
                  </div>

                  <strong>
                    Chọn ảnh đại diện
                  </strong>

                  <span>
                    Nhấn để chọn tệp từ máy tính
                  </span>

                  <small>
                    PNG, JPG, JPEG · Tối đa 10MB
                  </small>

                </label>
              ) : (
                <div className="announcement-image-preview">

                  <img
                    src={imagePreview}
                    alt="Ảnh đại diện thông báo"
                  />

                  <div className="announcement-image-overlay">

                    <div>
                      <FileImage size={17} />

                      <span>
                        {image?.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={
                        removeImage
                      }
                      aria-label="Xóa ảnh"
                    >
                      <X size={17} />
                    </button>

                  </div>

                </div>
              )}

            </section>

          </div>

          {/* =================================================
              RIGHT
          ================================================= */}

          <aside className="announcement-create-right">

            <section className="announcement-preview-card">

              <div className="announcement-preview-header">
                <div>
                  <span>
                    XEM TRƯỚC
                  </span>

                  <h2>
                    Thông báo
                  </h2>
                </div>

                <div className="announcement-preview-live">
                  <i />
                  LIVE
                </div>
              </div>

              <div className="announcement-preview-body">

                <div className="announcement-preview-image">

                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt=""
                    />
                  ) : (
                    <div>
                      <ImageIcon size={28} />
                      <span>
                        Chưa có ảnh
                      </span>
                    </div>
                  )}

                </div>

                <div className="announcement-preview-tag">
                  THÔNG BÁO
                </div>

                <h3>
                  {title.trim() ||
                    "Tiêu đề thông báo"}
                </h3>

                <div className="announcement-preview-meta">

                  <span>
                    <UserRound size={13} />
                    {author.trim() ||
                      "Người đăng"}
                  </span>

                  <span>
                    <CalendarDays size={13} />
                    Hôm nay
                  </span>

                </div>

              </div>

            </section>

            <section className="announcement-create-note">

              <div className="announcement-create-note-icon">
                <Sparkles size={17} />
              </div>

              <div>
                <strong>
                  Sau khi tạo
                </strong>

                <p>
                  Hệ thống sẽ tự động tạo tài liệu
                  DOCX và mở trình soạn thảo để bạn
                  nhập nội dung chi tiết.
                </p>
              </div>

            </section>

          </aside>

          {/* =================================================
              BOTTOM ACTION
          ================================================= */}

          <div className="announcement-create-footer">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/announcements"
                )
              }
              className="announcement-cancel-button"
              disabled={creating}
            >
              <ArrowLeft size={17} />
              Hủy
            </button>

            <div className="announcement-create-footer-info">

              <span>
                <i />
                Thông tin sẽ được lưu an toàn
              </span>

            </div>

            <button
              type="submit"
              disabled={creating}
              className="announcement-submit-button"
            >
              {creating ? (
                <>
                  <Loader2
                    size={18}
                    className="announcement-spin"
                  />

                  Đang khởi tạo...
                </>
              ) : (
                <>
                  <Plus size={19} />

                  Tạo thông báo

                  <ArrowRight size={17} />
                </>
              )}
            </button>

          </div>

        </form>

      </div>

      {/* =====================================================
          CSS
      ===================================================== */}

      <style jsx global>{`

        /* =====================================================
           PAGE
        ===================================================== */

        .announcement-create-page {
          min-height: calc(100vh - 70px);
          padding: 30px 34px 50px;
          background:
            radial-gradient(
              circle at 85% 0%,
              rgba(37, 99, 235, 0.07),
              transparent 27%
            ),
            radial-gradient(
              circle at 10% 35%,
              rgba(124, 58, 237, 0.045),
              transparent 24%
            ),
            #f5f7fb;
        }

        .announcement-create-container {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .announcement-create-hero {
          position: relative;
          overflow: hidden;
          min-height: 310px;
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 40px;
          padding: 32px 38px;
          border-radius: 28px;
          color: white;
          background:
            linear-gradient(
              120deg,
              #0b4f91 0%,
              #1769b3 48%,
              #2d78bd 100%
            );
          box-shadow:
            0 20px 50px rgba(16, 71, 122, 0.18);
        }

        .announcement-create-hero-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.7;
          background:
            radial-gradient(
              circle at 78% 25%,
              rgba(255, 255, 255, 0.18),
              transparent 25%
            ),
            radial-gradient(
              circle at 95% 100%,
              rgba(255, 255, 255, 0.13),
              transparent 30%
            );
        }

        .announcement-create-hero::after {
          content: "";
          position: absolute;
          width: 430px;
          height: 430px;
          right: 120px;
          bottom: -330px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 50%;
          pointer-events: none;
        }

        .announcement-create-hero-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
          min-width: 0;
        }

        .announcement-create-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,.65);
          font-size: 12px;
        }

        .announcement-create-breadcrumb button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          border: 0;
          color: rgba(255,255,255,.72);
          background: transparent;
          font: inherit;
          cursor: pointer;
          transition: .2s ease;
        }

        .announcement-create-breadcrumb button:hover {
          color: white;
        }

        .announcement-create-breadcrumb strong {
          color: white;
          font-weight: 700;
        }

        .announcement-create-title-row {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 32px;
        }

        .announcement-create-main-icon {
          width: 60px;
          height: 60px;
          flex: 0 0 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.24);
          border-radius: 18px;
          background: rgba(255,255,255,.13);
          backdrop-filter: blur(12px);
          box-shadow:
            0 10px 30px rgba(0,0,0,.10);
        }

        .announcement-create-eyebrow {
          margin-bottom: 7px;
          color: rgba(255,255,255,.62);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .18em;
        }

        .announcement-create-title-row h1 {
          margin: 0;
          font-size: clamp(2rem, 4vw, 3.25rem);
          line-height: 1;
          letter-spacing: -.045em;
          font-weight: 850;
        }

        .announcement-create-title-row p {
          max-width: 650px;
          margin: 12px 0 0;
          color: rgba(255,255,255,.73);
          font-size: 13px;
          line-height: 1.65;
        }

        /* =====================================================
           STEPS
        ===================================================== */

        .announcement-create-steps {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-top: 28px;
        }

        .announcement-create-step {
          display: flex;
          align-items: center;
          gap: 9px;
          opacity: .48;
        }

        .announcement-create-step.active {
          opacity: 1;
        }

        .announcement-create-step > span {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 50%;
          background: rgba(255,255,255,.08);
          font-size: 11px;
          font-weight: 900;
        }

        .announcement-create-step.active > span {
          color: #1769b3;
          background: white;
          border-color: white;
        }

        .announcement-create-step div {
          display: flex;
          flex-direction: column;
        }

        .announcement-create-step b {
          font-size: 11px;
        }

        .announcement-create-step small {
          margin-top: 2px;
          color: rgba(255,255,255,.55);
          font-size: 9px;
        }

        .announcement-create-step-line {
          width: 35px;
          height: 1px;
          background: rgba(255,255,255,.22);
        }

        /* =====================================================
           HERO CARD
        ===================================================== */

        .announcement-create-hero-card {
          position: relative;
          z-index: 2;
          align-self: center;
          width: 235px;
          flex: 0 0 235px;
          padding: 23px;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 22px;
          background: rgba(255,255,255,.10);
          backdrop-filter: blur(15px);
          box-shadow:
            inset 0 1px rgba(255,255,255,.12);
        }

        .announcement-create-hero-card svg {
          margin-bottom: 22px;
          color: #bfdbfe;
        }

        .announcement-create-hero-card span {
          display: block;
          color: rgba(255,255,255,.55);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .15em;
        }

        .announcement-create-hero-card strong {
          display: block;
          margin-top: 6px;
          font-size: 20px;
        }

        .announcement-create-hero-card p {
          margin: 8px 0 0;
          color: rgba(255,255,255,.62);
          font-size: 11px;
          line-height: 1.6;
        }

        /* =====================================================
           LAYOUT
        ===================================================== */

        .announcement-create-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1.45fr)
            minmax(320px, .75fr);
          gap: 20px;
          margin-top: 20px;
        }

        .announcement-create-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .announcement-create-right {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        /* =====================================================
           CARD
        ===================================================== */

        .announcement-create-card,
        .announcement-preview-card,
        .announcement-create-note {
          border: 1px solid #e5e9ef;
          border-radius: 22px;
          background: white;
          box-shadow:
            0 7px 25px rgba(15,23,42,.045);
        }

        .announcement-create-card {
          padding: 26px;
        }

        .announcement-create-card-header {
          display: flex;
          align-items: center;
          gap: 13px;
          padding-bottom: 21px;
          margin-bottom: 23px;
          border-bottom: 1px solid #eef1f5;
        }

        .announcement-create-card-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
        }

        .announcement-create-card-icon.blue {
          color: #2563eb;
          background: #eff6ff;
        }

        .announcement-create-card-icon.purple {
          color: #7c3aed;
          background: #f5f3ff;
        }

        .announcement-create-card-header h2 {
          margin: 0;
          color: #172033;
          font-size: 17px;
          font-weight: 800;
        }

        .announcement-create-card-header p {
          margin: 4px 0 0;
          color: #8b95a5;
          font-size: 11px;
        }

        /* =====================================================
           FIELDS
        ===================================================== */

        .announcement-create-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .announcement-field label {
          display: block;
          margin-bottom: 9px;
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        .announcement-field label em {
          margin-left: 3px;
          color: #ef4444;
          font-style: normal;
        }

        .announcement-input-wrap {
          height: 50px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 15px;
          border: 1px solid #dfe5ec;
          border-radius: 13px;
          color: #9aa4b2;
          background: #fbfcfe;
          transition: all .2s ease;
        }

        .announcement-input-wrap:focus-within {
          border-color: #77a9e4;
          background: white;
          box-shadow:
            0 0 0 4px rgba(37,99,235,.07);
        }

        .announcement-input-wrap input {
          width: 100%;
          height: 100%;
          padding: 0;
          border: 0;
          outline: 0;
          color: #1f2937;
          background: transparent;
          font-family: inherit;
          font-size: 13px;
        }

        .announcement-input-wrap input::placeholder {
          color: #a9b2bf;
        }

        .announcement-field > small {
          display: block;
          margin-top: 7px;
          color: #9aa4b2;
          font-size: 10px;
          line-height: 1.5;
        }

        /* =====================================================
           UPLOAD
        ===================================================== */

        .announcement-upload-box {
          min-height: 190px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed #ccd6e2;
          border-radius: 17px;
          color: #64748b;
          background:
            linear-gradient(
              180deg,
              #fcfdff,
              #f8fafc
            );
          cursor: pointer;
          transition: all .2s ease;
        }

        .announcement-upload-box:hover {
          border-color: #70a5e5;
          background: #f8fbff;
          box-shadow:
            inset 0 0 0 1px rgba(37,99,235,.05);
        }

        .announcement-upload-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          border-radius: 15px;
          color: #7c3aed;
          background: #f3efff;
        }

        .announcement-upload-box strong {
          color: #344054;
          font-size: 13px;
        }

        .announcement-upload-box span {
          margin-top: 5px;
          color: #98a2b3;
          font-size: 11px;
        }

        .announcement-upload-box small {
          margin-top: 10px;
          color: #b0b8c4;
          font-size: 9px;
        }

        .announcement-image-preview {
          position: relative;
          overflow: hidden;
          height: 250px;
          border-radius: 17px;
          background: #f1f5f9;
        }

        .announcement-image-preview img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .announcement-image-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 15px;
          color: white;
          background:
            linear-gradient(
              transparent,
              rgba(0,0,0,.72)
            );
        }

        .announcement-image-overlay > div {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .announcement-image-overlay span {
          overflow: hidden;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .announcement-image-overlay button {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 9px;
          color: white;
          background: rgba(255,255,255,.13);
          cursor: pointer;
        }

        /* =====================================================
           PREVIEW
        ===================================================== */

        .announcement-preview-card {
          overflow: hidden;
        }

        .announcement-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 21px 23px;
          border-bottom: 1px solid #eef1f5;
        }

        .announcement-preview-header > div:first-child span {
          color: #2563eb;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .15em;
        }

        .announcement-preview-header h2 {
          margin: 4px 0 0;
          color: #172033;
          font-size: 17px;
          font-weight: 800;
        }

        .announcement-preview-live {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #16a34a;
          font-size: 9px;
          font-weight: 800;
        }

        .announcement-preview-live i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
        }

        .announcement-preview-body {
          padding: 18px;
        }

        .announcement-preview-image {
          overflow: hidden;
          height: 165px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: #f3f6f9;
        }

        .announcement-preview-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .announcement-preview-image > div {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          color: #b1bac7;
        }

        .announcement-preview-image span {
          font-size: 10px;
        }

        .announcement-preview-tag {
          display: inline-flex;
          margin-top: 15px;
          padding: 5px 8px;
          border-radius: 6px;
          color: #2563eb;
          background: #eff6ff;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .announcement-preview-body h3 {
          margin: 9px 0 0;
          color: #1f2937;
          font-size: 17px;
          font-weight: 800;
          line-height: 1.35;
        }

        .announcement-preview-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 13px;
        }

        .announcement-preview-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #98a2b3;
          font-size: 9px;
        }

        /* =====================================================
           NOTE
        ===================================================== */

        .announcement-create-note {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 17px;
          border-color: #dbeafe;
          background: #f8fbff;
        }

        .announcement-create-note-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #2563eb;
          background: #eaf3ff;
        }

        .announcement-create-note strong {
          display: block;
          color: #344054;
          font-size: 11px;
        }

        .announcement-create-note p {
          margin: 4px 0 0;
          color: #8b95a5;
          font-size: 10px;
          line-height: 1.6;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .announcement-create-footer {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 17px 20px;
          border: 1px solid #e4e9ef;
          border-radius: 18px;
          background: white;
          box-shadow:
            0 7px 25px rgba(15,23,42,.045);
        }

        .announcement-cancel-button {
          min-height: 45px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 17px;
          border: 1px solid #e0e5eb;
          border-radius: 11px;
          color: #64748b;
          background: white;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: .2s ease;
        }

        .announcement-cancel-button:hover {
          color: #334155;
          background: #f8fafc;
        }

        .announcement-create-footer-info {
          flex: 1;
          color: #98a2b3;
          font-size: 10px;
        }

        .announcement-create-footer-info span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .announcement-create-footer-info i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
        }

        .announcement-submit-button {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 20px;
          border: 1px solid #bde4cc;
          border-radius: 12px;
          color: #166534;
          background: #ecfdf3;
          font-family: inherit;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
          box-shadow:
            0 7px 20px rgba(34,197,94,.08);
          transition: all .2s ease;
        }

        .announcement-submit-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: #9ed8b5;
          background: #dcfce7;
          box-shadow:
            0 10px 24px rgba(34,197,94,.13);
        }

        .announcement-submit-button:disabled {
          cursor: not-allowed;
          opacity: .65;
        }

        .announcement-spin {
          animation: announcement-spin 1s linear infinite;
        }

        @keyframes announcement-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1050px) {
          .announcement-create-layout {
            grid-template-columns: 1fr;
          }

          .announcement-create-right {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .announcement-create-footer {
            grid-column: auto;
          }
        }

        @media (max-width: 800px) {
          .announcement-create-page {
            padding: 18px 14px 35px;
          }

          .announcement-create-hero {
            min-height: auto;
            padding: 25px;
          }

          .announcement-create-hero-card {
            display: none;
          }

          .announcement-create-title-row {
            margin-top: 25px;
          }

          .announcement-create-steps {
            overflow-x: auto;
            padding-bottom: 3px;
          }

          .announcement-create-fields {
            grid-template-columns: 1fr;
          }

          .announcement-create-right {
            display: flex;
          }

          .announcement-create-footer {
            flex-wrap: wrap;
          }

          .announcement-create-footer-info {
            order: 3;
            flex-basis: 100%;
          }
        }

        @media (max-width: 520px) {
          .announcement-create-card {
            padding: 18px;
          }

          .announcement-create-title-row h1 {
            font-size: 30px;
          }

          .announcement-create-main-icon {
            width: 48px;
            height: 48px;
            flex-basis: 48px;
          }

          .announcement-create-step-line {
            width: 18px;
          }

          .announcement-create-footer {
            padding: 13px;
          }

          .announcement-cancel-button,
          .announcement-submit-button {
            flex: 1;
          }
        }

      `}</style>
    </main>
  );
}