"use client";

import "./announcements.css";

import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Eye,
  FileText,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Announcement = {
  id: string;
  title: string;
  content: string;
  image: string;
  author: string;
  created_at: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("announcements")
        .select(
          "id, title, content, image, author, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      setAnnouncements(
        (data ?? []) as Announcement[]
      );
    } catch (error) {
      console.error(
        "[ANNOUNCEMENTS]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải thông báo."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;

    try {
      setRefreshing(true);

      const { data, error } = await supabase
        .from("announcements")
        .select(
          "id, title, content, image, author, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      setAnnouncements(
        (data ?? []) as Announcement[]
      );

      toast.success(
        "Đã cập nhật danh sách thông báo"
      );
    } catch (error) {
      console.error(
        "[ANNOUNCEMENTS_REFRESH]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể làm mới dữ liệu."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function deleteAnnouncement(
    id: string
  ) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa thông báo này?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAnnouncements((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );

    toast.success(
      "Đã xóa thông báo"
    );
  }

  const filteredAnnouncements =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      if (!keyword) {
        return announcements;
      }

      return announcements.filter(
        (item) => {
          const title =
            item.title
              ?.toLowerCase() ?? "";

          const author =
            item.author
              ?.toLowerCase() ?? "";

          const content =
            stripHtml(
              item.content ?? ""
            ).toLowerCase();

          return (
            title.includes(keyword) ||
            author.includes(keyword) ||
            content.includes(keyword)
          );
        }
      );
    }, [
      announcements,
      search,
    ]);

  const latest =
    announcements[0] ?? null;

  return (
    <main className="announcement-page">

      <div className="announcement-shell">

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="announcement-hero">

          <div className="announcement-hero-grid" />

          <div className="announcement-hero-circle announcement-hero-circle-one" />
          <div className="announcement-hero-circle announcement-hero-circle-two" />

          <div className="announcement-hero-content">

            <div className="announcement-hero-kicker">
              <Megaphone size={15} />
              TRUNG TÂM THÔNG BÁO
            </div>

            <h1>
              Quản lý thông báo
            </h1>

            <p>
              Quản lý tập trung các thông báo,
              nội dung truyền thông và thông tin
              hoạt động dành cho Chi đoàn D-K66.
            </p>

            {/* =================================================
                HERO BUTTONS
            ================================================= */}

            <div className="announcement-hero-buttons">

              <Link
                href="/dashboard/announcements/create"
                className="announcement-hero-button announcement-hero-create"
              >
                <span className="announcement-hero-button-icon">
                  <Plus
                    size={17}
                    strokeWidth={2.4}
                  />
                </span>

                <span className="announcement-hero-button-label">
                  Thêm thông báo
                </span>
              </Link>


              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="announcement-hero-button announcement-hero-refresh"
              >
                <span className="announcement-hero-button-icon">
                  <RefreshCw
                    size={16}
                    strokeWidth={2.2}
                    className={
                      refreshing
                        ? "is-spinning"
                        : ""
                    }
                  />
                </span>

                <span className="announcement-hero-button-label">
                  Làm mới
                </span>
              </button>


              <div className="announcement-hero-status">
                <span />
                {announcements.length} thông báo đang lưu trữ
              </div>

            </div>

          </div>


          {/* =================================================
              HERO STAT
          ================================================= */}

          <div className="announcement-hero-stat">

            <div className="announcement-hero-stat-label">
              TỔNG THÔNG BÁO
            </div>

            <strong>
              {announcements.length}
            </strong>

            <small>
              nội dung trong hệ thống
            </small>

            <div className="announcement-hero-stat-icon">
              <BellRing size={22} />
            </div>

          </div>

        </section>


        {/* =====================================================
            STATS
        ===================================================== */}

        <section className="announcement-stats">

          <div className="announcement-stat active">

            <div className="announcement-stat-icon red">
              <BellRing size={18} />
            </div>

            <div className="announcement-stat-content">

              <span>
                Tất cả
              </span>

              <div>
                <strong>
                  {announcements.length}
                </strong>

                <small>
                  thông báo
                </small>
              </div>

            </div>

          </div>


          <div className="announcement-stat">

            <div className="announcement-stat-icon green">
              <Megaphone size={18} />
            </div>

            <div className="announcement-stat-content">

              <span>
                Đã đăng
              </span>

              <div>
                <strong>
                  {announcements.length}
                </strong>

                <small>
                  bài viết
                </small>
              </div>

            </div>

          </div>


          <div className="announcement-stat">

            <div className="announcement-stat-icon amber">
              <CalendarDays size={18} />
            </div>

            <div className="announcement-stat-content">

              <span>
                Gần nhất
              </span>

              <div>
                <strong className="date">
                  {latest
                    ? formatDate(
                        latest.created_at
                      )
                    : "--/--"}
                </strong>

                <small>
                  cập nhật mới
                </small>
              </div>

            </div>

          </div>


          <div className="announcement-stat">

            <div className="announcement-stat-icon violet">
              <FileText size={18} />
            </div>

            <div className="announcement-stat-content">

              <span>
                Nội dung
              </span>

              <div>
                <strong>
                  {announcements.length}
                </strong>

                <small>
                  đang lưu trữ
                </small>
              </div>

            </div>

          </div>


          <div className="announcement-stat">

            <div className="announcement-stat-icon slate">
              <UserRound size={18} />
            </div>

            <div className="announcement-stat-content">

              <span>
                Hệ thống
              </span>

              <div>
                <strong className="live">
                  LIVE
                </strong>

                <small>
                  hoạt động
                </small>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            LIBRARY
        ===================================================== */}

        <section className="announcement-library">

          <header className="announcement-library-header">

            <div className="announcement-library-heading">

              <span className="announcement-library-kicker">
                ANNOUNCEMENT LIBRARY
              </span>

              <h2>
                Danh sách thông báo
              </h2>

              <p>
                {filteredAnnouncements.length} thông báo phù hợp
              </p>

            </div>


            <div className="announcement-library-tools">

              <div className="announcement-search">

                <Search size={17} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Tìm thông báo..."
                />

                {search && (
                  <button
                    type="button"
                    className="announcement-search-clear"
                    onClick={() =>
                      setSearch("")
                    }
                    aria-label="Xóa tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}

              </div>

            </div>

          </header>


          {/* =================================================
              LIST
          ================================================= */}

          <div className="announcement-list">

            {loading ? (
              <>
                <AnnouncementSkeleton />
                <AnnouncementSkeleton />
                <AnnouncementSkeleton />
              </>
            ) : filteredAnnouncements.length ===
              0 ? (

              <div className="announcement-empty">

                <div className="announcement-empty-icon">
                  <Megaphone size={27} />
                </div>

                <span>
                  ANNOUNCEMENT LIBRARY
                </span>

                <h3>
                  {search
                    ? "Không tìm thấy thông báo"
                    : "Chưa có thông báo nào"}
                </h3>

                <p>
                  {search
                    ? "Thử tìm kiếm bằng từ khóa khác."
                    : "Hãy tạo thông báo đầu tiên cho Chi đoàn."}
                </p>

                {!search && (
                  <Link
                    href="/dashboard/announcements/create"
                    className="announcement-empty-button"
                  >
                    <Plus size={16} />
                    Tạo thông báo
                  </Link>
                )}

              </div>

            ) : (

              filteredAnnouncements.map(
                (item, index) => {

                  const description =
                    stripHtml(
                      item.content ?? ""
                    );

                  return (
                    <article
                      key={item.id}
                      className="announcement-row"
                      style={{
                        animationDelay:
                          `${index * 65}ms`,
                      }}
                    >

                      {/* =================================================
                          IMAGE
                      ================================================= */}

                      <Link
                        href={`/announcement/${item.id}`}
                        className="announcement-thumb"
                        aria-label={
                          `Xem ${item.title}`
                        }
                      >

                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                          />
                        ) : (
                          <div className="announcement-thumb-empty">
                            <Megaphone size={27} />
                          </div>
                        )}

                        <span>
                          THÔNG BÁO
                        </span>

                      </Link>


                      {/* =================================================
                          CONTENT
                      ================================================= */}

                      <div className="announcement-row-main">

                        <div className="announcement-row-top">

                          <span className="announcement-status">
                            <i />
                            ĐÃ ĐĂNG
                          </span>

                          <span className="announcement-time">
                            {formatTime(
                              item.created_at
                            )}
                          </span>

                        </div>


                        <Link
                          href={`/announcement/${item.id}`}
                          className="announcement-row-title"
                        >
                          {item.title}
                        </Link>


                        <p className="announcement-row-description">

                          {description.length > 180
                            ? `${description.slice(
                                0,
                                180
                              )}...`
                            : description}

                        </p>


                        <div className="announcement-row-meta">

                          <span>
                            <UserRound size={13} />
                            {item.author ||
                              "BCH Chi đoàn"}
                          </span>

                          <b />

                          <span>
                            <CalendarDays size={13} />
                            {formatDate(
                              item.created_at
                            )}
                          </span>

                        </div>

                      </div>


                      {/* =================================================
                          ACTIONS
                      ================================================= */}

                      <div className="announcement-row-actions">

                        <Link
                          href={`/announcement/${item.id}`}
                          className="announcement-row-action announcement-row-action-view"
                          title="Xem thông báo"
                          aria-label="Xem thông báo"
                        >
                          <Eye
                            size={16}
                            strokeWidth={2}
                          />

                          <span>
                            Xem
                          </span>
                        </Link>


                        <Link
                          href={`/dashboard/announcements/edit/${item.id}`}
                          className="announcement-row-action announcement-row-action-edit"
                          title="Chỉnh sửa thông báo"
                          aria-label="Chỉnh sửa thông báo"
                        >
                          <Pencil
                            size={16}
                            strokeWidth={2}
                          />

                          <span>
                            Sửa
                          </span>
                        </Link>


                        <button
                          type="button"
                          onClick={() =>
                            deleteAnnouncement(
                              item.id
                            )
                          }
                          className="announcement-row-action announcement-row-action-delete"
                          title="Xóa thông báo"
                          aria-label="Xóa thông báo"
                        >
                          <Trash2
                            size={16}
                            strokeWidth={2}
                          />

                          <span>
                            Xóa
                          </span>
                        </button>

                      </div>


                      <ArrowRight
                        size={17}
                        className="announcement-row-arrow"
                      />

                    </article>
                  );
                }
              )

            )}

          </div>

        </section>


        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="announcement-footer">

          <span>
            CHI ĐOÀN D-K66
          </span>

          <div />

          <small>
            HỆ THỐNG QUẢN LÝ THÔNG BÁO
          </small>

          <div />

          <span>
            {announcements.length} NỘI DUNG
          </span>

        </footer>

      </div>


      {/* =====================================================
          STYLES
      ===================================================== */}



    </main>
  );
}


/* =========================================================
   SKELETON
========================================================= */

function AnnouncementSkeleton() {
  return (
    <div className="announcement-skeleton">

      <div className="skeleton-box skeleton-image" />

      <div className="skeleton-main">

        <div className="skeleton-box skeleton-tag" />

        <div className="skeleton-box skeleton-title" />

        <div className="skeleton-box skeleton-line" />

        <div className="skeleton-box skeleton-meta" />

      </div>

      <div className="skeleton-box skeleton-action" />

    </div>
  );
}