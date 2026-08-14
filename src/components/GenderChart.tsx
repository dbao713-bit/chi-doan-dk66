"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Props = {
  male: number;
  female: number;
};

const COLORS = ["#2563eb", "#ec4899"];

export default function GenderChart({
  male,
  female,
}: Props) {
  const data = [
    {
      name: "Nam",
      value: male,
    },
    {
      name: "Nữ",
      value: female,
    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 h-[420px]">
      <h2 className="text-xl font-bold mb-4">
        Tỷ lệ đoàn viên
      </h2>

      <div className="h-[320px] mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              label
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index]}
                />
              ))}
            </Pie>

            <Tooltip />

            <Legend />

          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}