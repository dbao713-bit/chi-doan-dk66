"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity as ActivityIcon,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  X,
  XCircle,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Member = {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
  gender: string | null;
  birth_year: number | null;
  avatar: string | null;
  total_score: number | null;
  rating: string | null;
};

type Activity = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  status: string;
};

type Registration = {
  id: string;
  activity_id: string;
  status: "registered" | "cancelled";
  registered_at: string;
};

type Attendance = {
  activity_id: string;
  present: boolean;
};

type ActivityPoint = {
  activity_id: string;
  points: number;
  note: string | null;
};

type DocumentItem = {
  id: string;
  title: string;
  category: string;
  file_name: string;
  created_at: string;
};

type MemberFeedback = {
  id: string;
  member_id: number | null;
  is_anonymous: boolean;
  subject: string;
  content: string;
  status: "new" | "processing" | "resolved" | "archived";
  member_response: string | null;
  responded_at: string | null;
  created_at: string;
};

type AccountPayload = {
  account?: {
    email: string;
    must_change_password: boolean;
    status: string;
    members: Member | Member[] | null;
  };
  error?: string;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    scheduled: "Sắp diễn ra",
    ongoing: "Đang diễn ra",
    completed: "Đã hoàn thành",
    cancelled: "Đã hủy",

    new: "Mới",
    processing: "Đang xử lý",
    resolved: "Đã xử lý",
    archived: "Đã lưu",
  };

  return map[status] ?? status;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[
    parts.length - 1
  ]
    .slice(0, 1)
    .toUpperCase()}`.toUpperCase();
}

function getActivityState(
  activity: Activity,
  registered: boolean
) {
  if (activity.status === "completed") {
    return {
      label: "Đã hoàn thành",
      tone: "completed",
    };
  }

  if (registered) {
    return {
      label: "Đã đăng ký",
      tone: "registered",
    };
  }

  if (activity.status === "ongoing") {
    return {
      label: "Đang diễn ra",
      tone: "ongoing",
    };
  }

  return {
    label: "Mở đăng ký",
    tone: "open",
  };
}

export default function PortalPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [email, setEmail] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [points, setPoints] = useState<ActivityPoint[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<
    MemberFeedback[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(
    null
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const registrationMap = useMemo(
    () =>
      new Map(
        registrations.map((item) => [item.activity_id, item])
      ),
    [registrations]
  );

  const attendanceMap = useMemo(
    () =>
      new Map(
        attendance.map((item) => [item.activity_id, item])
      ),
    [attendance]
  );

  const pointsMap = useMemo(
    () =>
      new Map(points.map((item) => [item.activity_id, item])),
    [points]
  );

  const registeredCount = registrations.filter(
    (item) => item.status === "registered"
  ).length;

  const presentCount = attendance.filter(
    (item) => item.present
  ).length;

  const absentCount = attendance.filter(
    (item) => !item.present
  ).length;

  const attendanceRate =
    attendance.length > 0
      ? Math.round((presentCount / attendance.length) * 100)
      : 0;

  const activityPoints = points.reduce(
    (sum, item) => sum + (item.points || 0),
    0
  );

  const upcomingActivities = useMemo(
    () =>
      activities
        .filter((item) => item.status !== "completed")
        .slice(0, 4),
    [activities]
  );

  const historyRows = useMemo(() => {
    return [...attendance]
      .map((item) => {
        const activity = activities.find(
          (activityItem) =>
            activityItem.id === item.activity_id
        );

        return {
          ...item,
          activity,
          point: pointsMap.get(item.activity_id),
        };
      })
      .reverse()
      .slice(0, 8);
  }, [attendance, activities, pointsMap]);

  async function loadPortal() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/portal/login";
      return;
    }

    const response = await fetch("/api/member/me", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: "no-store",
    });

    const payload = (await response
      .json()
      .catch(() => ({}))) as AccountPayload;

    if (!response.ok || !payload.account) {
      await supabase.auth.signOut();
      window.location.href = "/portal/login";
      return;
    }

    if (payload.account.must_change_password) {
      window.location.href = "/portal/change-password";
      return;
    }

    const currentMember = one(payload.account.members);

    if (!currentMember) {
      toast.error(
        "Tài khoản chưa được liên kết với hồ sơ đoàn viên."
      );
      setLoading(false);
      return;
    }

    setEmail(payload.account.email);
    setMember(currentMember);

    const [
      activityResult,
      registrationResult,
      attendanceResult,
      pointsResult,
      documentResult,
      feedbackResult,
    ] = await Promise.all([
      supabase
        .from("activities")
        .select(
          "id,title,description,location,start_at,end_at,status"
        )
        .neq("status", "cancelled")
        .order("start_at", { ascending: true })
        .limit(12),

      supabase
        .from("activity_registrations")
        .select(
          "id,activity_id,status,registered_at"
        )
        .eq("member_id", currentMember.id),

      supabase
        .from("activity_attendance")
        .select("activity_id,present")
        .eq("member_id", currentMember.id),

      supabase
        .from("activity_points")
        .select("activity_id,points,note")
        .eq("member_id", currentMember.id),

      supabase
        .from("documents")
        .select(
          "id,title,category,file_name,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(6),

      supabase
        .from("feedback")
        .select(
          "id,member_id,is_anonymous,subject,content,status,member_response,responded_at,created_at"
        )
        .eq("member_id", currentMember.id)
        .eq("is_anonymous", false)
        .order("created_at", { ascending: false }),
    ]);

    if (activityResult.error) {
      toast.error("Không thể tải hoạt động.");
    } else {
      setActivities(activityResult.data ?? []);
    }

    if (registrationResult.error) {
      toast.error("Không thể tải đăng ký hoạt động.");
    } else {
      setRegistrations(
        registrationResult.data ?? []
      );
    }

    if (!attendanceResult.error) {
      setAttendance(attendanceResult.data ?? []);
    }

    if (!pointsResult.error) {
      setPoints(pointsResult.data ?? []);
    }

    if (!documentResult.error) {
      setDocuments(documentResult.data ?? []);
    }

    if (feedbackResult.error) {
      console.error(
        "[PORTAL FEEDBACK]",
        feedbackResult.error
      );

      setFeedbackItems([]);
    } else {
      setFeedbackItems(
        (feedbackResult.data ?? []) as MemberFeedback[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadPortal();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          window.location.href = "/portal/login";
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
  const sectionIds = [
    "overview",
    "activities",
    "score",
    "history",
    "feedback",
    "documents",
  ];

  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(
      (element): element is HTMLElement =>
        Boolean(element)
    );

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top -
            b.boundingClientRect.top
        );

      if (visible[0]?.target.id) {
        setActiveSection(
          visible[0].target.id
        );
      }
    },
    {
      root: null,
      rootMargin: "-18% 0px -62% 0px",
      threshold: 0,
    }
  );

  sections.forEach((section) =>
    observer.observe(section)
  );

  return () => observer.disconnect();
  }, [loading]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/portal/login";
  }

  async function toggleRegistration(activity: Activity) {
    if (!member || submitting) return;

    const current = registrationMap.get(activity.id);
    setSubmitting(activity.id);

    try {
      if (current?.status === "registered") {
        const { error } = await supabase
          .from("activity_registrations")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", current.id)
          .eq("member_id", member.id);

        if (error) {
          throw new Error(error.message);
        }

        setRegistrations((old) =>
          old.map((item) =>
            item.id === current.id
              ? { ...item, status: "cancelled" }
              : item
          )
        );

        toast.success(
          "Đã hủy đăng ký hoạt động."
        );
        return;
      }

      if (activity.status === "completed") {
        toast.error("Hoạt động đã kết thúc.");
        return;
      }

      const { data, error } = await supabase
        .from("activity_registrations")
        .upsert(
          {
            activity_id: activity.id,
            member_id: member.id,
            status: "registered",
            registered_at:
              new Date().toISOString(),
            cancelled_at: null,
          },
          {
            onConflict: "activity_id,member_id",
          }
        )
        .select(
          "id,activity_id,status,registered_at"
        )
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setRegistrations((old) => [
        ...old.filter(
          (item) => item.activity_id !== activity.id
        ),
        data as Registration,
      ]);

      toast.success(
        "Đăng ký hoạt động thành công."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật đăng ký."
      );
    } finally {
      setSubmitting(null);
    }
  }

  async function sendFeedback(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !feedbackSubject.trim() ||
      !feedbackContent.trim() ||
      sendingFeedback
    ) {
      return;
    }

    setSendingFeedback(true);

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        member_id: anonymous
          ? null
          : member?.id ?? null,
        is_anonymous: anonymous,
        subject: feedbackSubject.trim(),
        content: feedbackContent.trim(),
      })
      .select(
        "id,member_id,is_anonymous,subject,content,status,member_response,responded_at,created_at"
      )
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        anonymous
          ? "Đã gửi phản ánh ẩn danh."
          : "Đã gửi phản ánh tới Ban Chấp hành."
      );

      if (!anonymous && data) {
        setFeedbackItems((old) => [
          data as MemberFeedback,
          ...old,
        ]);
      }

      setFeedbackSubject("");
      setFeedbackContent("");
      setAnonymous(false);
    }

    setSendingFeedback(false);
  }

  if (loading) {
    return <PortalSkeleton />;
  }

  if (!member) {
    return (
      <main className="member-portal-empty-page">
        <div className="member-portal-empty-card">
          <div className="member-portal-empty-icon">
            <ShieldCheck size={30} />
          </div>

          <span className="member-portal-overline">
            CỔNG ĐOÀN VIÊN
          </span>

          <h1>Chưa có hồ sơ đoàn viên</h1>

          <p>
            Vui lòng liên hệ Ban Chấp hành để liên kết tài
            khoản với hồ sơ đoàn viên.
          </p>

          <Link
            href="/"
            className="member-portal-primary-button"
          >
            Về website
          </Link>
        </div>
      </main>
    );
  }

  const firstName =
    member.full_name
      .trim()
      .split(/\s+/)
      .slice(-1)[0] || member.full_name;

  const profileInitials = getInitials(
    member.full_name
  );

  return (
    <main
  className={`member-portal-shell ${
    sidebarCollapsed ? "sidebar-collapsed" : ""
  }`}
>
      <aside
  className={`member-portal-sidebar ${
    sidebarCollapsed ? "is-collapsed" : ""
  }`}
>
        <div className="member-portal-sidebar-top">
          <button
  type="button"
  className="member-portal-sidebar-collapse"
  onClick={() =>
    setSidebarCollapsed(
      (value) => !value
    )
  }
  aria-label={
    sidebarCollapsed
      ? "Mở rộng thanh bên"
      : "Thu gọn thanh bên"
  }
>
  {sidebarCollapsed ? "›" : "‹"}
</button>
          <Link
            href="/portal"
            className="member-portal-brand"
          >
            <span className="member-portal-brand-logo">
              <img
                src="/logo-truong.png"
                alt=""
              />
            </span>

            <span>
              <strong>CỔNG ĐOÀN VIÊN</strong>
              <small>CHI ĐOÀN D-K66</small>
            </span>
          </Link>

          <div className="member-portal-side-profile">
            <div className="member-portal-avatar large">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt=""
                />
              ) : (
                profileInitials
              )}
            </div>

            <div className="member-portal-side-profile-copy">
              <strong>{member.full_name}</strong>

              <span>
                {member.class_name} ·{" "}
                {member.student_id}
              </span>
            </div>
          </div>

          <nav className="member-portal-nav">
            <a
              href="#overview"
              className={`member-portal-nav-item ${
                activeSection === "overview"
                  ? "active"
                  : ""
              }`}
              onClick={() => setActiveSection("overview")}
            >
              <LayoutDashboard size={18} />
              <span>Tổng quan</span>
            </a>

            <a
              href="#activities"
              className={`member-portal-nav-item ${
                activeSection === "activities"
                  ? "active"
                  : ""
              }`}
              onClick={() => setActiveSection("activities")}
            >
              <CalendarDays size={18} />
              <span>Hoạt động</span>

              {registeredCount > 0 && (
                <em>{registeredCount}</em>
              )}
            </a>

            <a
              href="#score"
              className={`member-portal-nav-item ${
                activeSection === "score"
                  ? "active"
                  : ""
              }`}
              onClick={() => setActiveSection("score")}
            >
              <Star size={18} />
              <span>Điểm của tôi</span>
            </a>

            <a
              href="#history"
              className={`member-portal-nav-item ${
                activeSection === "history"
                  ? "active"
                  : ""
              }`}
              onClick={() => setActiveSection("history")}
            >
              <ClipboardCheck size={18} />
              <span>Lịch sử tham gia</span>
            </a>

            <a
              href="#feedback"
              className={`member-portal-nav-item ${
                activeSection === "feedback"
                  ? "active"
                  : ""
              }`}
              onClick={() => setActiveSection("feedback")}
            >
              <MessageSquare size={18} />
              <span>Góp ý / phản ánh</span>

              {feedbackItems.length > 0 && (
                <em>{feedbackItems.length}</em>
              )}
            </a>

            <a
              href="#documents"
              className={`member-portal-nav-item ${
                activeSection === "documents"
                  ? "active"
                  : ""
              }`}
              onClick={() => setActiveSection("documents")}
            >
              <FileText size={18} />
              <span>Tài liệu</span>
            </a>
          </nav>
        </div>

        <div className="member-portal-sidebar-bottom">
          <Link
            href="/"
            className="member-portal-side-link"
          >
            Về website
          </Link>

          <button
            type="button"
            onClick={signOut}
            className="member-portal-side-logout"
          >
            <LogOut size={17} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div
        className={`member-portal-main ${
          mobileMenuOpen ? "menu-open" : ""
        }`}
      >
        <header className="member-portal-mobile-header">
          <Link
            href="/portal"
            className="member-portal-brand"
          >
            <span className="member-portal-brand-logo">
              <img
                src="/logo-truong.png"
                alt=""
              />
            </span>

            <span>
              <strong>CỔNG ĐOÀN VIÊN</strong>
              <small>D-K66 · THPT HÀ TRUNG</small>
            </span>
          </Link>

          <div className="member-portal-mobile-actions">
            <button
              type="button"
              className="member-portal-icon-button"
              aria-label="Thông báo"
            >
              <Bell size={18} />
            </button>

            <button
              type="button"
              className="member-portal-icon-button"
              onClick={() =>
                setMobileMenuOpen(
                  (value) => !value
                )
              }
              aria-label="Mở menu"
            >
              {mobileMenuOpen ? (
                <X size={19} />
              ) : (
                <Menu size={19} />
              )}
            </button>
          </div>
        </header>

        <div className="member-portal-content">
          <section
            id="overview"
            className="member-portal-hero"
          >
            <div className="member-portal-hero-glow glow-one" />
            <div className="member-portal-hero-glow glow-two" />

            <div className="member-portal-hero-content">
              <span className="member-portal-hero-badge">
                <Sparkles size={14} />
                TÀI KHOẢN ĐOÀN VIÊN
              </span>

              <p className="member-portal-hero-kicker">
                CHI ĐOÀN D-K66 · NHIỆM KỲ 2025 — 2028
              </p>

              <h1>
                Xin chào, {firstName}
                <span> 👋</span>
              </h1>

              <p>
                Đây là không gian cá nhân để bạn theo dõi hoạt
                động, điểm danh, điểm số và hành trình tham gia
                Chi đoàn.
              </p>

              <div className="member-portal-hero-meta">
                <span>
                  <UserRound size={14} />
                  {member.class_name}
                </span>

                <span>
                  <ShieldCheck size={14} />
                  {member.student_id}
                </span>

                <span>{email}</span>
              </div>
            </div>

            <div className="member-portal-hero-score">
              <span>TỔNG ĐIỂM</span>

              <strong>
                {member.total_score ?? "—"}
              </strong>

              <small>
                {member.rating || "Chưa xếp loại"}
              </small>

              <div className="member-portal-score-ring">
                <div>
                  <Star size={18} />

                  <b>{activityPoints}</b>

                  <span>
                    điểm hoạt động
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="member-portal-stats-grid">
            <PortalStat
              icon={<CalendarDays />}
              label="Đã đăng ký"
              value={registeredCount}
              tone="blue"
              detail="hoạt động"
            />

            <PortalStat
              icon={<ClipboardCheck />}
              label="Điểm danh"
              value={`${attendanceRate}%`}
              tone="green"
              detail={`${presentCount} buổi có mặt`}
            />

            <PortalStat
              icon={<ActivityIcon />}
              label="Đã tham dự"
              value={presentCount}
              tone="violet"
              detail="buổi hoạt động"
            />

            <PortalStat
              icon={<Star />}
              label="Điểm hoạt động"
              value={activityPoints}
              tone="amber"
              detail="điểm tích lũy"
            />
          </section>

          <section
            id="activities"
            className="member-portal-section"
          >
            <div className="member-portal-section-header">
              <div>
                <span>HOẠT ĐỘNG</span>

                <h2>
                  Hoạt động dành cho bạn
                </h2>

                <p>
                  Theo dõi và đăng ký các hoạt động sắp diễn
                  ra của Chi đoàn.
                </p>
              </div>

              <div className="member-portal-section-counter">
                {upcomingActivities.length}

                <small>
                  đang hiển thị
                </small>
              </div>
            </div>

            <div className="member-portal-activity-grid">
              {upcomingActivities.length === 0 ? (
                <div className="member-portal-wide-empty">
                  <CalendarDays size={24} />

                  <strong>
                    Chưa có hoạt động sắp diễn ra
                  </strong>

                  <span>
                    Khi BCH đăng hoạt động mới, thông tin sẽ
                    xuất hiện tại đây.
                  </span>
                </div>
              ) : (
                upcomingActivities.map((activity) => {
                  const registered =
                    registrationMap.get(
                      activity.id
                    )?.status === "registered";

                  const attended =
                    attendanceMap.get(
                      activity.id
                    );

                  const point =
                    pointsMap.get(
                      activity.id
                    )?.points ?? 0;

                  const state =
                    getActivityState(
                      activity,
                      registered
                    );

                  return (
                    <article
                      key={activity.id}
                      className="member-portal-activity-card"
                    >
                      <div className="member-portal-activity-card-top">
                        <div
                          className={`member-portal-activity-state ${state.tone}`}
                        >
                          {state.tone ===
                          "registered" ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <CalendarDays size={13} />
                          )}

                          {state.label}
                        </div>

                        {point > 0 && (
                          <span className="member-portal-point-chip">
                            +{point} điểm
                          </span>
                        )}
                      </div>

                      <h3>
                        {activity.title}
                      </h3>

                      <div className="member-portal-activity-details">
                        <span>
                          <CalendarDays size={15} />

                          {formatDateTime(
                            activity.start_at
                          )}
                        </span>

                        {activity.location && (
                          <span>
                            <HeartHandshake size={15} />

                            {activity.location}
                          </span>
                        )}
                      </div>

                      {activity.description && (
                        <p className="member-portal-activity-description">
                          {activity.description}
                        </p>
                      )}

                      {attended && (
                        <div
                          className={`member-portal-attendance-note ${
                            attended.present
                              ? "present"
                              : "absent"
                          }`}
                        >
                          {attended.present ? (
                            <>
                              <CheckCircle2 size={15} />
                              Bạn đã có mặt
                            </>
                          ) : (
                            <>
                              <XCircle size={15} />
                              Bạn được ghi nhận vắng
                            </>
                          )}
                        </div>
                      )}

                      {activity.status !==
                        "completed" && (
                        <button
                          type="button"
                          disabled={
                            submitting ===
                            activity.id
                          }
                          onClick={() =>
                            void toggleRegistration(
                              activity
                            )
                          }
                          className={`member-portal-activity-button ${
                            registered
                              ? "cancel"
                              : ""
                          }`}
                        >
                          {submitting ===
                          activity.id ? (
                            "ĐANG CẬP NHẬT..."
                          ) : registered ? (
                            <>
                              <XCircle size={16} />
                              Hủy đăng ký
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={16} />
                              Đăng ký tham gia
                            </>
                          )}
                        </button>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <div className="member-portal-two-column">
            <section
              id="score"
              className="member-portal-panel member-portal-score-panel"
            >
              <div className="member-portal-section-header compact">
                <div>
                  <span>KẾT QUẢ CÁ NHÂN</span>
                  <h2>Điểm & xếp loại</h2>
                </div>

                <div className="member-portal-panel-icon amber">
                  <Star size={19} />
                </div>
              </div>

              <div className="member-portal-score-big">
                <div>
                  <small>TỔNG ĐIỂM</small>

                  <strong>
                    {member.total_score ?? "—"}
                  </strong>
                </div>

                <div className="member-portal-rating">
                  <span>XẾP LOẠI</span>

                  <strong>
                    {member.rating ||
                      "Chưa xếp loại"}
                  </strong>
                </div>
              </div>

              <div className="member-portal-progress-row">
                <div>
                  <span>Điểm hoạt động</span>
                  <strong>
                    {activityPoints}
                  </strong>
                </div>

                <div className="member-portal-progress-track">
                  <span
                    style={{
                      width: `${Math.min(
                        Math.max(
                          activityPoints,
                          0
                        ),
                        100
                      )}%`,
                    }}
                  />
                </div>

                <small>
                  Dữ liệu điểm hoạt động được BCH ghi nhận theo
                  từng hoạt động.
                </small>
              </div>
            </section>

            <section className="member-portal-panel">
              <div className="member-portal-section-header compact">
                <div>
                  <span>HỒ SƠ</span>
                  <h2>Thông tin của tôi</h2>
                </div>

                <div className="member-portal-panel-icon blue">
                  <UserRound size={19} />
                </div>
              </div>

              <div className="member-portal-profile-inline">
                <div className="member-portal-avatar profile">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt=""
                    />
                  ) : (
                    profileInitials
                  )}
                </div>

                <div>
                  <strong>
                    {member.full_name}
                  </strong>

                  <span>
                    {member.class_name} ·{" "}
                    {member.student_id}
                  </span>
                </div>
              </div>

              <div className="member-portal-info-grid">
                <Info
                  label="Họ tên"
                  value={member.full_name}
                />

                <Info
                  label="Lớp"
                  value={member.class_name}
                />

                <Info
                  label="Mã đoàn viên"
                  value={member.student_id}
                />

                <Info
                  label="Giới tính"
                  value={
                    member.gender ||
                    "Chưa cập nhật"
                  }
                />

                <Info
                  label="Năm sinh"
                  value={
                    member.birth_year
                      ? String(
                          member.birth_year
                        )
                      : "Chưa cập nhật"
                  }
                />

                <Info
                  label="Email"
                  value={email}
                />
              </div>
            </section>
          </div>

          <section
            id="history"
            className="member-portal-panel"
          >
            <div className="member-portal-section-header">
              <div>
                <span>LỊCH SỬ</span>

                <h2>
                  Hành trình tham gia
                </h2>

                <p>
                  Theo dõi những hoạt động đã được ghi nhận trong
                  hệ thống.
                </p>
              </div>

              <div className="member-portal-history-summary">
                <strong>{presentCount}</strong>
                <span>có mặt</span>
                <i />
                <strong>{absentCount}</strong>
                <span>vắng</span>
              </div>
            </div>

            {historyRows.length === 0 ? (
              <div className="member-portal-wide-empty">
                <ClipboardCheck size={24} />

                <strong>
                  Chưa có dữ liệu điểm danh
                </strong>

                <span>
                  Lịch sử tham gia sẽ xuất hiện sau khi BCH cập
                  nhật điểm danh.
                </span>
              </div>
            ) : (
              <div className="member-portal-timeline">
                {historyRows.map(
                  (row, index) => (
                    <article
                      key={`${row.activity_id}-${index}`}
                      className="member-portal-timeline-item"
                    >
                      <div className="member-portal-timeline-marker">
                        {row.present ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <XCircle size={17} />
                        )}
                      </div>

                      <div className="member-portal-timeline-content">
                        <div className="member-portal-timeline-top">
                          <div>
                            <span>
                              {row.activity
                                ? formatDate(
                                    row.activity
                                      .start_at
                                  )
                                : "Hoạt động đã lưu trữ"}
                            </span>

                            <h3>
                              {row.activity
                                ?.title ||
                                "Hoạt động đã lưu trữ"}
                            </h3>
                          </div>

                          <div
                            className={`member-portal-timeline-status ${
                              row.present
                                ? "present"
                                : "absent"
                            }`}
                          >
                            {row.present
                              ? "Có mặt"
                              : "Vắng"}
                          </div>
                        </div>

                        <div className="member-portal-timeline-meta">
                          {row.point &&
                            row.point.points >
                              0 && (
                              <span>
                                <Star size={14} />
                                +{row.point.points} điểm
                              </span>
                            )}

                          {row.point?.note && (
                            <span>
                              {row.point.note}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </section>

          <div className="member-portal-two-column lower">
            {/* =================================================
                FEEDBACK
               ================================================= */}
            <section
              id="feedback"
              className="member-portal-panel member-portal-feedback-pro"
            >
              <div className="member-portal-feedback-pro-header">
                <div className="member-portal-feedback-pro-heading">
                  <div className="member-portal-feedback-pro-icon">
                    <MessageSquare size={21} />
                  </div>

                  <div>
                    <div className="member-portal-feedback-pro-kicker">
                      <span>
                        KẾT NỐI TRỰC TIẾP
                      </span>

                      <span className="member-portal-feedback-pro-dot" />

                      <span>PHẢN HỒI</span>
                    </div>

                    <h2>
                      Góp ý & phản ánh
                    </h2>

                    <p>
                      Không gian để bạn chia sẻ ý kiến, đề xuất
                      hoặc phản ánh trực tiếp tới Ban Chấp hành
                      Chi đoàn.
                    </p>
                  </div>
                </div>

                <div className="member-portal-feedback-pro-secure">
                  <ShieldCheck size={16} />

                  <div>
                    <strong>BẢO MẬT</strong>

                    <span>
                      Thông tin được tiếp nhận an toàn
                    </span>
                  </div>
                </div>
              </div>

              <div className="member-portal-feedback-pro-layout">
                <div className="member-portal-feedback-pro-form-wrap">
                  <form
                    onSubmit={sendFeedback}
                    className="member-portal-feedback-pro-form"
                  >
                    <div className="member-portal-feedback-pro-field">
                      <div className="member-portal-feedback-pro-label-row">
                        <label htmlFor="feedback-subject">
                          Tiêu đề
                        </label>

                        <span>
                          {feedbackSubject.length}
                          /120
                        </span>
                      </div>

                      <div className="member-portal-feedback-pro-input-box">
                        <MessageSquare size={17} />

                        <input
                          id="feedback-subject"
                          required
                          maxLength={120}
                          value={feedbackSubject}
                          onChange={(event) =>
                            setFeedbackSubject(
                              event.target.value
                            )
                          }
                          placeholder="Ví dụ: Đề xuất về hoạt động Chi đoàn"
                        />
                      </div>
                    </div>

                    <div className="member-portal-feedback-pro-field">
                      <div className="member-portal-feedback-pro-label-row">
                        <label htmlFor="feedback-content">
                          Nội dung phản ánh
                        </label>

                        <span>
                          {feedbackContent.length}
                          /2000
                        </span>
                      </div>

                      <div className="member-portal-feedback-pro-textarea-box">
                        <textarea
                          id="feedback-content"
                          required
                          maxLength={2000}
                          value={feedbackContent}
                          onChange={(event) =>
                            setFeedbackContent(
                              event.target.value
                            )
                          }
                          placeholder="Hãy chia sẻ điều bạn muốn BCH biết. Bạn có thể góp ý về hoạt động, tổ chức, thông tin, tài liệu hoặc bất kỳ vấn đề nào liên quan tới Chi đoàn..."
                          rows={7}
                        />

                        <div className="member-portal-feedback-pro-textarea-footer">
                          <span>
                            Hãy viết rõ ràng để BCH dễ tiếp nhận và xử lý.
                          </span>

                          <span>
                            {feedbackContent.length >
                            0
                              ? "Đang soạn nội dung"
                              : "Chưa nhập nội dung"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <label className="member-portal-feedback-pro-anonymous">
                      <input
                        type="checkbox"
                        checked={anonymous}
                        onChange={(event) =>
                          setAnonymous(
                            event.target.checked
                          )
                        }
                      />

                      <span className="member-portal-feedback-pro-toggle">
                        <i />
                      </span>

                      <span className="member-portal-feedback-pro-anonymous-copy">
                        <strong>
                          Gửi phản ánh ẩn danh
                        </strong>

                        <small>
                          BCH vẫn nhận được nội dung nhưng thông tin
                          đoàn viên của bạn sẽ không được gắn vào phản ánh.
                        </small>
                      </span>

                      <span className="member-portal-feedback-pro-anonymous-badge">
                        {anonymous
                          ? "ĐANG BẬT"
                          : "TẮT"}
                      </span>
                    </label>

                    <div className="member-portal-feedback-pro-security">
                      <div className="member-portal-feedback-pro-security-icon">
                        <ShieldCheck size={17} />
                      </div>

                      <div>
                        <strong>
                          Thông tin của bạn được tôn trọng
                        </strong>

                        <span>
                          Khi gửi ẩn danh, phản ánh sẽ không gắn
                          <strong> member_id </strong>
                          của bạn trong hệ thống.
                        </span>
                      </div>
                    </div>

                    <div className="member-portal-feedback-pro-actions">
                      <div className="member-portal-feedback-pro-actions-note">
                        <CheckCircle2 size={16} />

                        <span>
                          Nội dung sẽ được chuyển tới Ban Chấp hành để tiếp nhận.
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={sendingFeedback}
                        className="member-portal-feedback-pro-submit"
                      >
                        <span>
                          {sendingFeedback
                            ? "ĐANG GỬI..."
                            : "GỬI PHẢN ÁNH"}
                        </span>

                        <MessageSquare size={17} />
                      </button>
                    </div>
                  </form>
                </div>

                <aside className="member-portal-feedback-pro-aside">
                  <div className="member-portal-feedback-pro-aside-glow" />

                  <div className="member-portal-feedback-pro-aside-icon">
                    <HeartHandshake size={23} />
                  </div>

                  <span className="member-portal-feedback-pro-aside-kicker">
                    TIẾNG NÓI ĐOÀN VIÊN
                  </span>

                  <h3>
                    Ý kiến của bạn
                    <br />
                    luôn có giá trị.
                  </h3>

                  <p>
                    Những phản hồi chân thành giúp BCH hiểu rõ hơn
                    nhu cầu của đoàn viên và cải thiện hoạt động
                    của Chi đoàn.
                  </p>

                  <div className="member-portal-feedback-pro-aside-list">
                    <div>
                      <span>01</span>
                      <p>Góp ý về hoạt động</p>
                    </div>

                    <div>
                      <span>02</span>
                      <p>Đề xuất sáng kiến</p>
                    </div>

                    <div>
                      <span>03</span>
                      <p>Phản ánh vấn đề</p>
                    </div>
                  </div>

                  <div className="member-portal-feedback-pro-aside-footer">
                    <ShieldCheck size={15} />

                    <span>
                      Kênh phản hồi chính thức của Chi đoàn D-K66
                    </span>
                  </div>
                </aside>
              </div>

{/* =================================================
    PHẢN HỒI TỪ BCH — COMPACT
   ================================================= */}
<div className="member-portal-feedback-replies-compact">
  <div className="member-portal-feedback-replies-header">
    <div>
      <span>     PHẢN HỒI TỪ BAN CHẤP HÀNH</span>

      <h3>   Phản ánh & phản hồi</h3>

      <p>
             Theo dõi các phản ánh bạn đã gửi và phản hồi chính thức
        từ BCH.
      </p>
    </div>

    <div className="member-portal-panel-icon blue">
      <MessageSquare size={18} />
    </div>
  </div>

  {feedbackItems.length === 0 ? (
    <div className="member-portal-feedback-empty">
      <div className="member-portal-feedback-empty-icon">
        <Inbox size={19} />
      </div>

      <div>
        <strong>Chưa có phản ánh nào</strong>

        <span>
          Các phản ánh bạn gửi sẽ xuất hiện tại đây.
        </span>
      </div>
    </div>
  ) : (
    <>
      <div className="member-portal-feedback-compact-list">
        {feedbackItems.slice(0, 3).map((item) => (
          <details
            key={item.id}
            className="member-portal-feedback-compact-item"
          >
            <summary>
              <div className="member-portal-feedback-compact-main">
                <div className="member-portal-feedback-compact-title-row">
                  <h4>{item.subject}</h4>

                  <span
                    className={`member-portal-feedback-status ${item.status}`}
                  >
                    {statusLabel(item.status)}
                  </span>
                </div>

                <div className="member-portal-feedback-compact-meta">
                  <span>
                    {formatDateTime(item.created_at)}
                  </span>

                  <span>
                    {item.member_response
                      ? "Đã có phản hồi"
                      : "Đang chờ phản hồi"}
                  </span>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="member-portal-feedback-compact-arrow"
              />
            </summary>

            <div className="member-portal-feedback-compact-content">
              <div className="member-portal-feedback-compact-message">
                <span>BẠN ĐÃ GỬI</span>

                <p>{item.content}</p>
              </div>

              {item.member_response ? (
                <div className="member-portal-feedback-compact-response">
                  <div className="member-portal-feedback-compact-response-head">
                    <div className="member-portal-feedback-compact-response-icon">
                      <CheckCircle2 size={15} />
                    </div>

                    <div>
                      <strong>
                        Phản hồi từ Ban Chấp hành
                      </strong>

                      {item.responded_at && (
                        <span>
                          {formatDateTime(
                            item.responded_at
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <p>{item.member_response}</p>
                </div>
              ) : (
                <div className="member-portal-feedback-compact-pending">
                  <Clock3 size={15} />

                  <span>
                    BCH chưa gửi phản hồi chính thức cho phản ánh này.
                  </span>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      {feedbackItems.length > 3 && (
        <div className="member-portal-feedback-more">
          <span>
            Hiển thị 3 phản ánh gần nhất trong tài khoản.
          </span>

          <strong>
            Tổng cộng {feedbackItems.length} phản ánh
          </strong>
        </div>
      )}
    </>
  )}
</div>
            </section>

            {/* =================================================
                DOCUMENTS
               ================================================= */}
            <section
              id="documents"
              className="member-portal-panel"
            >
              <div className="member-portal-section-header compact">
                <div>
                  <span>TÀI LIỆU</span>
                  <h2>Tài liệu mới</h2>
                </div>

                <Link
                  href="/documents"
                  className="member-portal-text-link"
                >
                  Xem tất cả
                  <ChevronRight size={15} />
                </Link>
              </div>

              {documents.length === 0 ? (
                <div className="member-portal-wide-empty small">
                  <FileText size={22} />

                  <strong>
                    Chưa có tài liệu mới
                  </strong>
                </div>
              ) : (
                <div className="member-portal-document-list">
                  {documents.map(
                    (document) => (
                      <Link
                        key={document.id}
                        href="/documents"
                        className="member-portal-document-item"
                      >
                        <div className="member-portal-document-icon">
                          <FileText size={18} />
                        </div>

                        <div>
                          <strong>
                            {document.title}
                          </strong>

                          <span>
                            {document.file_name} ·{" "}
                            {formatDate(
                              document.created_at
                            )}
                          </span>
                        </div>

                        <ChevronRight
                          size={17}
                          className="member-portal-document-arrow"
                        />
                      </Link>
                    )
                  )}
                </div>
              )}
            </section>
          </div>

          <footer className="member-portal-footer">
            <div>
              <strong>
                CHI ĐOÀN D-K66 · TRƯỜNG THPT HÀ TRUNG
              </strong>

              <span>
                Đoàn kết · Trách nhiệm · Tiên phong · Sáng tạo
              </span>
            </div>

            <span className="member-portal-footer-security">
              <ShieldCheck size={14} />
              Cổng đoàn viên bảo mật
            </span>
          </footer>
        </div>

        {mobileMenuOpen && (
          <div
            className="member-portal-mobile-drawer"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          >
            <div
              className="member-portal-mobile-drawer-card"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="member-portal-mobile-drawer-head">
                <div>
                  <span>MENU</span>
                  <strong>
                    Cổng đoàn viên
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="member-portal-icon-button"
                >
                  <X size={18} />
                </button>
              </div>

              <nav>
                <a
                  href="#overview"
                  className={
                    activeSection === "overview" ? "active" : ""
                  }
                  onClick={() => {
                    setActiveSection("overview");
                    setMobileMenuOpen(false);
                  }}
                >
                  <LayoutDashboard size={18} />
                  Tổng quan
                </a>

                <a
                  href="#activities"
                  className={
                    activeSection === "activities" ? "active" : ""
                  }
                  onClick={() => {
                    setActiveSection("activities");
                    setMobileMenuOpen(false);
                  }}
                >
                  <CalendarDays size={18} />
                  Hoạt động
                </a>

                <a
                  href="#score"
                  className={
                    activeSection === "score" ? "active" : ""
                  }
                  onClick={() => {
                    setActiveSection("score");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Star size={18} />
                  Điểm của tôi
                </a>

                <a
                  href="#history"
                  className={
                    activeSection === "history" ? "active" : ""
                  }
                  onClick={() => {
                    setActiveSection("history");
                    setMobileMenuOpen(false);
                  }}
                >
                  <ClipboardCheck size={18} />
                  Lịch sử tham gia
                </a>

                <a
                  href="#feedback"
                  className={
                    activeSection === "feedback" ? "active" : ""
                  }
                  onClick={() => {
                    setActiveSection("feedback");
                    setMobileMenuOpen(false);
                  }}
                >
                  <MessageSquare size={18} />
                  Góp ý / phản ánh
                </a>

                <a
                  href="#documents"
                  className={
                    activeSection === "documents" ? "active" : ""
                  }
                  onClick={() => {
                    setActiveSection("documents");
                    setMobileMenuOpen(false);
                  }}
                >
                  <FileText size={18} />
                  Tài liệu
                </a>
              </nav>

              <button
                type="button"
                onClick={signOut}
                className="member-portal-mobile-logout"
              >
                <LogOut size={17} />
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="member-portal-bottom-nav">
        <a
          href="#overview"
          className={activeSection === "overview" ? "active" : ""}
        >
          <LayoutDashboard size={18} />
          <span>Tổng quan</span>
        </a>

        <a
          href="#activities"
          className={activeSection === "activities" ? "active" : ""}
        >
          <CalendarDays size={18} />
          <span>Hoạt động</span>
        </a>

        <a
          href="#score"
          className={activeSection === "score" ? "active" : ""}
        >
          <Star size={18} />
          <span>Điểm</span>
        </a>

        <a
          href="#history"
          className={activeSection === "history" ? "active" : ""}
        >
          <ClipboardCheck size={18} />
          <span>Lịch sử</span>
        </a>
      </nav>
    </main>
  );
}

function PortalStat({
  icon,
  label,
  value,
  tone,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone: "blue" | "green" | "violet" | "amber";
  detail: string;
}) {
  return (
    <article
      className={`member-portal-stat-card ${tone}`}
    >
      <div className="member-portal-stat-icon">
        {icon}
      </div>

      <div className="member-portal-stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="member-portal-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PortalSkeleton() {
  return (
    <main className="member-portal-skeleton-page">
      <div className="member-portal-skeleton-wrap">
        <div className="member-portal-skeleton-sidebar" />

        <div className="member-portal-skeleton-content">
          <div className="member-portal-skeleton-header" />

          <div className="member-portal-skeleton-hero" />

          <div className="member-portal-skeleton-stat-grid">
            <div />
            <div />
            <div />
            <div />
          </div>

          <div className="member-portal-skeleton-panel" />
          <div className="member-portal-skeleton-panel" />
        </div>
      </div>
    </main>
  );
}