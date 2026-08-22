"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  // LOAD MEMBER
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

    if (!Number.isFinite(score)) {
      score = 0;
    }

    score = Math.min(Math.max(score, 0), max);

    setter(score);
  }

  // =========================================================
  // UPLOAD AVATAR
  // =========================================================

  async function uploadAvatar(file: File) {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `member-${id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // =========================================================
  // SAVE
  // =========================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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

      // Upload ảnh mới nếu có
      if (avatar) {
        avatarUrl = await uploadAvatar(avatar);
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

      const { error } = await supabase
        .from("members")
        .update({
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
        })
        .eq("id", id);

      if (error) {
        console.error("UPDATE MEMBER ERROR:", error);
        alert(`Không thể cập nhật: ${error.message}`);
        return;
      }

      alert("Đã cập nhật thông tin đoàn viên!");

      router.push("/dashboard/members");
      router.refresh();
    } catch (error) {
      console.error("SAVE MEMBER ERROR:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi cập nhật đoàn viên!";

      alert(message);
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6">
          <div className="h-6 w-32 rounded-full bg-gray-200" />

          <div className="rounded-3xl bg-gradient-to-r from-gray-200 to-gray-100 p-8">
            <div className="h-10 w-80 rounded-xl bg-white/60" />
            <div className="mt-3 h-5 w-[420px] max-w-full rounded-lg bg-white/50" />
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="h-6 w-48 rounded-lg bg-gray-200" />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="h-14 rounded-2xl bg-gray-100" />
              <div className="h-14 rounded-2xl bg-gray-100" />
              <div className="h-14 rounded-2xl bg-gray-100" />
              <div className="h-14 rounded-2xl bg-gray-100" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-64 rounded-3xl bg-gray-100" />
            <div className="h-64 rounded-3xl bg-gray-100" />
            <div className="h-64 rounded-3xl bg-gray-100" />
            <div className="h-64 rounded-3xl bg-gray-100" />
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // GIAO DIỆN
  // =========================================================

  return (
    <main className="min-h-[calc(100vh-80px)] w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* =====================================================
            QUAY LẠI
        ===================================================== */}

        <button
          type="button"
          onClick={() => router.push("/dashboard/members")}
          className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-blue-600 hover:shadow-sm"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-1">
            ←
          </span>

          Quay lại danh sách đoàn viên
        </button>

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-700 via-indigo-600 to-violet-600 px-6 py-7 text-white shadow-xl shadow-blue-500/20 sm:px-8">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative">
            <div className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-50 backdrop-blur">
              Quản lý đoàn viên
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Chỉnh sửa đoàn viên
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
              Cập nhật thông tin cá nhân và điểm rèn luyện.
              Tổng điểm và xếp loại sẽ được tính tự động.
            </p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ===================================================
              THÔNG TIN CÁ NHÂN
          =================================================== */}

          <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-xl">
                  👤
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    Thông tin cá nhân
                  </h2>

                  <p className="text-sm text-gray-500">
                    Thông tin cơ bản của đoàn viên
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">

              {/* Mã sinh viên */}

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Mã sinh viên
                </label>

                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Ví dụ: 123456"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-medium text-gray-900 outline-none transition duration-200 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* Họ tên */}

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Họ và tên
                </label>

                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-medium text-gray-900 outline-none transition duration-200 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* Lớp */}

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Lớp
                </label>

                <input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Ví dụ: 11D"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-medium text-gray-900 outline-none transition duration-200 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* Giới tính */}

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Giới tính
                </label>

                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-medium text-gray-900 outline-none transition duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
            </div>
          </section>

          {/* ===================================================
              AVATAR
          =================================================== */}

          <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-fuchsia-50 via-white to-blue-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-100 text-xl">
                  🖼️
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    Ảnh đại diện
                  </h2>

                  <p className="text-sm text-gray-500">
                    Cập nhật ảnh đại diện của đoàn viên
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">

              <div className="relative shrink-0">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Ảnh đại diện"
                    className="h-32 w-32 rounded-3xl border-4 border-white object-cover shadow-lg ring-1 ring-gray-200"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 text-4xl shadow-inner">
                    👤
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  Chọn ảnh mới
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setAvatar(e.target.files?.[0] ?? null)
                  }
                  className="block w-full cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-600 file:mr-4 file:border-0 file:bg-blue-600 file:px-5 file:py-3 file:font-bold file:text-white hover:file:bg-blue-700"
                />

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Không chọn ảnh mới nếu muốn giữ nguyên ảnh hiện tại.
                </p>
              </div>
            </div>
          </section>

          {/* ===================================================
              HƯỚNG DẪN
          =================================================== */}

          <section className="overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-lg shadow-blue-600/20">
                  💡
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold text-blue-950">
                    Hướng dẫn nhập điểm
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-blue-800/70">
                    Nhập điểm theo từng nội dung đánh giá.
                    Hệ thống sẽ tự động tính tổng điểm và xếp loại.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">

                <div className="rounded-2xl border border-blue-100 bg-white/80 p-4">
                  <p className="font-bold text-blue-900">
                    📚 Học tập
                  </p>
                  <p className="mt-1 text-sm leading-5 text-gray-600">
                    Đánh giá kết quả và tinh thần học tập.
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
                  <p className="font-bold text-violet-900">
                    ⚡ Hoạt động
                  </p>
                  <p className="mt-1 text-sm leading-5 text-gray-600">
                    Đánh giá mức độ tham gia hoạt động Đoàn,
                    lớp và trường.
                  </p>
                </div>

                <div className="rounded-2xl border border-pink-100 bg-white/80 p-4">
                  <p className="font-bold text-pink-900">
                    ❤️ Tình nguyện
                  </p>
                  <p className="mt-1 text-sm leading-5 text-gray-600">
                    Đánh giá hoạt động cộng đồng và tình nguyện.
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-white/80 p-4">
                  <p className="font-bold text-orange-900">
                    🛡️ Kỷ luật
                  </p>
                  <p className="mt-1 text-sm leading-5 text-gray-600">
                    Đánh giá ý thức chấp hành nội quy và quy định.
                  </p>
                </div>

              </div>
            </div>
          </section>

          {/* ===================================================
              ĐIỂM RÈN LUYỆN
          =================================================== */}

          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-black tracking-tight text-gray-900">
                Điểm rèn luyện
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Nhập điểm theo từng tiêu chí. Giới hạn được lấy trực tiếp
                từ hệ thống tính điểm.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* =================================================
                  HỌC TẬP
              ================================================= */}

              <ScoreCard
                icon="📚"
                title={SCORE_RULES.conduct.label}
                description={SCORE_RULES.conduct.description}
                value={conductScore}
                max={SCORE_RULES.conduct.max}
                color="blue"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    SCORE_RULES.conduct.max,
                    setConductScore
                  )
                }
              />

              {/* =================================================
                  HOẠT ĐỘNG
              ================================================= */}

              <ScoreCard
                icon="⚡"
                title={SCORE_RULES.activity.label}
                description={SCORE_RULES.activity.description}
                value={activityScore}
                max={SCORE_RULES.activity.max}
                color="violet"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    SCORE_RULES.activity.max,
                    setActivityScore
                  )
                }
              />

              {/* =================================================
                  TÌNH NGUYỆN
              ================================================= */}

              <ScoreCard
                icon="❤️"
                title={SCORE_RULES.volunteer.label}
                description={SCORE_RULES.volunteer.description}
                value={volunteerScore}
                max={SCORE_RULES.volunteer.max}
                color="pink"
                onChange={(value) =>
                  handleScoreChange(
                    value,
                    SCORE_RULES.volunteer.max,
                    setVolunteerScore
                  )
                }
              />

              {/* =================================================
                  KỶ LUẬT
              ================================================= */}

              <ScoreCard
                icon="🛡️"
                title={SCORE_RULES.discipline.label}
                description={SCORE_RULES.discipline.description}
                value={disciplineScore}
                max={SCORE_RULES.discipline.max}
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

          {/* ===================================================
              KẾT QUẢ
          =================================================== */}

          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 p-6 text-white shadow-2xl shadow-indigo-900/20 sm:p-8">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">

                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                    Kết quả tự động
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Tổng kết đánh giá
                  </h2>

                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">
                    Kết quả được cập nhật ngay khi bạn thay đổi điểm.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Xếp loại
                  </p>

                  <p className="mt-1 text-xl font-black text-emerald-300">
                    {rating}
                  </p>
                </div>

              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <ResultBox
                  label="Học tập"
                  value={conductScore}
                  max={SCORE_RULES.conduct.max}
                />

                <ResultBox
                  label="Hoạt động"
                  value={activityScore}
                  max={SCORE_RULES.activity.max}
                />

                <ResultBox
                  label="Tình nguyện"
                  value={volunteerScore}
                  max={SCORE_RULES.volunteer.max}
                />

                <ResultBox
                  label="Kỷ luật"
                  value={disciplineScore}
                  max={SCORE_RULES.discipline.max}
                />

              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                  <div>
                    <p className="text-sm text-slate-400">
                      Tổng điểm
                    </p>

                    <p className="mt-1 text-5xl font-black tracking-tight">
                      {total}
                      <span className="ml-2 text-lg font-semibold text-slate-400">
                        / 100
                      </span>
                    </p>
                  </div>

                  <div className="min-w-0 sm:w-1/2">
                    <div className="mb-2 flex justify-between text-xs text-slate-400">
                      <span>Mức hoàn thành</span>
                      <span>{total}%</span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 transition-all duration-500"
                        style={{
                          width: `${Math.min(total, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* ===================================================
              ACTIONS
          =================================================== */}

          <div className="sticky bottom-4 z-20 rounded-3xl border border-gray-200/80 bg-white/90 p-4 shadow-2xl shadow-gray-900/10 backdrop-blur-xl">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() => router.push("/dashboard/members")}
                disabled={saving}
                className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-3.5 font-bold text-gray-700 transition duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-7 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/25 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "✓ Lưu thay đổi"}
              </button>

            </div>
          </div>

        </form>
      </div>
    </main>
  );
}

// =============================================================
// SCORE CARD
// =============================================================

type ScoreColor =
  | "blue"
  | "violet"
  | "pink"
  | "orange";

function ScoreCard({
  icon,
  title,
  description,
  value,
  max,
  color,
  onChange,
}: {
  icon: string;
  title: string;
  description: string;
  value: number;
  max: number;
  color: ScoreColor;
  onChange: (value: string) => void;
}) {
  const percentage =
    max > 0
      ? Math.min((value / max) * 100, 100)
      : 0;

  const styles = {
    blue: {
      border: "border-blue-200",
      bg: "bg-blue-50/60",
      icon: "bg-blue-600",
      text: "text-blue-900",
      accent: "bg-blue-500",
      ring: "focus:ring-blue-500/10",
      borderFocus: "focus:border-blue-500",
    },

    violet: {
      border: "border-violet-200",
      bg: "bg-violet-50/60",
      icon: "bg-violet-600",
      text: "text-violet-900",
      accent: "bg-violet-500",
      ring: "focus:ring-violet-500/10",
      borderFocus: "focus:border-violet-500",
    },

    pink: {
      border: "border-pink-200",
      bg: "bg-pink-50/60",
      icon: "bg-pink-600",
      text: "text-pink-900",
      accent: "bg-pink-500",
      ring: "focus:ring-pink-500/10",
      borderFocus: "focus:border-pink-500",
    },

    orange: {
      border: "border-orange-200",
      bg: "bg-orange-50/60",
      icon: "bg-orange-500",
      text: "text-orange-900",
      accent: "bg-orange-500",
      ring: "focus:ring-orange-500/10",
      borderFocus: "focus:border-orange-500",
    },
  }[color];

  return (
    <div
      className={`overflow-hidden rounded-3xl border ${styles.border} ${styles.bg} p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className="flex items-start justify-between gap-4">

        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon} text-xl text-white shadow-lg`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <h3
              className={`truncate text-lg font-black ${styles.text}`}
            >
              {title}
            </h3>

            <p className="mt-1 text-xs font-semibold text-gray-500">
              Tối đa {max} điểm
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-3xl font-black text-gray-900">
            {value}
          </span>

          <span className="text-sm font-semibold text-gray-400">
            /{max}
          </span>
        </div>
      </div>

      <p className="mt-4 min-h-[48px] text-sm leading-6 text-gray-600">
        {description}
      </p>

      <div className="mt-5">
        <input
          type="number"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-lg font-black text-gray-900 outline-none transition ${styles.borderFocus} ${styles.ring}`}
        />

        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full ${styles.accent} transition-all duration-500`}
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>

          <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-gray-400">
            <span>0 điểm</span>
            <span>{Math.round(percentage)}%</span>
            <span>{max} điểm</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// RESULT BOX
// =============================================================

function ResultBox({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage =
    max > 0
      ? Math.min((value / max) * 100, 100)
      : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
        <span className="ml-1 text-sm font-semibold text-slate-500">
          / {max}
        </span>
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400 transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}