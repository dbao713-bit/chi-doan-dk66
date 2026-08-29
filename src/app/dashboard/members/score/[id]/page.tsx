"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  UserRound,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Activity,
  HeartHandshake,
  Trophy,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { calculateRating } from "@/lib/calculateRating";
import { SCORE_RULES } from "@/lib/scoring";

type ScoreKey = keyof typeof SCORE_RULES;

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

export default function ScorePage() {
  const { id } = useParams();
  const router = useRouter();

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [conductScore, setConductScore] = useState(0);
  const [activityScore, setActivityScore] = useState(0);
  const [volunteerScore, setVolunteerScore] = useState(0);
  const [disciplineScore, setDisciplineScore] = useState(0);

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

      const dataMember = data as Member;

      setMember(dataMember);

      setConductScore(Number(dataMember.conduct_score ?? 0));
      setActivityScore(Number(dataMember.activity_score ?? 0));
      setVolunteerScore(Number(dataMember.volunteer_score ?? 0));
      setDisciplineScore(Number(dataMember.discipline_score ?? 0));

      setLoading(false);
    }

    loadMember();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const preview = calculateRating(
    conductScore,
    activityScore,
    volunteerScore,
    disciplineScore
  );

  function setScore(key: ScoreKey, value: number) {
    switch (key) {
      case "conduct":
        setConductScore(value);
        break;

      case "activity":
        setActivityScore(value);
        break;

      case "volunteer":
        setVolunteerScore(value);
        break;

      case "discipline":
        setDisciplineScore(value);
        break;
    }
  }

  function handleScoreChange(
    key: ScoreKey,
    value: string
  ) {
    const max = SCORE_RULES[key].max;

    if (value === "") {
      setScore(key, 0);
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

    setScore(key, score);
  }

  async function saveScore() {
    if (saving) return;

    if (!member) return;

    setSaving(true);

    try {
      const { total, rating } = calculateRating(
        conductScore,
        activityScore,
        volunteerScore,
        disciplineScore
      );

      const { error } = await supabase
        .from("members")
        .update({
          conduct_score: conductScore,
          activity_score: activityScore,
          volunteer_score: volunteerScore,
          discipline_score: disciplineScore,
          total_score: total,
          rating,
        })
        .eq("id", id);

      if (error) {
        console.error("SAVE SCORE ERROR:", error);
        alert(`Không thể lưu điểm: ${error.message}`);
        return;
      }

      alert("Đã lưu điểm đoàn viên!");

      router.push("/dashboard/members");
      router.refresh();
    } catch (error) {
      console.error("SAVE SCORE ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi lưu điểm!"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!member) {
    return null;
  }

  const displayedAvatar = member.avatar;

  return (
    <main className="score-page">

      {/* =====================================================
          BACKGROUND
          ===================================================== */}

      <div className="score-bg">
        <div className="score-orb score-orb-one" />
        <div className="score-orb score-orb-two" />
        <div className="score-grid" />
      </div>

      <div className="score-container">

        {/* ===================================================
            TOP BAR
            =================================================== */}

        <div className="score-topbar">

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/members")
            }
            disabled={saving}
            className="score-back"
          >
            <ArrowLeft size={17} />
            <span>Danh sách đoàn viên</span>
          </button>

          <div className="score-status">
            <CheckCircle2 size={15} />
            ĐANG CHẤM ĐIỂM
          </div>

        </div>


        {/* ===================================================
            HERO
            =================================================== */}

        <section className="score-hero">

          <div className="score-hero-glow" />

          <div className="score-hero-avatar">

            {displayedAvatar ? (
              <img
                src={displayedAvatar}
                alt={member.full_name}
              />
            ) : (
              <UserRound size={30} />
            )}

          </div>

          <div className="score-hero-content">

            <span>ĐÁNH GIÁ ĐOÀN VIÊN</span>

            <h1>
              Chấm điểm đoàn viên
            </h1>

            <p>
              Nhập điểm đánh giá theo từng tiêu chí.
              Hệ thống sẽ tự động tính tổng điểm và xếp loại.
            </p>

          </div>

          <div className="score-hero-member">

            <span>MÃ SINH VIÊN</span>

            <strong>
              {member.student_id}
            </strong>

            <small>
              {member.class_name}
            </small>

          </div>

        </section>


        {/* ===================================================
            MEMBER INFO
            =================================================== */}

        <section className="score-member-card">

          <div className="score-member-left">

            <div className="score-member-mini-avatar">

              {displayedAvatar ? (
                <img
                  src={displayedAvatar}
                  alt={member.full_name}
                />
              ) : (
                <UserRound size={25} />
              )}

            </div>

            <div>

              <span>ĐOÀN VIÊN</span>

              <h2>
                {member.full_name}
              </h2>

              <p>
                {member.student_id} · {member.class_name}
              </p>

            </div>

          </div>

          <div className="score-member-rating">

            <span>XẾP LOẠI HIỆN TẠI</span>

            <strong>
              {preview.rating}
            </strong>

          </div>

        </section>


        {/* ===================================================
            SCORE FORM
            =================================================== */}

        <section className="score-card">

          <div className="score-card-header">

            <div className="score-title-wrap">

              <div className="score-section-icon emerald">
                <Activity size={19} />
              </div>

              <div>

                <span>TIÊU CHÍ ĐÁNH GIÁ</span>

                <h2>
                  Điểm rèn luyện
                </h2>

                <p>
                  Điều chỉnh điểm theo từng nội dung đánh giá.
                </p>

              </div>

            </div>

            <div className="score-step">
              01
            </div>

          </div>


          <div className="score-grid">

            <ScoreInputCard
              title={SCORE_RULES.conduct.label}
              description={SCORE_RULES.conduct.description}
              icon={<BookOpen size={19} />}
              value={conductScore}
              max={SCORE_RULES.conduct.max}
              color="blue"
              onChange={(value) =>
                handleScoreChange(
                  "conduct",
                  value
                )
              }
            />

            <ScoreInputCard
              title={SCORE_RULES.activity.label}
              description={SCORE_RULES.activity.description}
              icon={<Activity size={19} />}
              value={activityScore}
              max={SCORE_RULES.activity.max}
              color="violet"
              onChange={(value) =>
                handleScoreChange(
                  "activity",
                  value
                )
              }
            />

            <ScoreInputCard
              title={SCORE_RULES.volunteer.label}
              description={SCORE_RULES.volunteer.description}
              icon={<HeartHandshake size={19} />}
              value={volunteerScore}
              max={SCORE_RULES.volunteer.max}
              color="pink"
              onChange={(value) =>
                handleScoreChange(
                  "volunteer",
                  value
                )
              }
            />

            <ScoreInputCard
              title={SCORE_RULES.discipline.label}
              description={SCORE_RULES.discipline.description}
              icon={<ShieldCheck size={19} />}
              value={disciplineScore}
              max={SCORE_RULES.discipline.max}
              color="orange"
              onChange={(value) =>
                handleScoreChange(
                  "discipline",
                  value
                )
              }
            />

          </div>

        </section>


        {/* ===================================================
            SUMMARY
            =================================================== */}

        <section className="score-summary">

          <div className="score-summary-glow" />

          <div className="score-summary-header">

            <div>

              <span>
                KẾT QUẢ TỰ ĐỘNG
              </span>

              <h2>
                Tổng kết đánh giá
              </h2>

              <p>
                Kết quả được cập nhật ngay khi bạn thay đổi điểm.
              </p>

            </div>

            <div className="score-summary-rating">

              <small>
                XẾP LOẠI
              </small>

              <strong>
                {preview.rating}
              </strong>

            </div>

          </div>


          <div className="score-summary-grid">

            <SummaryItem
              title="Học tập"
              icon={<BookOpen size={16} />}
              value={conductScore}
              max={SCORE_RULES.conduct.max}
            />

            <SummaryItem
              title="Hoạt động"
              icon={<Activity size={16} />}
              value={activityScore}
              max={SCORE_RULES.activity.max}
            />

            <SummaryItem
              title="Tình nguyện"
              icon={<HeartHandshake size={16} />}
              value={volunteerScore}
              max={SCORE_RULES.volunteer.max}
            />

            <SummaryItem
              title="Kỷ luật"
              icon={<ShieldCheck size={16} />}
              value={disciplineScore}
              max={SCORE_RULES.discipline.max}
            />

          </div>


          <div className="score-total">

            <div className="score-total-number">

              <span>
                TỔNG ĐIỂM
              </span>

              <strong>
                {preview.total}
                <small>/100</small>
              </strong>

            </div>


            <div className="score-total-progress-wrap">

              <div className="score-total-progress">

                <div
                  style={{
                    width: `${Math.min(
                      preview.total,
                      100
                    )}%`,
                  }}
                />

              </div>

              <div className="score-total-progress-label">
                <span>Mức hoàn thành</span>
                <strong>
                  {preview.total}%
                </strong>
              </div>

            </div>


            <div className="score-total-badge">

              <Trophy size={18} />

              <div>

                <span>
                  XẾP LOẠI
                </span>

                <strong>
                  {preview.rating}
                </strong>

              </div>

            </div>

          </div>

        </section>


        {/* ===================================================
            ACTIONS
            =================================================== */}

        <div className="score-actions">

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              router.push("/dashboard/members")
            }
            className="score-cancel"
          >
            <ArrowLeft size={17} />
            Hủy
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={saveScore}
            className="score-save"
          >
            {saving ? (
              <>
                <span className="score-spinner" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save size={17} />
                Lưu điểm
              </>
            )}
          </button>

        </div>

      </div>

      {/* =====================================================
          STYLES
          ===================================================== */}

      <style jsx global>{`

        .score-page {
          position: relative;
          min-height: calc(100vh - 80px);
          padding: 28px 16px 100px;
          overflow: hidden;
          background:
            linear-gradient(
              180deg,
              #f8fafc 0%,
              #f1f5f9 100%
            );
        }

        .score-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .score-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .score-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(80px);
          opacity: .45;
        }

        .score-orb-one {
          width: 360px;
          height: 360px;
          top: -180px;
          right: -120px;
          background: #c7d2fe;
        }

        .score-orb-two {
          width: 300px;
          height: 300px;
          left: -180px;
          top: 420px;
          background: #bae6fd;
        }

        .score-grid {
          position: absolute;
          inset: 0;
          opacity: .35;
          background-image:
            linear-gradient(
              rgba(148,163,184,.08) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148,163,184,.08) 1px,
              transparent 1px
            );
          background-size: 32px 32px;
        }

        .score-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .score-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          border-radius: 12px;
          padding: 10px 13px;
          background: transparent;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: .2s ease;
        }

        .score-back:hover {
          background: white;
          color: #2563eb;
          box-shadow: 0 8px 25px rgba(15,23,42,.07);
        }

        .score-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #bbf7d0;
          border-radius: 999px;
          padding: 8px 12px;
          background: #f0fdf4;
          color: #15803d;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .score-hero {
          position: relative;
          display: flex;
          align-items: center;
          gap: 20px;
          overflow: hidden;
          min-height: 190px;
          padding: 30px;
          border-radius: 30px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #0f172a 0%,
              #1e1b4b 48%,
              #3730a3 100%
            );
          box-shadow:
            0 25px 55px rgba(30,41,59,.2);
        }

        .score-hero-glow {
          position: absolute;
          width: 420px;
          height: 420px;
          right: -120px;
          top: -210px;
          border-radius: 999px;
          background: rgba(99,102,241,.35);
          filter: blur(30px);
        }

        .score-hero-avatar {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 76px;
          height: 76px;
          flex: 0 0 76px;
          overflow: hidden;
          border: 3px solid rgba(255,255,255,.25);
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              #3b82f6,
              #7c3aed
            );
          box-shadow:
            0 15px 35px rgba(0,0,0,.2);
        }

        .score-hero-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .score-hero-content {
          position: relative;
          z-index: 1;
          min-width: 0;
          flex: 1;
        }

        .score-hero-content > span {
          display: block;
          margin-bottom: 7px;
          color: #a5b4fc;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .score-hero-content h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -.04em;
        }

        .score-hero-content p {
          max-width: 620px;
          margin: 11px 0 0;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.65;
        }

        .score-hero-member {
          position: relative;
          z-index: 1;
          min-width: 150px;
          padding-left: 25px;
          border-left: 1px solid rgba(255,255,255,.12);
        }

        .score-hero-member span,
        .score-hero-member small {
          display: block;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .1em;
        }

        .score-hero-member strong {
          display: block;
          margin: 7px 0;
          color: white;
          font-size: 20px;
          font-weight: 950;
        }

        .score-hero-member small {
          color: #cbd5e1;
          font-size: 12px;
          letter-spacing: 0;
        }

        .score-member-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 18px;
          padding: 18px 20px;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          background: rgba(255,255,255,.9);
          box-shadow: 0 10px 30px rgba(15,23,42,.06);
          backdrop-filter: blur(12px);
        }

        .score-member-left {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .score-member-mini-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          flex: 0 0 50px;
          overflow: hidden;
          border-radius: 17px;
          color: #4f46e5;
          background: #eef2ff;
        }

        .score-member-mini-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .score-member-left span,
        .score-member-rating span {
          display: block;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .score-member-left h2 {
          margin: 2px 0;
          color: #0f172a;
          font-size: 17px;
          font-weight: 900;
        }

        .score-member-left p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .score-member-rating {
          text-align: right;
        }

        .score-member-rating strong {
          display: block;
          margin-top: 3px;
          color: #4f46e5;
          font-size: 19px;
          font-weight: 950;
        }

        .score-card {
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 28px;
          background: white;
          box-shadow: 0 12px 35px rgba(15,23,42,.07);
        }

        .score-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 23px 25px;
          border-bottom: 1px solid #f1f5f9;
          background:
            linear-gradient(
              90deg,
              #f8fafc,
              white
            );
        }

        .score-title-wrap {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .score-section-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border-radius: 15px;
        }

        .score-section-icon.emerald {
          color: #059669;
          background: #d1fae5;
        }

        .score-card-header span {
          display: block;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .score-card-header h2 {
          margin: 2px 0;
          color: #0f172a;
          font-size: 20px;
          font-weight: 950;
        }

        .score-card-header p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .score-step {
          color: #cbd5e1;
          font-size: 30px;
          font-weight: 950;
        }

        .score-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          padding: 22px;
        }

        .score-input-card {
          padding: 20px;
          border: 1px solid;
          border-radius: 23px;
          transition: .25s ease;
        }

        .score-input-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(15,23,42,.08);
        }

        .score-blue {
          border-color: #bfdbfe;
          background: linear-gradient(145deg,#eff6ff,#fff);
        }

        .score-violet {
          border-color: #ddd6fe;
          background: linear-gradient(145deg,#f5f3ff,#fff);
        }

        .score-pink {
          border-color: #fbcfe8;
          background: linear-gradient(145deg,#fdf2f8,#fff);
        }

        .score-orange {
          border-color: #fed7aa;
          background: linear-gradient(145deg,#fff7ed,#fff);
        }

        .score-input-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .score-input-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          color: white;
        }

        .score-blue .score-input-icon {
          background: #2563eb;
        }

        .score-violet .score-input-icon {
          background: #7c3aed;
        }

        .score-pink .score-input-icon {
          background: #db2777;
        }

        .score-orange .score-input-icon {
          background: #ea580c;
        }

        .score-input-max {
          border-radius: 999px;
          padding: 6px 9px;
          color: #64748b;
          background: rgba(255,255,255,.8);
          font-size: 10px;
          font-weight: 800;
        }

        .score-input-card h3 {
          margin: 16px 0 5px;
          color: #0f172a;
          font-size: 18px;
          font-weight: 950;
        }

        .score-input-card p {
          min-height: 42px;
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.65;
        }

        .score-input-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
        }

        .score-input-wrap input {
          width: 100%;
          min-width: 0;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          padding: 13px 14px;
          color: #0f172a;
          background: white;
          outline: none;
          font-size: 24px;
          font-weight: 950;
          transition: .2s ease;
        }

        .score-input-wrap input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99,102,241,.1);
        }

        .score-input-wrap > span {
          flex: 0 0 auto;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 800;
        }

        .score-input-progress {
          height: 7px;
          margin-top: 13px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .score-input-progress > div {
          height: 100%;
          border-radius: inherit;
          transition: width .35s ease;
        }

        .score-blue .score-input-progress > div {
          background: #3b82f6;
        }

        .score-violet .score-input-progress > div {
          background: #8b5cf6;
        }

        .score-pink .score-input-progress > div {
          background: #ec4899;
        }

        .score-orange .score-input-progress > div {
          background: #f97316;
        }

        .score-input-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 7px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
        }

        .score-summary {
          position: relative;
          overflow: hidden;
          margin-top: 18px;
          padding: 27px;
          border-radius: 28px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #020617,
              #172554 55%,
              #312e81
            );
          box-shadow: 0 25px 50px rgba(30,41,59,.2);
        }

        .score-summary-glow {
          position: absolute;
          width: 420px;
          height: 420px;
          right: -150px;
          top: -230px;
          border-radius: 999px;
          background: rgba(99,102,241,.3);
          filter: blur(40px);
        }

        .score-summary-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .score-summary-header > div:first-child > span {
          color: #818cf8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .score-summary-header h2 {
          margin: 5px 0;
          font-size: 24px;
          font-weight: 950;
        }

        .score-summary-header p {
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .score-summary-rating {
          min-width: 125px;
          padding: 12px 15px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 17px;
          background: rgba(255,255,255,.07);
          text-align: right;
          backdrop-filter: blur(10px);
        }

        .score-summary-rating small {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .score-summary-rating strong {
          display: block;
          margin-top: 2px;
          color: #6ee7b7;
          font-size: 18px;
          font-weight: 950;
        }

        .score-summary-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 10px;
          margin-top: 22px;
        }

        .score-summary-item {
          padding: 14px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 17px;
          background: rgba(255,255,255,.055);
        }

        .score-summary-item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .score-summary-item-title {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
        }

        .score-summary-item strong {
          display: block;
          margin-top: 8px;
          color: white;
          font-size: 22px;
          font-weight: 950;
        }

        .score-summary-item strong small {
          margin-left: 3px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .score-summary-item-progress {
          height: 4px;
          margin-top: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.1);
        }

        .score-summary-item-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #60a5fa,
            #a78bfa
          );
        }

        .score-total {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 180px 1fr 150px;
          align-items: center;
          gap: 24px;
          margin-top: 12px;
          padding: 19px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 20px;
          background: rgba(255,255,255,.07);
        }

        .score-total-number > span,
        .score-total-badge span {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .score-total-number strong {
          display: block;
          margin-top: 2px;
          color: white;
          font-size: 40px;
          line-height: 1;
          font-weight: 950;
        }

        .score-total-number small {
          margin-left: 4px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .score-total-progress {
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.1);
        }

        .score-total-progress > div {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #60a5fa,
              #8b5cf6,
              #d946ef
            );
          transition: width .4s ease;
        }

        .score-total-progress-label {
          display: flex;
          justify-content: space-between;
          margin-top: 7px;
          color: #64748b;
          font-size: 10px;
        }

        .score-total-progress-label strong {
          color: #cbd5e1;
        }

        .score-total-badge {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 9px;
          color: #fbbf24;
        }

        .score-total-badge strong {
          display: block;
          margin-top: 2px;
          color: #6ee7b7;
          font-size: 16px;
          font-weight: 950;
        }

        .score-actions {
          position: sticky;
          z-index: 10;
          bottom: 16px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
          padding: 12px;
          border: 1px solid rgba(226,232,240,.9);
          border-radius: 22px;
          background: rgba(255,255,255,.88);
          box-shadow:
            0 20px 45px rgba(15,23,42,.12);
          backdrop-filter: blur(16px);
        }

        .score-cancel,
        .score-save {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 15px;
          padding: 12px 19px;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          transition: .2s ease;
        }

        .score-cancel {
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .score-cancel:hover {
          background: #f1f5f9;
        }

        .score-save {
          color: white;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5,
              #7c3aed
            );
          box-shadow:
            0 10px 25px rgba(79,70,229,.25);
        }

        .score-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 30px rgba(79,70,229,.3);
        }

        .score-cancel:disabled,
        .score-save:disabled,
        .score-back:disabled {
          cursor: not-allowed;
          opacity: .55;
        }

        .score-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: white;
          border-radius: 999px;
          animation: score-spin .7s linear infinite;
        }

        @keyframes score-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .score-loading {
          min-height: calc(100vh - 80px);
          padding: 28px 16px 80px;
          background: #f8fafc;
        }

        .score-loading-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .score-skeleton-back {
          width: 150px;
          height: 38px;
          margin-bottom: 18px;
          border-radius: 12px;
          background: #e2e8f0;
        }

        .score-skeleton-hero {
          height: 190px;
          border-radius: 30px;
          background:
            linear-gradient(
              90deg,
              #e2e8f0,
              #f1f5f9,
              #e2e8f0
            );
          background-size: 200% 100%;
          animation: score-loading 1.4s infinite;
        }

        .score-skeleton-card {
          height: 390px;
          margin-top: 18px;
          border-radius: 28px;
          background: #e2e8f0;
          animation: score-loading 1.4s infinite;
        }

        .score-skeleton-summary {
          height: 300px;
          margin-top: 18px;
          border-radius: 28px;
          background: #cbd5e1;
          animation: score-loading 1.4s infinite;
        }

        @keyframes score-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @media (max-width: 800px) {

          .score-page {
            padding-top: 18px;
          }

          .score-hero {
            align-items: flex-start;
            flex-wrap: wrap;
            padding: 23px;
          }

          .score-hero-member {
            width: 100%;
            padding-top: 14px;
            padding-left: 0;
            border-top: 1px solid rgba(255,255,255,.12);
            border-left: 0;
          }

          .score-grid {
            grid-template-columns: 1fr;
          }

          .score-summary-grid {
            grid-template-columns: repeat(2,1fr);
          }

          .score-total {
            grid-template-columns: 1fr;
          }

          .score-total-badge {
            justify-content: flex-start;
          }

        }

        @media (max-width: 560px) {

          .score-page {
            padding: 15px 12px 90px;
          }

          .score-topbar {
            align-items: flex-start;
          }

          .score-status {
            display: none;
          }

          .score-back span {
            display: none;
          }

          .score-hero {
            display: block;
            padding: 22px;
            border-radius: 24px;
          }

          .score-hero-avatar {
            margin-bottom: 18px;
          }

          .score-hero-content h1 {
            font-size: 30px;
          }

          .score-member-card {
            align-items: flex-start;
          }

          .score-member-rating {
            display: none;
          }

          .score-card-header {
            padding: 19px;
          }

          .score-card-header p {
            max-width: 230px;
          }

          .score-step {
            display: none;
          }

          .score-grid {
            padding: 14px;
          }

          .score-summary {
            padding: 20px;
            border-radius: 24px;
          }

          .score-summary-header {
            display: block;
          }

          .score-summary-rating {
            margin-top: 15px;
            text-align: left;
          }

          .score-summary-grid {
            gap: 8px;
          }

          .score-summary-item {
            padding: 12px;
          }

          .score-total {
            padding: 15px;
          }

          .score-actions {
            justify-content: stretch;
          }

          .score-cancel,
          .score-save {
            flex: 1;
          }

        }

      `}</style>

    </main>
  );
}


/* =========================================================
   SCORE INPUT CARD
   ========================================================= */

function ScoreInputCard({
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
      className={`score-input-card score-${color}`}
    >

      <div className="score-input-top">

        <div className="score-input-icon">
          {icon}
        </div>

        <span className="score-input-max">
          Tối đa {max} điểm
        </span>

      </div>


      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>


      <div className="score-input-wrap">

        <input
          type="number"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
        />

        <span>
          / {max}
        </span>

      </div>


      <div className="score-input-progress">

        <div
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>


      <div className="score-input-footer">

        <span>
          0 điểm
        </span>

        <strong>
          {Math.round(percentage)}%
        </strong>

        <span>
          {max} điểm
        </span>

      </div>

    </div>
  );
}


/* =========================================================
   SUMMARY ITEM
   ========================================================= */

function SummaryItem({
  title,
  icon,
  value,
  max,
}: {
  title: string;
  icon: React.ReactNode;
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
    <div className="score-summary-item">

      <div className="score-summary-item-top">

        <div className="score-summary-item-title">
          {icon}
          {title}
        </div>

      </div>


      <strong>
        {value}
        <small>
          /{max}
        </small>
      </strong>


      <div className="score-summary-item-progress">

        <span
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}


/* =========================================================
   LOADING
   ========================================================= */

function LoadingSkeleton() {
  return (
    <main className="score-loading">

      <div className="score-loading-container">

        <div className="score-skeleton-back" />

        <div className="score-skeleton-hero" />

        <div className="score-skeleton-card" />

        <div className="score-skeleton-summary" />

      </div>

    </main>
  );
}