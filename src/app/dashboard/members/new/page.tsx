"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  // TÍNH ĐIỂM TỰ ĐỘNG
  // =========================================================

  const { total, rating } = calculateRating(
    conductScore,
    activityScore,
    volunteerScore,
    disciplineScore
  );

  // =========================================================
  // PREVIEW ẢNH
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

    if (score < 0) {
      score = 0;
    }

    if (score > max) {
      score = max;
    }

    setter(score);
  }

  // =========================================================
  // LƯU ĐOÀN VIÊN
  // =========================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;

    // -------------------------------------------------------
    // KIỂM TRA THÔNG TIN
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // KIỂM TRA ĐIỂM
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // KIỂM TRA SESSION
    // -------------------------------------------------------

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
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

        const fileName = `member-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatar);

        if (uploadError) {
          console.error("UPLOAD AVATAR ERROR:", uploadError);
          alert(`Không thể upload ảnh: ${uploadError.message}`);
          return;
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        avatarUrl = data.publicUrl;
      }

      // =====================================================
      // TÍNH ĐIỂM LẦN CUỐI
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
      // INSERT SUPABASE
      // =====================================================

      const { error } = await supabase.from("members").insert([
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
        console.error("SUPABASE INSERT ERROR:", error);
        alert(`Không thể lưu đoàn viên: ${error.message}`);
        return;
      }

      alert("Đã thêm đoàn viên thành công!");

      router.push("/dashboard/members");
      router.refresh();
    } catch (error) {
      console.error("CREATE MEMBER ERROR:", error);
      alert("Đã xảy ra lỗi khi thêm đoàn viên!");
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // GIAO DIỆN
  // =========================================================

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 shadow-xl">
          <div className="relative p-6 sm:p-8">
            {/* hiệu ứng nền */}

            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="relative">
              <div className="mb-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                QUẢN LÝ ĐOÀN VIÊN
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Thêm đoàn viên
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Nhập thông tin cá nhân và kết quả đánh giá để hệ thống
                tự động tính tổng điểm và xếp loại đoàn viên.
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================
            FORM
        =================================================== */}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* =================================================
              THÔNG TIN CÁ NHÂN
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl text-white shadow-lg shadow-blue-500/20">
                  👤
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Thông tin cá nhân
                  </h2>

                  <p className="text-sm text-slate-500">
                    Thông tin cơ bản của đoàn viên
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              {/* MÃ SINH VIÊN */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Mã sinh viên
                </label>

                <input
                  type="text"
                  placeholder="Ví dụ: 23A12345"
                  value={studentId}
                  onChange={(e) =>
                    setStudentId(e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* HỌ VÀ TÊN */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Họ và tên
                </label>

                <input
                  type="text"
                  placeholder="Nhập họ và tên đoàn viên"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* LỚP */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Lớp
                </label>

                <input
                  type="text"
                  placeholder="Ví dụ: 11D"
                  value={className}
                  onChange={(e) =>
                    setClassName(e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* GIỚI TÍNH */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Giới tính
                </label>

                <select
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              {/* =================================================
                  AVATAR
              ================================================= */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Ảnh đại diện
                </label>

                <div className="grid gap-5 md:grid-cols-[160px_1fr]">
                  {/* PREVIEW */}

                  <div className="flex min-h-[160px] items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Ảnh xem trước"
                        className="h-40 w-40 object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-4xl">
                          📷
                        </div>

                        <p className="mt-2 text-xs font-medium text-slate-400">
                          Chưa chọn ảnh
                        </p>
                      </div>
                    )}
                  </div>

                  {/* INPUT */}

                  <div className="flex flex-col justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setAvatar(
                          e.target.files?.[0] ?? null
                        )
                      }
                      className="block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-gradient-to-r file:from-blue-600 file:to-indigo-600 file:px-5 file:py-3 file:font-semibold file:text-white hover:file:from-blue-700 hover:file:to-indigo-700"
                    />

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Có thể bỏ trống nếu không muốn thêm
                      ảnh đại diện.
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Khuyến nghị sử dụng ảnh rõ mặt, tỷ lệ
                      vuông.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              ĐIỂM ĐÁNH GIÁ
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Điểm đánh giá đoàn viên
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Tổng điểm tối đa là 100 điểm. Điểm được
                    tính và xếp loại tự động.
                  </p>
                </div>

                <div className="hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-3 text-right text-white shadow-lg shadow-indigo-500/20 sm:block">
                  <p className="text-xs font-medium text-indigo-100">
                    Tổng điểm
                  </p>

                  <p className="text-2xl font-black">
                    {total}
                    <span className="ml-1 text-sm font-medium text-indigo-200">
                      /100
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              {/* =================================================
                  HỌC TẬP
              ================================================= */}

              <div className="group overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                <div className="border-b border-blue-100 bg-blue-500/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-lg text-white shadow-lg">
                        📚
                      </div>

                      <h3 className="text-lg font-extrabold text-blue-950">
                        Học tập
                      </h3>
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      30 điểm
                    </span>
                  </div>

                  <p className="mt-4 min-h-[96px] text-sm leading-6 text-slate-600">
                    Đánh giá ý thức và kết quả học tập:
                    thái độ, mức độ hoàn thành nhiệm vụ,
                    tinh thần tự giác và kết quả học tập.
                  </p>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-end justify-between">
                    <span className="text-sm font-semibold text-slate-500">
                      Điểm hiện tại
                    </span>

                    <span className="text-2xl font-black text-blue-600">
                      {conductScore}
                      <span className="text-sm font-semibold text-slate-400">
                        {" "}
                        / 30
                      </span>
                    </span>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={1}
                    value={conductScore}
                    onChange={(e) =>
                      handleScoreChange(
                        e.target.value,
                        30,
                        setConductScore
                      )
                    }
                    className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3.5 text-lg font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (conductScore / 30) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* =================================================
                  HOẠT ĐỘNG
              ================================================= */}

              <div className="group overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10">
                <div className="border-b border-emerald-100 bg-emerald-500/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 text-lg text-white shadow-lg">
                        ⚡
                      </div>

                      <h3 className="text-lg font-extrabold text-emerald-950">
                        Hoạt động Đoàn
                      </h3>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      30 điểm
                    </span>
                  </div>

                  <p className="mt-4 min-h-[96px] text-sm leading-6 text-slate-600">
                    Đánh giá mức độ tham gia hoạt động Chi
                    đoàn, Đoàn trường, hoạt động tập thể,
                    tinh thần trách nhiệm và hoàn thành nhiệm vụ.
                  </p>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-end justify-between">
                    <span className="text-sm font-semibold text-slate-500">
                      Điểm hiện tại
                    </span>

                    <span className="text-2xl font-black text-emerald-600">
                      {activityScore}
                      <span className="text-sm font-semibold text-slate-400">
                        {" "}
                        / 30
                      </span>
                    </span>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={1}
                    value={activityScore}
                    onChange={(e) =>
                      handleScoreChange(
                        e.target.value,
                        30,
                        setActivityScore
                      )
                    }
                    className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-lg font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (activityScore / 30) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* =================================================
                  TÌNH NGUYỆN
              ================================================= */}

              <div className="group overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10">
                <div className="border-b border-orange-100 bg-orange-500/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-lg text-white shadow-lg">
                        ❤️
                      </div>

                      <h3 className="text-lg font-extrabold text-orange-950">
                        Hoạt động tình nguyện
                      </h3>
                    </div>

                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                      20 điểm
                    </span>
                  </div>

                  <p className="mt-4 min-h-[96px] text-sm leading-6 text-slate-600">
                    Đánh giá tinh thần tham gia hoạt động
                    tình nguyện, cộng đồng, xã hội và các
                    chương trình thiện nguyện.
                  </p>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-end justify-between">
                    <span className="text-sm font-semibold text-slate-500">
                      Điểm hiện tại
                    </span>

                    <span className="text-2xl font-black text-orange-600">
                      {volunteerScore}
                      <span className="text-sm font-semibold text-slate-400">
                        {" "}
                        / 20
                      </span>
                    </span>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={volunteerScore}
                    onChange={(e) =>
                      handleScoreChange(
                        e.target.value,
                        20,
                        setVolunteerScore
                      )
                    }
                    className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3.5 text-lg font-bold text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                  />

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (volunteerScore / 20) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* =================================================
                  KỶ LUẬT
              ================================================= */}

              <div className="group overflow-hidden rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-red-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10">
                <div className="border-b border-rose-100 bg-rose-500/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-500 text-lg text-white shadow-lg">
                        🛡️
                      </div>

                      <h3 className="text-lg font-extrabold text-rose-950">
                        Ý thức và kỷ luật
                      </h3>
                    </div>

                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                      20 điểm
                    </span>
                  </div>

                  <p className="mt-4 min-h-[96px] text-sm leading-6 text-slate-600">
                    Đánh giá việc chấp hành nội quy, tác phong,
                    chuyên cần, tinh thần trách nhiệm và các
                    quy định chung.
                  </p>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-end justify-between">
                    <span className="text-sm font-semibold text-slate-500">
                      Điểm hiện tại
                    </span>

                    <span className="text-2xl font-black text-rose-600">
                      {disciplineScore}
                      <span className="text-sm font-semibold text-slate-400">
                        {" "}
                        / 20
                      </span>
                    </span>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={disciplineScore}
                    onChange={(e) =>
                      handleScoreChange(
                        e.target.value,
                        20,
                        setDisciplineScore
                      )
                    }
                    className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3.5 text-lg font-bold text-slate-900 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                  />

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-rose-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (disciplineScore / 20) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              KẾT QUẢ
          ================================================= */}

          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-2xl shadow-indigo-900/20 sm:p-8">
            <div className="mb-6">
              <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-indigo-200 backdrop-blur">
                KẾT QUẢ TỰ ĐỘNG
              </div>

              <h2 className="text-2xl font-black">
                Tổng kết đánh giá
              </h2>

              <p className="mt-1 text-sm text-indigo-200">
                Kết quả được cập nhật ngay khi thay đổi điểm.
              </p>
            </div>

            {/* 4 điểm */}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15">
                <p className="text-xs text-blue-200">
                  Học tập
                </p>

                <p className="mt-1 text-2xl font-black">
                  {conductScore}
                  <span className="text-xs font-medium text-blue-300">
                    {" "}
                    / 30
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15">
                <p className="text-xs text-emerald-200">
                  Hoạt động
                </p>

                <p className="mt-1 text-2xl font-black">
                  {activityScore}
                  <span className="text-xs font-medium text-emerald-300">
                    {" "}
                    / 30
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15">
                <p className="text-xs text-orange-200">
                  Tình nguyện
                </p>

                <p className="mt-1 text-2xl font-black">
                  {volunteerScore}
                  <span className="text-xs font-medium text-orange-300">
                    {" "}
                    / 20
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15">
                <p className="text-xs text-rose-200">
                  Kỷ luật
                </p>

                <p className="mt-1 text-2xl font-black">
                  {disciplineScore}
                  <span className="text-xs font-medium text-rose-300">
                    {" "}
                    / 20
                  </span>
                </p>
              </div>
            </div>

            {/* Tổng */}

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-indigo-200">
                      Tổng điểm
                    </p>

                    <p className="mt-1 text-5xl font-black tracking-tight">
                      {total}
                      <span className="ml-2 text-lg font-medium text-indigo-300">
                        / 100
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-indigo-300">
                      Mức đạt được
                    </p>

                    <p className="text-lg font-bold text-white">
                      {total}%
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 shadow-lg shadow-blue-500/30 transition-all duration-700"
                    style={{
                      width: `${Math.min(total, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 p-5 text-center backdrop-blur">
                <p className="text-sm text-emerald-200">
                  Xếp loại dự kiến
                </p>

                <p className="mt-2 text-3xl font-black text-white">
                  {rating}
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              BUTTONS
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                router.push("/dashboard/members")
              }
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-8 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 hover:shadow-xl hover:shadow-indigo-500/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Đang lưu...
                </span>
              ) : (
                "Lưu đoàn viên"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}