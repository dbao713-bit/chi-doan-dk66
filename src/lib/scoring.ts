export const SCORE_RULES = {
  conduct: {
    key: "conduct",
    label: "Điểm học tập",
    max: 30,
    description:
      "Đánh giá kết quả, ý thức và tinh thần học tập của đoàn viên.",
  },

  activity: {
    key: "activity",
    label: "Điểm hoạt động",
    max: 30,
    description:
      "Đánh giá mức độ tham gia hoạt động Đoàn, phong trào và tập thể.",
  },

  volunteer: {
    key: "volunteer",
    label: "Điểm tình nguyện",
    max: 20,
    description:
      "Đánh giá mức độ tham gia hoạt động tình nguyện, thiện nguyện và vì cộng đồng.",
  },

  discipline: {
    key: "discipline",
    label: "Điểm kỷ luật",
    max: 20,
    description:
      "Đánh giá ý thức chấp hành nội quy, quy định và kỷ luật.",
  },
} as const;

export const SCORE_MAX_TOTAL = 100;

export function clampScore(
  value: number,
  max: number
) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    Math.max(value, 0),
    max
  );
}