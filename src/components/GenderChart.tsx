"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
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
  const total = male + female;

  const data = [
    {
      name: "Nam",
      value: male,
      color: COLORS[0],
    },
    {
      name: "Nữ",
      value: female,
      color: COLORS[1],
    },
  ];

  return (
    <div className="gender-chart-modern">

      {/* BIỂU ĐỒ */}

      <div className="gender-chart-pie">

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
                  key={`gender-${index}`}
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

        <div className="gender-chart-center">

          <strong>
            {total}
          </strong>

          <span>
            đoàn viên
          </span>

        </div>

      </div>


      {/* CHÚ THÍCH */}

      <div className="gender-chart-legend">

        <div className="gender-chart-legend-item">

          <div className="gender-chart-legend-left">

            <span
              className="gender-chart-dot"
              style={{
                background: COLORS[0],
              }}
            />

            <span>
              Nam
            </span>

          </div>

          <div className="gender-chart-legend-value">

            <strong>
              {male}
            </strong>

            <span>
              {total > 0
                ? `${Math.round((male / total) * 100)}%`
                : "0%"}
            </span>

          </div>

        </div>


        <div className="gender-chart-legend-item">

          <div className="gender-chart-legend-left">

            <span
              className="gender-chart-dot"
              style={{
                background: COLORS[1],
              }}
            />

            <span>
              Nữ
            </span>

          </div>

          <div className="gender-chart-legend-value">

            <strong>
              {female}
            </strong>

            <span>
              {total > 0
                ? `${Math.round((female / total) * 100)}%`
                : "0%"}
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}