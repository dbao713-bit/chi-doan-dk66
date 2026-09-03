"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Megaphone,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import AnnouncementDocument from "@/components/AnnouncementDocument";

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
import { SidebarProvider } from "@/context/SidebarContext";

/* =========================================================
   TYPES
========================================================= */

type Announcement = {
  id: string;
  title: string;
  content: string | null;
  image: string | null;
  author: string | null;
  created_at: string | null;
};

/* =========================================================
   PAGE
========================================================= */

export default function AnnouncementDetailPage() {
  return (
    <SidebarProvider>
      <AnnouncementDetailContent />
    </SidebarProvider>
  );
}

/* =========================================================
   CONTENT
========================================================= */

function AnnouncementDetailContent() {
  const params = useParams();

  const announcementId = String(params.id);

  const [announcement, setAnnouncement] =
    useState<Announcement | null>(null);

  const [openDelete, setOpenDelete] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const documentId =
    `announcement-${announcementId}`;

  /* =======================================================
     LOAD ANNOUNCEMENT
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncement() {
      try {
        const { data, error } =
          await supabase
            .from("announcements")
            .select(
              "id, title, content, image, author, created_at"
            )
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
          setAnnouncement(
            data as Announcement
          );
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

    void loadAnnouncement();

    return () => {
      cancelled = true;
    };
  }, [announcementId]);

  /* =======================================================
     DELETE
  ======================================================= */

  async function deleteAnnouncement() {
    if (deleting) {
      return;
    }

    try {
      setDeleting(true);

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

      if (!fileResponse.ok) {
        throw new Error(
          fileResult?.error ||
            "Không thể xóa file Word."
        );
      }

      const { error } =
        await supabase
          .from("announcements")
          .delete()
          .eq("id", announcementId);

      if (error) {
        throw new Error(error.message);
      }

      toast.success(
        "Đã xóa thông báo và file Word."
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
          : "Xóa thông báo thất bại."
      );

      setDeleting(false);
    }
  }

  /* =======================================================
     FORMAT
  ======================================================= */

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "Chưa xác định";
    }

    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(new Date(value));
  }

  function formatTime(
    value: string | null
  ) {
    if (!value) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(value));
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (!announcement) {
    return (
      <div className="min-h-screen bg-[#f3f6fa]">

        <div className="flex min-h-screen">

          <Sidebar />

          <div className="min-w-0 flex-1">

            <Header />

            <main className="px-5 pb-12 pt-5 sm:px-7 lg:px-10 xl:px-12">

              <div className="mx-auto w-full max-w-[1380px]">

                <div className="mb-6 inline-flex h-10 w-48 animate-pulse rounded-xl bg-white shadow-sm" />

                <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(16,42,67,0.08)]">

                  <div className="h-[280px] animate-pulse bg-slate-100 sm:h-[360px] lg:h-[430px]" />

                  <div className="space-y-5 p-6 sm:p-8 lg:p-10">

                    <div className="h-6 w-28 animate-pulse rounded-lg bg-slate-100" />

                    <div className="h-12 w-4/5 animate-pulse rounded-xl bg-slate-100" />

                    <div className="h-10 w-2/5 animate-pulse rounded-xl bg-slate-100" />

                    <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-100" />

                  </div>

                </div>

              </div>

            </main>

          </div>

        </div>

      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f3f6fa]">

      <div className="flex min-h-screen">

        <Sidebar />

        <div className="min-w-0 flex-1">

          <Header />

          <main className="px-5 pb-14 pt-5 sm:px-7 lg:px-10 xl:px-12">

            <div className="mx-auto w-full max-w-[1380px]">

              {/* =================================================
                  TOP TOOLBAR
              ================================================= */}

              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <Link
                  href="/dashboard/announcements"
                  className="group inline-flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#b9d6ea] hover:text-[#005BAC] hover:shadow-md"
                >

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f7fb] text-[#005BAC] transition group-hover:bg-[#e5f2fa]">
                    <ArrowLeft
                      size={17}
                      strokeWidth={2.3}
                    />
                  </span>

                  <span className="pr-1">
                    Quay lại danh sách thông báo
                  </span>

                </Link>


                <div className="flex flex-wrap items-center gap-3">

                  <Link
                    href={`/dashboard/announcements/edit/${announcement.id}`}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-200 bg-white px-5 text-sm font-extrabold text-amber-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md"
                  >
                    <Pencil
                      size={16}
                      strokeWidth={2.2}
                    />

                    <span>
                      Sửa thông báo
                    </span>

                  </Link>


                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() =>
                      setOpenDelete(true)
                    }
                    className="!inline-flex !h-11 !items-center !gap-2 !rounded-xl !border !border-red-600 !bg-red-600 !px-5 !text-sm !font-extrabold !text-white !shadow-sm transition duration-200 hover:-translate-y-0.5 hover:!border-red-700 hover:!bg-red-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      color: "#ffffff",
                    }}
                  >

                    <Trash2
                      size={16}
                      strokeWidth={2.2}
                    />

                    <span>
                      {deleting
                        ? "Đang xóa..."
                        : "Xóa thông báo"}
                    </span>

                  </button>

                </div>

              </div>


              {/* =================================================
                  ARTICLE
              ================================================= */}

              <article className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_20px_65px_rgba(16,42,67,0.09)]">

                {/* =================================================
                    IMAGE
                ================================================= */}

                {announcement.image ? (
                  <div className="relative overflow-hidden border-b border-slate-100 bg-[#e9eef4]">

                    <div className="flex min-h-[300px] items-center justify-center p-3 sm:min-h-[380px] sm:p-5 lg:min-h-[470px] lg:p-7">

                      <img
                        src={announcement.image}
                        alt={
                          announcement.title ||
                          "Ảnh thông báo"
                        }
                        className="block max-h-[470px] w-full rounded-[22px] object-contain shadow-[0_12px_36px_rgba(18,38,63,0.12)]"
                      />

                    </div>

                  </div>
                ) : (
                  <div className="flex min-h-[230px] items-center justify-center bg-gradient-to-br from-[#eaf5fb] via-white to-[#edf5fa]">

                    <div className="text-center">

                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#005BAC] shadow-sm">
                        <Megaphone
                          size={28}
                          strokeWidth={1.8}
                        />
                      </div>

                      <p className="text-sm font-bold text-slate-500">
                        Thông báo Chi đoàn D-K66
                      </p>

                    </div>

                  </div>
                )}


                {/* =================================================
                    TITLE AREA
                ================================================= */}

                <div className="px-6 py-8 sm:px-9 sm:py-9 lg:px-12 lg:py-10">

                  <div className="mb-5 flex flex-wrap items-center gap-2.5">

                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf4fb] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#005BAC]">
                      <Megaphone
                        size={13}
                        strokeWidth={2.2}
                      />
                      Thông báo
                    </span>

                    <span className="text-xs font-semibold text-slate-400">
                      Mã thông báo
                    </span>

                    <span className="max-w-[min(100%,420px)] truncate rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-500">
                      {announcement.id}
                    </span>

                  </div>


                  <h1 className="max-w-5xl text-[32px] font-black leading-[1.12] tracking-[-0.035em] text-[#142940] sm:text-[40px] lg:text-[50px]">
                    {announcement.title}
                  </h1>


                  {/* =================================================
                      META ROW
                  ================================================= */}

                  <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5 border-t border-slate-100 pt-6">

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf6fc] text-[#005BAC]">
                        <UserRound
                          size={19}
                          strokeWidth={2}
                        />
                      </div>

                      <div>

                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                          Người đăng
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {announcement.author ||
                            "BCH Chi đoàn"}
                        </p>

                      </div>

                    </div>


                    <span className="hidden h-10 w-px bg-slate-200 sm:block" />


                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <CalendarDays
                          size={19}
                          strokeWidth={2}
                        />
                      </div>

                      <div>

                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                          Ngày đăng
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {formatDate(
                            announcement.created_at
                          )}

                          {announcement.created_at && (
                            <span className="ml-2 font-medium text-slate-400">
                              {formatTime(
                                announcement.created_at
                              )}
                            </span>
                          )}
                        </p>

                      </div>

                    </div>


                    <span className="hidden h-10 w-px bg-slate-200 sm:block" />


                    <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5">

                      <CheckCircle2
                        size={16}
                        className="text-emerald-600"
                        strokeWidth={2.2}
                      />

                      <span className="text-xs font-extrabold text-emerald-700">
                        Đang lưu trữ
                      </span>

                    </div>

                  </div>

                </div>

              </article>


              {/* =================================================
                  DOCUMENT
              ================================================= */}

              <section className="mt-7 overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_18px_55px_rgba(16,42,67,0.075)]">

                <header className="border-b border-slate-100 px-6 py-7 sm:px-9 lg:px-10">

                  <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

                    <div className="flex items-start gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf6fc] text-[#005BAC]">
                        <FileText
                          size={21}
                          strokeWidth={2}
                        />
                      </div>

                      <div>

                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#005BAC]">
                          Tài liệu đính kèm
                        </p>

                        <h2 className="mt-1 text-2xl font-black tracking-[-0.02em] text-[#172b43]">
                          Nội dung thông báo
                        </h2>

                        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                          Tài liệu Word được hiển thị trực tiếp
                          trong hệ thống để bạn có thể theo dõi
                          nội dung mà không cần tải xuống.
                        </p>

                      </div>

                    </div>


                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 xl:w-[420px]">

                      <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-400">
                        Document ID
                      </p>

                      <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-600">
                        {documentId}
                      </p>

                    </div>

                  </div>

                </header>


                <div className="bg-[#eef2f6] p-3 sm:p-5 lg:p-6">

                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,35,55,0.10)]">

                    <AnnouncementDocument
                      announcementId={
                        announcementId
                      }
                    />

                  </div>

                </div>

              </section>


              {/* =================================================
                  BOTTOM ACTION BAR
              ================================================= */}

              <section className="mt-6 rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">

                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                  <div className="min-w-0">

                    <div className="flex items-center gap-2">

                      <div className="h-2 w-2 rounded-full bg-[#005BAC]" />

                      <p className="text-sm font-extrabold text-slate-700">
                        Bạn đang xem thông báo của Chi đoàn D-K66
                      </p>

                    </div>

                    <p className="mt-1.5 pl-4 text-xs leading-5 text-slate-400">
                      Các thao tác chỉnh sửa và xóa chỉ dành cho
                      tài khoản quản trị có quyền phù hợp.
                    </p>

                  </div>


                  <div className="flex shrink-0 flex-wrap items-center gap-3">

                    <Link
                      href="/dashboard/announcements"
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
                    >
                      <ArrowLeft
                        size={15}
                        strokeWidth={2.2}
                      />

                      <span>
                        Danh sách
                      </span>

                    </Link>


                    <Link
                      href={`/dashboard/announcements/edit/${announcement.id}`}
                      className="!inline-flex !h-11 !items-center !gap-2 !rounded-xl !border !border-[#005BAC] !bg-[#005BAC] !px-5 !text-sm !font-extrabold !text-white !shadow-sm transition hover:-translate-y-0.5 hover:!border-[#004d92] hover:!bg-[#004d92] hover:shadow-md"
                      style={{
                        color: "#ffffff",
                      }}
                    >
                      <Pencil
                        size={15}
                        strokeWidth={2.2}
                      />

                      <span>
                        Chỉnh sửa
                      </span>

                    </Link>

                  </div>

                </div>

              </section>

            </div>

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

        <AlertDialogContent className="max-w-md rounded-[24px] border border-slate-200 p-6 shadow-[0_25px_80px_rgba(15,35,55,0.18)]">

          <AlertDialogHeader>

            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2
                size={21}
                strokeWidth={2}
              />
            </div>

            <AlertDialogTitle className="text-xl font-black text-slate-900">
              Xóa thông báo?
            </AlertDialogTitle>

            <AlertDialogDescription className="mt-1 leading-6 text-slate-500">
              Thông báo và file Word tương ứng sẽ được xóa
              khỏi hệ thống. Hành động này không thể hoàn tác.
            </AlertDialogDescription>

          </AlertDialogHeader>


          <AlertDialogFooter className="mt-4 gap-2">

            <AlertDialogCancel
              disabled={deleting}
              className="!h-10 !rounded-xl !border-slate-200 !bg-white !px-4 !font-semibold !text-slate-600"
            >
              Hủy
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={deleteAnnouncement}
              disabled={deleting}
              className="!h-10 !rounded-xl !border-red-600 !bg-red-600 !px-4 !font-bold !text-white hover:!border-red-700 hover:!bg-red-700"
              style={{
                color: "#ffffff",
              }}
            >
              {deleting
                ? "Đang xóa..."
                : "Xóa thông báo"}
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>

    </div>
  );
}