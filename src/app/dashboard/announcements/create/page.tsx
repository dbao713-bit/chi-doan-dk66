"use client";

import Editor from "@/components/Editor";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  /**
   * =========================================================
   * BƯỚC 1 + 2 + 3
   *
   * 1. Upload ảnh
   * 2. Tạo announcement trong Supabase
   * 3. Tạo file DOCX riêng cho announcement
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
            .upload(fileName, image);

        if (uploadError) {
          throw new Error(
            `Không thể upload ảnh: ${uploadError.message}`
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
       * 2. TẠO ANNOUNCEMENT TRONG DATABASE
       * -------------------------------------------------------
       *
       * Lúc này chưa có file DOCX.
       *
       * Supabase tạo:
       *
       * id = 123
       *
       * Sau đó ta sẽ tạo:
       *
       * announcement-123.docx
       */

      console.log(
        "[ANNOUNCEMENT CREATE] Creating database record..."
      );

      const { data, error } =
        await supabase
          .from("announcements")
          .insert([
            {
              title: title.trim(),
              content: "",
              image: imageUrl,
              author: author.trim(),
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
       * 3. TẠO FILE DOCX
       * -------------------------------------------------------
       *
       * Gọi:
       *
       * POST /api/announcements/create-document
       *
       * API này sẽ copy:
       *
       * public/documents/test-docx.docx
       *
       * thành:
       *
       * public/documents/announcement-123.docx
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
   * CHƯA CÓ ANNOUNCEMENT
   * =========================================================
   */

  if (
    !announcementId ||
    !documentId
  ) {
    return (
      <main className="mx-auto max-w-4xl py-10">
        <h1 className="mb-8 text-4xl font-bold">
          Thêm thông báo
        </h1>

        <form
          onSubmit={
            handleCreateAnnouncement
          }
          className="space-y-6 rounded-2xl bg-white p-8 shadow"
        >
          {/* =================================================
              TIÊU ĐỀ
          ================================================= */}

          <div>
            <label className="mb-2 block font-semibold">
              Tiêu đề
            </label>

            <input
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              placeholder="Nhập tiêu đề thông báo..."
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
            />
          </div>

          {/* =================================================
              NGƯỜI ĐĂNG
          ================================================= */}

          <div>
            <label className="mb-2 block font-semibold">
              Người đăng
            </label>

            <input
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              placeholder="Người đăng"
              value={author}
              onChange={(e) =>
                setAuthor(e.target.value)
              }
            />
          </div>

          {/* =================================================
              ẢNH
          ================================================= */}

          <div>
            <label className="mb-2 block font-semibold">
              Ảnh đại diện thông báo
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setImage(
                  e.target.files?.[0] ??
                    null
                )
              }
              className="w-full rounded-xl border p-3"
            />
          </div>

          {/* =================================================
              BUTTON
          ================================================= */}

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating
              ? "Đang tạo..."
              : "Tạo thông báo và mở trình soạn thảo"}
          </button>
        </form>
      </main>
    );
  }

  /**
   * =========================================================
   * ĐÃ TẠO ANNOUNCEMENT
   *
   * Bây giờ mở ONLYOFFICE.
   * =========================================================
   */

  return (
    <main className="min-h-screen w-full bg-gray-100 p-4">
      <div className="mx-auto w-full max-w-[1600px]">

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {title}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Announcement ID:{" "}
              {announcementId}
            </p>

            <p className="text-sm text-gray-500">
              Document ID:{" "}
              {documentId}
            </p>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Hoàn tất
          </button>
        </div>

        {/* ===================================================
            ONLYOFFICE
        =================================================== */}

        <Editor
          documentId={documentId}
          documentTitle={`${title}.docx`}
          height="calc(100vh - 130px)"
          width="100%"
        />
      </div>
    </main>
  );
}