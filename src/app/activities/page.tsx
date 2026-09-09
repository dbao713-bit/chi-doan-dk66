"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type ActivityStatus =
  | "scheduled"
  | "ongoing"
  | "completed"
  | "cancelled";

type Activity = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  status: ActivityStatus;
  created_at: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const statusLabels: Record<ActivityStatus, string> = {
  scheduled: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

/* =========================================================
   PAGE
========================================================= */

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [filter, setFilter] = useState<
    "all" | "upcoming" | "completed"
  >("all");

  /* =======================================================
     LOAD ACTIVITIES
  ======================================================= */

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("activities")
      .select(
        `
          id,
          title,
          description,
          location,
          start_at,
          end_at,
          status,
          created_at
        `
      )
      .order("start_at", {
        ascending: true,
      });

    if (error) {
      console.error("LOAD ACTIVITIES ERROR:", error);

      setActivities([]);
      setErrorMessage(
        "Không thể tải lịch sinh hoạt. Vui lòng thử lại sau."
      );
      setLoading(false);
      return;
    }

    setActivities((data ?? []) as Activity[]);
    setLoading(false);
  }

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredActivities = useMemo(() => {
    const now = new Date();

    if (filter === "upcoming") {
      return activities.filter((activity) => {
        return (
          new Date(activity.start_at) >= now &&
          activity.status !== "cancelled"
        );
      });
    }

    if (filter === "completed") {
      return activities.filter(
        (activity) =>
          activity.status === "completed" ||
          new Date(activity.start_at) < now
      );
    }

    return activities;
  }, [activities, filter]);

  /* =======================================================
     HELPERS
  ======================================================= */

  function formatDay(value: string) {
    return new Date(value).getDate();
  }

  function formatMonth(value: string) {
    return new Date(value).toLocaleDateString("vi-VN", {
      month: "short",
    });
  }

  function formatWeekday(value: string) {
    return new Date(value).toLocaleDateString("vi-VN", {
      weekday: "long",
    });
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatTime(value: string) {
    return new Date(value).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTimeRange(activity: Activity) {
    const start = formatTime(activity.start_at);

    if (!activity.end_at) {
      return start;
    }

    return `${start} — ${formatTime(activity.end_at)}`;
  }

  /* =======================================================
     UPCOMING COUNT
  ======================================================= */

  const upcomingCount = activities.filter((activity) => {
    return (
      new Date(activity.start_at) >= new Date() &&
      activity.status !== "cancelled"
    );
  }).length;

  const completedCount = activities.filter(
    (activity) =>
      activity.status === "completed"
  ).length;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="activities-page">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="activities-header">
        <div className="activities-header-inner">
          <Link
            href="/"
            className="activities-back"
          >
            <ArrowLeft size={17} />
            <span>Trang chủ</span>
          </Link>

          <div className="activities-header-brand">
            <span>CHI ĐOÀN D-K66</span>
            <small>TRƯỜNG THPT HÀ TRUNG</small>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/portal"
              className="activities-admin"
            >
              CỔNG ĐOÀN VIÊN
            </Link>
            <Link
              href="/admin"
              className="activities-admin"
            >
              BCH / ADMIN
            </Link>
          </div>
        </div>
      </header>

      {/* ===================================================
          HERO
      =================================================== */}

      <section className="activities-hero">
        <div className="activities-hero-pattern">
          ✦
        </div>

        <div className="activities-hero-inner">
          <div className="activities-eyebrow">
            <CalendarDays size={16} />
            <span>LỊCH SINH HOẠT</span>
          </div>

          <h1>
            Hoạt động
            <span> Chi đoàn</span>
          </h1>

          <p>
            Theo dõi các buổi sinh hoạt, hoạt động
            phong trào và chương trình sắp tới của
            Chi đoàn D-K66.
          </p>

          <div className="activities-hero-line" />

          <div className="activities-stats">
            <div>
              <strong>{upcomingCount}</strong>
              <span>Sắp diễn ra</span>
            </div>

            <div>
              <strong>{completedCount}</strong>
              <span>Đã hoàn thành</span>
            </div>

            <div>
              <strong>{activities.length}</strong>
              <span>Tổng hoạt động</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <section className="activities-content">
        <div className="activities-container">
          {/* TITLE */}

          <div className="activities-section-heading">
            <div>
              <span className="activities-section-number">
                LỊCH
              </span>

              <h2>
                Các hoạt động
              </h2>

              <p>
                Những hoạt động được cập nhật từ
                Ban Chấp hành Chi đoàn.
              </p>
            </div>

            <Sparkles size={28} />
          </div>

          {/* FILTER */}

          <div className="activities-filter">
            <button
              type="button"
              className={
                filter === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("all")
              }
            >
              Tất cả
            </button>

            <button
              type="button"
              className={
                filter === "upcoming"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("upcoming")
              }
            >
              Sắp diễn ra
            </button>

            <button
              type="button"
              className={
                filter === "completed"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("completed")
              }
            >
              Đã hoàn thành
            </button>
          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (
            <div className="activities-loading">
              <div className="activities-loading-icon">
                <CalendarDays size={30} />
              </div>

              <strong>
                Đang tải lịch sinh hoạt...
              </strong>

              <span>
                Vui lòng chờ một chút.
              </span>
            </div>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {!loading && errorMessage && (
            <div className="activities-empty">
              <div className="activities-empty-icon">
                !
              </div>

              <strong>
                Có lỗi xảy ra
              </strong>

              <p>
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={loadActivities}
              >
                Thử lại
              </button>
            </div>
          )}

          {/* =================================================
              EMPTY
          ================================================= */}

          {!loading &&
            !errorMessage &&
            filteredActivities.length === 0 && (
              <div className="activities-empty">
                <div className="activities-empty-icon">
                  <CalendarDays size={32} />
                </div>

                <span>
                  LỊCH CHI ĐOÀN
                </span>

                <strong>
                  Chưa có hoạt động
                </strong>

                <p>
                  Hiện chưa có hoạt động nào
                  trong danh sách này.
                </p>

                {filter !== "all" && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilter("all")
                    }
                  >
                    Xem tất cả hoạt động
                  </button>
                )}
              </div>
            )}

          {/* =================================================
              LIST
          ================================================= */}

          {!loading &&
            !errorMessage &&
            filteredActivities.length > 0 && (
              <div className="activities-list">
                {filteredActivities.map(
                  (activity, index) => (
                    <article
                      key={activity.id}
                      className={`activity-public-card ${
                        activity.status ===
                        "cancelled"
                          ? "cancelled"
                          : ""
                      }`}
                    >
                      {/* NUMBER */}

                      <div className="activity-public-index">
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      {/* DATE */}

                      <div className="activity-public-date">
                        <span>
                          {formatMonth(
                            activity.start_at
                          )}
                        </span>

                        <strong>
                          {formatDay(
                            activity.start_at
                          )}
                        </strong>

                        <small>
                          {formatWeekday(
                            activity.start_at
                          )}
                        </small>
                      </div>

                      {/* MAIN */}

                      <div className="activity-public-main">
                        <div className="activity-public-top">
                          <span
                            className={`activity-public-status ${activity.status}`}
                          >
                            {
                              statusLabels[
                                activity.status
                              ]
                            }
                          </span>

                          <span className="activity-public-date-text">
                            {formatDate(
                              activity.start_at
                            )}
                          </span>
                        </div>

                        <h3>
                          {activity.title}
                        </h3>

                        {activity.description && (
                          <p>
                            {
                              activity.description
                            }
                          </p>
                        )}

                        <div className="activity-public-meta">
                          <span>
                            <Clock3
                              size={15}
                            />

                            {formatTimeRange(
                              activity
                            )}
                          </span>

                          {activity.location && (
                            <span>
                              <MapPin
                                size={15}
                              />

                              {
                                activity.location
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ARROW */}

                      <div className="activity-public-arrow">
                        <ArrowRight size={20} />
                      </div>
                    </article>
                  )
                )}
              </div>
            )}

          {/* =================================================
              FOOTER CTA
          ================================================= */}

          {!loading && (
            <div className="activities-bottom">
              <div>
                <span>
                  CHI ĐOÀN D-K66
                </span>

                <strong>
                  Đoàn kết · Trách nhiệm ·
                  Tiên phong · Sáng tạo
                </strong>
              </div>

              <Link
                href="/"
                className="activities-home-button"
              >
                Về trang chủ
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="activities-footer">
        <div>
          <strong>
            CHI ĐOÀN D-K66
          </strong>

          <span>
            TRƯỜNG THPT HÀ TRUNG
          </span>
        </div>

        <p>
          © 2025 — 2028 · BCH Chi đoàn D-K66
        </p>

        <Link href="/">
          ↑
        </Link>
      </footer>
    </main>
  );
}