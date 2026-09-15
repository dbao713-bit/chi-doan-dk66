"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  KeyRound,
  Megaphone,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Announcement = {
  id: string;
  title: string;
  author: string;
  created_at: string;
};

type ActivityItem = {
  id: string;
  title: string;
  location: string | null;
  start_at: string;
  end_at: string | null;
  status:
    | "scheduled"
    | "ongoing"
    | "completed"
    | "cancelled";
};

type FeedbackItem = {
  id: string;
  subject: string;
  status:
    | "new"
    | "processing"
    | "resolved"
    | "archived";
  created_at: string;
};

type MemberItem = {
  id: number;
  full_name: string;
  class_name: string;
  avatar: string | null;
  total_score: number | null;
  rating: string | null;
};

type DashboardStats = {
  members: number;
  maleMembers: number;
  femaleMembers: number;
  upcomingActivities: number;
  registered: number;
  attendancePresent: number;
  attendanceTotal: number;
  feedbackNew: number;
  feedbackProcessing: number;
  memberAccounts: number;
};

const ACTIVITY_STATUS_LABELS: Record<
  ActivityItem["status"],
  string
> = {
  scheduled: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

const FEEDBACK_STATUS_LABELS: Record<
  FeedbackItem["status"],
  string
> = {
  new: "Mới",
  processing: "Đang xử lý",
  resolved: "Đã xử lý",
  archived: "Đã lưu",
};

const EMPTY_STATS: DashboardStats = {
  members: 0,
  maleMembers: 0,
  femaleMembers: 0,
  upcomingActivities: 0,
  registered: 0,
  attendancePresent: 0,
  attendanceTotal: 0,
  feedbackNew: 0,
  feedbackProcessing: 0,
  memberAccounts: 0,
};

export default function Dashboard() {
  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  const [activities, setActivities] = useState<
    ActivityItem[]
  >([]);

  const [feedbackItems, setFeedbackItems] = useState<
    FeedbackItem[]
  >([]);

  const [topMembers, setTopMembers] = useState<
    MemberItem[]
  >([]);

  const [stats, setStats] =
    useState<DashboardStats>(EMPTY_STATS);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState<string | null>(
    null
  );

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const loadDashboard = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const now =
          new Date().toISOString();

        const [
          announcementsResult,
          membersCountResult,
          maleMembersResult,
          femaleMembersResult,
          upcomingActivitiesResult,
          registrationsResult,
          attendanceResult,
          feedbackNewResult,
          feedbackProcessingResult,
          memberAccountsResult,
          activitiesResult,
          feedbackResult,
          topMembersResult,
        ] = await Promise.all([
          supabase
            .from("announcements")
            .select(
              "id,title,author,created_at"
            )
            .order("created_at", {
              ascending: false,
            })
            .limit(5),

          supabase
            .from("members")
            .select("id", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("members")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("gender", "Nam"),

          supabase
            .from("members")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("gender", "Nữ"),

          supabase
            .from("activities")
            .select("id", {
              count: "exact",
              head: true,
            })
            .gte("start_at", now)
            .neq("status", "cancelled"),

          supabase
            .from("activity_registrations")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("status", "registered"),

          supabase
            .from("activity_attendance")
            .select("id,present"),

          supabase
            .from("feedback")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("status", "new"),

          supabase
            .from("feedback")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("status", "processing"),

          supabase
            .from("member_accounts")
            .select("id", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("activities")
            .select(
              "id,title,location,start_at,end_at,status"
            )
            .neq("status", "cancelled")
            .order("start_at", {
              ascending: true,
            })
            .limit(6),

          supabase
            .from("feedback")
            .select(
              "id,subject,status,created_at"
            )
            .in("status", [
              "new",
              "processing",
            ])
            .order("created_at", {
              ascending: false,
            })
            .limit(5),

          supabase
            .from("members")
            .select(
              "id,full_name,class_name,avatar,total_score,rating"
            )
            .order("total_score", {
              ascending: false,
              nullsFirst: false,
            })
            .limit(5),
        ]);

        if (announcementsResult.error) {
          console.error(
            "[DASHBOARD announcements]",
            announcementsResult.error
          );
        }

        if (activitiesResult.error) {
          console.error(
            "[DASHBOARD activities]",
            activitiesResult.error
          );
        }

        if (feedbackResult.error) {
          console.error(
            "[DASHBOARD feedback]",
            feedbackResult.error
          );
        }

        if (topMembersResult.error) {
          console.error(
            "[DASHBOARD top members]",
            topMembersResult.error
          );
        }

        const attendanceRows =
          attendanceResult.data ?? [];

        const attendancePresent =
          attendanceRows.filter(
            (item) => item.present === true
          ).length;

        const attendanceTotal =
          attendanceRows.length;

        const partialErrors = [
          announcementsResult.error,
          membersCountResult.error,
          maleMembersResult.error,
          femaleMembersResult.error,
          upcomingActivitiesResult.error,
          registrationsResult.error,
          attendanceResult.error,
          feedbackNewResult.error,
          feedbackProcessingResult.error,
          memberAccountsResult.error,
          activitiesResult.error,
          feedbackResult.error,
          topMembersResult.error,
        ].filter(Boolean);

        setAnnouncements(
          (announcementsResult.data ??
            []) as Announcement[]
        );

        setActivities(
          (activitiesResult.data ??
            []) as ActivityItem[]
        );

        setFeedbackItems(
          (feedbackResult.data ??
            []) as FeedbackItem[]
        );

        setTopMembers(
          (topMembersResult.data ??
            []) as MemberItem[]
        );

        setStats({
          members:
            membersCountResult.count ?? 0,

          maleMembers:
            maleMembersResult.count ?? 0,

          femaleMembers:
            femaleMembersResult.count ?? 0,

          upcomingActivities:
            upcomingActivitiesResult.count ?? 0,

          registered:
            registrationsResult.count ?? 0,

          attendancePresent,

          attendanceTotal,

          feedbackNew:
            feedbackNewResult.count ?? 0,

          feedbackProcessing:
            feedbackProcessingResult.count ?? 0,

          memberAccounts:
            memberAccountsResult.count ?? 0,
        });

        setLastUpdated(new Date());

        if (
          partialErrors.length > 0 &&
          !announcementsResult.data
        ) {
          setError(
            "Một số dữ liệu Dashboard chưa thể tải. Hệ thống vẫn hiển thị các phần còn khả dụng."
          );
        }
      } catch (err) {
        console.error(
          "[DASHBOARD]",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu Dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadDashboard();

    const timer =
      window.setInterval(() => {
        void loadDashboard(true);
      }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadDashboard]);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(new Date(date));
  }

  function formatDateTime(date: string) {
    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(date));
  }

  function formatTime(date: string) {
    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(date));
  }

  function formatLastUpdated(date: Date) {
    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    ).format(date);
  }

  const attendanceRate =
    useMemo(() => {
      if (!stats.attendanceTotal) {
        return 0;
      }

      return Math.round(
        (stats.attendancePresent /
          stats.attendanceTotal) *
          100
      );
    }, [
      stats.attendancePresent,
      stats.attendanceTotal,
    ]);

  const unresolvedFeedback =
    stats.feedbackNew +
    stats.feedbackProcessing;

  const registrationIntensity =
    stats.members > 0
      ? Math.min(
          100,
          Math.round(
            (stats.registered /
              stats.members) *
              10
          )
        )
      : 0;

  return (
    <section className="dashboard-page">
      <div className="dashboard-orb dashboard-orb-one" />
      <div className="dashboard-orb dashboard-orb-two" />

      <div className="dashboard-content">

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="dashboard-hero">

          <div className="dashboard-hero-glow" />

          <div className="dashboard-hero-top-time">
            <Clock3 size={15} />

            <span>
              {lastUpdated
                ? `Cập nhật ${formatLastUpdated(
                    lastUpdated
                  )}`
                : "Đang khởi tạo dữ liệu"}
            </span>
          </div>

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
              Không gian quản lý tập trung dành cho Ban
              Chấp hành Chi đoàn D-K66.
            </p>

            <div className="dashboard-hero-actions">

              <Link
                href="/dashboard/members/new"
                className="dashboard-primary-button"
              >
                <Plus size={19} />

                <span>
                  Thêm đoàn viên
                </span>

                <ArrowRight size={17} />
              </Link>

              <Link
                href="/dashboard/announcements/create"
                className="dashboard-secondary-button"
              >
                <Megaphone size={18} />

                <span>
                  Tạo thông báo
                </span>
              </Link>

            </div>

          </div>

          <div className="dashboard-hero-side">

            <div className="dashboard-hero-icon">
              <Activity size={34} />
            </div>

            <p>
              QUẢN LÝ CHI ĐOÀN
            </p>

            <strong>
              D-K66
            </strong>

            <span>
              Trường THPT Hà Trung
            </span>

          </div>

        </section>


        {/* =====================================================
            KPI
        ===================================================== */}

        <section className="dashboard-kpi-grid">

          <DashboardKpi
            icon={<Users size={22} />}
            label="Đoàn viên"
            value={stats.members}
            detail={`${stats.maleMembers} nam · ${stats.femaleMembers} nữ`}
            tone="blue"
          />

          <DashboardKpi
            icon={<CalendarDays size={22} />}
            label="Hoạt động sắp tới"
            value={stats.upcomingActivities}
            detail="Đang mở trong hệ thống"
            tone="green"
          />

          <DashboardKpi
            icon={<UserCheck size={22} />}
            label="Lượt đăng ký"
            value={stats.registered}
            detail="Đăng ký hoạt động hiện tại"
            tone="purple"
          />

          <DashboardKpi
            icon={<CheckCircle2 size={22} />}
            label="Tỷ lệ điểm danh"
            value={`${attendanceRate}%`}
            detail={`${stats.attendancePresent}/${stats.attendanceTotal} lượt ghi nhận`}
            tone="orange"
          />

          <DashboardKpi
            icon={<MessageSquare size={22} />}
            label="Phản hồi cần xử lý"
            value={unresolvedFeedback}
            detail={`${stats.feedbackNew} mới · ${stats.feedbackProcessing} đang xử lý`}
            tone="red"
          />

          <DashboardKpi
            icon={<KeyRound size={22} />}
            label="Tài khoản đoàn viên"
            value={stats.memberAccounts}
            detail={
              stats.members > 0
                ? `${Math.min(
                    100,
                    Math.round(
                      (stats.memberAccounts /
                        stats.members) *
                        100
                    )
                  )}% hồ sơ đã có tài khoản`
                : "Chưa có dữ liệu"
            }
            tone="teal"
          />

        </section>


        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="dashboard-error">

            <Bell size={20} />

            <div>

              <strong>
                Dữ liệu Dashboard chưa hoàn chỉnh
              </strong>

              <p>
                {error}
              </p>

            </div>

          </div>
        )}


        {/* =====================================================
            QUICK ACCESS
        ===================================================== */}

        <section className="dashboard-section">

          <div className="dashboard-section-heading">

            <div>

              <span>
                ĐIỀU HÀNH
              </span>

              <h2>
                Phân hệ quản lý
              </h2>

            </div>

            <p>
              Mở nhanh các khu vực BCH sử dụng thường xuyên.
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
              description="Hoạt động, đăng ký và điểm danh"
              className="dashboard-module-green"
            />

            <DashboardModule
              href="/dashboard/accounts"
              icon={<KeyRound />}
              number="05"
              title="Tài khoản"
              description="Cấp tài khoản và quản lý truy cập"
              className="dashboard-module-blue"
            />

            <DashboardModule
              href="/dashboard/feedback"
              icon={<MessageSquare />}
              number="06"
              title="Phản ánh & góp ý"
              description="Tiếp nhận, xử lý và phản hồi"
              className="dashboard-module-orange"
            />

          </div>

        </section>


        {/* =====================================================
            OPERATION + SYSTEM HEALTH
        ===================================================== */}

        <section className="dashboard-command-grid">

          <div className="dashboard-panel dashboard-operation-panel">

            <div className="dashboard-panel-heading">

              <div className="dashboard-panel-title">

                <div className="dashboard-panel-icon">
                  <Activity size={19} />
                </div>

                <div>

                  <span>
                    OPERATION
                  </span>

                  <h2>
                    Tình hình vận hành
                  </h2>

                </div>

              </div>

              <TrendingUp size={18} />

            </div>


            <div className="dashboard-operation-list">

              <OperationMetric
                title="Hoạt động sắp tới"
                value={`${stats.upcomingActivities}`}
                label="hoạt động"
                percent={Math.min(
                  100,
                  stats.upcomingActivities * 10
                )}
                tone="green"
              />

              <OperationMetric
                title="Mức độ đăng ký"
                value={`${stats.registered}`}
                label="lượt đăng ký"
                percent={registrationIntensity}
                tone="purple"
              />

              <OperationMetric
                title="Điểm danh"
                value={`${attendanceRate}%`}
                label="tỷ lệ có mặt"
                percent={attendanceRate}
                tone="blue"
              />

              <OperationMetric
                title="Phản hồi cần xử lý"
                value={`${unresolvedFeedback}`}
                label="yêu cầu"
                percent={Math.min(
                  100,
                  unresolvedFeedback * 20
                )}
                tone="orange"
              />

            </div>

          </div>


          <div className="dashboard-panel dashboard-system">

            <div className="dashboard-panel-heading">

              <div className="dashboard-panel-title">

                <div className="dashboard-panel-icon">
                  <ShieldCheck size={19} />
                </div>

                <div>

                  <span>
                    SYSTEM HEALTH
                  </span>

                  <h2>
                    Trạng thái hệ thống
                  </h2>

                </div>

              </div>

            </div>


            <div className="dashboard-health-banner">

              <div className="dashboard-health-check">
                <CheckCircle2 size={23} />
              </div>

              <div>

                <strong>
                  Các phân hệ cốt lõi đang sẵn sàng
                </strong>

                <span>
                  Dữ liệu được đồng bộ từ hệ thống quản trị.
                </span>

              </div>

              <span className="system-online">
                ONLINE
              </span>

            </div>


            <div className="dashboard-system-items">

              <SystemItem
                icon={<Users size={17} />}
                title="Quản lý đoàn viên"
                description={`${stats.members} hồ sơ`}
              />

              <SystemItem
                icon={<CalendarDays size={17} />}
                title="Hoạt động"
                description={`${stats.upcomingActivities} hoạt động sắp tới`}
              />

              <SystemItem
                icon={<MessageSquare size={17} />}
                title="Phản ánh"
                description={`${unresolvedFeedback} yêu cầu cần xử lý`}
              />

              <SystemItem
                icon={<KeyRound size={17} />}
                title="Tài khoản"
                description={`${stats.memberAccounts} tài khoản đoàn viên`}
              />

            </div>

          </div>

        </section>


        {/* =====================================================
            UPCOMING ACTIVITIES
        ===================================================== */}

        <section className="dashboard-panel dashboard-full-panel">

          <div className="dashboard-panel-heading">

            <div className="dashboard-panel-title">

              <div className="dashboard-panel-icon">
                <CalendarDays size={19} />
              </div>

              <div>

                <span>
                  ACTIVITY CENTER
                </span>

                <h2>
                  Hoạt động sắp tới
                </h2>

              </div>

            </div>


            <Link
              href="/dashboard/activities"
              className="dashboard-view-all"
            >
              Quản lý hoạt động
              <ArrowRight size={16} />
            </Link>

          </div>


          {loading ? (
            <DashboardListSkeleton />
          ) : activities.length === 0 ? (

            <div className="dashboard-empty">

              <CalendarDays size={31} />

              <strong>
                Chưa có hoạt động sắp tới
              </strong>

              <p>
                Khi BCH tạo hoạt động mới,
                dữ liệu sẽ xuất hiện tại đây.
              </p>

            </div>

          ) : (

            <div className="dashboard-activity-grid">

              {activities.map(
                (activity) => (

                  <Link
                    href="/dashboard/activities"
                    key={activity.id}
                    className="dashboard-activity-card"
                  >

                    <div className="dashboard-activity-date">

                      <span>
                        {new Date(
                          activity.start_at
                        ).getDate()}
                      </span>

                      <small>
                        {new Intl.DateTimeFormat(
                          "vi-VN",
                          {
                            month: "short",
                          }
                        ).format(
                          new Date(
                            activity.start_at
                          )
                        )}
                      </small>

                    </div>


                    <div className="dashboard-activity-main">

                      <div className="dashboard-activity-top">

                        <span
                          className={`dashboard-activity-status ${activity.status}`}
                        >
                          {
                            ACTIVITY_STATUS_LABELS[
                              activity.status
                            ]
                          }
                        </span>

                        <Clock3 size={14} />

                        <span>
                          {formatTime(
                            activity.start_at
                          )}
                        </span>

                      </div>


                      <h3>
                        {activity.title}
                      </h3>

                      <p>
                        {activity.location ||
                          "Địa điểm chưa cập nhật"}
                      </p>

                    </div>


                    <ArrowRight size={18} />

                  </Link>

                )
              )}

            </div>

          )}

        </section>


        {/* =====================================================
            FEEDBACK + TOP MEMBERS
        ===================================================== */}

        <section className="dashboard-two-panel-grid">

          <div className="dashboard-panel">

            <div className="dashboard-panel-heading">

              <div className="dashboard-panel-title">

                <div className="dashboard-panel-icon">
                  <MessageSquare size={19} />
                </div>

                <div>

                  <span>
                    FEEDBACK CENTER
                  </span>

                  <h2>
                    Phản ánh cần xử lý
                  </h2>

                </div>

              </div>


              <Link
                href="/dashboard/feedback"
                className="dashboard-view-all"
              >
                Xem tất cả
                <ArrowRight size={16} />
              </Link>

            </div>


            {loading ? (
              <DashboardListSkeleton compact />
            ) : feedbackItems.length === 0 ? (

              <div className="dashboard-empty compact">

                <CheckCircle2 size={28} />

                <strong>
                  Không có phản ánh cần xử lý
                </strong>

                <p>
                  Hiện chưa có yêu cầu mới hoặc đang xử lý.
                </p>

              </div>

            ) : (

              <div className="dashboard-feedback-list">

                {feedbackItems.map(
                  (item) => (

                    <Link
                      href="/dashboard/feedback"
                      key={item.id}
                      className="dashboard-feedback-item"
                    >

                      <div className="dashboard-feedback-icon">
                        <MessageSquare size={16} />
                      </div>


                      <div>

                        <strong>
                          {item.subject}
                        </strong>

                        <span>
                          {formatDateTime(
                            item.created_at
                          )}
                        </span>

                      </div>


                      <span
                        className={`dashboard-feedback-status ${item.status}`}
                      >
                        {
                          FEEDBACK_STATUS_LABELS[
                            item.status
                          ]
                        }
                      </span>

                    </Link>

                  )
                )}

              </div>

            )}

          </div>


          <div className="dashboard-panel">

            <div className="dashboard-panel-heading">

              <div className="dashboard-panel-title">

                <div className="dashboard-panel-icon">
                  <TrendingUp size={19} />
                </div>

                <div>

                  <span>
                    MEMBER PERFORMANCE
                  </span>

                  <h2>
                    Đoàn viên nổi bật
                  </h2>

                </div>

              </div>


              <Link
                href="/dashboard/members"
                className="dashboard-view-all"
              >
                Xem danh sách
                <ArrowRight size={16} />
              </Link>

            </div>


            {loading ? (
              <DashboardListSkeleton compact />
            ) : topMembers.length === 0 ? (

              <div className="dashboard-empty compact">

                <Users size={28} />

                <strong>
                  Chưa có dữ liệu xếp hạng
                </strong>

                <p>
                  Cập nhật điểm rèn luyện để hiển thị.
                </p>

              </div>

            ) : (

              <div className="dashboard-ranking-list">

                {topMembers.map(
                  (
                    member,
                    index
                  ) => (

                    <Link
                      href={`/dashboard/members/edit/${member.id}`}
                      key={member.id}
                      className="dashboard-ranking-item"
                    >

                      <div
                        className={`dashboard-ranking-number rank-${index + 1}`}
                      >
                        {index + 1}
                      </div>


                      <div className="dashboard-ranking-avatar">

                        {member.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.avatar}
                            alt={member.full_name}
                          />
                        ) : (
                          getInitials(
                            member.full_name
                          )
                        )}

                      </div>


                      <div className="dashboard-ranking-main">

                        <strong>
                          {member.full_name}
                        </strong>

                        <span>
                          {member.class_name ||
                            "D-K66"}
                        </span>

                      </div>


                      <div className="dashboard-ranking-score">

                        <strong>
                          {member.total_score ?? 0}
                        </strong>

                        <span>
                          {member.rating ||
                            "Đang đánh giá"}
                        </span>

                      </div>

                    </Link>

                  )
                )}

              </div>

            )}

          </div>

        </section>


        {/* =====================================================
            ANNOUNCEMENTS
        ===================================================== */}

        <section className="dashboard-panel dashboard-full-panel">

          <div className="dashboard-panel-heading">

            <div className="dashboard-panel-title">

              <div className="dashboard-panel-icon">
                <Megaphone size={19} />
              </div>

              <div>

                <span>
                  COMMUNICATION
                </span>

                <h2>
                  Thông báo mới nhất
                </h2>

              </div>

            </div>


            <div className="dashboard-heading-actions">

              <Link
                href="/dashboard/announcements/create"
                className="dashboard-heading-create"
              >
                <Plus size={16} />
                Tạo thông báo
              </Link>

              <Link
                href="/dashboard/announcements"
                className="dashboard-view-all"
              >
                Xem tất cả
                <ArrowRight size={16} />
              </Link>

            </div>

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

                <strong>
                  Chưa có thông báo nào
                </strong>

                <p>
                  Hãy tạo thông báo đầu tiên cho Chi đoàn.
                </p>

              </div>

            ) : (

              announcements.map(
                (
                  announcement,
                  index
                ) => (

                  <Link
                    key={announcement.id}
                    href={`/announcement/${announcement.id}`}
                    className="dashboard-announcement"
                  >

                    <div className="dashboard-announcement-number">
                      {String(
                        index + 1
                      ).padStart(2, "0")}
                    </div>


                    <div className="dashboard-announcement-main">

                      <h3>
                        {announcement.title}
                      </h3>

                      <div className="dashboard-announcement-meta">

                        <span>
                          {announcement.author ||
                            "BCH Chi đoàn"}
                        </span>

                        <span className="dashboard-meta-dot" />

                        <span>
                          {formatDate(
                            announcement.created_at
                          )}
                        </span>

                      </div>

                    </div>


                    <ArrowRight
                      size={18}
                      className="dashboard-announcement-arrow"
                    />

                  </Link>

                )
              )

            )}

          </div>

        </section>


        {/* =====================================================
            FOOTER
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
   KPI
========================================================= */

function DashboardKpi({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone:
    | "blue"
    | "green"
    | "purple"
    | "orange"
    | "red"
    | "teal";
}) {
  return (
    <article
      className={`dashboard-kpi-card dashboard-kpi-${tone}`}
    >

      <div className="dashboard-kpi-top">

        <div className="dashboard-kpi-icon">
          {icon}
        </div>

        <span className="dashboard-kpi-live">
          LIVE
        </span>

      </div>


      <div className="dashboard-kpi-value">
        {value}
      </div>

      <strong>
        {label}
      </strong>

      <span>
        {detail}
      </span>

    </article>
  );
}


/* =========================================================
   OPERATION METRIC
========================================================= */

function OperationMetric({
  title,
  value,
  label,
  percent,
  tone,
}: {
  title: string;
  value: string;
  label: string;
  percent: number;
  tone:
    | "blue"
    | "green"
    | "purple"
    | "orange";
}) {
  return (
    <div className="dashboard-operation-item">

      <div className="dashboard-operation-top">

        <div>

          <strong>
            {title}
          </strong>

          <span>
            {value} {label}
          </span>

        </div>

        <b>
          {percent}%
        </b>

      </div>


      <div className="dashboard-operation-track">

        <div
          className={`dashboard-operation-fill ${tone}`}
          style={{
            width: `${percent}%`,
          }}
        />

      </div>

    </div>
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
}: {
  href: string;
  icon: ReactNode;
  number: string;
  title: string;
  description: string;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={`dashboard-module ${className}`}
    >

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
        <ArrowRight size={18} />
      </div>

    </Link>
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
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="dashboard-system-item">

      <div className="dashboard-system-item-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>

      <CheckCircle2
        size={17}
        className="dashboard-system-item-check"
      />

    </div>
  );
}


/* =========================================================
   LIST SKELETON
========================================================= */

function DashboardListSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={`dashboard-list-skeleton ${
        compact ? "compact" : ""
      }`}
    >
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}


/* =========================================================
   ANNOUNCEMENT SKELETON
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


/* =========================================================
   INITIALS
========================================================= */

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(
      (part) =>
        part[0] ?? ""
    )
    .join("")
    .toUpperCase();
}