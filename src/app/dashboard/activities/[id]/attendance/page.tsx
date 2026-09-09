"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  MapPin,
  Save,
  Search,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Activity = {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
};

type Member = {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
};

type AttendanceRow = {
  member: Member;
  registered: boolean;
  checked: boolean;
  present: boolean;
  points: number;
  note: string;
};

type FilterMode = "all" | "present" | "absent" | "pending";

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();

  const activityId = String(params.id);

  const [activity, setActivity] = useState<Activity | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  async function load() {
    setLoading(true);

    const [
      activityResult,
      membersResult,
      attendanceResult,
      pointsResult,
      registrationResult,
    ] = await Promise.all([
      supabase
        .from("activities")
        .select("id,title,start_at,end_at,location")
        .eq("id", activityId)
        .single(),

      supabase
        .from("members")
        .select("id,student_id,full_name,class_name")
        .order("full_name"),

      supabase
        .from("activity_attendance")
        .select("member_id,present,note")
        .eq("activity_id", activityId),

      supabase
        .from("activity_points")
        .select("member_id,points,note")
        .eq("activity_id", activityId),

      supabase
        .from("activity_registrations")
        .select("member_id,status")
        .eq("activity_id", activityId)
        .eq("status", "registered"),
    ]);

    if (activityResult.error || !activityResult.data) {
      toast.error("Không tìm thấy hoạt động.");
      setLoading(false);
      return;
    }

    if (membersResult.error) {
      toast.error("Không thể tải danh sách đoàn viên.", {
        description: membersResult.error.message,
      });
      setLoading(false);
      return;
    }

    if (attendanceResult.error) {
      toast.error("Không thể tải dữ liệu điểm danh.", {
        description: attendanceResult.error.message,
      });
    }

    if (pointsResult.error) {
      toast.error("Không thể tải điểm hoạt động.", {
        description: pointsResult.error.message,
      });
    }

    if (registrationResult.error) {
      toast.error("Không thể tải danh sách đăng ký.", {
        description: registrationResult.error.message,
      });
    }

    const attendanceMap = new Map(
      (attendanceResult.data ?? []).map((item) => [
        item.member_id,
        item,
      ])
    );

    const pointsMap = new Map(
      (pointsResult.data ?? []).map((item) => [
        item.member_id,
        item,
      ])
    );

    const registeredIds = new Set(
      (registrationResult.data ?? []).map(
        (item) => item.member_id
      )
    );

    setActivity(activityResult.data as Activity);

    setRows(
      ((membersResult.data ?? []) as Member[]).map(
        (member) => {
          const attendance = attendanceMap.get(member.id);
          const point = pointsMap.get(member.id);

          return {
            member,
            registered: registeredIds.has(member.id),
            checked: Boolean(attendance),
            present: Boolean(attendance?.present),
            points: Number(point?.points ?? 0),
            note: String(
              point?.note ??
                attendance?.note ??
                ""
            ),
          };
        }
      )
    );

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [activityId]);

  const stats = useMemo(() => {
    const total = rows.length;
    const registered = rows.filter(
      (row) => row.registered
    ).length;

    const checked = rows.filter(
      (row) => row.checked
    ).length;

    const present = rows.filter(
      (row) => row.checked && row.present
    ).length;

    const absent = rows.filter(
      (row) => row.checked && !row.present
    ).length;

    const pending = rows.filter(
      (row) => !row.checked
    ).length;

    const rate = total
      ? Math.round((present / total) * 100)
      : 0;

    const checkedRate = total
      ? Math.round((checked / total) * 100)
      : 0;

    const registeredAttendanceRate = registered
      ? Math.round((present / registered) * 100)
      : 0;

    return {
      total,
      registered,
      checked,
      present,
      absent,
      pending,
      rate,
      checkedRate,
      registeredAttendanceRate,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !keyword ||
        row.member.full_name
          .toLowerCase()
          .includes(keyword) ||
        row.member.student_id
          .toLowerCase()
          .includes(keyword) ||
        row.member.class_name
          .toLowerCase()
          .includes(keyword);

      let matchesFilter = true;

      if (filterMode === "present") {
        matchesFilter =
          row.checked && row.present;
      }

      if (filterMode === "absent") {
        matchesFilter =
          row.checked && !row.present;
      }

      if (filterMode === "pending") {
        matchesFilter = !row.checked;
      }

      return matchesSearch && matchesFilter;
    });
  }, [rows, search, filterMode]);

  function setAll(value: boolean) {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        checked: true,
        present: value,
      }))
    );
  }

  function setRegisteredOnly(value: boolean) {
    setRows((current) =>
      current.map((row) => {
        if (!row.registered) return row;

        return {
          ...row,
          checked: true,
          present: value,
        };
      })
    );
  }

  function updateRow(
    id: number,
    patch: Partial<AttendanceRow>
  ) {
    setRows((current) =>
      current.map((row) =>
        row.member.id === id
          ? {
              ...row,
              ...patch,
            }
          : row
      )
    );
  }

  async function save() {
    if (saving) return;

    setSaving(true);

    const checkedAt = new Date().toISOString();

    const attendancePayload = rows.map(
      (row) => ({
        activity_id: activityId,
        member_id: row.member.id,
        present: row.present,
        checked_at: checkedAt,
        note:
          row.note.trim() || null,
      })
    );

    const pointsPayload = rows.map(
      (row) => ({
        activity_id: activityId,
        member_id: row.member.id,
        points: Math.max(
          0,
          Math.min(
            30,
            Number(row.points) || 0
          )
        ),
        note:
          row.note.trim() || null,
      })
    );

    const [
      attendanceResult,
      pointsResult,
    ] = await Promise.all([
      supabase
        .from("activity_attendance")
        .upsert(
          attendancePayload,
          {
            onConflict:
              "activity_id,member_id",
          }
        ),

      supabase
        .from("activity_points")
        .upsert(
          pointsPayload,
          {
            onConflict:
              "activity_id,member_id",
          }
        ),
    ]);

    if (
      attendanceResult.error ||
      pointsResult.error
    ) {
      toast.error(
        "Chưa thể lưu đầy đủ dữ liệu.",
        {
          description:
            attendanceResult.error
              ?.message ||
            pointsResult.error
              ?.message ||
            "Lỗi không xác định",
        }
      );
    } else {
      toast.success(
        "Đã lưu điểm danh và điểm hoạt động."
      );

      await load();
    }

    setSaving(false);
  }

  function exportExcel() {
    if (!activity) return;

    const data = rows.map(
      (row, index) => ({
        STT: index + 1,
        "Mã sinh viên":
          row.member.student_id,
        "Họ và tên":
          row.member.full_name,
        Lớp: row.member.class_name,
        "Đăng ký": row.registered
          ? "Đã đăng ký"
          : "Chưa đăng ký",
        "Trạng thái":
          !row.checked
            ? "Chưa điểm danh"
            : row.present
            ? "Có mặt"
            : "Vắng",
        "Điểm hoạt động":
          row.points,
        "Ghi chú":
          row.note,
      })
    );

    const workbook =
      XLSX.utils.book_new();

    const worksheet =
      XLSX.utils.json_to_sheet(data);

    worksheet["!cols"] = [
      { wch: 7 },
      { wch: 16 },
      { wch: 28 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 36 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Điểm danh"
    );

    const safeTitle =
      activity.title
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .replace(
          /[^a-zA-Z0-9]+/g,
          "-"
        )
        .replace(/^-|-$/g, "")
        .slice(0, 50);

    XLSX.writeFile(
      workbook,
      `diem-danh-${
        safeTitle || "hoat-dong"
      }.xlsx`
    );

    toast.success(
      "Đã xuất file Excel điểm danh."
    );
  }

  function formatDateTime(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getInitial(
    fullName: string
  ) {
    return (
      fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .pop()
        ?.charAt(0)
        .toUpperCase() || "Đ"
    );
  }

  if (loading) {
    return (
      <main className="attendance-page">
        <div className="attendance-shell">
          <div className="attendance-skeleton attendance-skeleton-top" />

          <div className="attendance-skeleton-grid">
            <div className="attendance-skeleton" />
            <div className="attendance-skeleton" />
            <div className="attendance-skeleton" />
            <div className="attendance-skeleton" />
          </div>

          <div className="attendance-skeleton attendance-skeleton-table" />
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!activity) {
    return null;
  }

  return (
    <main className="attendance-page">
      <div className="attendance-shell">
        {/* =====================================================
            TOP NAV
        ===================================================== */}
        <div className="attendance-topbar">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/activities"
              )
            }
            className="attendance-back"
          >
            <span className="attendance-back-icon">
              <ArrowLeft size={17} />
            </span>

            <span>
              Quản lý hoạt động
            </span>
          </button>

          <div className="attendance-top-actions">
            <button
              type="button"
              onClick={exportExcel}
              className="attendance-export"
            >
              <Download size={16} />
              <span>
                Xuất Excel
              </span>
            </button>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="attendance-save-top"
            >
              <Save size={16} />

              <span>
                {saving
                  ? "ĐANG LƯU..."
                  : "LƯU ĐIỂM DANH"}
              </span>
            </button>
          </div>
        </div>

        {/* =====================================================
            HERO
        ===================================================== */}
        <section className="attendance-hero">
          <div className="attendance-hero-pattern" />
          <div className="attendance-hero-glow one" />
          <div className="attendance-hero-glow two" />

          <div className="attendance-hero-content">
            <div className="attendance-eyebrow">
              <span className="attendance-eyebrow-icon">
                <ClipboardCheck
                  size={15}
                />
              </span>

              <span>
                QUẢN LÝ ĐIỂM DANH
              </span>

              <span className="attendance-eyebrow-dot" />

              <span>
                CHI ĐOÀN D-K66
              </span>
            </div>

            <h1>
              {activity.title}
            </h1>

            <p className="attendance-hero-description">
              Theo dõi danh sách đăng ký,
              điểm danh và điểm hoạt động
              của đoàn viên trong hoạt động
              này.
            </p>

            <div className="attendance-meta-list">
              <div className="attendance-meta-item">
                <CalendarDays
                  size={16}
                />

                <span>
                  {formatDateTime(
                    activity.start_at
                  )}
                </span>
              </div>

              <div className="attendance-meta-item">
                <Clock3 size={16} />

                <span>
                  {activity.end_at
                    ? `Kết thúc ${new Date(
                        activity.end_at
                      ).toLocaleString(
                        "vi-VN",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}`
                    : "Chưa xác định thời gian kết thúc"}
                </span>
              </div>

              {activity.location && (
                <div className="attendance-meta-item">
                  <MapPin
                    size={16}
                  />

                  <span>
                    {activity.location}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="attendance-hero-score">
            <div className="attendance-score-ring">
              <div className="attendance-score-inner">
                <strong>
                  {stats.registeredAttendanceRate}
                  <small>%</small>
                </strong>

                <span>
                  Có mặt
                </span>
              </div>
            </div>

            <div className="attendance-score-caption">
              <strong>
                {stats.present}/
                {stats.registered ||
                  stats.total}
              </strong>

              <span>
                đoàn viên tham gia
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================
            SUMMARY
        ===================================================== */}
        <section className="attendance-summary">
          <SummaryCard
            icon={
              <Users size={19} />
            }
            label="ĐÃ ĐĂNG KÝ"
            value={
              stats.registered
            }
            sub={
              `${stats.total} đoàn viên trong Chi đoàn`
            }
            tone="blue"
          />

          <SummaryCard
            icon={
              <UserCheck size={19} />
            }
            label="CÓ MẶT"
            value={
              stats.present
            }
            sub={
              `${stats.rate}% tổng danh sách`
            }
            tone="green"
          />

          <SummaryCard
            icon={
              <UserX size={19} />
            }
            label="VẮNG"
            value={
              stats.absent
            }
            sub={
              "Đã xác nhận vắng"
            }
            tone="red"
          />

          <SummaryCard
            icon={
              <ClipboardCheck
                size={19}
              />
            }
            label="CHƯA ĐIỂM DANH"
            value={
              stats.pending
            }
            sub={
              `${stats.checkedRate}% đã xử lý`
            }
            tone="amber"
          />
        </section>

        {/* =====================================================
            PROGRESS
        ===================================================== */}
        <section className="attendance-progress-card">
          <div className="attendance-progress-head">
            <div>
              <span className="section-kicker">
                TIẾN ĐỘ XỬ LÝ
              </span>

              <h2>
                Tiến độ điểm danh
              </h2>
            </div>

            <strong>
              {stats.checkedRate}%
            </strong>
          </div>

          <div className="attendance-progress-track">
            <div
              className="attendance-progress-fill"
              style={{
                width: `${stats.checkedRate}%`,
              }}
            />
          </div>

          <div className="attendance-progress-bottom">
            <span>
              <i className="progress-dot done" />
              Đã xử lý{" "}
              <strong>
                {stats.checked}
              </strong>
            </span>

            <span>
              <i className="progress-dot pending" />
              Chưa xử lý{" "}
              <strong>
                {stats.pending}
              </strong>
            </span>

            <span>
              <i className="progress-dot registered" />
              Đăng ký{" "}
              <strong>
                {stats.registered}
              </strong>
            </span>
          </div>
        </section>

        {/* =====================================================
            MAIN TABLE CARD
        ===================================================== */}
        <section className="attendance-card">
          <div className="attendance-card-header">
            <div>
              <div className="section-kicker">
                DANH SÁCH ĐOÀN VIÊN
              </div>

              <h2>
                Điểm danh hoạt động
              </h2>

              <p>
                Kiểm tra đăng ký, xác nhận
                có mặt và nhập điểm hoạt động
                cho từng đoàn viên.
              </p>
            </div>

            <div className="attendance-header-count">
              <strong>
                {filteredRows.length}
              </strong>

              <span>
                kết quả
              </span>
            </div>
          </div>

          {/* ===================================================
              TOOLBAR
          =================================================== */}
          <div className="attendance-toolbar">
            <div className="attendance-search">
              <Search size={17} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Tìm theo tên, mã sinh viên hoặc lớp..."
              />
            </div>

            <div className="attendance-filters">
              <FilterButton
                active={
                  filterMode === "all"
                }
                onClick={() =>
                  setFilterMode("all")
                }
                label="Tất cả"
                count={stats.total}
              />

              <FilterButton
                active={
                  filterMode === "present"
                }
                onClick={() =>
                  setFilterMode(
                    "present"
                  )
                }
                label="Có mặt"
                count={
                  stats.present
                }
                tone="green"
              />

              <FilterButton
                active={
                  filterMode === "absent"
                }
                onClick={() =>
                  setFilterMode(
                    "absent"
                  )
                }
                label="Vắng"
                count={stats.absent}
                tone="red"
              />

              <FilterButton
                active={
                  filterMode === "pending"
                }
                onClick={() =>
                  setFilterMode(
                    "pending"
                  )
                }
                label="Chưa điểm danh"
                count={
                  stats.pending
                }
                tone="amber"
              />
            </div>
          </div>

          {/* ===================================================
              BULK ACTIONS
          =================================================== */}
          <div className="attendance-bulk">
            <div className="attendance-bulk-info">
              <div className="attendance-bulk-icon">
                <CheckCheck
                  size={17}
                />
              </div>

              <div>
                <strong>
                  Thao tác nhanh
                </strong>

                <span>
                  Chọn trạng thái cho
                  nhiều đoàn viên cùng lúc.
                </span>
              </div>
            </div>

            <div className="attendance-bulk-actions">
              <button
                type="button"
                onClick={() =>
                  setRegisteredOnly(true)
                }
                className="bulk-button registered"
              >
                <Check
                  size={15}
                />

                Có mặt người đã đăng ký
              </button>

              <button
                type="button"
                onClick={() =>
                  setRegisteredOnly(false)
                }
                className="bulk-button neutral"
              >
                Bỏ chọn người đăng ký
              </button>

              <button
                type="button"
                onClick={() =>
                  setAll(true)
                }
                className="bulk-button green"
              >
                <CheckCheck
                  size={15}
                />
                Có mặt tất cả
              </button>

              <button
                type="button"
                onClick={() =>
                  setAll(false)
                }
                className="bulk-button red"
              >
                <UserX size={15} />
                Vắng tất cả
              </button>
            </div>
          </div>

          {/* ===================================================
              TABLE
          =================================================== */}
          <div className="attendance-table-wrap">
            <div className="attendance-table-head">
              <div className="col-person">
                ĐOÀN VIÊN
              </div>

              <div className="col-class">
                LỚP
              </div>

              <div className="col-register">
                ĐĂNG KÝ
              </div>

              <div className="col-status">
                TRẠNG THÁI
              </div>

              <div className="col-points">
                ĐIỂM
              </div>

              <div className="col-note">
                GHI CHÚ
              </div>
            </div>

            <div className="attendance-table-body">
              {filteredRows.map(
                (row, index) => {
                  const status =
                    !row.checked
                      ? "pending"
                      : row.present
                      ? "present"
                      : "absent";

                  return (
                    <article
                      key={
                        row.member.id
                      }
                      className={`attendance-row ${status}`}
                    >
                      {/* PERSON */}
                      <div className="col-person">
                        <div className="attendance-person">
                          <span className="attendance-index">
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <div className="attendance-avatar">
                            {
                              getInitial(
                                row
                                  .member
                                  .full_name
                              )
                            }
                          </div>

                          <div className="attendance-person-info">
                            <strong>
                              {
                                row
                                  .member
                                  .full_name
                              }
                            </strong>

                            <span>
                              {
                                row
                                  .member
                                  .student_id
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CLASS */}
                      <div className="col-class">
                        <span className="class-badge">
                          {
                            row.member
                              .class_name
                          }
                        </span>
                      </div>

                      {/* REGISTERED */}
                      <div className="col-register">
                        {row.registered ? (
                          <span className="registration-badge yes">
                            <CheckCircle2
                              size={
                                14
                              }
                            />

                            Đã đăng ký
                          </span>
                        ) : (
                          <span className="registration-badge no">
                            Chưa đăng ký
                          </span>
                        )}
                      </div>

                      {/* STATUS */}
                      <div className="col-status">
                        <div className="attendance-status-buttons">
                          <button
                            type="button"
                            onClick={() =>
                              updateRow(
                                row.member.id,
                                {
                                  checked:
                                    true,
                                  present:
                                    true,
                                }
                              )
                            }
                            className={`status-button present ${
                              status ===
                              "present"
                                ? "active"
                                : ""
                            }`}
                          >
                            <Check
                              size={
                                15
                              }
                            />

                            Có mặt
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateRow(
                                row.member.id,
                                {
                                  checked:
                                    true,
                                  present:
                                    false,
                                }
                              )
                            }
                            className={`status-button absent ${
                              status ===
                              "absent"
                                ? "active"
                                : ""
                            }`}
                          >
                            <UserX
                              size={
                                14
                              }
                            />

                            Vắng
                          </button>
                        </div>

                        {status ===
                          "pending" && (
                          <span className="pending-label">
                            Chưa xác nhận
                          </span>
                        )}
                      </div>

                      {/* POINTS */}
                      <div className="col-points">
                        <div className="points-input">
                          <input
                            type="number"
                            min={
                              0
                            }
                            max={
                              30
                            }
                            value={
                              row.points
                            }
                            onChange={(
                              event
                            ) =>
                              updateRow(
                                row.member.id,
                                {
                                  points:
                                    Math.max(
                                      0,
                                      Math.min(
                                        30,
                                        Number(
                                          event
                                            .target
                                            .value
                                        ) ||
                                          0
                                      )
                                    ),
                                }
                              )
                            }
                          />

                          <span>
                            /30
                          </span>
                        </div>
                      </div>

                      {/* NOTE */}
                      <div className="col-note">
                        <input
                          value={
                            row.note
                          }
                          onChange={(
                            event
                          ) =>
                            updateRow(
                              row.member.id,
                              {
                                note: event
                                  .target
                                  .value,
                              }
                            )
                          }
                          placeholder="Nhập ghi chú..."
                        />
                      </div>
                    </article>
                  );
                }
              )}

              {filteredRows.length ===
                0 && (
                <div className="attendance-empty">
                  <div className="attendance-empty-icon">
                    <Search
                      size={24}
                    />
                  </div>

                  <strong>
                    Không tìm thấy đoàn viên
                  </strong>

                  <span>
                    Hãy thử thay đổi từ khóa
                    hoặc bộ lọc.
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilterMode(
                        "all"
                      );
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ===================================================
              FOOTER ACTION
          =================================================== */}
          <div className="attendance-card-footer">
            <div className="attendance-footer-note">
              <div className="attendance-footer-icon">
                <ClipboardCheck
                  size={17}
                />
              </div>

              <div>
                <strong>
                  Kiểm tra trước khi lưu
                </strong>

                <span>
                  Dữ liệu điểm danh và điểm hoạt động
                  sẽ được cập nhật vào hệ thống.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="attendance-main-save"
            >
              <Save size={17} />

              {saving
                ? "ĐANG LƯU..."
                : "LƯU ĐIỂM DANH"}
            </button>
          </div>
        </section>

        {/* =====================================================
            FOOTER
        ===================================================== */}
        <footer className="attendance-footer">
          <span>
            CHI ĐOÀN D-K66
          </span>

          <span className="attendance-footer-line" />

          <span>
            HỆ THỐNG QUẢN LÝ HOẠT ĐỘNG
          </span>

          <span className="attendance-footer-line" />

          <span>
            {activity.title}
          </span>
        </footer>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  sub: string;
  tone:
    | "blue"
    | "green"
    | "red"
    | "amber";
}) {
  return (
    <article
      className={`summary-card ${tone}`}
    >
      <div className="summary-card-top">
        <div className="summary-icon">
          {icon}
        </div>

        <span className="summary-label">
          {label}
        </span>
      </div>

      <div className="summary-card-bottom">
        <strong>
          {value}
        </strong>

        <span>
          {sub}
        </span>
      </div>
    </article>
  );
}

/* ============================================================
   FILTER BUTTON
============================================================ */

function FilterButton({
  active,
  onClick,
  label,
  count,
  tone = "blue",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?:
    | "blue"
    | "green"
    | "red"
    | "amber";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-button ${
        active ? `active ${tone}` : ""
      }`}
    >
      <span>
        {label}
      </span>

      <strong>
        {count}
      </strong>
    </button>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = `
  * {
    box-sizing: border-box;
  }

  .attendance-page {
    min-height: 100%;
    width: 100%;
    background:
      radial-gradient(
        circle at 85% 0%,
        rgba(0, 91, 172, 0.06),
        transparent 28%
      ),
      linear-gradient(
        180deg,
        #f7faff 0%,
        #f3f6fa 100%
      );
    color: #172033;
    padding: 28px 34px 60px;
  }

  .attendance-shell {
    width: 100%;
    max-width: 1480px;
    margin: 0 auto;
  }

  /* ==========================================================
     SKELETON
  ========================================================== */

  .attendance-skeleton {
    border-radius: 26px;
    background:
      linear-gradient(
        90deg,
        #edf1f6 20%,
        #f7f9fb 35%,
        #edf1f6 50%
      );
    background-size: 200% 100%;
    animation: attendanceShimmer 1.4s infinite;
  }

  .attendance-skeleton-top {
    height: 160px;
  }

  .attendance-skeleton-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-top: 18px;
  }

  .attendance-skeleton-grid
    .attendance-skeleton {
    height: 150px;
  }

  .attendance-skeleton-table {
    height: 620px;
    margin-top: 18px;
  }

  @keyframes attendanceShimmer {
    0% {
      background-position: 200% 0;
    }

    100% {
      background-position: -200% 0;
    }
  }

  /* ==========================================================
     TOP BAR
  ========================================================== */

  .attendance-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .attendance-back,
  .attendance-export,
  .attendance-save-top {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    border: 0;
    cursor: pointer;
    font: inherit;
  }

  .attendance-back {
    color: #596579;
    background: transparent;
    padding: 0;
    font-size: 13px;
    font-weight: 800;
    transition:
      color 0.2s ease,
      transform 0.2s ease;
  }

  .attendance-back:hover {
    color: #005bac;
    transform: translateX(-2px);
  }

  .attendance-back-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: #fff;
    border: 1px solid #e5ebf2;
    box-shadow:
      0 5px 18px rgba(28, 50, 76, 0.06);
  }

  .attendance-top-actions {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .attendance-export,
  .attendance-save-top {
    min-height: 42px;
    border-radius: 12px;
    padding: 0 15px;
    font-size: 12px;
    font-weight: 900;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;
  }

  .attendance-export {
    color: #176044;
    background: #ecf9f3;
    border: 1px solid #c9eadb;
  }

  .attendance-export:hover {
    background: #e0f5ec;
    transform: translateY(-1px);
  }

  .attendance-save-top {
    color: #fff;
    background: #005bac;
    box-shadow:
      0 9px 24px rgba(0, 91, 172, 0.17);
  }

  .attendance-save-top:hover {
    transform: translateY(-1px);
    box-shadow:
      0 12px 28px rgba(0, 91, 172, 0.24);
  }

  .attendance-save-top:disabled {
    cursor: wait;
    opacity: 0.65;
    transform: none;
  }

  /* ==========================================================
     HERO
  ========================================================== */

  .attendance-hero {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    gap: 35px;
    min-height: 300px;
    overflow: hidden;
    border-radius: 30px;
    padding: 37px 42px;
    background:
      linear-gradient(
        132deg,
        #082c53 0%,
        #005bac 53%,
        #097ec9 100%
      );
    box-shadow:
      0 24px 70px rgba(4, 57, 105, 0.19);
    isolation: isolate;
  }

  .attendance-hero-pattern {
    position: absolute;
    inset: 0;
    opacity: 0.13;
    background-image:
      linear-gradient(
        rgba(255,255,255,0.18) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(255,255,255,0.18) 1px,
        transparent 1px
      );
    background-size: 34px 34px;
    mask-image:
      linear-gradient(
        to bottom right,
        black,
        transparent 70%
      );
    pointer-events: none;
    z-index: -1;
  }

  .attendance-hero-glow {
    position: absolute;
    border-radius: 999px;
    filter: blur(10px);
    pointer-events: none;
    z-index: -1;
  }

  .attendance-hero-glow.one {
    width: 300px;
    height: 300px;
    top: -180px;
    right: 140px;
    background: rgba(72, 209, 255, 0.2);
  }

  .attendance-hero-glow.two {
    width: 280px;
    height: 280px;
    bottom: -190px;
    left: 15%;
    background: rgba(255,255,255,0.08);
  }

  .attendance-hero-content {
    position: relative;
    z-index: 2;
    min-width: 0;
    flex: 1;
  }

  .attendance-eyebrow {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: rgba(255,255,255,0.76);
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.14em;
  }

  .attendance-eyebrow-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 9px;
    background: rgba(255,255,255,0.08);
  }

  .attendance-eyebrow-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255,255,255,0.45);
    margin: 0 2px;
  }

  .attendance-hero h1 {
    max-width: 920px;
    margin: 22px 0 0;
    color: #fff;
    font-size: clamp(2.1rem, 4vw, 4.25rem);
    line-height: 0.99;
    letter-spacing: -0.055em;
    font-weight: 950;
  }

  .attendance-hero-description {
    max-width: 710px;
    margin: 17px 0 0;
    color: rgba(255,255,255,0.72);
    font-size: 14px;
    line-height: 1.75;
    font-weight: 600;
  }

  .attendance-meta-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 27px;
  }

  .attendance-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 38px;
    max-width: 100%;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    background: rgba(255,255,255,0.08);
    padding: 0 12px;
    color: rgba(255,255,255,0.82);
    font-size: 11px;
    font-weight: 750;
    backdrop-filter: blur(8px);
  }

  .attendance-meta-item svg {
    flex: 0 0 auto;
    color: #8bd8ff;
  }

  .attendance-hero-score {
    width: 250px;
    flex: 0 0 250px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 26px;
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(16px);
  }

  .attendance-score-ring {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 155px;
    height: 155px;
    border-radius: 50%;
    background:
      conic-gradient(
        #71e2b0 0deg,
        #71e2b0 var(--attendance-progress, 0deg),
        rgba(255,255,255,0.13) var(--attendance-progress, 0deg),
        rgba(255,255,255,0.13) 360deg
      );
  }

  .attendance-score-ring::before {
    content: "";
    position: absolute;
    inset: 8px;
    border-radius: inherit;
    background: #07558f;
  }

  .attendance-score-inner {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .attendance-score-inner strong {
    color: #fff;
    font-size: 34px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .attendance-score-inner strong small {
    font-size: 16px;
    margin-left: 2px;
  }

  .attendance-score-inner span {
    margin-top: 7px;
    color: rgba(255,255,255,0.56);
    font-size: 10px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .attendance-score-caption {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 17px;
    color: rgba(255,255,255,0.55);
    font-size: 11px;
    font-weight: 700;
  }

  .attendance-score-caption strong {
    color: #fff;
    font-size: 12px;
    font-weight: 950;
  }

  /* ==========================================================
     SUMMARY
  ========================================================== */

  .attendance-summary {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-top: 17px;
  }

  .summary-card {
    position: relative;
    overflow: hidden;
    min-height: 150px;
    border: 1px solid #e2e8ef;
    border-radius: 22px;
    background: #fff;
    padding: 18px;
    box-shadow:
      0 10px 30px rgba(29, 48, 71, 0.055);
  }

  .summary-card::after {
    content: "";
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    right: -54px;
    bottom: -65px;
    opacity: 0.55;
    filter: blur(6px);
  }

  .summary-card.blue::after {
    background: #dceefe;
  }

  .summary-card.green::after {
    background: #d9f6e9;
  }

  .summary-card.red::after {
    background: #fee2e2;
  }

  .summary-card.amber::after {
    background: #ffefcf;
  }

  .summary-card-top {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .summary-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 13px;
  }

  .summary-card.blue .summary-icon {
    color: #005bac;
    background: #edf6ff;
  }

  .summary-card.green .summary-icon {
    color: #148359;
    background: #e9f8f1;
  }

  .summary-card.red .summary-icon {
    color: #d34d54;
    background: #fff0f1;
  }

  .summary-card.amber .summary-icon {
    color: #a66b00;
    background: #fff7e4;
  }

  .summary-label {
    color: #8993a4;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.12em;
  }

  .summary-card-bottom {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    margin-top: 18px;
  }

  .summary-card-bottom strong {
    color: #172033;
    font-size: 35px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .summary-card-bottom span {
    margin-top: 7px;
    color: #9aa3b1;
    font-size: 10px;
    font-weight: 700;
  }

  /* ==========================================================
     PROGRESS
  ========================================================== */

  .attendance-progress-card {
    margin-top: 17px;
    padding: 21px 23px;
    border: 1px solid #e2e8ef;
    border-radius: 22px;
    background: #fff;
    box-shadow:
      0 10px 30px rgba(29, 48, 71, 0.045);
  }

  .attendance-progress-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
  }

  .section-kicker {
    color: #97a1ae;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 0.15em;
  }

  .attendance-progress-head h2,
  .attendance-card-header h2 {
    margin: 5px 0 0;
    color: #172033;
    font-size: 18px;
    line-height: 1.2;
    font-weight: 950;
    letter-spacing: -0.035em;
  }

  .attendance-progress-head > strong {
    color: #005bac;
    font-size: 21px;
    font-weight: 950;
  }

  .attendance-progress-track {
    width: 100%;
    height: 10px;
    margin-top: 17px;
    overflow: hidden;
    border-radius: 999px;
    background: #edf1f5;
  }

  .attendance-progress-fill {
    height: 100%;
    min-width: 0;
    border-radius: inherit;
    background:
      linear-gradient(
        90deg,
        #005bac 0%,
        #23a5f4 100%
      );
    transition: width 0.35s ease;
  }

  .attendance-progress-bottom {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 13px;
  }

  .attendance-progress-bottom span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #8d98a7;
    font-size: 10px;
    font-weight: 750;
  }

  .attendance-progress-bottom strong {
    color: #3e4a5c;
  }

  .progress-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .progress-dot.done {
    background: #24ae78;
  }

  .progress-dot.pending {
    background: #e1a229;
  }

  .progress-dot.registered {
    background: #278bc9;
  }

  /* ==========================================================
     MAIN CARD
  ========================================================== */

  .attendance-card {
    overflow: hidden;
    margin-top: 17px;
    border: 1px solid #dfe6ee;
    border-radius: 28px;
    background: #fff;
    box-shadow:
      0 18px 55px rgba(31, 49, 71, 0.065);
  }

  .attendance-card-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 25px 26px 22px;
    border-bottom: 1px solid #edf1f4;
  }

  .attendance-card-header p {
    max-width: 670px;
    margin: 8px 0 0;
    color: #8a95a4;
    font-size: 11px;
    line-height: 1.65;
    font-weight: 650;
  }

  .attendance-header-count {
    align-self: center;
    display: flex;
    align-items: baseline;
    gap: 7px;
    white-space: nowrap;
  }

  .attendance-header-count strong {
    color: #172033;
    font-size: 25px;
    font-weight: 950;
  }

  .attendance-header-count span {
    color: #9aa4b0;
    font-size: 10px;
    font-weight: 750;
  }

  /* ==========================================================
     TOOLBAR
  ========================================================== */

  .attendance-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 15px 19px;
    border-bottom: 1px solid #edf1f4;
    background: #fbfcfd;
  }

  .attendance-search {
    display: flex;
    align-items: center;
    gap: 10px;
    width: min(430px, 100%);
    height: 43px;
    padding: 0 13px;
    border: 1px solid #e0e6ec;
    border-radius: 12px;
    background: #fff;
    color: #9ba4b2;
    box-shadow:
      0 4px 14px rgba(31, 49, 71, 0.025);
  }

  .attendance-search:focus-within {
    border-color: #8ebdde;
    box-shadow:
      0 0 0 4px rgba(0, 91, 172, 0.07);
  }

  .attendance-search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: #263246;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
  }

  .attendance-search input::placeholder {
    color: #aeb7c2;
  }

  .attendance-filters {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .filter-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 37px;
    border: 1px solid #e2e8ee;
    border-radius: 10px;
    padding: 0 10px;
    cursor: pointer;
    background: #fff;
    color: #788596;
    font-size: 10px;
    font-weight: 850;
    transition:
      border-color 0.2s ease,
      background 0.2s ease,
      color 0.2s ease;
  }

  .filter-button strong {
    min-width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #f2f5f8;
    color: #8994a2;
    font-size: 9px;
  }

  .filter-button:hover {
    border-color: #cbd5df;
  }

  .filter-button.active {
    color: #fff;
    border-color: transparent;
  }

  .filter-button.active strong {
    color: inherit;
    background: rgba(255,255,255,0.18);
  }

  .filter-button.active.blue {
    background: #005bac;
  }

  .filter-button.active.green {
    background: #1b9568;
  }

  .filter-button.active.red {
    background: #ce5961;
  }

  .filter-button.active.amber {
    background: #c48719;
  }

  /* ==========================================================
     BULK
  ========================================================== */

  .attendance-bulk {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 14px 19px;
    background: #f8fafc;
    border-bottom: 1px solid #e8edf2;
  }

  .attendance-bulk-info {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .attendance-bulk-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 10px;
    background: #e7f2fb;
    color: #005bac;
  }

  .attendance-bulk-info div:last-child {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .attendance-bulk-info strong {
    color: #465365;
    font-size: 10px;
    font-weight: 950;
  }

  .attendance-bulk-info span {
    margin-top: 2px;
    color: #9ba5b2;
    font-size: 9px;
    font-weight: 650;
  }

  .attendance-bulk-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .bulk-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 34px;
    border-radius: 9px;
    padding: 0 10px;
    cursor: pointer;
    font: inherit;
    font-size: 9px;
    font-weight: 900;
    transition:
      transform 0.18s ease,
      background 0.18s ease;
  }

  .bulk-button:hover {
    transform: translateY(-1px);
  }

  .bulk-button.registered {
    color: #005bac;
    background: #edf6ff;
    border: 1px solid #d2e8fa;
  }

  .bulk-button.neutral {
    color: #697789;
    background: #fff;
    border: 1px solid #dde4eb;
  }

  .bulk-button.green {
    color: #137c55;
    background: #eaf8f1;
    border: 1px solid #cdeadd;
  }

  .bulk-button.red {
    color: #c04e57;
    background: #fff0f1;
    border: 1px solid #f3d2d5;
  }

  /* ==========================================================
     TABLE
  ========================================================== */

  .attendance-table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  .attendance-table-head,
  .attendance-row {
    display: grid;
    grid-template-columns:
      minmax(245px, 1.45fr)
      minmax(90px, 0.55fr)
      minmax(125px, 0.7fr)
      minmax(198px, 1.1fr)
      minmax(95px, 0.55fr)
      minmax(190px, 1fr);
    min-width: 1050px;
  }

  .attendance-table-head {
    align-items: center;
    padding: 12px 19px;
    background: #fafbfc;
    border-bottom: 1px solid #edf1f4;
    color: #a0a9b5;
    font-size: 8px;
    font-weight: 950;
    letter-spacing: 0.12em;
  }

  .attendance-row {
    min-height: 91px;
    align-items: center;
    padding: 12px 19px;
    border-bottom: 1px solid #edf1f4;
    transition:
      background 0.18s ease,
      box-shadow 0.18s ease;
  }

  .attendance-row:hover {
    background: #fbfdff;
  }

  .attendance-row.present {
    background:
      linear-gradient(
        90deg,
        rgba(236, 251, 244, 0.42),
        transparent 40%
      );
  }

  .attendance-row.absent {
    background:
      linear-gradient(
        90deg,
        rgba(255, 242, 243, 0.36),
        transparent 40%
      );
  }

  .attendance-row.pending {
    background:
      linear-gradient(
        90deg,
        rgba(255, 248, 231, 0.28),
        transparent 40%
      );
  }

  .col-person,
  .col-class,
  .col-register,
  .col-status,
  .col-points,
  .col-note {
    min-width: 0;
  }

  .attendance-person {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }

  .attendance-index {
    width: 24px;
    flex: 0 0 24px;
    color: #c3cad3;
    font-size: 9px;
    font-weight: 950;
    text-align: center;
  }

  .attendance-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border-radius: 13px;
    color: #005bac;
    background:
      linear-gradient(
        145deg,
        #edf7ff,
        #dceeff
      );
    border: 1px solid #d7e9f9;
    font-size: 13px;
    font-weight: 950;
  }

  .attendance-person-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .attendance-person-info strong {
    overflow: hidden;
    color: #253044;
    font-size: 11px;
    line-height: 1.35;
    font-weight: 950;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attendance-person-info span {
    margin-top: 4px;
    color: #9aa5b2;
    font-size: 9px;
    font-weight: 750;
  }

  .class-badge {
    display: inline-flex;
    align-items: center;
    min-height: 29px;
    border-radius: 9px;
    padding: 0 9px;
    background: #f4f6f9;
    color: #596678;
    font-size: 9px;
    font-weight: 900;
  }

  .registration-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 29px;
    border-radius: 9px;
    padding: 0 9px;
    font-size: 9px;
    font-weight: 900;
  }

  .registration-badge.yes {
    color: #137853;
    background: #eaf8f1;
    border: 1px solid #cfeadd;
  }

  .registration-badge.no {
    color: #9ba3ae;
    background: #f4f5f7;
    border: 1px solid #e7eaee;
  }

  .attendance-status-buttons {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .status-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 31px;
    border: 1px solid #dfe5eb;
    border-radius: 9px;
    padding: 0 9px;
    cursor: pointer;
    background: #fff;
    color: #8792a0;
    font: inherit;
    font-size: 9px;
    font-weight: 900;
    transition:
      background 0.18s ease,
      color 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
  }

  .status-button:hover {
    transform: translateY(-1px);
  }

  .status-button.present.active {
    color: #fff;
    background: #1a986a;
    border-color: #1a986a;
    box-shadow:
      0 6px 15px rgba(26, 152, 106, 0.16);
  }

  .status-button.absent.active {
    color: #fff;
    background: #cf5962;
    border-color: #cf5962;
    box-shadow:
      0 6px 15px rgba(207, 89, 98, 0.15);
  }

  .pending-label {
    display: block;
    margin-top: 5px;
    color: #bf861f;
    font-size: 8px;
    font-weight: 850;
  }

  .points-input {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 35px;
    border: 1px solid #e0e7ed;
    border-radius: 9px;
    background: #fff;
    padding: 0 8px;
  }

  .points-input:focus-within {
    border-color: #83b7dc;
    box-shadow:
      0 0 0 3px rgba(0, 91, 172, 0.06);
  }

  .points-input input {
    width: 38px;
    border: 0;
    outline: none;
    background: transparent;
    color: #005bac;
    font: inherit;
    font-size: 11px;
    font-weight: 950;
    text-align: center;
  }

  .points-input input::-webkit-outer-spin-button,
  .points-input input::-webkit-inner-spin-button {
    margin: 0;
    appearance: none;
  }

  .points-input span {
    color: #a3adb8;
    font-size: 8px;
    font-weight: 850;
  }

  .col-note input {
    width: 100%;
    height: 35px;
    border: 1px solid #e0e7ed;
    border-radius: 9px;
    outline: none;
    background: #fff;
    padding: 0 10px;
    color: #455366;
    font: inherit;
    font-size: 9px;
    font-weight: 700;
  }

  .col-note input::placeholder {
    color: #b1bac4;
  }

  .col-note input:focus {
    border-color: #83b7dc;
    box-shadow:
      0 0 0 3px rgba(0, 91, 172, 0.06);
  }

  /* ==========================================================
     EMPTY
  ========================================================== */

  .attendance-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 350px;
    padding: 35px;
    text-align: center;
  }

  .attendance-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 58px;
    border-radius: 17px;
    color: #7c8998;
    background: #f1f4f7;
  }

  .attendance-empty strong {
    margin-top: 15px;
    color: #3c4859;
    font-size: 14px;
    font-weight: 950;
  }

  .attendance-empty span {
    margin-top: 5px;
    color: #9ea8b4;
    font-size: 10px;
    font-weight: 650;
  }

  .attendance-empty button {
    margin-top: 16px;
    border: 0;
    cursor: pointer;
    border-radius: 9px;
    padding: 8px 12px;
    color: #005bac;
    background: #edf6ff;
    font: inherit;
    font-size: 9px;
    font-weight: 900;
  }

  /* ==========================================================
     FOOTER ACTION
  ========================================================== */

  .attendance-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 17px 19px;
    background: #fbfcfd;
    border-top: 1px solid #edf1f4;
  }

  .attendance-footer-note {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .attendance-footer-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 35px;
    height: 35px;
    flex: 0 0 35px;
    border-radius: 10px;
    color: #005bac;
    background: #eaf4fc;
  }

  .attendance-footer-note div:last-child {
    display: flex;
    flex-direction: column;
  }

  .attendance-footer-note strong {
    color: #4b586a;
    font-size: 10px;
    font-weight: 950;
  }

  .attendance-footer-note span {
    margin-top: 2px;
    color: #99a3af;
    font-size: 9px;
    font-weight: 650;
  }

  .attendance-main-save {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    flex: 0 0 auto;
    border: 0;
    border-radius: 11px;
    padding: 0 18px;
    cursor: pointer;
    color: #fff;
    background: #005bac;
    box-shadow:
      0 9px 24px rgba(0, 91, 172, 0.17);
    font: inherit;
    font-size: 10px;
    font-weight: 950;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .attendance-main-save:hover {
    transform: translateY(-1px);
    box-shadow:
      0 12px 28px rgba(0, 91, 172, 0.23);
  }

  .attendance-main-save:disabled {
    cursor: wait;
    opacity: 0.6;
    transform: none;
  }

  /* ==========================================================
     PAGE FOOTER
  ========================================================== */

  .attendance-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 11px;
    margin-top: 26px;
    color: #a7b0bb;
    font-size: 8px;
    font-weight: 950;
    letter-spacing: 0.12em;
  }

  .attendance-footer-line {
    width: 24px;
    height: 1px;
    background: #d7dde4;
  }

  /* ==========================================================
     RESPONSIVE
  ========================================================== */

  @media (max-width: 1180px) {
    .attendance-page {
      padding-left: 24px;
      padding-right: 24px;
    }

    .attendance-hero {
      padding: 32px;
    }

    .attendance-hero-score {
      width: 215px;
      flex-basis: 215px;
    }

    .attendance-summary {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .attendance-toolbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .attendance-search {
      width: 100%;
      max-width: none;
    }

    .attendance-filters {
      justify-content: flex-start;
    }

    .attendance-bulk {
      align-items: flex-start;
      flex-direction: column;
    }

    .attendance-bulk-actions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 850px) {
    .attendance-page {
      padding: 18px 15px 45px;
    }

    .attendance-topbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .attendance-top-actions {
      width: 100%;
    }

    .attendance-export,
    .attendance-save-top {
      flex: 1;
      justify-content: center;
    }

    .attendance-hero {
      flex-direction: column;
      min-height: unset;
      padding: 27px 23px;
    }

    .attendance-hero h1 {
      font-size: clamp(
        2rem,
        9vw,
        3.3rem
      );
    }

    .attendance-hero-score {
      width: 100%;
      flex-basis: auto;
      flex-direction: row;
      gap: 22px;
    }

    .attendance-score-ring {
      width: 125px;
      height: 125px;
      flex: 0 0 125px;
    }

    .attendance-score-caption {
      margin-top: 0;
      flex-direction: column;
      align-items: flex-start;
    }

    .attendance-card-header {
      padding: 21px;
    }

    .attendance-card-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .attendance-main-save {
      width: 100%;
    }
  }

  @media (max-width: 620px) {
    .attendance-page {
      padding-left: 11px;
      padding-right: 11px;
    }

    .attendance-topbar {
      margin-bottom: 13px;
    }

    .attendance-top-actions {
      gap: 7px;
    }

    .attendance-export span,
    .attendance-save-top span {
      font-size: 9px;
    }

    .attendance-hero {
      border-radius: 23px;
      padding: 23px 18px;
    }

    .attendance-eyebrow {
      font-size: 8px;
    }

    .attendance-eyebrow-icon {
      width: 24px;
      height: 24px;
    }

    .attendance-hero-description {
      font-size: 12px;
    }

    .attendance-meta-list {
      gap: 7px;
    }

    .attendance-meta-item {
      width: 100%;
      font-size: 10px;
    }

    .attendance-summary {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 9px;
    }

    .summary-card {
      min-height: 126px;
      padding: 13px;
      border-radius: 17px;
    }

    .summary-icon {
      width: 35px;
      height: 35px;
      border-radius: 10px;
    }

    .summary-label {
      font-size: 7px;
      text-align: right;
    }

    .summary-card-bottom {
      margin-top: 13px;
    }

    .summary-card-bottom strong {
      font-size: 28px;
    }

    .attendance-progress-card {
      border-radius: 17px;
      padding: 16px;
    }

    .attendance-progress-bottom {
      gap: 9px;
    }

    .attendance-card {
      border-radius: 21px;
    }

    .attendance-card-header {
      flex-direction: column;
      padding: 18px;
    }

    .attendance-header-count {
      align-self: flex-start;
    }

    .attendance-toolbar,
    .attendance-bulk {
      padding-left: 13px;
      padding-right: 13px;
    }

    .attendance-filters {
      width: 100%;
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .filter-button {
      justify-content: space-between;
    }

    .attendance-bulk-actions {
      width: 100%;
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .bulk-button {
      justify-content: center;
    }

    .attendance-table-head,
    .attendance-row {
      min-width: 1050px;
    }

    .attendance-card-footer {
      padding: 15px 13px;
    }

    .attendance-footer-note {
      align-items: flex-start;
    }

    .attendance-footer {
      font-size: 7px;
      letter-spacing: 0.08em;
    }
  }
`;