import {
  SCORE_MAX_TOTAL,
  SCORE_RULES,
  clampScore,
} from "@/lib/scoring";

export function calculateRating(
  conduct: number,
  activity: number,
  volunteer: number,
  discipline: number
) {
  const safeConduct = clampScore(
    conduct,
    SCORE_RULES.conduct.max
  );

  const safeActivity = clampScore(
    activity,
    SCORE_RULES.activity.max
  );

  const safeVolunteer = clampScore(
    volunteer,
    SCORE_RULES.volunteer.max
  );

  const safeDiscipline = clampScore(
    discipline,
    SCORE_RULES.discipline.max
  );

  const total = Math.min(
    safeConduct +
      safeActivity +
      safeVolunteer +
      safeDiscipline,
    SCORE_MAX_TOTAL
  );

  let rating: string;

  if (total >= 90) {
    rating = "Xuất sắc";
  } else if (total >= 80) {
    rating = "Khá";
  } else if (total >= 65) {
    rating = "Trung bình";
  } else {
    rating = "Yếu";
  }

  return {
    total,
    rating,
    scores: {
      conduct: safeConduct,
      activity: safeActivity,
      volunteer: safeVolunteer,
      discipline: safeDiscipline,
    },
  };
}