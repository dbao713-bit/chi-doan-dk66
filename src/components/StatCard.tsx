import React from "react";

type Props = {
  title: string;
  value: number;
  color?: string;
  icon: React.ReactNode;
};

export default function StatCard({
  title,
  value,
  color = "blue",
  icon,
}: Props) {
  const themes: Record<
    string,
    {
      icon: string;
      number: string;
      glow: string;
    }
  > = {
    blue: {
      icon: "stat-icon-blue",
      number: "stat-number-blue",
      glow: "stat-glow-blue",
    },
    green: {
      icon: "stat-icon-green",
      number: "stat-number-green",
      glow: "stat-glow-green",
    },
    pink: {
      icon: "stat-icon-pink",
      number: "stat-number-pink",
      glow: "stat-glow-pink",
    },
    emerald: {
      icon: "stat-icon-emerald",
      number: "stat-number-emerald",
      glow: "stat-glow-emerald",
    },
    sky: {
      icon: "stat-icon-sky",
      number: "stat-number-sky",
      glow: "stat-glow-sky",
    },
    amber: {
      icon: "stat-icon-amber",
      number: "stat-number-amber",
      glow: "stat-glow-amber",
    },
    red: {
      icon: "stat-icon-red",
      number: "stat-number-red",
      glow: "stat-glow-red",
    },
  };

  const theme = themes[color] ?? themes.blue;

  return (
    <div className={`members-stat-card ${theme.glow}`}>
      <div className="members-stat-content">
        <div className="members-stat-top">
          <span className="members-stat-title">
            {title}
          </span>

          <div className={`members-stat-icon ${theme.icon}`}>
            {icon}
          </div>
        </div>

        <div className="members-stat-bottom">
          <span className={`members-stat-number ${theme.number}`}>
            {value}
          </span>

          <span className="members-stat-unit">
            người
          </span>
        </div>
      </div>
    </div>
  );
}