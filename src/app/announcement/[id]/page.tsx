"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AnnouncementDocument from "@/components/AnnouncementDocument";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function AnnouncementDetailPage() {
  const params = useParams();

  const announcementId = String(params.id);

  const [announcement, setAnnouncement] =
    useState<any>(null);

  const [openDelete, setOpenDelete] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  /**
   * =========================================================
   * DOCUMENT ID
   * =========================================================
   *
   * Announcement:
   *
   * ca60bd73-b17d-4ced-9acb-5fbc72d5730e
   *
   * Document:
   *
   * announcement-ca60bd73-b17d-4ced-9acb-5fbc72d5730e.docx
   */

  const documentId =
    `announcement-${announcementId}`;

  /**
   * =========================================================
   * LOAD ANNOUNCEMENT
   * =========================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncement() {
      try {
        const { data, error } =
          await supabase
           .from("announcements")
           .select("*")
           .eq("id", announcementId)
           .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error(
            "Không tìm thấy thông báo."
          );
        }

        if (!cancelled) {
          setAnnouncement(data);
        }
      } catch (error) {
        console.error(
          "[ANNOUNCEMENT DETAIL]",
          error
        );

        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Không thể tải thông báo."
          );
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
   * DELETE ANNOUNCEMENT
   * =========================================================
   *
   * Thứ tự:
   *
   * 1. Xóa file DOCX
   * 2. Xóa database
   * 3. Quay lại danh sách
   *
   * Không xóa database trước vì nếu database đã mất
   * nhưng file Word vẫn còn thì sẽ tạo file rác.
   */

  async function deleteAnnouncement() {
  try {
    /**
     * =====================================================
     * 1. XÓA FILE WORD
     * =====================================================
     */

    console.log(
      "[ANNOUNCEMENT DELETE] Deleting DOCX:",
      documentId
    );

    const fileResponse = await fetch(
      `/api/onlyoffice/delete/${encodeURIComponent(
        documentId
      )}`,
      {
        method: "DELETE",
        cache: "no-store",
      }
    );

    const fileResult =
      await fileResponse.json();

    console.log(
      "[ANNOUNCEMENT DELETE] DOCX delete result:",
      fileResult
    );

    if (!fileResponse.ok) {
      throw new Error(
        fileResult?.error ||
          "Không thể xóa file Word."
      );
    }

    /**
     * =====================================================
     * 2. XÓA BẢN GHI SUPABASE
     * =====================================================
     */

    console.log(
      "[ANNOUNCEMENT DELETE] Deleting announcement:",
      announcementId
    );

    const { error } =
      await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId);

    if (error) {
      throw new Error(error.message);
    }

    /**
     * =====================================================
     * 3. THÀNH CÔNG
     * =====================================================
     */

    toast.success(
      "Đã xóa thông báo và file Word"
    );

    window.location.href =
      "/dashboard/announcements";

  } catch (error) {
    console.error(
      "[ANNOUNCEMENT DELETE]",
      error
    );

    toast.error(
      error instanceof Error
        ? error.message
        : "Xóa thất bại."
    );
  }
}

  /**
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (!announcement) {
    return (
      <div className="flex min-h-screen">

        <Sidebar />

        <div className="flex-1 bg-slate-100">

          <Header />

          <div className="flex min-h-[70vh] items-center justify-center">

            <div className="text-center">

              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

              <p className="text-lg text-gray-500">
                Đang tải thông báo...
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /**
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <>
      <div className="flex min-h-screen">

        <Sidebar />

        <div className="flex-1 bg-slate-100">

          <Header />

          <main className="mx-auto w-full max-w-7xl p-8">

            {/* =================================================
                TOP BAR
            ================================================= */}

            <div className="mb-6 flex items-center justify-between">

              <Link
                href="/dashboard/announcements"
                className="text-blue-600 hover:underline"
              >
                ← Quay lại danh sách
              </Link>

              <div className="flex gap-3">

                {/* SỬA */}

                <Link
                  href={`/dashboard/announcements/edit/${announcement.id}`}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white hover:bg-amber-600"
                >
                  <Pencil size={18} />

                  Sửa
                </Link>

                {/* XÓA */}

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() =>
                    setOpenDelete(true)
                  }
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={18} />

                  {deleting
                    ? "Đang xóa..."
                    : "Xóa"}
                </button>

              </div>

            </div>

            {/* =================================================
                THÔNG TIN THÔNG BÁO
            ================================================= */}

            <article className="overflow-hidden rounded-2xl bg-white shadow">

              {/* =================================================
                  IMAGE
              ================================================= */}

              {announcement.image && (
                <img
                  src={announcement.image}
                  alt={
                    announcement.title ||
                    "Ảnh thông báo"
                  }
                  className="max-h-[500px] w-full object-cover"
                />
              )}

              {/* =================================================
                  HEADER
              ================================================= */}

              <div className="p-10">

                <h1 className="mb-4 text-5xl font-bold leading-tight text-gray-900">
                  {announcement.title}
                </h1>

                <div className="border-b pb-6 text-gray-500">

                  <span className="font-semibold">
                    {announcement.author}
                  </span>

                  {" • "}

                  {announcement.created_at
                    ? new Date(
                        announcement.created_at
                      ).toLocaleDateString(
                        "vi-VN"
                      )
                    : ""}
                </div>

              </div>

            </article>

            {/* =================================================
                WORD DOCUMENT
            ================================================= */}

            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">

              {/* HEADER */}

              <div className="border-b p-6">

                <h2 className="text-2xl font-bold text-gray-900">
                  Nội dung thông báo
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Nội dung được hiển thị trực tiếp
                  từ file Word của thông báo.
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  Document ID: {documentId}
                </p>

              </div>

              {/* =================================================
                  ONLYOFFICE VIEWER
              ================================================= */}

              <div className="p-4">
                <AnnouncementDocument
                  announcementId={announcementId}
                />
              </div>

            </section>

          </main>

        </div>

      </div>

      {/* =====================================================
          DELETE DIALOG
      ===================================================== */}

      <AlertDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              Xóa thông báo?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Thông báo và file Word tương ứng
              sẽ bị xóa. Hành động này không thể
              hoàn tác.
            </AlertDialogDescription>

          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogCancel
              disabled={deleting}
            >
              Hủy
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={deleteAnnouncement}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting
                ? "Đang xóa..."
                : "Xóa"}
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>
    </>
  );
}