"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Bell,
  CalendarDays,
  FileText,
  Image,
  Settings,
  GraduationCap,
  Trophy,
} from "lucide-react";

import { useSidebar } from "@/context/SidebarContext";

const menuItems = [
  {
    href: "/dashboard",
    title: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/members",
    title: "Đoàn viên",
    icon: Users,
  },
  {
    href: "/dashboard/announcements",
    title: "Thông báo",
    icon: Bell,
  },
];

const extensionItems = [
  {
    href: "/dashboard/activities",
    title: "Sinh hoạt",
    icon: CalendarDays,
  },

  {
    href: "/dashboard/documents",
    title: "Tài liệu",
    icon: FileText,
  },
  {
    href: "/dashboard/library",
    title: "Thư viện",
    icon: Image,
  },

  {
    href: "/dashboard/frog-race",
    title: "Đua ếch",
    icon: Trophy,
  },
];

export default function Sidebar() {
  const { collapsed } = useSidebar();
  const pathname = usePathname();

  return (
    <aside
      className={`dashboard-sidebar ${
        collapsed ? "dashboard-sidebar-collapsed" : ""
      }`}
    >
      {/* BRAND */}

      <div className="dashboard-sidebar-brand">
        <div className="dashboard-sidebar-logo">
          <GraduationCap size={27} />
        </div>

        {!collapsed && (
          <div className="dashboard-sidebar-brand-text">
            <strong>CHI ĐOÀN D-K66</strong>
            <span>THPT HÀ TRUNG</span>
          </div>
        )}
      </div>

      {/* QUẢN LÝ */}

      <div className="dashboard-sidebar-section">
        {!collapsed && (
          <p className="dashboard-sidebar-label">
            QUẢN LÝ
          </p>
        )}

        <nav className="dashboard-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (
                item.href !== "/dashboard" &&
                pathname.startsWith(item.href)
              );

            return (
              <SidebarItem
                key={item.href}
                href={item.href}
                title={item.title}
                icon={<Icon size={20} />}
                collapsed={collapsed}
                active={active}
              />
            );
          })}
        </nav>
      </div>

      {/* MỞ RỘNG */}

      <div className="dashboard-sidebar-section">
        {!collapsed && (
          <p className="dashboard-sidebar-label">
            MỞ RỘNG
          </p>
        )}

        <nav className="dashboard-sidebar-nav">
          {extensionItems.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <SidebarItem
                key={item.href}
                href={item.href}
                title={item.title}
                icon={<Icon size={20} />}
                collapsed={collapsed}
                active={active}
              />
            );
          })}
        </nav>
      </div>

      {/* QUẢN TRỊ */}

      <div className="dashboard-sidebar-bottom">
        <SidebarItem
          href="/admin"
          title="Quản trị"
          icon={<Settings size={20} />}
          collapsed={collapsed}
          active={
            pathname === "/admin" ||
            pathname.startsWith("/admin/")
          }
        />
      </div>
    </aside>
  );
}

function SidebarItem({
  href,
  title,
  icon,
  collapsed,
  active,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`dashboard-sidebar-item ${
        active
          ? "dashboard-sidebar-item-active"
          : ""
      } ${
        collapsed
          ? "dashboard-sidebar-item-collapsed"
          : ""
      }`}
      title={collapsed ? title : undefined}
    >
      <span className="dashboard-sidebar-item-icon">
        {icon}
      </span>

      {!collapsed && (
        <span className="dashboard-sidebar-item-title">
          {title}
        </span>
      )}
    </Link>
  );
}