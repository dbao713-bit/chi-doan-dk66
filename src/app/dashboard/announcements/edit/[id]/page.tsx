"use client";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileEdit,
  Image as ImageIcon,
  Loader2,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import Editor from "@/components/Editor";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

export default function EditAnnouncementPage() {
  const params = useParams();

  const announcementId =
    String(params.id ?? "").trim();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [author, setAuthor] =
    useState("");

  const [oldImage, setOldImage] =
    useState("");

  const [image, setImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  /**
   * =========================================================
   * DOCUMENT ID
   * =========================================================
   */

  const documentId =
    `announcement-${announcementId}`;

  /**
   * =========================================================
   * DERIVED UI
   * =========================================================
   */

  const hasImage = Boolean(
    imagePreview || oldImage
  );

  const displayImage =
    imagePreview || oldImage;

  const shortId = useMemo(() => {
    if (!announcementId) return "—";

    if (announcementId.length <= 16) {
      return announcementId;
    }

    return `${announcementId.slice(
      0,
      8
    )}…${announcementId.slice(-6)}`;
  }, [announcementId]);

  /**
   * =========================================================
   * LOAD ANNOUNCEMENT
   * =========================================================
   */

  useEffect(() => {
    if (!announcementId) {
      return;
    }

    let cancelled = false;

    async function loadAnnouncement() {
      try {
        setLoading(true);

        const {
          data,
          error,
        } = await supabase
          .from("announcements")
          .select("*")
          .eq("id", announcementId)
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error(
            "Không tìm thấy thông báo."
          );
        }

        if (cancelled) {
          return;
        }

        setTitle(data.title ?? "");
        setAuthor(data.author ?? "");
        setOldImage(data.image ?? "");
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "[EDIT ANNOUNCEMENT LOAD]",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Không thể tải thông báo."
        );

        window.location.href =
          "/dashboard/announcements";
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAnnouncement();

    return () => {
      cancelled = true;
    };
  }, [announcementId]);

  /**
   * =========================================================
   * IMAGE PREVIEW
   * =========================================================
   */

  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return;
    }

    const objectUrl =
      URL.createObjectURL(image);

    setImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [image]);

  /**
   * =========================================================
   * SAVE INFORMATION
   * =========================================================
   */

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (saving) {
      return;
    }

    if (!title.trim()) {
      alert(
        "Vui lòng nhập tiêu đề."
      );
      return;
    }

    if (!author.trim()) {
      alert(
        "Vui lòng nhập người đăng."
      );
      return;
    }

    if (!announcementId) {
      alert(
        "Không xác định được announcementId."
      );
      return;
    }

    setSaving(true);

    try {
      let imageUrl = oldImage;

      /**
       * -------------------------------------------------------
       * UPLOAD ẢNH MỚI
       * -------------------------------------------------------
       */

      if (image) {
        const safeName =
          image.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          );

        const fileName =
          `${Date.now()}-${safeName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from(
            "announcement-images"
          )
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
            .from(
              "announcement-images"
            )
            .getPublicUrl(
              fileName
            );

        imageUrl =
          data.publicUrl;
      }

      /**
       * -------------------------------------------------------
       * UPDATE SUPABASE
       * -------------------------------------------------------
       */

      const { error } =
        await supabase
          .from("announcements")
          .update({
            title: title.trim(),
            author: author.trim(),
            image: imageUrl,
          })
          .eq(
            "id",
            announcementId
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      console.log(
        "[EDIT ANNOUNCEMENT] Information saved successfully."
      );

      alert(
        "Đã cập nhật thông tin thông báo!"
      );

      /**
       * ONLYOFFICE đang quản lý DOM riêng,
       * giữ full page navigation để tránh lỗi
       * removeChild / DOM lifecycle.
       */

      window.location.href =
        "/dashboard/announcements";
    } catch (error) {
      console.error(
        "[EDIT ANNOUNCEMENT SAVE]",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật thông báo."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * =========================================================
   * NAVIGATION
   * =========================================================
   */

  function goBack() {
    window.location.href =
      "/dashboard/announcements";
  }

  /**
   * =========================================================
   * CLEAR NEW IMAGE
   * =========================================================
   */

  function clearSelectedImage() {
    setImage(null);
  }

  /**
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className="announcement-edit-page">
        <div className="announcement-edit-loading">
          <div className="announcement-loading-icon">
            <Loader2
              size={28}
              className="announcement-loading-spin"
            />
          </div>

          <span>THÔNG BÁO</span>

          <h2>
            Đang tải thông tin
          </h2>

          <p>
            Chuẩn bị không gian chỉnh sửa...
          </p>
        </div>

        <style jsx>{`
          .announcement-edit-page {
            min-height: 100%;
            padding: 34px 32px 70px;
            background:
              radial-gradient(
                circle at 95% 5%,
                rgba(196, 181, 253, 0.16),
                transparent 28%
              ),
              radial-gradient(
                circle at 0% 90%,
                rgba(251, 191, 36, 0.10),
                transparent 28%
              ),
              #f7f8fa;
          }

          .announcement-edit-loading {
            min-height: 66vh;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            text-align: center;
          }

          .announcement-loading-icon {
            width: 62px;
            height: 62px;
            display: grid;
            place-items: center;
            border: 1px solid #e4e7eb;
            border-radius: 20px;
            color: #6d5dfc;
            background: #ffffff;
            box-shadow: 0 16px 45px rgba(15, 23, 42, 0.08);
          }

          .announcement-loading-spin {
            animation: announcement-loading-spin 1s linear infinite;
          }

          .announcement-edit-loading > span {
            margin-top: 18px;
            color: #8b93a1;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .15em;
          }

          .announcement-edit-loading h2 {
            margin: 7px 0 0;
            color: #202733;
            font-size: 24px;
            font-weight: 900;
          }

          .announcement-edit-loading p {
            margin: 7px 0 0;
            color: #939aa6;
            font-size: 12px;
          }

          @keyframes announcement-loading-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="announcement-edit-page">
      <div className="announcement-edit-bg" />

      <div className="announcement-edit-shell">

        {/* =====================================================
            TOP BAR
        ===================================================== */}

        <div className="announcement-edit-topbar">

          <button
            type="button"
            onClick={goBack}
            className="announcement-back-button"
          >
            <ArrowLeft size={17} />
            <span>
              Quay lại thông báo
            </span>
          </button>

          <div className="announcement-edit-top-status">
            <span className="status-dot" />
            ĐANG CHỈNH SỬA
          </div>
        </div>


        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="announcement-edit-hero">

          <div className="announcement-hero-grid" />

          <div className="announcement-hero-content">

            <div className="announcement-breadcrumb">
              <span>
                QUẢN LÝ
              </span>

              <ChevronRight size={13} />

              <span>
                THÔNG BÁO
              </span>

              <ChevronRight size={13} />

              <strong>
                CHỈNH SỬA
              </strong>
            </div>

            <div className="announcement-hero-kicker">
              <span className="announcement-hero-kicker-icon">
                <FileEdit size={15} />
              </span>

              EDIT ANNOUNCEMENT
            </div>

            <h1>
              Chỉnh sửa
              <span>
                thông báo
              </span>
            </h1>

            <p>
              Cập nhật thông tin hiển thị và
              chỉnh sửa nội dung trực tiếp
              trong trình soạn thảo ONLYOFFICE.
            </p>

          </div>

          <div className="announcement-hero-side">

            <div className="announcement-hero-document">
              <div className="document-icon">
                <FileEdit size={19} />
              </div>

              <div>
                <span>
                  DOCUMENT
                </span>

                <strong>
                  DOCX
                </strong>
              </div>
            </div>

            <div className="announcement-hero-divider" />

            <div className="announcement-hero-meta">

              <div>
                <span>
                  ANNOUNCEMENT ID
                </span>

                <strong>
                  {shortId}
                </strong>
              </div>

              <div>
                <span>
                  TRẠNG THÁI
                </span>

                <strong className="hero-online">
                  <i />
                  ONLINE
                </strong>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            FORM CARD
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="announcement-edit-form"
        >

          <div className="announcement-section-heading">

            <div className="section-heading-number">
              01
            </div>

            <div>
              <span>
                BASIC INFORMATION
              </span>

              <h2>
                Thông tin thông báo
              </h2>

              <p>
                Những thông tin này sẽ xuất hiện
                trên danh sách và trang thông báo.
              </p>
            </div>

          </div>


          <div className="announcement-form-grid">

            {/* TITLE */}

            <div className="announcement-field announcement-field-large">

              <div className="announcement-label-row">

                <label>
                  Tiêu đề thông báo
                  <span>*</span>
                </label>

                <small>
                  {title.length}/180
                </small>

              </div>

              <div className="announcement-input-shell">
                <FileEdit
                  size={17}
                  className="field-icon"
                />

                <input
                  value={title}
                  maxLength={180}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="Nhập tiêu đề thông báo..."
                />
              </div>

              <span className="field-help">
                Nên sử dụng tiêu đề ngắn gọn,
                rõ ràng và dễ nhận biết.
              </span>

            </div>


            {/* AUTHOR */}

            <div className="announcement-field">

              <div className="announcement-label-row">

                <label>
                  Người đăng
                  <span>*</span>
                </label>

              </div>

              <div className="announcement-input-shell">
                <UserRound
                  size={17}
                  className="field-icon"
                />

                <input
                  value={author}
                  onChange={(e) =>
                    setAuthor(
                      e.target.value
                    )
                  }
                  placeholder="Ví dụ: Admin"
                />
              </div>

              <span className="field-help">
                Tên người hoặc đơn vị đăng thông báo.
              </span>

            </div>

          </div>


          {/* ===================================================
              IMAGE CARD
          =================================================== */}

          <div className="announcement-image-section">

            <div className="announcement-section-heading image-heading">

              <div className="section-heading-number">
                02
              </div>

              <div>
                <span>
                  COVER IMAGE
                </span>

                <h2>
                  Ảnh đại diện
                </h2>

                <p>
                  Hình ảnh nổi bật của thông báo.
                </p>
              </div>

            </div>


            <div className="announcement-image-layout">

              {/* PREVIEW */}

              <div className="announcement-image-preview">

                {hasImage ? (
                  <>
                    <img
                      src={displayImage}
                      alt="Ảnh đại diện thông báo"
                    />

                    <div className="announcement-image-overlay">

                      <div>
                        <span>
                          PREVIEW
                        </span>

                        <strong>
                          {image
                            ? "Ảnh mới đã chọn"
                            : "Ảnh hiện tại"}
                        </strong>
                      </div>

                    </div>
                  </>
                ) : (
                  <div className="announcement-image-empty">

                    <div>
                      <ImageIcon size={28} />
                    </div>

                    <strong>
                      Chưa có ảnh
                    </strong>

                    <span>
                      Bạn có thể thêm ảnh đại diện.
                    </span>

                  </div>
                )}

              </div>


              {/* UPLOAD */}

              <div className="announcement-image-upload">

                <div className="upload-card-icon">
                  <Upload size={19} />
                </div>

                <div className="upload-card-copy">

                  <span>
                    THAY ĐỔI HÌNH ẢNH
                  </span>

                  <h3>
                    Tải ảnh mới
                  </h3>

                  <p>
                    Chọn một hình ảnh từ máy tính.
                    JPG, PNG, WEBP đều được hỗ trợ.
                  </p>

                </div>

                <label className="announcement-upload-button">

                  <Upload size={16} />

                  <span>
                    {image
                      ? "Chọn lại ảnh"
                      : "Chọn ảnh"}
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setImage(
                        e.target.files?.[0] ??
                          null
                      );
                    }}
                  />

                </label>

                {image && (
                  <div className="selected-image-file">

                    <div>
                      <ImageIcon size={15} />
                    </div>

                    <span>
                      {image.name}
                    </span>

                    <button
                      type="button"
                      onClick={
                        clearSelectedImage
                      }
                      aria-label="Bỏ ảnh mới"
                    >
                      <X size={14} />
                    </button>

                  </div>
                )}

                <div className="upload-note">
                  <ShieldCheck size={14} />
                  <span>
                    Ảnh hiện tại sẽ được giữ nguyên
                    nếu bạn không chọn ảnh mới.
                  </span>
                </div>

              </div>

            </div>

          </div>


          {/* ===================================================
              SAVE BAR
          =================================================== */}

          <div className="announcement-save-bar">

            <div className="announcement-save-info">

              <div className="announcement-save-check">
                <CheckCircle2 size={17} />
              </div>

              <div>
                <strong>
                  Thông tin đã sẵn sàng
                </strong>

                <span>
                  Nội dung DOCX được chỉnh sửa
                  riêng bằng ONLYOFFICE.
                </span>
              </div>

            </div>

            <button
              type="submit"
              disabled={saving}
              className="announcement-save-button"
            >

              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="announcement-save-spinner"
                  />

                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Lưu thông tin
                </>
              )}

            </button>

          </div>

        </form>


        {/* =====================================================
            ONLYOFFICE
        ===================================================== */}

        <section className="announcement-editor-section">

          <div className="announcement-editor-header">

            <div className="announcement-editor-title">

              <div className="editor-number">
                03
              </div>

              <div>

                <div className="editor-kicker">
                  <span className="editor-live-dot" />
                  ONLYOFFICE EDITOR
                </div>

                <h2>
                  Nội dung thông báo
                </h2>

                <p>
                  Chỉnh sửa trực tiếp nội dung
                  trong tài liệu DOCX.
                </p>

              </div>

            </div>


            <div className="announcement-editor-meta">

              <div className="editor-file-badge">
                <FileEdit size={14} />
                <span>
                  {title || "Thông báo"}.docx
                </span>
              </div>

              <div className="editor-status-badge">
                <CheckCircle2 size={14} />
                ONLINE
              </div>

            </div>

          </div>


          <div className="announcement-editor-note">

            <div className="editor-note-icon">
              <ShieldCheck size={16} />
            </div>

            <div>
              <strong>
                Tài liệu được quản lý riêng
              </strong>

              <span>
                Mọi thay đổi trong nội dung văn bản
                sẽ được ONLYOFFICE xử lý và lưu vào
                file DOCX của thông báo này.
              </span>
            </div>

          </div>


          <div className="announcement-editor-frame">

            <Editor
              editable={true}
              documentId={documentId}
              documentTitle={
                `${title || "Thông báo"}.docx`
              }
              height="720px"
              width="100%"
              onReady={() => {
                console.log(
                  "[ANNOUNCEMENT EDIT] ONLYOFFICE ready"
                );
              }}
              onDocumentChange={(changed) => {
                console.log(
                  "[ANNOUNCEMENT EDIT] document changed:",
                  changed
                );
              }}
              onError={(message) => {
                console.error(
                  "[ANNOUNCEMENT EDIT] ONLYOFFICE error:",
                  message
                );
              }}
            />

          </div>

        </section>


        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="announcement-edit-footer">

          <div>
            <span>
              CHI ĐOÀN D-K66
            </span>

            <strong>
              QUẢN LÝ THÔNG BÁO
            </strong>
          </div>

          <div className="footer-center">
            <CalendarDays size={14} />
            <span>
              Nội dung và thông tin được quản lý
              tập trung.
            </span>
          </div>

          <div>
            <span>
              DOCUMENT
            </span>

            <strong>
              {shortId}
            </strong>
          </div>

        </footer>

      </div>


      <style jsx>{`
        .announcement-edit-page {
          position: relative;
          min-height: 100%;
          padding: 28px 34px 80px;
          overflow: hidden;
          color: #202733;
          background:
            radial-gradient(
              circle at 92% 4%,
              rgba(196,181,253,.18),
              transparent 26%
            ),
            radial-gradient(
              circle at 0% 76%,
              rgba(251,191,36,.09),
              transparent 26%
            ),
            linear-gradient(
              180deg,
              #fafbfc 0%,
              #f5f6f8 100%
            );
        }


        .announcement-edit-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .45;
          background-image:
            linear-gradient(
              rgba(100,116,139,.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(100,116,139,.035) 1px,
              transparent 1px
            );
          background-size: 34px 34px;
          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 85%
          );
        }


        .announcement-edit-shell {
          position: relative;
          z-index: 1;
          width: min(
            1440px,
            calc(100% - 6px)
          );
          margin: 0 auto;
        }


        /* =====================================================
           TOP BAR
        ===================================================== */

        .announcement-edit-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }


        .announcement-back-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 13px;
          border: 1px solid #e4e7eb;
          border-radius: 11px;
          color: #4d5663;
          background: rgba(255,255,255,.88);
          box-shadow:
            0 5px 18px rgba(15,23,42,.045);
          font: inherit;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
          transition:
            transform .2s ease,
            border-color .2s ease,
            box-shadow .2s ease;
        }


        .announcement-back-button:hover {
          transform: translateX(-2px);
          border-color: #d5d9df;
          box-shadow:
            0 9px 25px rgba(15,23,42,.08);
        }


        .announcement-edit-top-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 34px;
          padding: 0 11px;
          border: 1px solid #e4e7eb;
          border-radius: 999px;
          color: #6b7280;
          background: rgba(255,255,255,.78);
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .13em;
        }


        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 0 4px rgba(34,197,94,.10);
        }


        /* =====================================================
           HERO
        ===================================================== */

        .announcement-edit-hero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0,1fr) 310px;
          gap: 24px;
          min-height: 245px;
          margin-bottom: 19px;
          padding: 33px 36px;
          overflow: hidden;
          border: 1px solid #e6e8eb;
          border-radius: 27px;
          background:
            linear-gradient(
              135deg,
              #2f3540 0%,
              #3a414d 52%,
              #4a4f59 100%
            );
          box-shadow:
            0 24px 60px rgba(15,23,42,.13);
        }


        .announcement-hero-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .27;
          background-image:
            linear-gradient(
              rgba(255,255,255,.08) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,.08) 1px,
              transparent 1px
            );
          background-size: 38px 38px;
          mask-image: linear-gradient(
            90deg,
            black,
            transparent 78%
          );
        }


        .announcement-edit-hero::after {
          content: "";
          position: absolute;
          right: -120px;
          bottom: -160px;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(139,92,246,.22),
              rgba(139,92,246,0) 68%
            );
          pointer-events: none;
        }


        .announcement-hero-content,
        .announcement-hero-side {
          position: relative;
          z-index: 2;
        }


        .announcement-breadcrumb {
          display: flex;
          align-items: center;
          gap: 5px;
          color: rgba(255,255,255,.48);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .11em;
        }


        .announcement-breadcrumb strong {
          color: rgba(255,255,255,.78);
        }


        .announcement-hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 27px;
          color: rgba(255,255,255,.66);
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .16em;
        }


        .announcement-hero-kicker-icon {
          display: grid;
          place-items: center;
          width: 29px;
          height: 29px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 9px;
          color: #ddd6fe;
          background: rgba(255,255,255,.08);
        }


        .announcement-edit-hero h1 {
          max-width: 700px;
          margin: 10px 0 0;
          color: #fff;
          font-size: clamp(
            32px,
            4.3vw,
            50px
          );
          line-height: .98;
          letter-spacing: -.055em;
          font-weight: 950;
        }


        .announcement-edit-hero h1 span {
          display: block;
          color: #d8d0ff;
        }


        .announcement-edit-hero p {
          max-width: 620px;
          margin: 15px 0 0;
          color: rgba(255,255,255,.66);
          font-size: 12px;
          line-height: 1.7;
        }


        .announcement-hero-side {
          align-self: center;
          padding: 21px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 20px;
          background: rgba(255,255,255,.075);
          backdrop-filter: blur(14px);
        }


        .announcement-hero-document {
          display: flex;
          align-items: center;
          gap: 11px;
        }


        .document-icon {
          display: grid;
          place-items: center;
          width: 41px;
          height: 41px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 13px;
          color: #ddd6fe;
          background: rgba(255,255,255,.08);
        }


        .announcement-hero-document span,
        .announcement-hero-meta span {
          display: block;
          color: rgba(255,255,255,.42);
          font-size: 7px;
          font-weight: 950;
          letter-spacing: .12em;
        }


        .announcement-hero-document strong {
          display: block;
          margin-top: 3px;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
        }


        .announcement-hero-divider {
          height: 1px;
          margin: 18px 0;
          background: rgba(255,255,255,.10);
        }


        .announcement-hero-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }


        .announcement-hero-meta strong {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          color: rgba(255,255,255,.85);
          font-size: 10px;
          font-weight: 850;
          white-space: nowrap;
          text-overflow: ellipsis;
        }


        .hero-online {
          display: inline-flex !important;
          align-items: center;
          gap: 6px;
          color: #bbf7d0 !important;
        }


        .hero-online i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
        }


        /* =====================================================
           FORM
        ===================================================== */

        .announcement-edit-form,
        .announcement-editor-section {
          border: 1px solid #e4e7eb;
          border-radius: 24px;
          background: rgba(255,255,255,.94);
          box-shadow:
            0 13px 38px rgba(15,23,42,.055);
        }


        .announcement-edit-form {
          margin-bottom: 18px;
          padding: 27px;
        }


        .announcement-section-heading {
          display: flex;
          align-items: flex-start;
          gap: 13px;
        }


        .section-heading-number {
          display: grid;
          place-items: center;
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          border: 1px solid #e6e2ff;
          border-radius: 11px;
          color: #6d5dfc;
          background: #f6f3ff;
          font-size: 9px;
          font-weight: 950;
        }


        .announcement-section-heading > div:last-child > span {
          display: block;
          color: #a0a7b2;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .14em;
        }


        .announcement-section-heading h2 {
          margin: 3px 0;
          color: #252c36;
          font-size: 20px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -.025em;
        }


        .announcement-section-heading p {
          margin: 0;
          color: #969eaa;
          font-size: 10px;
          line-height: 1.5;
        }


        .announcement-form-grid {
          display: grid;
          grid-template-columns:
            minmax(0,1.7fr)
            minmax(270px,1fr);
          gap: 17px;
          margin-top: 23px;
        }


        .announcement-field {
          min-width: 0;
        }


        .announcement-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }


        .announcement-label-row label {
          color: #3b4350;
          font-size: 10px;
          font-weight: 900;
        }


        .announcement-label-row label span {
          margin-left: 3px;
          color: #d9535b;
        }


        .announcement-label-row small {
          color: #a4abb5;
          font-size: 8px;
          font-weight: 750;
        }


        .announcement-input-shell {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 49px;
          padding: 0 13px;
          border: 1px solid #e1e5e9;
          border-radius: 13px;
          background: #fbfcfd;
          transition:
            border-color .2s ease,
            box-shadow .2s ease,
            background .2s ease,
            transform .2s ease;
        }


        .announcement-input-shell:focus-within {
          border-color: #b9b0ff;
          background: #fff;
          box-shadow:
            0 0 0 4px rgba(109,93,252,.075);
          transform: translateY(-1px);
        }


        .field-icon {
          flex: 0 0 auto;
          color: #9ba3ae;
        }


        .announcement-input-shell input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          color: #26303b;
          background: transparent;
          font: inherit;
          font-size: 12px;
          font-weight: 650;
        }


        .announcement-input-shell input::placeholder {
          color: #b0b6bf;
        }


        .field-help {
          display: block;
          margin-top: 6px;
          color: #a2a9b4;
          font-size: 8px;
          line-height: 1.5;
        }


        /* =====================================================
           IMAGE
        ===================================================== */

        .announcement-image-section {
          margin-top: 30px;
          padding-top: 28px;
          border-top: 1px solid #edf0f3;
        }


        .image-heading {
          margin-bottom: 19px;
        }


        .announcement-image-layout {
          display: grid;
          grid-template-columns:
            minmax(320px,.9fr)
            minmax(300px,1.1fr);
          gap: 16px;
        }


        .announcement-image-preview {
          position: relative;
          min-height: 270px;
          overflow: hidden;
          border: 1px solid #e4e7eb;
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              #f2f4f6,
              #e8ebef
            );
        }


        .announcement-image-preview img {
          width: 100%;
          height: 100%;
          min-height: 270px;
          display: block;
          object-fit: cover;
        }


        .announcement-image-overlay {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          padding: 12px 13px;
          border: 1px solid rgba(255,255,255,.22);
          border-radius: 13px;
          color: white;
          background: rgba(25,30,38,.68);
          backdrop-filter: blur(13px);
        }


        .announcement-image-overlay span {
          display: block;
          color: rgba(255,255,255,.53);
          font-size: 7px;
          font-weight: 950;
          letter-spacing: .13em;
        }


        .announcement-image-overlay strong {
          display: block;
          margin-top: 3px;
          font-size: 10px;
          font-weight: 850;
        }


        .announcement-image-empty {
          min-height: 270px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
        }


        .announcement-image-empty > div {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          border-radius: 17px;
          color: #8c94a0;
          background: #fff;
          box-shadow:
            0 8px 25px rgba(15,23,42,.06);
        }


        .announcement-image-empty strong {
          margin-top: 12px;
          color: #5b6470;
          font-size: 12px;
          font-weight: 900;
        }


        .announcement-image-empty span {
          margin-top: 4px;
          color: #9ca3ad;
          font-size: 9px;
        }


        .announcement-image-upload {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 24px;
          border: 1px dashed #d8dce2;
          border-radius: 18px;
          background: #fafbfc;
        }


        .upload-card-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          color: #6d5dfc;
          background: #f0edff;
        }


        .upload-card-copy {
          margin-top: 14px;
        }


        .upload-card-copy > span {
          color: #9da4ae;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: .14em;
        }


        .upload-card-copy h3 {
          margin: 4px 0 0;
          color: #343c47;
          font-size: 17px;
          font-weight: 950;
        }


        .upload-card-copy p {
          max-width: 430px;
          margin: 5px 0 0;
          color: #949ca7;
          font-size: 9px;
          line-height: 1.6;
        }


        .announcement-upload-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: fit-content;
          min-height: 41px;
          margin-top: 18px;
          padding: 0 14px;
          overflow: hidden;
          border: 1px solid #dcdfe4;
          border-radius: 11px;
          color: #353d48;
          background: white;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform .18s ease,
            border-color .18s ease,
            box-shadow .18s ease;
        }


        .announcement-upload-button:hover {
          transform: translateY(-1px);
          border-color: #c7cbd2;
          box-shadow:
            0 8px 20px rgba(15,23,42,.06);
        }


        .announcement-upload-button input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }


        .selected-image-file {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          margin-top: 11px;
          padding: 8px 9px;
          border: 1px solid #e1e5e9;
          border-radius: 10px;
          background: #fff;
        }


        .selected-image-file > div {
          display: grid;
          place-items: center;
          width: 27px;
          height: 27px;
          flex: 0 0 27px;
          border-radius: 8px;
          color: #6d5dfc;
          background: #f0edff;
        }


        .selected-image-file span {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          color: #5d6672;
          font-size: 8px;
          font-weight: 800;
          white-space: nowrap;
          text-overflow: ellipsis;
        }


        .selected-image-file button {
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          border: 0;
          border-radius: 7px;
          color: #9ba2ac;
          background: #f3f4f6;
          cursor: pointer;
        }


        .upload-note {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-top: 14px;
          color: #9ca4ae;
          font-size: 8px;
          line-height: 1.5;
        }


        .upload-note svg {
          flex: 0 0 auto;
          color: #4caf7b;
        }


        /* =====================================================
           SAVE BAR
        ===================================================== */

        .announcement-save-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 27px;
          padding-top: 23px;
          border-top: 1px solid #edf0f3;
        }


        .announcement-save-info {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }


        .announcement-save-check {
          display: grid;
          place-items: center;
          width: 37px;
          height: 37px;
          flex: 0 0 37px;
          border-radius: 11px;
          color: #4f9d72;
          background: #edf9f2;
        }


        .announcement-save-info strong,
        .announcement-save-info span {
          display: block;
        }


        .announcement-save-info strong {
          color: #434b57;
          font-size: 10px;
          font-weight: 900;
        }


        .announcement-save-info span {
          margin-top: 3px;
          color: #a0a7b1;
          font-size: 8px;
        }


        .announcement-save-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 154px;
          min-height: 45px;
          padding: 0 16px;
          border: 1px solid #d7d2ff;
          border-radius: 12px;
          color: #fff;
          background:
            linear-gradient(
              135deg,
              #7062f4,
              #6255d9
            );
          box-shadow:
            0 11px 24px rgba(98,85,217,.20);
          font: inherit;
          font-size: 10px;
          font-weight: 950;
          cursor: pointer;
          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }


        .announcement-save-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 15px 28px rgba(98,85,217,.25);
        }


        .announcement-save-button:disabled {
          opacity: .58;
          cursor: not-allowed;
        }


        .announcement-save-spinner {
          animation: announcement-save-spin 1s linear infinite;
        }


        @keyframes announcement-save-spin {
          to {
            transform: rotate(360deg);
          }
        }


        /* =====================================================
           EDITOR
        ===================================================== */

.announcement-editor-section {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}


        .announcement-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 25px;
          border-bottom: 1px solid #eceff2;
        }


        .announcement-editor-title {
          display: flex;
          align-items: flex-start;
          gap: 13px;
        }


        .editor-number {
          display: grid;
          place-items: center;
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          border: 1px solid #f2dfb4;
          border-radius: 11px;
          color: #b27a1a;
          background: #fff9ec;
          font-size: 9px;
          font-weight: 950;
        }


        .editor-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #a0a7b1;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: .14em;
        }


        .editor-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #31b66b;
          box-shadow:
            0 0 0 4px rgba(49,182,107,.09);
        }


        .announcement-editor-title h2 {
          margin: 3px 0;
          color: #282f39;
          font-size: 19px;
          font-weight: 950;
        }


        .announcement-editor-title p {
          margin: 0;
          color: #99a0aa;
          font-size: 9px;
        }


        .announcement-editor-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }


        .editor-file-badge,
        .editor-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 33px;
          padding: 0 9px;
          border: 1px solid #e3e6e9;
          border-radius: 10px;
          color: #666e79;
          background: #f9fafb;
          font-size: 8px;
          font-weight: 850;
        }


        .editor-file-badge {
          max-width: 250px;
        }


        .editor-file-badge span {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }


        .editor-status-badge {
          color: #4f9870;
          border-color: #d7eddc;
          background: #f3fbf5;
        }


        .announcement-editor-note {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 15px 17px;
          padding: 10px 12px;
          border: 1px solid #eceff2;
          border-radius: 12px;
          background: #fafbfc;
        }


        .editor-note-icon {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          border-radius: 9px;
          color: #5b9b76;
          background: #edf8f1;
        }


        .announcement-editor-note strong,
        .announcement-editor-note span {
          display: block;
        }


        .announcement-editor-note strong {
          color: #58616d;
          font-size: 9px;
          font-weight: 900;
        }


        .announcement-editor-note span {
          margin-top: 2px;
          color: #a0a7b1;
          font-size: 8px;
          line-height: 1.45;
        }


.announcement-editor-frame {
  margin: 0 11px 11px;
  overflow: hidden;
  border: 1px solid #dfe3e7;
  border-radius: 15px;
  background: #202226;
  box-shadow:
    0 14px 35px rgba(15,23,42,.10);
  min-height: 720px;
}


        /* =====================================================
           FOOTER
        ===================================================== */

        .announcement-edit-footer {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 15px;
          margin-top: 14px;
          padding: 0 4px;
          color: #9aa1ab;
          font-size: 8px;
        }


        .announcement-edit-footer > div {
          display: flex;
          align-items: center;
          gap: 8px;
        }


        .announcement-edit-footer > div:last-child {
          justify-content: flex-end;
        }


        .announcement-edit-footer span {
          font-weight: 700;
        }


        .announcement-edit-footer strong {
          color: #68717c;
          font-weight: 900;
          letter-spacing: .06em;
        }


        .footer-center {
          color: #a1a8b1;
        }


        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1100px) {
          .announcement-edit-page {
            padding: 22px 22px 65px;
          }

          .announcement-edit-hero {
            grid-template-columns: 1fr;
          }

          .announcement-hero-side {
            width: 100%;
            max-width: none;
          }

          .announcement-form-grid {
            grid-template-columns: 1fr;
          }
        }


        @media (max-width: 800px) {
          .announcement-edit-page {
            padding: 16px 13px 55px;
          }

          .announcement-edit-shell {
            width: 100%;
          }

          .announcement-edit-hero {
            padding: 25px 21px;
            border-radius: 21px;
          }

          .announcement-edit-hero h1 {
            font-size: 37px;
          }

          .announcement-hero-meta {
            grid-template-columns: 1fr 1fr;
          }

          .announcement-edit-form {
            padding: 19px;
            border-radius: 19px;
          }

          .announcement-image-layout {
            grid-template-columns: 1fr;
          }

          .announcement-image-preview,
          .announcement-image-preview img,
          .announcement-image-empty {
            min-height: 235px;
          }

          .announcement-editor-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .announcement-editor-meta {
            justify-content: flex-start;
          }

          .announcement-save-bar {
            align-items: stretch;
            flex-direction: column;
          }

          .announcement-save-button {
            width: 100%;
          }

          .announcement-edit-footer {
            grid-template-columns: 1fr;
            gap: 7px;
            line-height: 1.5;
          }

          .announcement-edit-footer > div,
          .announcement-edit-footer > div:last-child {
            justify-content: flex-start;
          }

          .footer-center {
            order: 3;
          }
        }


        @media (max-width: 520px) {
          .announcement-edit-topbar {
            align-items: flex-start;
          }

          .announcement-back-button span {
            display: none;
          }

          .announcement-edit-hero {
            min-height: 0;
          }

          .announcement-edit-hero h1 {
            font-size: 34px;
          }

          .announcement-hero-side {
            padding: 16px;
          }

          .announcement-section-heading h2 {
            font-size: 17px;
          }

          .announcement-image-upload {
            padding: 19px;
          }

          .announcement-editor-section {
            border-radius: 19px;
          }

          .announcement-editor-header {
            padding: 18px;
          }

          .announcement-editor-note {
            margin: 11px;
          }

          .announcement-editor-frame {
            margin: 0 6px 6px;
            border-radius: 11px;
          }
        }
      `}</style>
    </main>
  );
}