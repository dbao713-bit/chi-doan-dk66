"use client";

import { useState } from "react";
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

  // =========================================================
  // TÍNH TỔNG ĐIỂM + XẾP LOẠI NGAY TRÊN FORM
  // =========================================================

  const { total, rating } = calculateRating(
    conductScore,
    activityScore,
    volunteerScore,
    disciplineScore
  );

  // =========================================================
  // HÀM GIỚI HẠN ĐIỂM
  // =========================================================

  function handleScoreChange(
    value: string,
    max: number,
    setter: (value: number) => void
  ) {
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

    // Kiểm tra thông tin cơ bản
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

    let avatarUrl = "";

    // =========================================================
    // UPLOAD AVATAR
    // =========================================================

    if (avatar) {
      const fileName = `${Date.now()}-${avatar.name}`;

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

    // =========================================================
    // KIỂM TRA SESSION TRƯỚC KHI INSERT
    // =========================================================

    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log("=================================");
    console.log("SESSION TRƯỚC KHI INSERT:", session);
    console.log("USER ID:", session?.user?.id);
    console.log("USER EMAIL:", session?.user?.email);
    console.log("=================================");

    if (!session) {
      alert("Không có phiên đăng nhập Supabase!");
      return;
    }

    // =========================================================
    // TÍNH ĐIỂM LẦN CUỐI TRƯỚC KHI LƯU
    // =========================================================

    const { total: finalTotal, rating: finalRating } =
      calculateRating(
        conductScore,
        activityScore,
        volunteerScore,
        disciplineScore
      );

    // =========================================================
    // INSERT VÀO SUPABASE
    // =========================================================

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

    alert("Đã thêm đoàn viên!");

    router.push("/dashboard/members");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* =====================================================
          TIÊU ĐỀ
      ===================================================== */}

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Thêm đoàn viên
        </h1>

        <p className="mt-2 text-gray-500">
          Nhập đầy đủ thông tin và điểm đánh giá của đoàn viên.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-2xl bg-white p-8 shadow"
      >
        {/* ===================================================
            THÔNG TIN CÁ NHÂN
        =================================================== */}

        <section>
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Thông tin cá nhân
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mã sinh viên
              </label>

              <input
                className="w-full rounded-xl border border-gray-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Ví dụ: 23A12345"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Họ và tên
              </label>

              <input
                className="w-full rounded-xl border border-gray-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Nhập họ và tên đoàn viên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Lớp
              </label>

              <input
                className="w-full rounded-xl border border-gray-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Ví dụ: 11D"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Giới tính
              </label>

              <select
                className="w-full rounded-xl border border-gray-300 p-3"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>

            {/* Ảnh đại diện */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Ảnh đại diện
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setAvatar(e.target.files?.[0] ?? null)
                }
                className="w-full rounded-xl border border-gray-300 p-3"
              />

              <p className="mt-1 text-sm text-gray-500">
                Có thể bỏ trống nếu không muốn thêm ảnh.
              </p>
            </div>
          </div>
        </section>

        <hr />

        {/* ===================================================
            ĐIỂM ĐÁNH GIÁ
        =================================================== */}

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Điểm đánh giá đoàn viên
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Hãy đọc mô tả từng tiêu chí trước khi nhập điểm.
              Tổng điểm tối đa là <strong>100 điểm</strong>.
            </p>
          </div>

          <div className="space-y-6">
            {/* =================================================
                1. HỌC TẬP
            ================================================= */}

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-blue-900">
                    1. Học tập
                  </h3>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    Tối đa 30 điểm
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-gray-700">
                  Đánh giá ý thức và kết quả học tập của đoàn viên:
                  thái độ học tập, mức độ hoàn thành nhiệm vụ học tập,
                  tinh thần tự giác và kết quả học tập.
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Gợi ý: điểm càng cao khi đoàn viên có ý thức học tập
                  tốt, hoàn thành đầy đủ nhiệm vụ và có kết quả học tập
                  tốt.
                </p>
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
                className="w-full rounded-xl border border-blue-300 bg-white p-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-200"
              />

              <p className="mt-2 text-right text-sm text-blue-700">
                {conductScore}/30 điểm
              </p>
            </div>

            {/* =================================================
                2. HOẠT ĐỘNG ĐOÀN
            ================================================= */}

            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-green-900">
                    2. Hoạt động Đoàn
                  </h3>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                    Tối đa 30 điểm
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-gray-700">
                  Đánh giá mức độ tham gia các hoạt động của Chi đoàn,
                  Đoàn trường và các hoạt động tập thể; tinh thần tham
                  gia, trách nhiệm và mức độ hoàn thành nhiệm vụ được
                  giao.
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Gợi ý: tham gia đầy đủ và tích cực các hoạt động,
                  chủ động nhận nhiệm vụ và hoàn thành tốt nhiệm vụ thì
                  điểm cao hơn.
                </p>
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
                className="w-full rounded-xl border border-green-300 bg-white p-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-green-200"
              />

              <p className="mt-2 text-right text-sm text-green-700">
                {activityScore}/30 điểm
              </p>
            </div>

            {/* =================================================
                3. TÌNH NGUYỆN
            ================================================= */}

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-orange-900">
                    3. Hoạt động tình nguyện
                  </h3>

                  <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                    Tối đa 20 điểm
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-gray-700">
                  Đánh giá tinh thần tham gia các hoạt động tình nguyện,
                  hoạt động vì cộng đồng, giúp đỡ người khác và các
                  chương trình thiện nguyện do Đoàn hoặc nhà trường tổ
                  chức.
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Gợi ý: tích cực tham gia, có tinh thần trách nhiệm và
                  đóng góp thực tế cho hoạt động tình nguyện thì điểm
                  cao hơn.
                </p>
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
                className="w-full rounded-xl border border-orange-300 bg-white p-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-orange-200"
              />

              <p className="mt-2 text-right text-sm text-orange-700">
                {volunteerScore}/20 điểm
              </p>
            </div>

            {/* =================================================
                4. KỶ LUẬT
            ================================================= */}

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-red-900">
                    4. Ý thức và kỷ luật
                  </h3>

                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                    Tối đa 20 điểm
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-gray-700">
                  Đánh giá việc chấp hành nội quy của nhà trường và Chi
                  đoàn; ý thức tổ chức, tác phong, chuyên cần, tinh thần
                  trách nhiệm và việc thực hiện các quy định chung.
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Gợi ý: chấp hành tốt nội quy, đi học đầy đủ, đúng giờ,
                  có ý thức trách nhiệm và không vi phạm kỷ luật thì
                  điểm cao hơn.
                </p>
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
                className="w-full rounded-xl border border-red-300 bg-white p-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-red-200"
              />

              <p className="mt-2 text-right text-sm text-red-700">
                {disciplineScore}/20 điểm
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            TỔNG ĐIỂM
        ===================================================== */}

        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Kết quả dự kiến
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Học tập
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-600">
                {conductScore}
              </p>

              <p className="text-xs text-gray-400">
                / 30
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Hoạt động
              </p>

              <p className="mt-1 text-2xl font-bold text-green-600">
                {activityScore}
              </p>

              <p className="text-xs text-gray-400">
                / 30
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Tình nguyện
              </p>

              <p className="mt-1 text-2xl font-bold text-orange-600">
                {volunteerScore}
              </p>

              <p className="text-xs text-gray-400">
                / 20
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Kỷ luật
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600">
                {disciplineScore}
              </p>

              <p className="text-xs text-gray-400">
                / 20
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm md:flex-row">
            <div>
              <p className="text-sm text-gray-500">
                Tổng điểm
              </p>

              <p className="text-4xl font-bold text-blue-700">
                {total}
                <span className="ml-1 text-lg text-gray-400">
                  / 100
                </span>
              </p>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-gray-500">
                Xếp loại dự kiến
              </p>

              <p className="text-2xl font-bold text-green-600">
                {rating}
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            NÚT LƯU
        ===================================================== */}

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99]"
        >
          Lưu đoàn viên
        </button>
      </form>
    </main>
  );
}