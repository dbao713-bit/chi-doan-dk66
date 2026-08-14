import React from "react";

type Props = {
  title: string;
  value: number;
  color: string;
  icon: React.ReactNode;
};

export default function StatCard({
  title,
  value,
  color,
  icon,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">

      <div className="flex h-32">

        {/* Nội dung */}

        <div className="flex flex-1 flex-col justify-center px-6">

          <p className="text-xl font-bold text-gray-700">
            {title}
          </p>

          <div className="mt-3 flex items-end gap-2">

            <span className="text-5xl font-bold text-blue-600">
              {value}
            </span>

            <span className="mb-1 text-gray-500">
              người
            </span>

          </div>

        </div>

        {/* Icon */}

        <div
          className={`flex w-28 items-center justify-center ${color}`}
        >
          <div className="text-white">
            {icon}
          </div>
        </div>

      </div>

    </div>
  );
}