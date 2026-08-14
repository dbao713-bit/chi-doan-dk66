"use client";

import Link from "next/link";
import { Bell, Menu, UserCircle2 } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

export default function Header() {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <header className="mb-8 flex h-20 items-center justify-between rounded-2xl border border-gray-200 bg-white px-8 shadow-sm">

      {/* Bên trái */}
      <div className="flex items-center gap-5">

        {/* Nút thu / mở Sidebar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-xl p-2 transition hover:bg-gray-100"
        >
          <Menu
            size={28}
            className="text-[#005BAC]"
          />
        </button>

        <div>
          <h2 className="text-xl font-bold text-[#005BAC]">
            Hệ thống quản lý Chi đoàn D-K66
          </h2>

          <p className="text-sm text-gray-500">
            Trường THPT Hà Trung
          </p>
        </div>

      </div>

      {/* Bên phải */}
      <div className="flex items-center gap-6">

        <Link
  href="/dashboard/announcements"
  className="relative rounded-xl p-2 transition hover:bg-gray-100"
>
  <Bell size={24} />

  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
</Link>

        <div className="flex items-center gap-3">

          <UserCircle2
            size={42}
            className="text-[#005BAC]"
          />

          <div>

            <p className="font-semibold">
              Admin
            </p>

            <p className="text-sm text-gray-500">
              BCH Chi Đoàn
            </p>

          </div>

        </div>

      </div>

    </header>
  );
}