"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  excellent: number;
  good: number;
  average: number;
  weak: number;
};

const DATA = [
  {
    name: "Xuất sắc",
    key: "excellent",
    color: "#16a34a",
  },
  {
    name: "Khá",
    key: "good",
    color: "#2563eb",
  },
  {
    name: "Trung bình",
    key: "average",
    color: "#f59e0b",
  },
  {
    name: "Yếu",
    key: "weak",
    color: "#dc2626",
  },
];

export default function RatingChart({
  excellent,
  good,
  average,
  weak,
}: Props) {
  const values: Record<string, number> = {
    excellent,
    good,
    average,
    weak,
  };

  const data = DATA.map((item) => ({
    name: item.name,
    value: values[item.key],
    color: item.color,
  }));

  const total =
    excellent +
    good +
    average +
    weak;

  return (
    <div className="rating-chart-modern">

      {/* BIỂU ĐỒ */}

      <div className="rating-chart-pie">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={82}
              outerRadius={116}
              paddingAngle={3}
              cornerRadius={8}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`rating-${index}`}
                  fill={entry.color}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                boxShadow:
                  "0 10px 30px rgba(15, 23, 42, 0.08)",
                padding: "10px 14px",
              }}
              formatter={(value) => [
                `${value} người`,
                "Số lượng",
              ]}
            />

          </PieChart>
        </ResponsiveContainer>


        {/* SỐ Ở GIỮA */}

        <div className="rating-chart-center">

          <strong>
            {total}
          </strong>

          <span>
            đã xếp loại
          </span>

        </div>

      </div>


      {/* DANH SÁCH XẾP LOẠI */}

      <div className="rating-chart-legend">

        {data.map((item) => {

          const percentage =
            total > 0
              ? Math.round(
                  (item.value / total) * 100
                )
              : 0;

          return (
            <div
              key={item.name}
              className="rating-chart-legend-item"
            >

              <div className="rating-chart-legend-left">

                <span
                  className="rating-chart-dot"
                  style={{
                    background: item.color,
                  }}
                />

                <span>
                  {item.name}
                </span>

              </div>


              <div className="rating-chart-legend-value">

                <strong>
                  {item.value}
                </strong>

                <span>
                  {percentage}%
                </span>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}