"use client";

import Link from "next/link";
import {
  Bell,
  Menu,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

export default function Header() {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <header
      className="
        mb-6
        flex min-h-[88px]
        items-center justify-between
        rounded-2xl
        border border-slate-200/80
        bg-white
        px-6 py-4
        shadow-[0_8px_30px_rgba(15,23,42,0.06)]
        backdrop-blur
        sm:px-7
        lg:px-9
      "
      style={{
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* =====================================================
          BÊN TRÁI
      ===================================================== */}
      <div className="flex min-w-0 items-center gap-4">

        {/* NÚT SIDEBAR */}
        <button
          type="button"
          onClick={() =>
            setCollapsed(!collapsed)
          }
          className="
            flex h-11 w-11
            shrink-0
            items-center justify-center
            rounded-xl
            border border-slate-200
            bg-white
            text-[#005BAC]
            shadow-sm
            transition
            hover:bg-gray-100
          "
          aria-label="Mở hoặc thu Sidebar"
        >
          <Menu
            size={24}
            strokeWidth={2}
          />
        </button>

        {/* TÊN HỆ THỐNG */}
        <div className="min-w-0">

          <h1
            className="
              truncate
              text-[20px]
              font-bold
              leading-tight
              tracking-[-0.02em]
              text-slate-800
              sm:text-[23px]
            "
          >
            Hệ thống quản lý Chi đoàn D-K66
          </h1>

          <div className="mt-1.5 flex items-center gap-2">

            <span
              className="
                h-1.5
                w-1.5
                shrink-0
                rounded-full
                bg-emerald-500
              "
            />

            <p
              className="
                truncate
                text-[14px]
                font-normal
                text-slate-500
              "
            >
              Trường THPT Hà Trung
            </p>

          </div>
        </div>
      </div>

      {/* =====================================================
          BÊN PHẢI
      ===================================================== */}
      <div
        className="
          flex shrink-0
          items-center
          gap-3
        "
      >

        {/* =================================================
            THÔNG BÁO
        ================================================= */}
        <Link
          href="/dashboard/announcements"
          className="
            relative
            flex h-11 w-11
            items-center justify-center
            rounded-xl
            text-slate-700
            transition
            hover:bg-gray-100
          "
          aria-label="Thông báo"
        >
          <Bell
            size={22}
            strokeWidth={2}
          />

          <span
            className="
              absolute
              right-[7px]
              top-[6px]
              h-2.5
              w-2.5
              rounded-full
              border-2
              border-white
              bg-red-500
            "
          />
        </Link>

        {/* =================================================
            BCH / ADMIN
            GIỮ KIỂU BAN ĐẦU
        ================================================= */}
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

        {/* =================================================
            THÔNG TIN ADMIN
        ================================================= */}
        <div className="hidden items-center gap-3 md:flex">

          <UserCircle2
            size={42}
            className="text-[#005BAC]"
          />

          <div>

            <p
              className="
                font-semibold
                leading-tight
                text-slate-800
              "
            >
              Admin
            </p>

            <p
              className="
                mt-1
                text-sm
                leading-tight
                text-gray-500
              "
            >
              BCH Chi Đoàn
            </p>

          </div>
        </div>

      </div>
    </header>
  );
}