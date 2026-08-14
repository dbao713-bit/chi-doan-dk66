"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Bell,
  CalendarDays,
  FileText,
  Image,
  Settings,
  GraduationCap,
} from "lucide-react";

import { useSidebar } from "@/context/SidebarContext";

export default function Sidebar() {
  const { collapsed } = useSidebar();

  return (
    <aside
      className={`min-h-screen bg-[#005BAC] text-white shadow-xl transition-all duration-300 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Logo */}

      <div
        className={`border-b border-blue-400 ${
          collapsed ? "p-4" : "p-6"
        }`}
      >
        {collapsed ? (
          <div className="flex justify-center">
            <div className="rounded-xl bg-white p-3 text-[#005BAC]">
              <GraduationCap size={26} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-3 text-[#005BAC]">
              <GraduationCap size={28} />
            </div>

            <div>
              <h1 className="text-xl font-bold">
                CHI ĐOÀN D-K66
              </h1>

              <p className="text-sm text-blue-100">
                Hệ thống quản lý
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Menu */}

      <nav
  className={`mt-6 px-3 ${
    collapsed ? "space-y-7" : "space-y-2"
  }`}
>

        <MenuItem
          collapsed={collapsed}
          href="/dashboard"
          icon={<LayoutDashboard size={22} />}
          title="Dashboard"
        />

        <MenuItem
          collapsed={collapsed}
          href="/dashboard/members"
          icon={<Users size={22} />}
          title="Đoàn viên"
        />

        <MenuItem
  collapsed={collapsed}
  href="/dashboard/announcements"
  icon={<Bell size={22} />}
  title="Thông báo"
/>

        <MenuItem
          collapsed={collapsed}
          href="#"
          icon={<CalendarDays size={22} />}
          title="Sinh hoạt"
        />

        <MenuItem
          collapsed={collapsed}
          href="#"
          icon={<FileText size={22} />}
          title="Tài liệu"
        />

        <MenuItem
          collapsed={collapsed}
          href="#"
          icon={<Image size={22} />}
          title="Thư viện"
        />

        <MenuItem
          collapsed={collapsed}
          href="#"
          icon={<Settings size={22} />}
          title="Cài đặt"
        />

      </nav>
    </aside>
  );
}

function MenuItem({
  href,
  icon,
  title,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        flex items-center rounded-xl transition-all duration-300 hover:bg-blue-700

        ${
          collapsed
            ? "justify-center h-14 my-3"
            : "gap-3 px-4 py-3"
        }
      `}
    >
      {icon}

      {!collapsed && (
        <span className="font-medium">
          {title}
        </span>
      )}
    </Link>
  );
}