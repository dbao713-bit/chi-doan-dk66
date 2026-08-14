"use client";

import Editor from "@/components/Editor";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditAnnouncementPage() {
  const params = useParams();

  const announcementId = String(params.id ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [oldImage, setOldImage] = useState("");

  const [image, setImage] = useState<File | null>(null);

  /**
   * ---------------------------------------------------------
   * DOCUMENT ID
   * ---------------------------------------------------------
   *
   * Ví dụ:
   *
   * announcementId:
   * ca60bd73-b17d-4ced-9acb-5fbc72d5730e
   *
   * documentId:
   * announcement-ca60bd73-b17d-4ced-9acb-5fbc72d5730e
   */

  const documentId = `announcement-${announcementId}`;

  /**
   * ---------------------------------------------------------
   * LOAD ANNOUNCEMENT
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!announcementId) {
      return;
    }

    let cancelled = false;

    async function loadAnnouncement() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("id", announcementId)
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error("Không tìm thấy thông báo.");
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
   * ---------------------------------------------------------
   * SAVE INFORMATION
   * ---------------------------------------------------------
   *
   * Chỉ lưu:
   *
   * - title
   * - author
   * - image
   *
   * Nội dung DOCX được ONLYOFFICE lưu
   * thông qua callback.
   */

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề.");
      return;
    }

    if (!author.trim()) {
      alert("Vui lòng nhập người đăng.");
      return;
    }

    if (!announcementId) {
      alert("Không xác định được announcementId.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = oldImage;

      /**
       * -------------------------------------------------------
       * UPLOAD ẢNH
       * -------------------------------------------------------
       */

      if (image) {
        const fileName =
          `${Date.now()}-${image.name}`;

        const { error: uploadError } =
          await supabase.storage
            .from("announcement-images")
            .upload(fileName, image);

        if (uploadError) {
          throw new Error(
            uploadError.message
          );
        }

        const { data } =
          supabase.storage
            .from("announcement-images")
            .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
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
          .eq("id", announcementId);

      if (error) {
        throw new Error(error.message);
      }

      console.log(
        "[EDIT ANNOUNCEMENT] Information saved successfully."
      );

      alert(
        "Đã cập nhật thông tin thông báo!"
      );

      /**
       * -------------------------------------------------------
       * FULL PAGE NAVIGATION
       * -------------------------------------------------------
       *
       * Không dùng router.push().
       *
       * Lý do:
       * ONLYOFFICE đang quản lý DOM bên trong
       * component DocumentEditor.
       *
       * Full page navigation giúp tránh lỗi:
       *
       * NotFoundError:
       * Failed to execute 'removeChild' on 'Node'
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
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải thông báo...
        </p>
      </main>
    );
  }

  /**
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto w-full max-w-[1600px]">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-5 shadow">

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Chỉnh sửa thông báo
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {title}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Announcement ID: {announcementId}
            </p>

            <p className="text-xs text-gray-400">
              Document ID: {documentId}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/dashboard/announcements";
            }}
            className="rounded-xl bg-gray-200 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-300"
          >
            Quay lại
          </button>
        </div>

        {/* =====================================================
            THÔNG TIN THÔNG BÁO
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="mb-4 rounded-xl bg-white p-6 shadow"
        >
          <div className="grid gap-5 md:grid-cols-2">

            {/* TIÊU ĐỀ */}

            <div>
              <label className="mb-2 block font-semibold">
                Tiêu đề
              </label>

              <input
                className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                }}
                placeholder="Tiêu đề thông báo"
              />
            </div>

            {/* NGƯỜI ĐĂNG */}

            <div>
              <label className="mb-2 block font-semibold">
                Người đăng
              </label>

              <input
                className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                }}
                placeholder="Người đăng"
              />
            </div>
          </div>

          {/* ===================================================
              ẢNH
          =================================================== */}

          <div className="mt-5">
            <label className="mb-2 block font-semibold">
              Ảnh đại diện
            </label>

            {oldImage && (
              <div className="mb-3">
                <img
                  src={oldImage}
                  alt="Ảnh thông báo"
                  className="h-48 rounded-xl object-cover"
                />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImage(
                  e.target.files?.[0] ?? null
                );
              }}
              className="w-full rounded-xl border p-3"
            />
          </div>

          {/* ===================================================
              SAVE
          =================================================== */}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Đang lưu..."
                : "Lưu thông tin"}
            </button>
          </div>
        </form>

        {/* =====================================================
            ONLYOFFICE
        ===================================================== */}

        <div className="rounded-xl bg-white p-3 shadow">

          <div className="mb-3 px-2">
            <h2 className="text-lg font-bold">
              Nội dung thông báo
            </h2>

            <p className="text-sm text-gray-500">
              Chỉnh sửa nội dung trực tiếp bằng
              ONLYOFFICE. Nội dung sẽ được lưu
              vào file DOCX.
            </p>
          </div>

          <Editor
            editable={true}
            documentId={documentId}
            documentTitle={
              `${title || "Thông báo"}.docx`
            }
            height="calc(100vh - 300px)"
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
      </div>
    </main>
  );
}