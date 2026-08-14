"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Props = {
  excellent: number;
  good: number;
  average: number;
  weak: number;
};

export default function RatingChart({
  excellent,
  good,
  average,
  weak,
}: Props) {
  const data = [
    {
      name: "Xuất sắc",
      value: excellent,
      color: "#16A34A",
    },
    {
      name: "Khá",
      value: good,
      color: "#2563EB",
    },
    {
      name: "Trung bình",
      value: average,
      color: "#F59E0B",
    },
    {
      name: "Yếu",
      value: weak,
      color: "#DC2626",
    },
  ];

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl h-[420px]">

      <h2 className="mb-6 text-xl font-bold">
        Thống kê xếp loại
      </h2>

      <ResponsiveContainer
  width="100%"
  height={300}
>
        <PieChart>

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={110}
            label
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color}
              />
            ))}
          </Pie>

          <Tooltip />

          <Legend />

        </PieChart>
      </ResponsiveContainer>

    </div>
  );
}