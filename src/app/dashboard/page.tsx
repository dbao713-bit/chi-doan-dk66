"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  Image,
  Megaphone,
  Plus,
  Users,
  Activity,
  Clock3,
  KeyRound,
  MessageSquare,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Announcement = {
  id: string;
  title: string;
  author: string;
  created_at: string;
};

export default function Dashboard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("announcements")
          .select("id, title, author, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) {
          throw new Error(error.message);
        }

        setAnnouncements(data ?? []);
      } catch (err) {
        console.error("[DASHBOARD]", err);

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  }

  function formatTime(date: string) {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  return (
    <section className="dashboard-page">

      {/* BACKGROUND DECORATION */}
      <div className="dashboard-orb dashboard-orb-one" />
      <div className="dashboard-orb dashboard-orb-two" />

      <div className="dashboard-content">

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="dashboard-hero">

          <div className="dashboard-hero-glow" />

          <div className="dashboard-hero-content">

            <div className="dashboard-status">
              <span className="dashboard-status-dot" />
              HỆ THỐNG ĐANG HOẠT ĐỘNG
            </div>

            <p className="dashboard-eyebrow">
              CHI ĐOÀN D-K66
            </p>

            <h1>
              Trung tâm
              <span> điều hành</span>
            </h1>

            <p className="dashboard-hero-description">
              Không gian quản lý tập trung dành cho Ban Chấp hành
              Chi đoàn D-K66.
            </p>

            <div className="dashboard-hero-actions">

              <Link
                href="/dashboard/members/new"
                className="dashboard-primary-button"
              >
                <Plus size={19} />
                Thêm đoàn viên
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/dashboard/announcements/create"
                className="dashboard-secondary-button"
              >
                <Megaphone size={18} />
                Tạo thông báo
              </Link>

            </div>

          </div>

          <div className="dashboard-hero-side">

            <div className="dashboard-hero-icon">
              <Activity size={34} />
            </div>

            <p>QUẢN LÝ CHI ĐOÀN</p>

            <strong>D-K66</strong>

            <span>
              Trường THPT Hà Trung
            </span>

          </div>

        </section>


        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="dashboard-error">
            <Bell size={20} />

            <div>
              <strong>Không thể tải thông báo</strong>
              <p>{error}</p>
            </div>
          </div>
        )}


        {/* =====================================================
            QUICK ACCESS
        ===================================================== */}

        <section className="dashboard-section">

          <div className="dashboard-section-heading">

            <div>
              <span>QUẢN LÝ</span>

              <h2>
                Truy cập nhanh
              </h2>
            </div>

            <p>
              Các phân hệ chính của hệ thống
            </p>

          </div>


          <div className="dashboard-module-grid">

            <DashboardModule
              href="/dashboard/members"
              icon={<Users />}
              number="01"
              title="Đoàn viên"
              description="Danh sách, hồ sơ và đánh giá đoàn viên"
              className="dashboard-module-blue"
            />

            <DashboardModule
              href="/dashboard/announcements"
              icon={<Megaphone />}
              number="02"
              title="Thông báo"
              description="Đăng tải và quản lý thông báo Chi đoàn"
              className="dashboard-module-orange"
            />

            <DashboardModule
              href="/documents"
              icon={<FileText />}
              number="03"
              title="Tài liệu"
              description="Kho văn bản và tài liệu điện tử"
              className="dashboard-module-purple"
            />

            <DashboardModule
              href="/dashboard/activities"
              icon={<CalendarDays />}
              number="04"
              title="Sinh hoạt"
              description="Tổ chức hoạt động, đăng ký và điểm danh"
              className="dashboard-module-green"
            />

            <DashboardModule
              href="/dashboard/accounts"
              icon={<KeyRound />}
              number="05"
              title="Tài khoản đoàn viên"
              description="Cấp tài khoản và quản lý truy cập"
              className="dashboard-module-blue"
            />

            <DashboardModule
              href="/dashboard/feedback"
              icon={<MessageSquare />}
              number="06"
              title="Phản ánh & góp ý"
              description="Tiếp nhận, xử lý và lưu trữ phản ánh"
              className="dashboard-module-orange"
            />

          </div>

        </section>


        {/* =====================================================
            LOWER CONTENT
        ===================================================== */}

        <section className="dashboard-lower-grid">

          {/* ANNOUNCEMENTS */}

          <div className="dashboard-panel dashboard-announcements">

            <div className="dashboard-panel-heading">

              <div className="dashboard-panel-title">

                <div className="dashboard-panel-icon">
                  <Megaphone size={19} />
                </div>

                <div>
                  <span>COMMUNICATION</span>

                  <h2>
                    Thông báo mới nhất
                  </h2>
                </div>

              </div>

              <Link
                href="/dashboard/announcements"
                className="dashboard-view-all"
              >
                Xem tất cả
                <ArrowRight size={16} />
              </Link>

            </div>


            <div className="dashboard-announcement-list">

              {loading ? (
                <>
                  <AnnouncementSkeleton />
                  <AnnouncementSkeleton />
                  <AnnouncementSkeleton />
                </>
              ) : announcements.length === 0 ? (
                <div className="dashboard-empty">
                  <Bell size={30} />
                  <p>Chưa có thông báo nào.</p>
                </div>
              ) : (
                announcements.map((announcement, index) => (
                  <Link
                    key={announcement.id}
                    href={`/announcement/${announcement.id}`}
                    className="dashboard-announcement"
                  >

                    <div className="dashboard-announcement-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="dashboard-announcement-main">

                      <h3>
                        {announcement.title}
                      </h3>

                      <div className="dashboard-announcement-meta">

                        <span>
                          {announcement.author || "BCH Chi đoàn"}
                        </span>

                        <span className="dashboard-meta-dot" />

                        <span>
                          {formatDate(announcement.created_at)}
                        </span>

                      </div>

                    </div>

                    <ArrowRight
                      size={18}
                      className="dashboard-announcement-arrow"
                    />

                  </Link>
                ))
              )}

            </div>

          </div>


          {/* SYSTEM PANEL */}

          <div className="dashboard-panel dashboard-system">

            <div className="dashboard-panel-heading">

              <div className="dashboard-panel-title">

                <div className="dashboard-panel-icon">
                  <CheckCircle2 size={19} />
                </div>

                <div>
                  <span>SYSTEM</span>

                  <h2>
                    Trạng thái hệ thống
                  </h2>
                </div>

              </div>

            </div>


            <div className="dashboard-system-status">

              <div className="system-status-main">

                <div className="system-status-check">
                  <CheckCircle2 size={22} />
                </div>

                <div>
                  <strong>
                    Hệ thống hoạt động
                  </strong>

                  <span>
                    Các chức năng chính sẵn sàng
                  </span>
                </div>

              </div>

              <span className="system-online">
                ONLINE
              </span>

            </div>


            <div className="dashboard-system-items">

              <SystemItem
                icon={<Users size={18} />}
                title="Quản lý đoàn viên"
                description="Hồ sơ và danh sách"
              />

              <SystemItem
                icon={<Megaphone size={18} />}
                title="Thông báo"
                description="Đăng tải và cập nhật"
              />

              <SystemItem
                icon={<FileText size={18} />}
                title="Tài liệu"
                description="Kho văn bản điện tử"
              />

              <SystemItem
                icon={<Image size={18} />}
                title="Thư viện"
                description="Hình ảnh hoạt động"
              />

            </div>


            <div className="dashboard-system-footer">

              <Clock3 size={16} />

              <span>
                Cập nhật hệ thống theo thời gian thực
              </span>

            </div>

          </div>

        </section>


        {/* =====================================================
            FOOTER MESSAGE
        ===================================================== */}

        <section className="dashboard-bottom-message">

          <div className="dashboard-bottom-symbol">
            ✦
          </div>

          <div>
            <strong>
              ĐOÀN KẾT · TRÁCH NHIỆM · TIÊN PHONG · SÁNG TẠO
            </strong>

            <span>
              Chi đoàn D-K66 · Trường THPT Hà Trung
            </span>
          </div>

        </section>

      </div>

    </section>
  );
}


/* =========================================================
   MODULE
========================================================= */

function DashboardModule({
  href,
  icon,
  number,
  title,
  description,
  className,
  disabled = false,
}: {
  href: string;
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
  className: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div
        className={`dashboard-module dashboard-module-disabled ${className}`}
      >
        <ModuleContent
          icon={icon}
          number={number}
          title={title}
          description={description}
          disabled
        />
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`dashboard-module ${className}`}
    >
      <ModuleContent
        icon={icon}
        number={number}
        title={title}
        description={description}
      />
    </Link>
  );
}


function ModuleContent({
  icon,
  number,
  title,
  description,
  disabled = false,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="dashboard-module-top">

        <div className="dashboard-module-icon">
          {icon}
        </div>

        <span>
          {number}
        </span>

      </div>

      <div className="dashboard-module-body">

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>

      <div className="dashboard-module-arrow">
        {disabled ? "Sắp ra mắt" : <ArrowRight size={18} />}
      </div>
    </>
  );
}


/* =========================================================
   SYSTEM ITEM
========================================================= */

function SystemItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="dashboard-system-item">

      <div className="dashboard-system-item-icon">
        {icon}
      </div>

      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <CheckCircle2
        size={17}
        className="dashboard-system-item-check"
      />

    </div>
  );
}


/* =========================================================
   SKELETON
========================================================= */

function AnnouncementSkeleton() {
  return (
    <div className="dashboard-announcement-skeleton">
      <div />
      <div className="skeleton-content">
        <span />
        <small />
      </div>
    </div>
  );
}