"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";

import { toast } from "sonner";

type Announcement = {
  id: string;
  title: string;
  content: string;
  image: string;
  author: string;
  created_at: string;
};

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setAnnouncements(data ?? []);
  }

  async function deleteAnnouncement(id: string) {
    const ok = confirm(
      "Bạn có chắc muốn xóa thông báo này?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAnnouncements((old) =>
      old.filter((item) => item.id !== id)
    );

    toast.success("Đã xóa thông báo");
  }

  return (
    <section className="space-y-8">

      {/* Tiêu đề */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-4xl font-bold">
            Quản lý thông báo
          </h1>

          <p className="text-gray-500 mt-2">
            Danh sách tất cả thông báo
          </p>

        </div>

        <Link
          href="/dashboard/announcements/create"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Thêm thông báo
        </Link>

      </div>

      {/* Bảng */}

      <div className="overflow-hidden rounded-3xl bg-white shadow-xl">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>

              <th className="px-5 py-4 text-left">
                Ảnh
              </th>

              <th className="px-5 py-4 text-left">
                Tiêu đề
              </th>

              <th className="px-5 py-4 text-left">
                Người đăng
              </th>

              <th className="px-5 py-4 text-left">
                Ngày đăng
              </th>

              <th className="px-5 py-4 text-center">
                Thao tác
              </th>

            </tr>

          </thead>

          <tbody>

            {announcements.map((item) => (

              <tr
                key={item.id}
                className="border-t hover:bg-slate-50"
              >

                <td className="px-5 py-4">

                  {item.image ? (

                    <img
                      src={item.image}
                      className="h-16 w-24 rounded-lg object-cover"
                    />

                  ) : (

                    <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-gray-200">

                      Không ảnh

                    </div>

                  )}

                </td>

                <td className="px-5 py-4">

                  <div className="font-semibold">
                    {item.title}
                  </div>

                  <div className="text-sm text-gray-500">

                    {item.content.replace(/<[^>]+>/g, "").slice(0, 80)}...

                  </div>

                </td>

                <td className="px-5 py-4">

                  {item.author}

                </td>

                <td className="px-5 py-4">

                  {new Date(
                    item.created_at
                  ).toLocaleDateString("vi-VN")}

                </td>

                <td className="px-5 py-4">

                  <div className="flex justify-center gap-2">

                    <Link
                      href={`/announcement/${item.id}`}
                      className="rounded-lg p-2 text-blue-600 hover:bg-blue-100"
                    >
                      <Eye size={18} />
                    </Link>

                    <Link
  href={`/dashboard/announcements/edit/${item.id}`}
  className="rounded-lg p-2 text-yellow-600 hover:bg-yellow-100"
>
  <Pencil size={18} />
</Link>

                    <button
                      onClick={() =>
                        deleteAnnouncement(item.id)
                      }
                      className="rounded-lg p-2 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={18} />
                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </section>
  );
}