"use client";

import Link from "next/link";
import { Bell, Menu, ShieldCheck, UserCircle2 } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

export default function Header() {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <header className="mb-8 flex min-h-20 items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-8">

      {/* Bên trái */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">

        {/* Nút thu / mở Sidebar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 rounded-xl p-2 transition hover:bg-gray-100"
          aria-label="Mở hoặc thu Sidebar"
        >
          <Menu
            size={28}
            className="text-[#005BAC]"
          />
        </button>

        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-[#005BAC] sm:text-xl">
            Hệ thống quản lý Chi đoàn D-K66
          </h2>

          <p className="hidden text-sm text-gray-500 sm:block">
            Trường THPT Hà Trung
          </p>
        </div>

      </div>

      {/* Bên phải */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-6">

        {/* Thông báo */}
        <Link
          href="/dashboard/announcements"
          className="relative rounded-xl p-2 transition hover:bg-gray-100"
          aria-label="Thông báo"
        >
          <Bell
            size={22}
            className="text-gray-700 sm:h-6 sm:w-6"
          />

          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 sm:right-2 sm:top-2" />
        </Link>

        {/* Nút Admin - đặc biệt hữu ích trên điện thoại */}
        <Link
          href="/admin"
          className="dashboard-admin-button"
          aria-label="Đăng nhập quản trị"
>
          <ShieldCheck size={18} />

          <span>
            BCH / Admin
          </span>
        </Link>

        {/* Thông tin Admin */}
        <div className="hidden items-center gap-3 md:flex">

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