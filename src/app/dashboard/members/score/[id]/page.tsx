"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { calculateRating } from "@/lib/calculateRating";
import { SCORE_RULES } from "@/lib/scoring";

type ScoreKey = keyof typeof SCORE_RULES;

export default function ScorePage() {
  const { id } = useParams();
  const router = useRouter();

  const [member, setMember] = useState<any>(null);
  const [conductScore, setConductScore] = useState(0);
  const [activityScore, setActivityScore] = useState(0);
  const [volunteerScore, setVolunteerScore] = useState(0);
  const [disciplineScore, setDisciplineScore] = useState(0);
  const [saving, setSaving] = useState(false);

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

    score = Math.min(Math.max(score, 0), max);

    setScore(key, score);
  }

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

  async function saveScore() {
    if (saving) return;

    setSaving(true);

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
      setSaving(false);
      alert(error.message);
      return;
    }

    alert("Đã lưu điểm.");
    router.push("/dashboard/members");
  }

  if (!member) {
    return <div className="p-10">Đang tải...</div>;
  }

  const preview = calculateRating(
    conductScore,
    activityScore,
    volunteerScore,
    disciplineScore
  );

  const scoreFields = [
    {
      key: "conduct" as const,
      value: conductScore,
    },
    {
      key: "activity" as const,
      value: activityScore,
    },
    {
      key: "volunteer" as const,
      value: volunteerScore,
    },
    {
      key: "discipline" as const,
      value: disciplineScore,
    },
  ];

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            ĐÁNH GIÁ ĐOÀN VIÊN
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Chấm điểm đoàn viên
          </h1>

          <p className="mt-2 text-gray-500">
            {member.full_name}
          </p>
        </div>

        <div className="space-y-5 rounded-3xl bg-white p-6 shadow-lg sm:p-8">
          {scoreFields.map(({ key, value }) => {
            const rule = SCORE_RULES[key];

            return (
              <div
                key={key}
                className="rounded-2xl border border-gray-200 p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-gray-900">
                      {rule.label}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {rule.description}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    Tối đa {rule.max} điểm
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={rule.max}
                    step={1}
                    value={value}
                    onChange={(e) =>
                      handleScoreChange(key, e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <span className="text-sm font-medium text-gray-500">
                    / {rule.max}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl bg-slate-100 p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Tổng điểm
                </p>

                <p className="mt-1 text-4xl font-black text-gray-900">
                  {preview.total}
                  <span className="ml-1 text-lg font-medium text-gray-400">
                    / 100
                  </span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">
                  Xếp loại
                </p>

                <p className="mt-1 text-xl font-bold text-blue-700">
                  {preview.rating}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={saveScore}
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu điểm"}
          </button>
        </div>
      </div>
    </main>
  );
}
