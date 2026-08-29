"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Camera,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  Activity,
  BookOpen,
  Save,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { calculateRating } from "@/lib/calculateRating";

export default function NewMemberPage() {
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [gender, setGender] = useState("Nam");

  const [conductScore, setConductScore] = useState(0);
  const [activityScore, setActivityScore] = useState(0);
  const [volunteerScore, setVolunteerScore] = useState(0);
  const [disciplineScore, setDisciplineScore] = useState(0);

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [saving, setSaving] = useState(false);

  // =========================================================
  // TÍNH ĐIỂM
  // =========================================================

  const { total, rating } = calculateRating(
    conductScore,
    activityScore,
    volunteerScore,
    disciplineScore
  );

  // =========================================================
  // PREVIEW AVATAR
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
  // GIỚI HẠN ĐIỂM
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

    if (Number.isNaN(score)) {
      score = 0;
    }

    score = Math.max(0, Math.min(score, max));

    setter(score);
  }

  // =========================================================
  // LƯU
  // =========================================================

  async function handleSubmit(e: React.FormEvent) {
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

    if (
      conductScore < 0 ||
      conductScore > 30 ||
      activityScore < 0 ||
      activityScore > 30 ||
      volunteerScore < 0 ||
      volunteerScore > 20 ||
      disciplineScore < 0 ||
      disciplineScore > 20
    ) {
      alert("Điểm nhập không hợp lệ!");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!"
      );

      router.push("/login");
      return;
    }

    setSaving(true);

    try {
      let avatarUrl = "";

      // =====================================================
      // UPLOAD AVATAR
      // =====================================================

      if (avatar) {
        const extension =
          avatar.name.split(".").pop()?.toLowerCase() || "jpg";

        const fileName =
          `member-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}.${extension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("avatars")
            .upload(fileName, avatar);

        if (uploadError) {
          console.error(
            "UPLOAD AVATAR ERROR:",
            uploadError
          );

          alert(
            `Không thể upload ảnh: ${uploadError.message}`
          );

          return;
        }

        const { data } =
          supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

        avatarUrl = data.publicUrl;
      }

      // =====================================================
      // TÍNH ĐIỂM CUỐI
      // =====================================================

      const {
        total: finalTotal,
        rating: finalRating,
      } = calculateRating(
        conductScore,
        activityScore,
        volunteerScore,
        disciplineScore
      );

      // =====================================================
      // INSERT
      // =====================================================

      const { error } = await supabase
        .from("members")
        .insert([
          {
            student_id: studentId.trim(),
            full_name: fullName.trim(),
            class_name: className.trim(),
            gender,
            avatar: avatarUrl,

            conduct_score: conductScore,
            activity_score: activityScore,
            volunteer_score: volunteerScore,
            discipline_score: disciplineScore,

            total_score: finalTotal,
            rating: finalRating,
          },
        ]);

      if (error) {
        console.error(
          "SUPABASE INSERT ERROR:",
          error
        );

        alert(
          `Không thể lưu đoàn viên: ${error.message}`
        );

        return;
      }

      alert("Đã thêm đoàn viên thành công!");

      router.push("/dashboard/members");
      router.refresh();
    } catch (error) {
      console.error(
        "CREATE MEMBER ERROR:",
        error
      );

      alert(
        "Đã xảy ra lỗi khi thêm đoàn viên!"
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="member-create-page">

      {/* =====================================================
          BACKGROUND
          ===================================================== */}

      <div className="member-create-background">
        <div className="member-create-orb member-create-orb-one" />
        <div className="member-create-orb member-create-orb-two" />
        <div className="member-create-grid" />
      </div>


      {/* =====================================================
          CONTENT
          ===================================================== */}

      <div className="member-create-container">

        {/* ===================================================
            TOP NAV
            =================================================== */}

        <div className="member-create-topbar">

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/members")
            }
            className="member-create-back"
          >
            <ArrowLeft size={17} />

            <span>
              Danh sách đoàn viên
            </span>
          </button>

          <div className="member-create-topbar-badge">
            <span className="member-create-live-dot" />
            HỆ THỐNG QUẢN LÝ
          </div>

        </div>


        {/* ===================================================
            HERO
            =================================================== */}

        <section className="member-create-hero">

          <div className="member-create-hero-glow" />

          <div className="member-create-hero-icon">
            <UserPlus size={28} />
          </div>

          <div className="member-create-hero-content">

            <span className="member-create-eyebrow">
              HỒ SƠ ĐOÀN VIÊN
            </span>

            <h1>
              Thêm đoàn viên mới
            </h1>

            <p>
              Tạo hồ sơ đoàn viên và thiết lập điểm đánh giá.
              Hệ thống sẽ tự động tính tổng điểm và xếp loại.
            </p>

          </div>

          <div className="member-create-hero-meta">

            <div>
              <span>
                ĐƠN VỊ
              </span>

              <strong>
                CHI ĐOÀN D-K66
              </strong>
            </div>

            <div>
              <span>
                TỔNG ĐIỂM
              </span>

              <strong>
                {total}
                <small>/100</small>
              </strong>
            </div>

          </div>

        </section>


        {/* ===================================================
            FORM
            =================================================== */}

        <form
          onSubmit={handleSubmit}
          className="member-create-form"
        >

          {/* =================================================
              THÔNG TIN CÁ NHÂN
              ================================================= */}

          <section className="member-create-card member-create-card-main">

            <div className="member-create-card-header">

              <div className="member-create-card-title">

                <div className="member-create-card-icon blue">
                  <UserPlus size={20} />
                </div>

                <div>
                  <span>
                    THÔNG TIN
                  </span>

                  <h2>
                    Thông tin cá nhân
                  </h2>

                  <p>
                    Thông tin cơ bản của đoàn viên.
                  </p>
                </div>

              </div>

              <div className="member-create-step">
                01
              </div>

            </div>


            <div className="member-create-card-body">

              {/* MÃ */}

              <div className="member-field">

                <label>
                  Mã sinh viên
                  <span>*</span>
                </label>

                <div className="member-input-wrap">

                  <BookOpen
                    size={18}
                    className="member-input-icon"
                  />

                  <input
                    type="text"
                    placeholder="Ví dụ: D-K66-001"
                    value={studentId}
                    onChange={(e) =>
                      setStudentId(e.target.value)
                    }
                  />

                </div>

                <small>
                  Mã định danh duy nhất của đoàn viên.
                </small>

              </div>


              {/* HỌ TÊN */}

              <div className="member-field">

                <label>
                  Họ và tên
                  <span>*</span>
                </label>

                <div className="member-input-wrap">

                  <UserPlus
                    size={18}
                    className="member-input-icon"
                  />

                  <input
                    type="text"
                    placeholder="Nhập họ và tên đầy đủ"
                    value={fullName}
                    onChange={(e) =>
                      setFullName(e.target.value)
                    }
                  />

                </div>

                <small>
                  Nhập đúng họ tên theo hồ sơ.
                </small>

              </div>


              {/* LỚP */}

              <div className="member-field">

                <label>
                  Lớp
                  <span>*</span>
                </label>

                <div className="member-input-wrap">

                  <GraduationCap
                    size={18}
                    className="member-input-icon"
                  />

                  <input
                    type="text"
                    placeholder="Ví dụ: 11D"
                    value={className}
                    onChange={(e) =>
                      setClassName(e.target.value)
                    }
                  />

                </div>

                <small>
                  Ví dụ: 11D, 11A1...
                </small>

              </div>


              {/* GIỚI TÍNH */}

              <div className="member-field">

                <label>
                  Giới tính
                  <span>*</span>
                </label>

                <div className="member-gender-options">

                  <button
                    type="button"
                    onClick={() =>
                      setGender("Nam")
                    }
                    className={`member-gender-option ${
                      gender === "Nam"
                        ? "active-male"
                        : ""
                    }`}
                  >
                    <span className="member-gender-circle">
                      M
                    </span>

                    <span>
                      Nam
                    </span>
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      setGender("Nữ")
                    }
                    className={`member-gender-option ${
                      gender === "Nữ"
                        ? "active-female"
                        : ""
                    }`}
                  >
                    <span className="member-gender-circle">
                      F
                    </span>

                    <span>
                      Nữ
                    </span>
                  </button>

                </div>

              </div>


              {/* AVATAR */}

              <div className="member-avatar-field">

                <div className="member-avatar-preview">

                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Ảnh xem trước"
                    />
                  ) : (
                    <div className="member-avatar-empty">

                      <Camera size={30} />

                      <span>
                        Chưa có ảnh
                      </span>

                    </div>
                  )}

                </div>


                <div className="member-avatar-content">

                  <div>
                    <label>
                      Ảnh đại diện
                    </label>

                    <p>
                      Thêm ảnh chân dung để hồ sơ
                      dễ nhận diện hơn.
                    </p>
                  </div>

                  <label className="member-upload-button">

                    <Camera size={16} />

                    <span>
                      Chọn ảnh
                    </span>

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

                  <small>
                    JPG, PNG hoặc WebP · Khuyến nghị ảnh vuông.
                  </small>

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              ĐIỂM ĐÁNH GIÁ
              ================================================= */}

          <section className="member-create-card member-score-card">

            <div className="member-create-card-header">

              <div className="member-create-card-title">

                <div className="member-create-card-icon violet">
                  <Activity size={20} />
                </div>

                <div>
                  <span>
                    ĐÁNH GIÁ
                  </span>

                  <h2>
                    Điểm đánh giá đoàn viên
                  </h2>

                  <p>
                    Điều chỉnh điểm theo từng tiêu chí.
                  </p>
                </div>

              </div>

              <div className="member-create-step">
                02
              </div>

            </div>


            <div className="member-score-grid">

              {/* HỌC TẬP */}

              <ScoreCard
                title="Học tập"
                description="Ý thức, thái độ và kết quả học tập."
                icon={<BookOpen size={19} />}
                score={conductScore}
                max={30}
                color="blue"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    30,
                    setConductScore
                  )
                }
              />


              {/* HOẠT ĐỘNG */}

              <ScoreCard
                title="Hoạt động Đoàn"
                description="Tham gia phong trào và hoạt động tập thể."
                icon={<Activity size={19} />}
                score={activityScore}
                max={30}
                color="green"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    30,
                    setActivityScore
                  )
                }
              />


              {/* TÌNH NGUYỆN */}

              <ScoreCard
                title="Hoạt động tình nguyện"
                description="Hoạt động cộng đồng và thiện nguyện."
                icon={<HeartHandshake size={19} />}
                score={volunteerScore}
                max={20}
                color="orange"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    20,
                    setVolunteerScore
                  )
                }
              />


              {/* KỶ LUẬT */}

              <ScoreCard
                title="Ý thức và kỷ luật"
                description="Chấp hành nội quy và tinh thần trách nhiệm."
                icon={<ShieldCheck size={19} />}
                score={disciplineScore}
                max={20}
                color="red"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    20,
                    setDisciplineScore
                  )
                }
              />

            </div>

          </section>


          {/* =================================================
              SUMMARY
              ================================================= */}

          <section className="member-create-summary">

            <div className="member-summary-header">

              <div>

                <span>
                  KẾT QUẢ TỰ ĐỘNG
                </span>

                <h2>
                  Tổng kết đánh giá
                </h2>

                <p>
                  Kết quả được cập nhật ngay khi thay đổi điểm.
                </p>

              </div>

              <div className="member-summary-rating">

                <small>
                  XẾP LOẠI DỰ KIẾN
                </small>

                <strong>
                  {rating}
                </strong>

              </div>

            </div>


            <div className="member-summary-stats">

              <SummaryStat
                title="Học tập"
                value={conductScore}
                max={30}
              />

              <SummaryStat
                title="Hoạt động"
                value={activityScore}
                max={30}
              />

              <SummaryStat
                title="Tình nguyện"
                value={volunteerScore}
                max={20}
              />

              <SummaryStat
                title="Kỷ luật"
                value={disciplineScore}
                max={20}
              />

            </div>


            <div className="member-summary-total">

              <div>
                <span>
                  TỔNG ĐIỂM
                </span>

                <strong>
                  {total}
                  <small>
                    / 100
                  </small>
                </strong>
              </div>

              <div className="member-summary-progress">

                <div
                  className="member-summary-progress-bar"
                  style={{
                    width: `${Math.min(
                      total,
                      100
                    )}%`,
                  }}
                />

              </div>

              <div className="member-summary-percent">
                {total}%
              </div>

            </div>

          </section>


          {/* =================================================
              ACTIONS
              ================================================= */}

          <div className="member-create-actions">

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                router.push(
                  "/dashboard/members"
                )
              }
              className="member-create-cancel"
            >
              <ArrowLeft size={17} />
              Hủy
            </button>


            <button
              type="submit"
              disabled={saving}
              className="member-create-submit"
            >
              {saving ? (
                <>
                  <span className="member-create-spinner" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Lưu đoàn viên
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
   SCORE CARD
   ========================================================= */

function ScoreCard({
  title,
  description,
  icon,
  score,
  max,
  color,
  onChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  score: number;
  max: number;
  color: "blue" | "green" | "orange" | "red";
  onChange: (value: string) => void;
}) {
  const percentage =
    max > 0
      ? Math.min(
          (score / max) * 100,
          100
        )
      : 0;

  return (
    <div
      className={`member-score-item member-score-${color}`}
    >

      <div className="member-score-item-top">

        <div className="member-score-icon">
          {icon}
        </div>

        <span className="member-score-max">
          {max} điểm
        </span>

      </div>


      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>


      <div className="member-score-input-row">

        <input
          type="number"
          min={0}
          max={max}
          step={1}
          value={score}
          onChange={(e) =>
            onChange(e.target.value)
          }
        />

        <span>
          / {max}
        </span>

      </div>


      <div className="member-score-progress">

        <div
          className="member-score-progress-bar"
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>


      <div className="member-score-footer">

        <span>
          Mức điểm
        </span>

        <strong>
          {Math.round(percentage)}%
        </strong>

      </div>

    </div>
  );
}


/* =========================================================
   SUMMARY STAT
   ========================================================= */

function SummaryStat({
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
    <div className="member-summary-stat">

      <span>
        {title}
      </span>

      <strong>
        {value}
        <small>
          /{max}
        </small>
      </strong>

      <div className="member-summary-stat-bar">

        <div
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}