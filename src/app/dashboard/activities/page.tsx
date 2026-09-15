"use client";

import Link from "next/link";
import {
  CalendarDays,
  Plus,
  MapPin,
  Clock3,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  CircleAlert,
  Search,
  CalendarClock,
  Check,
  Ban,
  RefreshCw,
  ClipboardCheck,
  Users,
  UserRound,
  UserCheck,
  BarChart3,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";

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

type ActivityRegistration = {
  id: string;
  activity_id: string;
  member_id: number;
  status: "registered" | "cancelled";
  registered_at: string;
};

type RegistrationMember = {
  id: number;
  full_name: string;
  student_id: string;
  class_name: string;
  avatar: string | null;
};

type ActivityAttendance = {
  activity_id: string;
  member_id: number;
  present: boolean;
};

const statusLabels: Record<
  ActivityStatus,
  string
> = {
  scheduled: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

const statusIcons: Record<
  ActivityStatus,
  ReactNode
> = {
  scheduled: <CalendarClock size={15} />,
  ongoing: <RefreshCw size={15} />,
  completed: <Check size={15} />,
  cancelled: <Ban size={15} />,
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>(
    []
  );

  const [registrations, setRegistrations] = useState<
    ActivityRegistration[]
  >([]);

  const [registrationMembers, setRegistrationMembers] =
    useState<RegistrationMember[]>([]);

  const [attendanceRows, setAttendanceRows] = useState<
    ActivityAttendance[]
  >([]);

  const [registrationModalActivity, setRegistrationModalActivity] =
    useState<Activity | null>(null);

  const [loadingRegistrations, setLoadingRegistrations] =
    useState(false);

  const [loadingAttendance, setLoadingAttendance] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | ActivityStatus>("all");

  const [title, setTitle] = useState("");

  const [description, setDescription] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [startAt, setStartAt] =
    useState("");

  const [endAt, setEndAt] =
    useState("");

  const [status, setStatus] =
    useState<ActivityStatus>("scheduled");

  async function loadRegistrations() {
    setLoadingRegistrations(true);

    try {
      const [
        registrationResult,
        memberResult,
      ] = await Promise.all([
        supabase
          .from("activity_registrations")
          .select(
            "id,activity_id,member_id,status,registered_at"
          )
          .eq("status", "registered"),

        supabase
          .from("members")
          .select(
            "id,full_name,student_id,class_name,avatar"
          )
          .order("full_name", {
            ascending: true,
          }),
      ]);

      if (registrationResult.error) {
        console.error(
          "LOAD ACTIVITY REGISTRATIONS ERROR:",
          registrationResult.error
        );

        alert(
          `Không thể tải danh sách đăng ký: ${registrationResult.error.message}`
        );

        return;
      }

      if (memberResult.error) {
        console.error(
          "LOAD REGISTRATION MEMBERS ERROR:",
          memberResult.error
        );

        alert(
          `Không thể tải thông tin đoàn viên: ${memberResult.error.message}`
        );

        return;
      }

      setRegistrations(
        (registrationResult.data ??
          []) as ActivityRegistration[]
      );

      setRegistrationMembers(
        (memberResult.data ??
          []) as RegistrationMember[]
      );
    } finally {
      setLoadingRegistrations(false);
    }
  }

  async function loadAttendance() {
    setLoadingAttendance(true);

    try {
      const { data, error } =
        await supabase
          .from("activity_attendance")
          .select(
            "activity_id,member_id,present"
          );

      if (error) {
        console.error(
          "LOAD ACTIVITY ATTENDANCE ERROR:",
          error
        );

        return;
      }

      setAttendanceRows(
        (data ?? []) as ActivityAttendance[]
      );
    } finally {
      setLoadingAttendance(false);
    }
  }

  async function loadActivities(
    silent = false
  ) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } =
        await supabase
          .from("activities")
          .select(
            "id,title,description,location,start_at,end_at,status,created_at"
          )
          .order("start_at", {
            ascending: true,
          });

      if (error) {
        console.error(
          "LOAD ACTIVITIES ERROR:",
          error
        );

        alert(
          `Không thể tải danh sách sinh hoạt: ${error.message}`
        );

        return;
      }

      setActivities(
        (data ?? []) as Activity[]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshAll() {
    await Promise.all([
      loadActivities(true),
      loadRegistrations(),
      loadAttendance(),
    ]);
  }

  useEffect(() => {
    void loadActivities();
    void loadRegistrations();
    void loadAttendance();
  }, []);

  const filteredActivities = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return activities.filter(
      (activity) => {
        const matchesSearch =
          !keyword ||
          activity.title
            .toLowerCase()
            .includes(keyword) ||
          (
            activity.location ?? ""
          )
            .toLowerCase()
            .includes(keyword) ||
          (
            activity.description ?? ""
          )
            .toLowerCase()
            .includes(keyword);

        const matchesStatus =
          statusFilter === "all" ||
          activity.status === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    activities,
    search,
    statusFilter,
  ]);

  const stats = useMemo(() => {
    return {
      total: activities.length,

      scheduled:
        activities.filter(
          (item) =>
            item.status === "scheduled"
        ).length,

      ongoing:
        activities.filter(
          (item) =>
            item.status === "ongoing"
        ).length,

      completed:
        activities.filter(
          (item) =>
            item.status === "completed"
        ).length,

      cancelled:
        activities.filter(
          (item) =>
            item.status === "cancelled"
        ).length,

      registrations:
        registrations.filter(
          (item) =>
            item.status === "registered"
        ).length,

      attendancePresent:
        attendanceRows.filter(
          (item) =>
            item.present === true
        ).length,

      attendanceTotal:
        attendanceRows.length,
    };
  }, [
    activities,
    registrations,
    attendanceRows,
  ]);

  const attendanceRate =
    stats.attendanceTotal > 0
      ? Math.round(
          (stats.attendancePresent /
            stats.attendanceTotal) *
            100
        )
      : 0;

  function getRegistrationCount(
    activityId: string
  ) {
    return registrations.filter(
      (item) =>
        item.activity_id === activityId &&
        item.status === "registered"
    ).length;
  }

  function getAttendanceCount(
    activityId: string
  ) {
    return attendanceRows.filter(
      (item) =>
        item.activity_id === activityId
    ).length;
  }

  function getPresentCount(
    activityId: string
  ) {
    return attendanceRows.filter(
      (item) =>
        item.activity_id === activityId &&
        item.present === true
    ).length;
  }

  function getActivityAttendanceRate(
    activityId: string
  ) {
    const total =
      getAttendanceCount(activityId);

    if (!total) return 0;

    return Math.round(
      (getPresentCount(activityId) /
        total) *
        100
    );
  }

  function getRegistrationAttendance(
    activityId: string,
    memberId: number
  ) {
    return attendanceRows.find(
      (item) =>
        item.activity_id === activityId &&
        item.member_id === memberId
    );
  }

  function getActivityRegistrations(
    activityId: string
  ) {
    const rows = registrations.filter(
      (item) =>
        item.activity_id === activityId &&
        item.status === "registered"
    );

    const memberMap = new Map(
      registrationMembers.map(
        (member) => [
          member.id,
          member,
        ]
      )
    );

    return rows
      .map((registration) => ({
        registration,
        member: memberMap.get(
          registration.member_id
        ),
        attendance:
          getRegistrationAttendance(
            activityId,
            registration.member_id
          ),
      }))
      .filter(
        (
          item
        ): item is {
          registration: ActivityRegistration;
          member: RegistrationMember;
          attendance:
            | ActivityAttendance
            | undefined;
        } => Boolean(item.member)
      )
      .sort((a, b) => {
        const aPresent =
          a.attendance?.present === true
            ? 0
            : 1;

        const bPresent =
          b.attendance?.present === true
            ? 0
            : 1;

        if (aPresent !== bPresent) {
          return aPresent - bPresent;
        }

        return a.member.full_name.localeCompare(
          b.member.full_name,
          "vi"
        );
      });
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartAt("");
    setEndAt("");
    setStatus("scheduled");
    setEditingId(null);
  }

  function openCreate() {
    resetForm();

    setStartAt(
      toDatetimeLocal(
        new Date().toISOString()
      )
    );

    setModalOpen(true);
  }

  function openEdit(
    activity: Activity
  ) {
    setEditingId(activity.id);
    setTitle(activity.title);
    setDescription(
      activity.description ?? ""
    );
    setLocation(
      activity.location ?? ""
    );

    setStartAt(
      toDatetimeLocal(
        activity.start_at
      )
    );

    setEndAt(
      activity.end_at
        ? toDatetimeLocal(
            activity.end_at
          )
        : ""
    );

    setStatus(
      activity.status
    );

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (saving) return;

    if (!title.trim()) {
      alert(
        "Vui lòng nhập tên hoạt động."
      );
      return;
    }

    if (!startAt) {
      alert(
        "Vui lòng chọn thời gian bắt đầu."
      );
      return;
    }

    if (
      endAt &&
      new Date(endAt).getTime() <
        new Date(startAt).getTime()
    ) {
      alert(
        "Thời gian kết thúc không được sớm hơn thời gian bắt đầu."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),

        description:
          description.trim() ||
          null,

        location:
          location.trim() ||
          null,

        start_at:
          new Date(
            startAt
          ).toISOString(),

        end_at: endAt
          ? new Date(
              endAt
            ).toISOString()
          : null,

        status,
      };

      if (editingId) {
        const { error } =
          await supabase
            .from("activities")
            .update(payload)
            .eq(
              "id",
              editingId
            );

        if (error) {
          throw new Error(
            error.message
          );
        }
      } else {
        const { error } =
          await supabase
            .from("activities")
            .insert(payload);

        if (error) {
          throw new Error(
            error.message
          );
        }
      }

      setModalOpen(false);
      resetForm();

      await loadActivities();
    } catch (error) {
      console.error(
        "SAVE ACTIVITY ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Không thể lưu hoạt động."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    activity: Activity
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa hoạt động "${activity.title}" không?\n\nHành động này không thể hoàn tác.`
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("activities")
        .delete()
        .eq(
          "id",
          activity.id
        );

    if (error) {
      alert(
        `Không thể xóa hoạt động: ${error.message}`
      );
      return;
    }

    setActivities((current) =>
      current.filter(
        (item) =>
          item.id !== activity.id
      )
    );

    setRegistrations((current) =>
      current.filter(
        (item) =>
          item.activity_id !== activity.id
      )
    );

    setAttendanceRows((current) =>
      current.filter(
        (item) =>
          item.activity_id !== activity.id
      )
    );
  }

  return (
    <main className="dashboard-page activities-dashboard-page">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="activities-dashboard-hero">

        <div className="activities-dashboard-glow one" />
        <div className="activities-dashboard-glow two" />

        <div className="activities-dashboard-hero-content">

          <div className="activities-dashboard-kicker">
            <CalendarDays size={15} />
            QUẢN LÝ SINH HOẠT
          </div>

          <h1>
            Trung tâm hoạt động
          </h1>

          <p>
            Tổ chức, theo dõi đăng ký và điều phối
            hoạt động của Chi đoàn D-K66
            trong một không gian quản trị tập trung.
          </p>

          <div className="activities-dashboard-actions">

            <button
              type="button"
              onClick={openCreate}
              className="activities-dashboard-primary"
            >
              <Plus size={18} />
              Thêm hoạt động
            </button>

            <button
              type="button"
              onClick={() =>
                void refreshAll()
              }
              disabled={
                loading ||
                refreshing
              }
              className="activities-dashboard-secondary"
            >
              <RefreshCw
                size={16}
                className={
                  loading ||
                  refreshing
                    ? "activities-spin"
                    : ""
                }
              />

              {refreshing
                ? "Đang cập nhật"
                : "Làm mới dữ liệu"}
            </button>

          </div>

        </div>


        <div className="activities-dashboard-command-card">

          <div className="activities-command-card-icon">
            <BarChart3 size={28} />
          </div>

          <span>
            ACTIVITY CONTROL CENTER
          </span>

          <strong>
            {stats.total}
          </strong>

          <small>
            hoạt động trong hệ thống
          </small>

          <div className="activities-command-mini-stats">

            <div>
              <b>
                {stats.registrations}
              </b>

              <span>
                lượt đăng ký
              </span>
            </div>

            <div>
              <b>
                {attendanceRate}%
              </b>

              <span>
                điểm danh
              </span>
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          GLOBAL STATS
      ===================================================== */}

      <section className="activities-dashboard-stats">

        <ActivityStat
          active={
            statusFilter === "all"
          }
          onClick={() =>
            setStatusFilter("all")
          }
          icon={<CalendarDays size={19} />}
          tone="blue"
          label="Tất cả"
          value={stats.total}
          detail="hoạt động"
        />

        <ActivityStat
          active={
            statusFilter === "scheduled"
          }
          onClick={() =>
            setStatusFilter(
              "scheduled"
            )
          }
          icon={
            <CalendarClock size={19} />
          }
          tone="blue"
          label="Sắp diễn ra"
          value={stats.scheduled}
          detail="hoạt động"
        />

        <ActivityStat
          active={
            statusFilter === "ongoing"
          }
          onClick={() =>
            setStatusFilter(
              "ongoing"
            )
          }
          icon={
            <RefreshCw size={19} />
          }
          tone="green"
          label="Đang diễn ra"
          value={stats.ongoing}
          detail="hoạt động"
        />

        <ActivityStat
          active={
            statusFilter === "completed"
          }
          onClick={() =>
            setStatusFilter(
              "completed"
            )
          }
          icon={
            <CheckCircle2 size={19} />
          }
          tone="emerald"
          label="Hoàn thành"
          value={stats.completed}
          detail="hoạt động"
        />

        <ActivityStat
          active={
            statusFilter === "cancelled"
          }
          onClick={() =>
            setStatusFilter(
              "cancelled"
            )
          }
          icon={<Ban size={19} />}
          tone="red"
          label="Đã hủy"
          value={stats.cancelled}
          detail="hoạt động"
        />

        <ActivityStat
          active={false}
          onClick={() => undefined}
          icon={<Users size={19} />}
          tone="purple"
          label="Lượt đăng ký"
          value={stats.registrations}
          detail="đoàn viên"
          disabled
        />

        <ActivityStat
          active={false}
          onClick={() => undefined}
          icon={
            <ClipboardCheck size={19} />
          }
          tone="teal"
          label="Điểm danh"
          value={`${attendanceRate}%`}
          detail={`${stats.attendancePresent}/${stats.attendanceTotal}`}
          disabled
        />

      </section>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <section className="activities-dashboard-card">

        <div className="activities-dashboard-card-header">

          <div>

            <span>
              ACTIVITY SCHEDULE
            </span>

            <h2>
              Lịch sinh hoạt
            </h2>

            <p>
              Hiển thị{" "}
              <strong>
                {filteredActivities.length}
              </strong>{" "}
              hoạt động phù hợp với bộ lọc hiện tại.
            </p>

          </div>


          <div className="activities-dashboard-toolbar">

            <div className="activities-search">

              <Search size={17} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Tìm hoạt động..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}

            </div>


            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    | "all"
                    | ActivityStatus
                )
              }
              className="activities-filter"
            >

              <option value="all">
                Tất cả trạng thái
              </option>

              <option value="scheduled">
                Sắp diễn ra
              </option>

              <option value="ongoing">
                Đang diễn ra
              </option>

              <option value="completed">
                Đã hoàn thành
              </option>

              <option value="cancelled">
                Đã hủy
              </option>

            </select>

          </div>

        </div>


        {/* =====================================================
            LIST
        ===================================================== */}

        {loading ? (

          <div className="activities-premium-loading">

            {Array.from({
              length: 4,
            }).map((_, index) => (

              <div
                className="activities-loading-row"
                key={index}
              >

                <div />

                <div>
                  <span />
                  <small />
                </div>

                <div />

              </div>

            ))}

          </div>

        ) : filteredActivities.length === 0 ? (

          <div className="activities-empty">

            <div className="activities-empty-icon">
              <CalendarDays size={35} />
            </div>

            <span>
              ACTIVITY SCHEDULE
            </span>

            <h3>
              Không có hoạt động phù hợp
            </h3>

            <p>
              Chưa có hoạt động nào theo
              điều kiện tìm kiếm hiện tại.
            </p>

            <div className="activities-empty-actions">

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "all"
                  );
                }}
                className="activities-dashboard-secondary"
              >
                Xóa bộ lọc
              </button>

              <button
                type="button"
                onClick={openCreate}
                className="activities-dashboard-primary"
              >
                <Plus size={16} />
                Thêm hoạt động
              </button>

            </div>

          </div>

        ) : (

          <div className="activities-timeline">

            {filteredActivities.map(
              (
                activity,
                index
              ) => {

                const registrationCount =
                  getRegistrationCount(
                    activity.id
                  );

                const attendanceCount =
                  getAttendanceCount(
                    activity.id
                  );

                const presentCount =
                  getPresentCount(
                    activity.id
                  );

                const activityAttendanceRate =
                  getActivityAttendanceRate(
                    activity.id
                  );

                return (
                  <article
                    key={activity.id}
                    className={`activity-admin-card-premium activity-status-card-${activity.status}`}
                  >

                    <div className="activity-timeline-line">

                      {index !==
                        filteredActivities.length -
                          1 && (
                        <span />
                      )}

                    </div>


                    {/* DATE */}

                    <div className="activity-date-block">

                      <span>
                        {formatDay(
                          activity.start_at
                        )}
                      </span>

                      <strong>
                        {formatMonth(
                          activity.start_at
                        )}
                      </strong>

                      <small>
                        {formatYear(
                          activity.start_at
                        )}
                      </small>

                    </div>


                    {/* MAIN */}

                    <div className="activity-admin-main-premium">

                      <div className="activity-admin-topline">

                        <div className="activity-admin-title-wrap">

                          <h3>
                            {activity.title}
                          </h3>

                          <span
                            className={`activity-status activity-status-${activity.status}`}
                          >
                            {
                              statusIcons[
                                activity.status
                              ]
                            }

                            {
                              statusLabels[
                                activity.status
                              ]
                            }
                          </span>

                        </div>

                      </div>


                      {activity.description && (
                        <p className="activity-admin-description">
                          {
                            activity.description
                          }
                        </p>
                      )}


                      <div className="activity-admin-meta-premium">

                        <span>
                          <Clock3 size={15} />

                          {formatDateTime(
                            activity.start_at
                          )}

                          {activity.end_at &&
                            ` — ${formatTime(
                              activity.end_at
                            )}`}
                        </span>

                        {activity.location && (
                          <span>
                            <MapPin size={15} />
                            {
                              activity.location
                            }
                          </span>
                        )}

                      </div>


                      {/* ACTIVITY METRICS */}

                      <div className="activity-live-metrics">

                        <div className="activity-live-metric">

                          <div className="activity-live-metric-icon blue">
                            <Users size={15} />
                          </div>

                          <div>
                            <strong>
                              {
                                registrationCount
                              }
                            </strong>

                            <span>
                              đăng ký
                            </span>
                          </div>

                        </div>


                        <div className="activity-live-metric">

                          <div className="activity-live-metric-icon green">
                            <UserCheck size={15} />
                          </div>

                          <div>
                            <strong>
                              {
                                presentCount
                              }
                            </strong>

                            <span>
                              có mặt
                            </span>
                          </div>

                        </div>


                        <div className="activity-live-metric">

                          <div className="activity-live-metric-icon purple">
                            <ClipboardCheck
                              size={15}
                            />
                          </div>

                          <div>
                            <strong>
                              {
                                activityAttendanceRate
                              }%
                            </strong>

                            <span>
                              điểm danh
                            </span>
                          </div>

                        </div>

                      </div>


                      {/* MINI PROGRESS */}

                      {attendanceCount > 0 && (
                        <div className="activity-attendance-progress">

                          <div className="activity-attendance-progress-head">

                            <span>
                              Điểm danh
                            </span>

                            <strong>
                              {presentCount}/
                              {attendanceCount}
                            </strong>

                          </div>

                          <div className="activity-attendance-track">

                            <div
                              style={{
                                width: `${activityAttendanceRate}%`,
                              }}
                            />

                          </div>

                        </div>
                      )}

                    </div>


                    {/* ACTIONS */}

                    <div className="activity-admin-actions-premium">

                      <Link
                        href={`/dashboard/activities/${activity.id}/attendance`}
                        title="Điểm danh"
                        className="activity-action-primary"
                      >
                        <ClipboardCheck
                          size={16}
                        />
                      </Link>


                      <button
                        type="button"
                        onClick={() =>
                          setRegistrationModalActivity(
                            activity
                          )
                        }
                        title="Xem đăng ký"
                        className="activity-registration-button"
                      >
                        <Users size={16} />

                        {registrationCount >
                          0 && (
                          <span>
                            {
                              registrationCount
                            }
                          </span>
                        )}

                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          openEdit(
                            activity
                          )
                        }
                        title="Chỉnh sửa"
                      >
                        <Pencil size={16} />
                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            activity
                          )
                        }
                        title="Xóa"
                        className="danger"
                      >
                        <Trash2 size={16} />
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </div>

        )}

      </section>


      {/* =====================================================
          REGISTRATION / ATTENDANCE MODAL
      ===================================================== */}

      {registrationModalActivity && (
        <div
          className="activity-registration-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setRegistrationModalActivity(
                null
              );
            }
          }}
        >

          <section className="activity-registration-modal">

            <header className="activity-registration-modal-header">

              <div>

                <span>
                  ACTIVITY PARTICIPANTS
                </span>

                <h2>
                  Đăng ký & điểm danh
                </h2>

                <p>
                  {
                    registrationModalActivity.title
                  }
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setRegistrationModalActivity(
                    null
                  )
                }
                aria-label="Đóng"
              >
                <X size={20} />
              </button>

            </header>


            <div className="activity-registration-dashboard-summary">

              <div className="activity-participant-summary-card">

                <div className="activity-participant-summary-icon blue">
                  <Users size={19} />
                </div>

                <div>
                  <strong>
                    {
                      getRegistrationCount(
                        registrationModalActivity.id
                      )
                    }
                  </strong>

                  <span>
                    đã đăng ký
                  </span>
                </div>

              </div>


              <div className="activity-participant-summary-card">

                <div className="activity-participant-summary-icon green">
                  <UserCheck size={19} />
                </div>

                <div>
                  <strong>
                    {
                      getPresentCount(
                        registrationModalActivity.id
                      )
                    }
                  </strong>

                  <span>
                    có mặt
                  </span>
                </div>

              </div>


              <div className="activity-participant-summary-card">

                <div className="activity-participant-summary-icon purple">
                  <ClipboardCheck size={19} />
                </div>

                <div>
                  <strong>
                    {
                      getActivityAttendanceRate(
                        registrationModalActivity.id
                      )
                    }%
                  </strong>

                  <span>
                    tỷ lệ điểm danh
                  </span>
                </div>

              </div>

            </div>


            <div className="activity-registration-list">

              {loadingRegistrations ||
              loadingAttendance ? (

                <div className="activity-registration-loading">

                  <RefreshCw
                    size={22}
                    className="activities-spin"
                  />

                  <span>
                    Đang tải dữ liệu đoàn viên...
                  </span>

                </div>

              ) : getActivityRegistrations(
                  registrationModalActivity.id
                ).length === 0 ? (

                <div className="activity-registration-empty">

                  <UserRound size={28} />

                  <strong>
                    Chưa có đoàn viên đăng ký
                  </strong>

                  <span>
                    Khi đoàn viên đăng ký từ
                    Cổng đoàn viên, danh sách sẽ
                    xuất hiện tại đây.
                  </span>

                </div>

              ) : (

                getActivityRegistrations(
                  registrationModalActivity.id
                ).map(
                  ({
                    registration,
                    member,
                    attendance,
                  }) => {

                    const present =
                      attendance?.present ===
                      true;

                    return (
                      <div
                        key={
                          registration.id
                        }
                        className="activity-registration-row"
                      >

                        <div className="activity-registration-avatar">

                          {member.avatar ? (
                            <img
                              src={
                                member.avatar
                              }
                              alt=""
                            />
                          ) : (
                            getInitials(
                              member.full_name
                            )
                          )}

                        </div>


                        <div className="activity-registration-member">

                          <strong>
                            {
                              member.full_name
                            }
                          </strong>

                          <span>
                            {
                              member.student_id
                            }
                            {" · "}
                            {
                              member.class_name
                            }
                          </span>

                        </div>


                        <div className="activity-registration-time">

                          <span>
                            ĐĂNG KÝ
                          </span>

                          <strong>
                            {new Date(
                              registration.registered_at
                            ).toLocaleDateString(
                              "vi-VN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )}
                          </strong>

                        </div>


                        <div
  className={`activity-attendance-state ${
    present
      ? "present"
      : "not-recorded"
  }`}
>

                          {present ? (
                            <>
                              <CheckCircle2
                                size={15}
                              />

                              Có mặt
                            </>
                          ) : (
                            <>
                              <CircleDot
                                size={15}
                              />

                              Chưa ghi nhận
                            </>
                          )}

                        </div>

                      </div>
                    );
                  }
                )

              )}

            </div>


<footer className="activity-registration-modal-footer">
  <button
    type="button"
    onClick={() =>
      setRegistrationModalActivity(null)
    }
    className="activity-registration-close"
  >
    Đóng
  </button>

  <Link
    href={
      `/dashboard/activities/` +
      registrationModalActivity.id +
      `/attendance`
    }
    className="activity-registration-attendance-link"
    onClick={() =>
      setRegistrationModalActivity(null)
    }
  >
    <ClipboardCheck size={17} />
    <span>Mở điểm danh</span>
    <ArrowRight size={16} />
  </Link>
</footer>

          </section>

        </div>
      )}


      {/* =====================================================
          CREATE / EDIT MODAL
      ===================================================== */}

      {modalOpen && (
        <div
          className="activities-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="activities-modal">

            <div className="activities-modal-header">

              <div>

                <span>
                  {editingId
                    ? "CHỈNH SỬA HOẠT ĐỘNG"
                    : "TẠO HOẠT ĐỘNG MỚI"}
                </span>

                <h2>
                  {editingId
                    ? "Cập nhật hoạt động"
                    : "Thêm hoạt động"}
                </h2>

                <p>
                  Thiết lập lịch, địa điểm,
                  trạng thái và nội dung hoạt động.
                </p>

              </div>


              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={handleSubmit}
              className="activities-modal-form"
            >

              <div className="activities-modal-field full">

                <label>
                  Tên hoạt động
                  <span>*</span>
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Sinh hoạt Chi đoàn tháng 9"
                />

              </div>


              <div className="activities-modal-grid">

                <div className="activities-modal-field">

                  <label>
                    Bắt đầu
                    <span>*</span>
                  </label>

                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) =>
                      setStartAt(
                        event.target.value
                      )
                    }
                  />

                </div>


                <div className="activities-modal-field">

                  <label>
                    Kết thúc
                  </label>

                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(event) =>
                      setEndAt(
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>


              <div className="activities-modal-field">

                <label>
                  Địa điểm
                </label>

                <input
                  value={location}
                  onChange={(event) =>
                    setLocation(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Phòng học D-K66"
                />

              </div>


              <div className="activities-modal-field">

                <label>
                  Trạng thái
                </label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target
                        .value as ActivityStatus
                    )
                  }
                >

                  <option value="scheduled">
                    Sắp diễn ra
                  </option>

                  <option value="ongoing">
                    Đang diễn ra
                  </option>

                  <option value="completed">
                    Đã hoàn thành
                  </option>

                  <option value="cancelled">
                    Đã hủy
                  </option>

                </select>

              </div>


              <div className="activities-modal-field">

                <label>
                  Mô tả
                </label>

                <textarea
                  rows={5}
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Nội dung, mục tiêu hoặc ghi chú cho hoạt động..."
                />

              </div>


              <div className="activities-form-notice">

                <CircleAlert size={17} />

                <span>
                  Hoạt động được lưu trực tiếp
                  vào hệ thống lịch sinh hoạt
                  của Chi đoàn.
                </span>

              </div>


              <div className="activities-modal-actions">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="activities-dashboard-secondary"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="activities-dashboard-primary"
                >

                  {saving ? (
                    <>
                      <span className="activities-spinner" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />

                      {editingId
                        ? "Lưu thay đổi"
                        : "Tạo hoạt động"}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </main>
  );
}


/* =========================================================
   ACTIVITY STAT
========================================================= */

function ActivityStat({
  icon,
  tone,
  label,
  value,
  detail,
  active,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  tone:
    | "blue"
    | "green"
    | "emerald"
    | "red"
    | "purple"
    | "teal";
  label: string;
  value: string | number;
  detail: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`activity-stat-card ${
        active ? "active" : ""
      } ${disabled ? "disabled" : ""}`}
    >

      <div
        className={`activity-stat-icon activity-stat-${tone}`}
      >
        {icon}
      </div>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {detail}
        </small>

      </div>

    </button>
  );
}


/* =========================================================
   DATETIME LOCAL
========================================================= */

function toDatetimeLocal(
  value: string
) {
  const date = new Date(value);

  const pad = (
    number: number
  ) =>
    String(number).padStart(
      2,
      "0"
    );

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(
    date.getDate()
  )}T${pad(
    date.getHours()
  )}:${pad(
    date.getMinutes()
  )}`;
}


/* =========================================================
   DATE
========================================================= */

function formatDay(
  value: string
) {
  return new Date(value)
    .getDate();
}

function formatMonth(
  value: string
) {
  return new Date(value)
    .toLocaleDateString(
      "vi-VN",
      {
        month: "short",
      }
    );
}

function formatYear(
  value: string
) {
  return new Date(value)
    .getFullYear();
}

function formatDateTime(
  value: string
) {
  return new Date(value)
    .toLocaleDateString(
      "vi-VN",
      {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
}

function formatTime(
  value: string
) {
  return new Date(value)
    .toLocaleTimeString(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
}


/* =========================================================
   INITIALS
========================================================= */

function getInitials(
  name: string
) {
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