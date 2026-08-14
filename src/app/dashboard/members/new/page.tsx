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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let avatarUrl = "";

    // Upload avatar
    if (avatar) {
      const fileName = `${Date.now()}-${avatar.name}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatar);

      if (uploadError) {
        alert(uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      avatarUrl = data.publicUrl;
    }

    // Tự tính tổng điểm và xếp loại
    const { total, rating } = calculateRating(
      conductScore,
      activityScore,
      volunteerScore,
      disciplineScore
    );

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

    // Lưu dữ liệu
    const { error } = await supabase.from("members").insert([
      {
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
      },
    ]);

    if (error) {
      console.error("SUPABASE INSERT ERROR:", error);
      alert(error.message);
      return;
    }

    alert("Đã thêm đoàn viên!");

    router.push("/dashboard/members");
  }

  return (
    <main className="mx-auto max-w-3xl py-10">
      <h1 className="mb-8 text-4xl font-bold">
        Thêm đoàn viên
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

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setAvatar(e.target.files?.[0] ?? null)
            }
            className="w-full rounded-xl border p-3"
          />
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

        <button className="rounded-xl bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700">
          Lưu đoàn viên
        </button>
      </form>
    </main>
  );
}