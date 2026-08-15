"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { calculateRating } from "@/lib/calculateRating";

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

  useEffect(() => {
    async function loadMember() {
      if (!id) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("LỖI LẤY ĐOÀN VIÊN:", error);
        alert(error.message);
        setLoading(false);
        return;
      }

      setStudentId(data.student_id ?? "");
      setFullName(data.full_name ?? "");
      setClassName(data.class_name ?? "");
      setGender(data.gender ?? "Nam");

      setConductScore(data.conduct_score ?? 0);
      setActivityScore(data.activity_score ?? 0);
      setVolunteerScore(data.volunteer_score ?? 0);
      setDisciplineScore(data.discipline_score ?? 0);

      setCurrentAvatar(data.avatar ?? "");

      setLoading(false);
    }

    loadMember();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);

    try {
      let avatarUrl = currentAvatar;

      // Nếu chọn ảnh mới thì upload ảnh mới
      if (avatar) {
        const safeName = avatar.name.replace(/[^a-zA-Z0-9._-]/g, "-");

        const fileName = `${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatar);

        if (uploadError) {
          console.error("LỖI UPLOAD AVATAR:", uploadError);
          alert(uploadError.message);
          return;
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        avatarUrl = data.publicUrl;
      }

      // Tính lại tổng điểm và xếp loại
      const { total, rating } = calculateRating(
        conductScore,
        activityScore,
        volunteerScore,
        disciplineScore
      );

      // Cập nhật đoàn viên
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
        console.error("LỖI UPDATE MEMBER:", error);
        alert(error.message);
        return;
      }

      alert("Đã cập nhật đoàn viên!");

      router.push("/dashboard/members");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-gray-500">
          Đang tải thông tin đoàn viên...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl py-10">
      <h1 className="mb-8 text-4xl font-bold">
        Chỉnh sửa đoàn viên
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl bg-white p-8 shadow"
      >
        <input
          className="w-full rounded-xl border p-3"
          placeholder="Mã sinh viên"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />

        <input
          className="w-full rounded-xl border p-3"
          placeholder="Họ tên"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="w-full rounded-xl border p-3"
          placeholder="Lớp"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        />

        <select
          className="w-full rounded-xl border p-3"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="Nam">Nam</option>
          <option value="Nữ">Nữ</option>
        </select>

        <div>
          <label className="mb-2 block font-medium">
            Ảnh đại diện
          </label>

          {currentAvatar && (
            <div className="mb-3">
              <img
                src={currentAvatar}
                alt="Ảnh đại diện hiện tại"
                className="h-24 w-24 rounded-xl object-cover"
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setAvatar(e.target.files?.[0] ?? null)
            }
            className="w-full rounded-xl border p-3"
          />

          <p className="mt-2 text-sm text-gray-500">
            Không chọn ảnh nếu muốn giữ ảnh hiện tại.
          </p>
        </div>

        <hr />

        <h2 className="text-xl font-bold">
          Điểm rèn luyện
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            min={0}
            max={30}
            placeholder="Điểm học tập"
            value={conductScore}
            onChange={(e) =>
              setConductScore(Number(e.target.value))
            }
            className="rounded-xl border p-3"
          />

          <input
            type="number"
            min={0}
            max={30}
            placeholder="Điểm hoạt động"
            value={activityScore}
            onChange={(e) =>
              setActivityScore(Number(e.target.value))
            }
            className="rounded-xl border p-3"
          />

          <input
            type="number"
            min={0}
            max={20}
            placeholder="Điểm tình nguyện"
            value={volunteerScore}
            onChange={(e) =>
              setVolunteerScore(Number(e.target.value))
            }
            className="rounded-xl border p-3"
          />

          <input
            type="number"
            min={0}
            max={20}
            placeholder="Điểm kỷ luật"
            value={disciplineScore}
            onChange={(e) =>
              setDisciplineScore(Number(e.target.value))
            }
            className="rounded-xl border p-3"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border px-6 py-3 transition hover:bg-gray-100"
          >
            Hủy
          </button>
        </div>
      </form>
    </main>
  );
}