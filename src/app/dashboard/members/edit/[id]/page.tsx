"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { calculateRating } from "@/lib/calculateRating";

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

  total_score: number;
  rating: string;
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
  // TÍNH ĐIỂM TỰ ĐỘNG
  // =========================================================

  const { total, rating } = calculateRating(
    conductScore,
    activityScore,
    volunteerScore,
    disciplineScore
  );

  // =========================================================
  // LẤY THÔNG TIN ĐOÀN VIÊN
  // =========================================================

  useEffect(() => {
    async function loadMember() {
      setLoading(true);

      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", id)
        .single();

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
  }, [id, router]);

  // =========================================================
  // LƯU THAY ĐỔI
  // =========================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Kiểm tra điểm
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

    setSaving(true);

    try {
      let avatarUrl = currentAvatar;

      // =====================================================
      // UPLOAD ẢNH MỚI NẾU CÓ
      // =====================================================

      if (avatar) {
        const fileName = `${Date.now()}-${avatar.name}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatar);

        if (uploadError) {
          console.error("UPLOAD AVATAR ERROR:", uploadError);
          alert(`Không thể upload ảnh: ${uploadError.message}`);
          setSaving(false);
          return;
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        avatarUrl = data.publicUrl;
      }

      // =====================================================
      // UPDATE ĐOÀN VIÊN
      // =====================================================

      const { error } = await supabase
        .from("members")
        .update({
          student_id: studentId,
          full_name: fullName,
          class_name: className,
          gender,

          avatar: avatarUrl,

          conduct_score: conductScore,
          activity_score: activityScore,
          volunteer_score: volunteerScore,
          discipline_score: disciplineScore,

          total_score: total,
          rating: rating,
        })
        .eq("id", id);

      if (error) {
        console.error("UPDATE MEMBER ERROR:", error);
        alert(`Không thể cập nhật: ${error.message}`);
        setSaving(false);
        return;
      }

      alert("Đã cập nhật thông tin đoàn viên!");

      router.push("/dashboard/members");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Đã xảy ra lỗi khi cập nhật đoàn viên!");
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // ĐANG TẢI
  // =========================================================

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl py-10">
        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-gray-600">
            Đang tải thông tin đoàn viên...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // GIAO DIỆN
  // =========================================================

  return (
    <main className="mx-auto max-w-4xl py-10 px-4">
      <h1 className="mb-2 text-4xl font-bold text-gray-900">
        Chỉnh sửa đoàn viên
      </h1>

      <p className="mb-8 text-gray-500">
        Cập nhật thông tin và điểm rèn luyện của đoàn viên.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl bg-white p-8 shadow"
      >
        {/* =====================================================
            THÔNG TIN CƠ BẢN
        ===================================================== */}

        <div>
          <label className="mb-2 block font-semibold text-gray-800">
            Mã sinh viên
          </label>

          <input
            className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Ví dụ: 123456"
          />
        </div>

        <div>
          <label className="mb-2 block font-semibold text-gray-800">
            Họ và tên
          </label>

          <input
            className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nhập họ và tên"
          />
        </div>

        <div>
          <label className="mb-2 block font-semibold text-gray-800">
            Lớp
          </label>

          <input
            className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Ví dụ: 11D"
          />
        </div>

        <div>
          <label className="mb-2 block font-semibold text-gray-800">
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

        {/* =====================================================
            ẢNH ĐẠI DIỆN
        ===================================================== */}

        <div>
          <label className="mb-2 block font-semibold text-gray-800">
            Ảnh đại diện
          </label>

          {currentAvatar && (
            <div className="mb-4">
              <p className="mb-2 text-sm text-gray-500">
                Ảnh hiện tại:
              </p>

              <img
                src={currentAvatar}
                alt="Ảnh đại diện"
                className="h-32 w-32 rounded-xl border object-cover"
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setAvatar(e.target.files?.[0] ?? null)
            }
            className="w-full rounded-xl border border-gray-300 p-3"
          />

          <p className="mt-2 text-sm text-gray-500">
            Không chọn ảnh mới nếu muốn giữ nguyên ảnh hiện tại.
          </p>
        </div>

        <hr />

        {/* =====================================================
            ĐIỂM RÈN LUYỆN
        ===================================================== */}

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Điểm rèn luyện
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Nhập điểm theo từng nội dung đánh giá bên dưới.
            Hệ thống sẽ tự động tính tổng điểm và xếp loại.
          </p>
        </div>

        {/* =====================================================
            HƯỚNG DẪN
        ===================================================== */}

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="mb-3 font-bold text-blue-900">
            Hướng dẫn nhập điểm
          </h3>

          <ul className="space-y-2 text-sm text-blue-900">
            <li>
              <strong>Điểm học tập:</strong> đánh giá kết quả và
              tinh thần học tập của đoàn viên.
            </li>

            <li>
              <strong>Điểm hoạt động:</strong> đánh giá mức độ
              tham gia các hoạt động của lớp, Đoàn và nhà trường.
            </li>

            <li>
              <strong>Điểm tình nguyện:</strong> đánh giá mức độ
              tham gia các hoạt động tình nguyện, phong trào
              cộng đồng và hoạt động xã hội.
            </li>

            <li>
              <strong>Điểm kỷ luật:</strong> đánh giá ý thức chấp
              hành nội quy, quy định và tinh thần kỷ luật.
            </li>
          </ul>
        </div>

        {/* =====================================================
            4 Ô ĐIỂM
        ===================================================== */}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* HỌC TẬP */}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <label className="mb-2 block text-lg font-bold text-gray-900">
              Điểm học tập
              <span className="ml-2 text-sm font-normal text-gray-500">
                (0 - 30)
              </span>
            </label>

            <p className="mb-3 min-h-[48px] text-sm leading-6 text-gray-600">
              Đánh giá kết quả học tập, tinh thần học tập và ý
              thức trong quá trình học tập.
            </p>

            <input
              type="number"
              min={0}
              max={30}
              step={1}
              value={conductScore}
              onChange={(e) =>
                setConductScore(Number(e.target.value))
              }
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-lg font-semibold outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              Điểm tối đa: 30 điểm
            </p>
          </div>

          {/* HOẠT ĐỘNG */}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <label className="mb-2 block text-lg font-bold text-gray-900">
              Điểm hoạt động
              <span className="ml-2 text-sm font-normal text-gray-500">
                (0 - 30)
              </span>
            </label>

            <p className="mb-3 min-h-[48px] text-sm leading-6 text-gray-600">
              Đánh giá mức độ tham gia các hoạt động Đoàn, lớp,
              trường và các phong trào tập thể.
            </p>

            <input
              type="number"
              min={0}
              max={30}
              step={1}
              value={activityScore}
              onChange={(e) =>
                setActivityScore(Number(e.target.value))
              }
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-lg font-semibold outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              Điểm tối đa: 30 điểm
            </p>
          </div>

          {/* TÌNH NGUYỆN */}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <label className="mb-2 block text-lg font-bold text-gray-900">
              Điểm tình nguyện
              <span className="ml-2 text-sm font-normal text-gray-500">
                (0 - 20)
              </span>
            </label>

            <p className="mb-3 min-h-[48px] text-sm leading-6 text-gray-600">
              Đánh giá sự tham gia các hoạt động tình nguyện,
              cộng đồng, xã hội và phong trào thiện nguyện.
            </p>

            <input
              type="number"
              min={0}
              max={20}
              step={1}
              value={volunteerScore}
              onChange={(e) =>
                setVolunteerScore(Number(e.target.value))
              }
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-lg font-semibold outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              Điểm tối đa: 20 điểm
            </p>
          </div>

          {/* KỶ LUẬT */}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <label className="mb-2 block text-lg font-bold text-gray-900">
              Điểm kỷ luật
              <span className="ml-2 text-sm font-normal text-gray-500">
                (0 - 20)
              </span>
            </label>

            <p className="mb-3 min-h-[48px] text-sm leading-6 text-gray-600">
              Đánh giá ý thức chấp hành nội quy, quy định, tác
              phong và tinh thần kỷ luật.
            </p>

            <input
              type="number"
              min={0}
              max={20}
              step={1}
              value={disciplineScore}
              onChange={(e) =>
                setDisciplineScore(Number(e.target.value))
              }
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-lg font-semibold outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              Điểm tối đa: 20 điểm
            </p>
          </div>
        </div>

        {/* =====================================================
            KẾT QUẢ TỰ ĐỘNG
        ===================================================== */}

        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <h3 className="mb-4 text-lg font-bold text-green-900">
            Kết quả đánh giá
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white p-4">
              <p className="text-sm text-gray-500">
                Tổng điểm
              </p>

              <p className="mt-1 text-3xl font-bold text-green-700">
                {total}
              </p>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="text-sm text-gray-500">
                Xếp loại
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-700">
                {rating}
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================
            NÚT
        ===================================================== */}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/members")}
            className="rounded-xl bg-gray-200 px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-300"
          >
            Hủy
          </button>
        </div>
      </form>
    </main>
  );
}