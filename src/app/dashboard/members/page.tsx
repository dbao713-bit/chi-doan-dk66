"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import exportMembersToPDF from "@/lib/exportPdf";
import { exportMembersToExcel } from "@/lib/exportExcel";
import GenderChart from "@/components/GenderChart";
import { useEffect, useState } from "react";
import Link from "next/link";
import RatingChart from "@/components/RatingChart";
import {
  Users,
  User,
  UserRoundCheck,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";


import StatCard from "@/components/StatCard";
import { supabase } from "@/lib/supabase";

type Member = {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
  gender: string;
  avatar: string | null;
  conduct_score: number | null;
  activity_score: number | null;
  volunteer_score: number | null;
  discipline_score: number | null;
  total_score: number | null;
  rating: string | null;
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");

  useEffect(() => {
  async function loadMembers() {
    console.time("LOAD MEMBERS");

    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("id");

    console.timeEnd("LOAD MEMBERS");

    if (error) {
      console.log(error);
      return;
    }

    console.table(data);
    setMembers(data ?? []);
  }

  loadMembers();
}, []);

 async function deleteMember(id: number) {
  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", id);

  if (error) {
    toast.error("Xóa thất bại!", {
      description: error.message,
    });
    return;
  }

  setMembers((old) => old.filter((m) => m.id !== id));

  toast.success("Đã xóa đoàn viên!", {
    description: "Đoàn viên đã được xóa khỏi danh sách.",
  });
  setDeleteId(null);
}

  const filteredMembers = members.filter(
    (member) =>
      member.full_name.toLowerCase().includes(search.toLowerCase()) ||
      member.student_id.includes(search)
  );

  const maleCount = members.filter(
  (m) => m.gender === "Nam"
).length;

const femaleCount = members.filter(
  (m) => m.gender === "Nữ"
).length;

const excellentCount = members.filter(
  (m) => m.rating === "Xuất sắc"
).length;

const goodCount = members.filter(
  (m) => m.rating === "Khá"
).length;

const averageCount = members.filter(
  (m) => m.rating === "Trung bình"
).length;

const weakCount = members.filter(
  (m) => m.rating === "Yếu"
).length;

  return (
    <section className="p-12 space-y-12">
        {/* Tiêu đề */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              Danh sách đoàn viên
            </h1>

            <p className="mt-2 text-gray-500">
              Quản lý đoàn viên Chi đoàn D-K66
            </p>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="🔍 Tìm đoàn viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 rounded-xl border bg-white px-4 py-3"
            />

<div className="flex gap-3">

  <button
  onClick={async () => {
    await exportMembersToExcel(filteredMembers);

    toast.success("Xuất Excel thành công!", {
      description: "File DanhSachDoanVien.xlsx đã được tải xuống.",
    });
  }}
  className="rounded-xl bg-green-600 px-5 py-3 text-white transition hover:bg-green-700"
>
  📄 Xuất Excel
</button>

  <button
  onClick={() => {
    exportMembersToPDF(filteredMembers);

    toast.success("Xuất PDF thành công!", {
      description: "File DanhSachDoanVien.pdf đã được tải xuống.",
    });
  }}
  className="rounded-xl bg-red-600 px-5 py-3 text-white transition hover:bg-red-700"
>
  📕 Xuất PDF
</button>

</div>

            <Link
              href="/dashboard/members/new"
              className="rounded-xl bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700"
            >
              + Thêm đoàn viên
            </Link>
          </div>
        </div>

        {/* Thống kê */}
        <div className="mb-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard
            title="Tổng đoàn viên"
            value={members.length}
            color="bg-gradient-to-br from-blue-500 to-blue-700"
            icon={<Users size={36} />}
          />

          <StatCard
            title="Nam"
            value={members.filter((m) => m.gender === "Nam").length}
            color="bg-gradient-to-br from-green-500 to-green-700"
            icon={<User size={36} />}
          />

          <StatCard
            title="Nữ"
            value={members.filter((m) => m.gender === "Nữ").length}
            color="bg-gradient-to-br from-pink-500 to-pink-700"
            icon={<UserRoundCheck size={36} />}
          />

           <StatCard
  title="Xuất sắc"
  value={excellentCount}
  color="bg-gradient-to-br from-emerald-500 to-emerald-700"
  icon={<UserRoundCheck size={36} />}
/>

<StatCard
  title="Khá"
  value={goodCount}
  color="bg-gradient-to-br from-sky-500 to-sky-700"
  icon={<UserRoundCheck size={36} />}
/>

<StatCard
  title="Trung bình"
  value={averageCount}
  color="bg-gradient-to-br from-amber-400 to-orange-500"
  icon={<UserRoundCheck size={36} />}
/>

<StatCard
  title="Yếu"
  value={weakCount}
  color="bg-gradient-to-br from-red-500 to-rose-700"
  icon={<UserRoundCheck size={36} />}
/>

        </div>

<div className="mt-16">

  <div className="mt-10">
  {/* Biểu đồ */}

<div className="h-10"></div>

<h2 className="text-3xl font-bold text-slate-800 mb-8">
  📊 Thống kê trực quan
</h2>

</div>
<div className="grid grid-cols-1 gap-10 xl:grid-cols-2">

  <GenderChart
    male={maleCount}
    female={femaleCount}
  />

  <RatingChart
    excellent={excellentCount}
    good={goodCount}
    average={averageCount}
    weak={weakCount}
  />

</div>

</div>

        {/* Bảng */}
<div className="h-10"></div>
<div className="mt-20 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left">
                  Họ tên
                </th>

                <th className="px-6 py-4 text-left">
                  Lớp
                </th>

                <th className="px-6 py-4 text-left">
                  Giới tính
                </th>
                <th className="px-6 py-4 text-left">
                  Tổng điểm
                </th>
                <th className="px-6 py-4 text-left">
                  Xếp loại
                </th>

                <th className="px-6 py-4 text-center">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-t transition hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10">
  {member.avatar ? (
    <img
      src={member.avatar}
      alt={member.full_name}
      className="h-10 w-10 rounded-full object-cover"
    />
  ) : (
    <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-200">
  {member.avatar ? (
    <img
      src={member.avatar}
      alt={member.full_name}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-blue-600 text-white font-bold">
      {member.full_name.charAt(0).toUpperCase()}
    </div>
  )}
</div>
  )}
</div>

                      <div>
                        <p className="font-semibold">
                          {member.full_name}
                        </p>

                        <p className="text-sm text-gray-500">
                          {member.student_id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {member.class_name}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        member.gender === "Nam"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      {member.gender}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {member.total_score ?? "—"}
                  </td>
                  <td className="px-6 py-4">
  <span
    className={`rounded-full px-3 py-1 text-sm font-medium ${
      member.rating === "Xuất sắc"
        ? "bg-green-100 text-green-700"
        : member.rating === "Khá"
        ? "bg-blue-100 text-blue-700"
        : member.rating === "Trung bình"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700"
    }`}
  >
    {member.rating || "Chưa xếp loại"}
  </span>
</td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">

                      <Link
  href={`/dashboard/members/edit/${member.id}`}
  className="rounded-lg p-2 text-yellow-600 transition hover:bg-yellow-100"
>
  <Pencil size={18} />
</Link>

<Link
  href={`/dashboard/members/score/${member.id}`}
  className="rounded-lg p-2 text-green-600 transition hover:bg-green-100"
  title="Chấm điểm"
>
  ⭐
</Link>

<button
  onClick={() => deleteMember(member.id)}
  className="rounded-lg p-2 text-red-600 transition hover:bg-red-100"
>
  <Trash2 size={18} />
</button>

                    </div>
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-gray-500"
                  >
                    Không tìm thấy đoàn viên.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </section>
  );
}
