"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { calculateRating } from "@/lib/calculateRating";

export default function ScorePage() {
  const { id } = useParams();

  const router = useRouter();

  const [member, setMember] = useState<any>(null);

  const [conductScore, setConductScore] = useState(0);
  const [activityScore, setActivityScore] = useState(0);
  const [volunteerScore, setVolunteerScore] = useState(0);
  const [disciplineScore, setDisciplineScore] = useState(0);

  useEffect(() => {
    loadMember();
  }, []);

  async function loadMember() {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setMember(data);

    setConductScore(data.conduct_score || 0);
    setActivityScore(data.activity_score || 0);
    setVolunteerScore(data.volunteer_score || 0);
    setDisciplineScore(data.discipline_score || 0);
  }

  async function saveScore() {
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
      alert(error.message);
      return;
    }

    alert("Đã lưu điểm.");

    router.push("/dashboard/members");
  }

  if (!member) return <div className="p-10">Đang tải...</div>;

  const preview = calculateRating(
    conductScore,
    activityScore,
    volunteerScore,
    disciplineScore
  );

  return (
    <main className="mx-auto max-w-2xl py-10">

      <h1 className="mb-2 text-4xl font-bold">
        Chấm điểm đoàn viên
      </h1>

      <p className="mb-8 text-gray-500">
        {member.full_name}
      </p>

      <div className="space-y-5 rounded-2xl bg-white p-8 shadow">

        <input
          type="number"
          value={conductScore}
          onChange={(e) => setConductScore(Number(e.target.value))}
          className="w-full rounded-xl border p-3"
          placeholder="Điểm học tập"
        />

        <input
          type="number"
          value={activityScore}
          onChange={(e) => setActivityScore(Number(e.target.value))}
          className="w-full rounded-xl border p-3"
          placeholder="Điểm hoạt động"
        />

        <input
          type="number"
          value={volunteerScore}
          onChange={(e) => setVolunteerScore(Number(e.target.value))}
          className="w-full rounded-xl border p-3"
          placeholder="Điểm tình nguyện"
        />

        <input
          type="number"
          value={disciplineScore}
          onChange={(e) => setDisciplineScore(Number(e.target.value))}
          className="w-full rounded-xl border p-3"
          placeholder="Điểm kỷ luật"
        />

        <div className="rounded-xl bg-slate-100 p-5">

          <p>
            <b>Tổng điểm:</b> {preview.total}
          </p>

          <p className="mt-2">
            <b>Xếp loại:</b> {preview.rating}
          </p>

        </div>

        <button
          onClick={saveScore}
          className="w-full rounded-xl bg-blue-600 py-3 text-white hover:bg-blue-700"
        >
          Lưu điểm
        </button>

      </div>

    </main>
  );
}