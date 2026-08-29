"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  UserRound,
  Camera,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Activity,
  HeartHandshake,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { calculateRating } from "@/lib/calculateRating";
import { SCORE_RULES } from "@/lib/scoring";

type Member = {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
  gender: string;
  avatar: string | null;

  conduct_score: number;
  activity_score: number;
  volunteer_score: number;
  discipline_score: number;
};

type ScoreColor = "blue" | "violet" | "pink" | "orange";

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [gender, setGender] = useState("Nam");

  const [conductScore, setConductScore] = useState(0);
  const [activityScore, setActivityScore] = useState(0);
  const [volunteerScore, setVolunteerScore] = useState(0);
  const [disciplineScore, setDisciplineScore] = useState(0);

  const [avatar, setAvatar] = useState<File | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  const { total, rating } = calculateRating(
    conductScore,
    activityScore,
    volunteerScore,
    disciplineScore
  );

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadMember() {
      setLoading(true);

      const { data, error } = await supabase
        .from("members")
        .select(`
          id,
          student_id,
          full_name,
          class_name,
          gender,
          avatar,
          conduct_score,
          activity_score,
          volunteer_score,
          discipline_score
        `)
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (error) {
        console.error("LOAD MEMBER ERROR:", error);
        alert("Không thể tải thông tin đoàn viên!");
        router.push("/dashboard/members");
        return;
      }

      const member = data as Member;

      setStudentId(member.student_id ?? "");
      setFullName(member.full_name ?? "");
      setClassName(member.class_name ?? "");
      setGender(member.gender ?? "Nam");

      setConductScore(Number(member.conduct_score ?? 0));
      setActivityScore(Number(member.activity_score ?? 0));
      setVolunteerScore(Number(member.volunteer_score ?? 0));
      setDisciplineScore(Number(member.discipline_score ?? 0));

      setCurrentAvatar(member.avatar ?? "");

      setLoading(false);
    }

    loadMember();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // =========================================================
  // AVATAR PREVIEW
  // =========================================================

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(avatar);

    setAvatarPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [avatar]);

  // =========================================================
  // SCORE
  // =========================================================

  function handleScoreChange(
    value: string,
    max: number,
    setter: (value: number) => void
  ) {
    if (value === "") {
      setter(0);
      return;
    }

    let score = Number(value);

    if (!Number.isFinite(score)) {
      score = 0;
    }

    score = Math.min(
      Math.max(score, 0),
      max
    );

    setter(score);
  }

  // =========================================================
  // UPLOAD
  // =========================================================

  async function uploadAvatar(file: File) {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName =
      `member-${id}-${Date.now()}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("avatars")
        .upload(fileName, file);

    if (uploadError) {
      throw new Error(
        uploadError.message
      );
    }

    const { data } =
      supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // =========================================================
  // SAVE
  // =========================================================

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (saving) return;

    if (!studentId.trim()) {
      alert("Vui lòng nhập mã sinh viên!");
      return;
    }

    if (!fullName.trim()) {
      alert("Vui lòng nhập họ tên!");
      return;
    }

    if (!className.trim()) {
      alert("Vui lòng nhập lớp!");
      return;
    }

    setSaving(true);

    try {
      let avatarUrl = currentAvatar;

      if (avatar) {
        avatarUrl =
          await uploadAvatar(avatar);
      }

      const {
        total: finalTotal,
        rating: finalRating,
      } = calculateRating(
        conductScore,
        activityScore,
        volunteerScore,
        disciplineScore
      );

      const { error } =
        await supabase
          .from("members")
          .update({
            student_id:
              studentId.trim(),

            full_name:
              fullName.trim(),

            class_name:
              className.trim(),

            gender,

            avatar:
              avatarUrl,

            conduct_score:
              conductScore,

            activity_score:
              activityScore,

            volunteer_score:
              volunteerScore,

            discipline_score:
              disciplineScore,

            total_score:
              finalTotal,

            rating:
              finalRating,
          })
          .eq("id", id);

      if (error) {
        console.error(
          "UPDATE MEMBER ERROR:",
          error
        );

        alert(
          `Không thể cập nhật: ${error.message}`
        );

        return;
      }

      alert(
        "Đã cập nhật thông tin đoàn viên!"
      );

      router.push(
        "/dashboard/members"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "SAVE MEMBER ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi cập nhật đoàn viên!"
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="member-edit-page">

        <div className="member-edit-container">

          <div className="member-edit-skeleton">

            <div className="member-edit-skeleton-back" />

            <div className="member-edit-skeleton-hero">
              <div />
              <span />
              <span />
            </div>

            <div className="member-edit-skeleton-card">
              <div />
              <div />
              <div />
              <div />
            </div>

            <div className="member-edit-skeleton-grid">
              <div />
              <div />
              <div />
              <div />
            </div>

          </div>

        </div>

      </main>
    );
  }

  const displayedAvatar =
    avatarPreview ||
    currentAvatar;

  return (
    <main className="member-edit-page">

      {/* =====================================================
          BACKGROUND
          ===================================================== */}

      <div className="member-edit-bg">
        <div className="member-edit-orb one" />
        <div className="member-edit-orb two" />
        <div className="member-edit-grid" />
      </div>


      <div className="member-edit-container">

        {/* ===================================================
            TOP BAR
            =================================================== */}

        <div className="member-edit-topbar">

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/members"
              )
            }
            className="member-edit-back"
          >
            <ArrowLeft size={17} />
            <span>
              Danh sách đoàn viên
            </span>
          </button>


          <div className="member-edit-status">
            <CheckCircle2 size={15} />
            ĐANG CHỈNH SỬA
          </div>

        </div>


        {/* ===================================================
            HERO
            =================================================== */}

        <section className="member-edit-hero">

          <div className="member-edit-hero-glow" />

          <div className="member-edit-hero-icon">
            <UserRound size={29} />
          </div>

          <div className="member-edit-hero-content">

            <span>
              HỒ SƠ ĐOÀN VIÊN
            </span>

            <h1>
              Chỉnh sửa đoàn viên
            </h1>

            <p>
              Cập nhật thông tin hồ sơ,
              ảnh đại diện và điểm đánh giá.
            </p>

          </div>

          <div className="member-edit-hero-member">

            <span>
              MÃ ĐOÀN VIÊN
            </span>

            <strong>
              {studentId}
            </strong>

          </div>

        </section>


        {/* ===================================================
            FORM
            =================================================== */}

        <form
          onSubmit={handleSubmit}
          className="member-edit-form"
        >

          {/* =================================================
              PERSONAL
              ================================================= */}

          <section className="member-edit-card">

            <div className="member-edit-card-header">

              <div className="member-edit-title-wrap">

                <div className="member-edit-icon blue">
                  <UserRound size={19} />
                </div>

                <div>

                  <span>
                    THÔNG TIN
                  </span>

                  <h2>
                    Hồ sơ cá nhân
                  </h2>

                  <p>
                    Cập nhật thông tin cơ bản của đoàn viên.
                  </p>

                </div>

              </div>

              <div className="member-edit-step">
                01
              </div>

            </div>


            <div className="member-edit-fields">

              {/* MÃ */}

              <Field
                label="Mã sinh viên"
                icon={
                  <BookOpen size={17} />
                }
                value={studentId}
                placeholder="Nhập mã sinh viên"
                onChange={setStudentId}
              />


              {/* HỌ TÊN */}

              <Field
                label="Họ và tên"
                icon={
                  <UserRound size={17} />
                }
                value={fullName}
                placeholder="Nhập họ và tên"
                onChange={setFullName}
              />


              {/* LỚP */}

              <Field
                label="Lớp"
                icon={
                  <GraduationCap size={17} />
                }
                value={className}
                placeholder="Ví dụ: 11D"
                onChange={setClassName}
              />


              {/* GIỚI TÍNH */}

              <div className="member-edit-field">

                <label>
                  Giới tính
                  <span>*</span>
                </label>

                <div className="member-edit-gender">

                  <button
                    type="button"
                    className={
                      gender === "Nam"
                        ? "active male"
                        : ""
                    }
                    onClick={() =>
                      setGender("Nam")
                    }
                  >
                    <span>
                      M
                    </span>

                    Nam
                  </button>


                  <button
                    type="button"
                    className={
                      gender === "Nữ"
                        ? "active female"
                        : ""
                    }
                    onClick={() =>
                      setGender("Nữ")
                    }
                  >
                    <span>
                      F
                    </span>

                    Nữ
                  </button>

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              AVATAR
              ================================================= */}

          <section className="member-edit-card">

            <div className="member-edit-card-header">

              <div className="member-edit-title-wrap">

                <div className="member-edit-icon violet">
                  <Camera size={19} />
                </div>

                <div>

                  <span>
                    HÌNH ẢNH
                  </span>

                  <h2>
                    Ảnh đại diện
                  </h2>

                  <p>
                    Thay đổi ảnh đại diện của đoàn viên.
                  </p>

                </div>

              </div>

              <div className="member-edit-step">
                02
              </div>

            </div>


            <div className="member-edit-avatar-area">

              <div className="member-edit-avatar-preview">

                {displayedAvatar ? (

                  <img
                    src={displayedAvatar}
                    alt={
                      fullName ||
                      "Ảnh đại diện"
                    }
                  />

                ) : (

                  <div>
                    <UserRound size={42} />
                    <span>
                      Chưa có ảnh
                    </span>
                  </div>

                )}

              </div>


              <div className="member-edit-avatar-info">

                <h3>
                  Cập nhật ảnh hồ sơ
                </h3>

                <p>
                  Ảnh mới sẽ được tải lên hệ thống
                  khi bạn lưu thay đổi.
                </p>

                <label className="member-edit-upload">

                  <Camera size={16} />

                  Chọn ảnh mới

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setAvatar(
                        e.target.files?.[0] ??
                        null
                      )
                    }
                  />

                </label>

                {avatar && (
                  <div className="member-edit-new-photo">
                    ✓ Đã chọn ảnh mới
                  </div>
                )}

                <small>
                  JPG, PNG hoặc WebP · Nên sử dụng ảnh vuông.
                </small>

              </div>

            </div>

          </section>


          {/* =================================================
              SCORE
              ================================================= */}

          <section className="member-edit-card">

            <div className="member-edit-card-header">

              <div className="member-edit-title-wrap">

                <div className="member-edit-icon emerald">
                  <Activity size={19} />
                </div>

                <div>

                  <span>
                    ĐÁNH GIÁ
                  </span>

                  <h2>
                    Điểm rèn luyện
                  </h2>

                  <p>
                    Điều chỉnh điểm theo từng tiêu chí.
                  </p>

                </div>

              </div>

              <div className="member-edit-step">
                03
              </div>

            </div>


            <div className="member-edit-score-grid">

              <EditScoreCard
                title={
                  SCORE_RULES.conduct.label
                }
                description={
                  SCORE_RULES.conduct.description
                }
                icon={
                  <BookOpen size={18} />
                }
                value={conductScore}
                max={
                  SCORE_RULES.conduct.max
                }
                color="blue"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    SCORE_RULES.conduct.max,
                    setConductScore
                  )
                }
              />


              <EditScoreCard
                title={
                  SCORE_RULES.activity.label
                }
                description={
                  SCORE_RULES.activity.description
                }
                icon={
                  <Activity size={18} />
                }
                value={activityScore}
                max={
                  SCORE_RULES.activity.max
                }
                color="violet"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    SCORE_RULES.activity.max,
                    setActivityScore
                  )
                }
              />


              <EditScoreCard
                title={
                  SCORE_RULES.volunteer.label
                }
                description={
                  SCORE_RULES.volunteer.description
                }
                icon={
                  <HeartHandshake size={18} />
                }
                value={volunteerScore}
                max={
                  SCORE_RULES.volunteer.max
                }
                color="pink"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    SCORE_RULES.volunteer.max,
                    setVolunteerScore
                  )
                }
              />


              <EditScoreCard
                title={
                  SCORE_RULES.discipline.label
                }
                description={
                  SCORE_RULES.discipline.description
                }
                icon={
                  <ShieldCheck size={18} />
                }
                value={disciplineScore}
                max={
                  SCORE_RULES.discipline.max
                }
                color="orange"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    SCORE_RULES.discipline.max,
                    setDisciplineScore
                  )
                }
              />

            </div>

          </section>


          {/* =================================================
              SUMMARY
              ================================================= */}

          <section className="member-edit-summary">

            <div className="member-edit-summary-bg" />

            <div className="member-edit-summary-header">

              <div>

                <span>
                  KẾT QUẢ TỰ ĐỘNG
                </span>

                <h2>
                  Tổng kết đánh giá
                </h2>

                <p>
                  Tổng điểm và xếp loại được cập nhật ngay lập tức.
                </p>

              </div>


              <div className="member-edit-rating">

                <small>
                  XẾP LOẠI
                </small>

                <strong>
                  {rating}
                </strong>

              </div>

            </div>


            <div className="member-edit-summary-grid">

              <SummaryItem
                title="Học tập"
                value={conductScore}
                max={SCORE_RULES.conduct.max}
              />

              <SummaryItem
                title="Hoạt động"
                value={activityScore}
                max={SCORE_RULES.activity.max}
              />

              <SummaryItem
                title="Tình nguyện"
                value={volunteerScore}
                max={SCORE_RULES.volunteer.max}
              />

              <SummaryItem
                title="Kỷ luật"
                value={disciplineScore}
                max={SCORE_RULES.discipline.max}
              />

            </div>


            <div className="member-edit-summary-total">

              <div>

                <span>
                  TỔNG ĐIỂM
                </span>

                <strong>
                  {total}
                  <small>
                    /100
                  </small>
                </strong>

              </div>


              <div className="member-edit-summary-progress">

                <div
                  style={{
                    width:
                      `${Math.min(
                        total,
                        100
                      )}%`,
                  }}
                />

              </div>


              <div className="member-edit-summary-percent">
                {total}%
              </div>

            </div>

          </section>


          {/* =================================================
              ACTIONS
              ================================================= */}

          <div className="member-edit-actions">

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                router.push(
                  "/dashboard/members"
                )
              }
              className="member-edit-cancel"
            >
              <ArrowLeft size={17} />
              Hủy
            </button>


            <button
              type="submit"
              disabled={saving}
              className="member-edit-save"
            >
              {saving ? (
                <>
                  <span className="member-edit-spinner" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Lưu thay đổi
                </>
              )}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}


/* =========================================================
   FIELD
   ========================================================= */

function Field({
  label,
  icon,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="member-edit-field">

      <label>
        {label}
        <span>*</span>
      </label>

      <div className="member-edit-input-wrap">

        <span className="member-edit-input-icon">
          {icon}
        </span>

        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) =>
            onChange(e.target.value)
          }
        />

      </div>

    </div>
  );
}


/* =========================================================
   SCORE CARD
   ========================================================= */

function EditScoreCard({
  title,
  description,
  icon,
  value,
  max,
  color,
  onChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: number;
  max: number;
  color: ScoreColor;
  onChange: (value: string) => void;
}) {
  const percentage =
    max > 0
      ? Math.min(
          (value / max) * 100,
          100
        )
      : 0;

  return (
    <div
      className={`member-edit-score-card member-edit-score-${color}`}
    >

      <div className="member-edit-score-top">

        <div className="member-edit-score-icon">
          {icon}
        </div>

        <span>
          Tối đa {max}
        </span>

      </div>


      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>


      <div className="member-edit-score-input">

        <input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
        />

        <span>
          / {max}
        </span>

      </div>


      <div className="member-edit-score-progress">

        <div
          style={{
            width:
              `${percentage}%`,
          }}
        />

      </div>


      <div className="member-edit-score-footer">

        <span>
          Mức đạt
        </span>

        <strong>
          {Math.round(percentage)}%
        </strong>

      </div>

    </div>
  );
}


/* =========================================================
   SUMMARY ITEM
   ========================================================= */

function SummaryItem({
  title,
  value,
  max,
}: {
  title: string;
  value: number;
  max: number;
}) {
  const percentage =
    max > 0
      ? Math.min(
          (value / max) * 100,
          100
        )
      : 0;

  return (
    <div className="member-edit-summary-item">

      <span>
        {title}
      </span>

      <strong>
        {value}
        <small>
          /{max}
        </small>
      </strong>

      <div>
        <span
          style={{
            width:
              `${percentage}%`,
          }}
        />
      </div>

    </div>
  );
}


/* =========================================================
   LOADING SKELETON
   ========================================================= */
