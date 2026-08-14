export function calculateRating(
  conduct: number,
  activity: number,
  volunteer: number,
  discipline: number
) {
  const total =
    conduct +
    activity +
    volunteer +
    discipline;

  let rating = "";

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
  };
}