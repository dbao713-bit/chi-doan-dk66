"use client";

import { toast } from "sonner";
import exportMembersToPDF from "@/lib/exportPdf";
import { exportMembersToExcel } from "@/lib/exportExcel";

import GenderChart from "@/components/GenderChart";
import RatingChart from "@/components/RatingChart";
import StatCard from "@/components/StatCard";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Users,
  User,
  UserRoundCheck,
  Pencil,
  Trash2,
} from "lucide-react";

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

  // =========================================================
  // LOAD MEMBERS
  // =========================================================

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

        toast.error("Không thể tải danh sách đoàn viên", {
          description: error.message,
        });

        return;
      }

      console.table(data);

      setMembers(data ?? []);
    }

    loadMembers();
  }, []);

  // =========================================================
  // DELETE MEMBER
  // =========================================================

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

    setMembers((old) =>
      old.filter((member) => member.id !== id)
    );

    toast.success("Đã xóa đoàn viên!", {
      description:
        "Đoàn viên đã được xóa khỏi danh sách.",
    });

    setDeleteId(null);
    setDeleteName("");
  }

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredMembers = members.filter((member) => {
    const keyword = search.toLowerCase().trim();

    return (
      member.full_name
        .toLowerCase()
        .includes(keyword) ||
      member.student_id
        .toLowerCase()
        .includes(keyword)
    );
  });

  // =========================================================
  // STATISTICS
  // =========================================================

  const maleCount = members.filter(
    (member) => member.gender === "Nam"
  ).length;

  const femaleCount = members.filter(
    (member) => member.gender === "Nữ"
  ).length;

  const excellentCount = members.filter(
    (member) => member.rating === "Xuất sắc"
  ).length;

  const goodCount = members.filter(
    (member) => member.rating === "Khá"
  ).length;

  const averageCount = members.filter(
    (member) => member.rating === "Trung bình"
  ).length;

  const weakCount = members.filter(
    (member) => member.rating === "Yếu"
  ).length;

  const ratedCount =
    excellentCount +
    goodCount +
    averageCount +
    weakCount;

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <section className="members-page">

      {/* =====================================================
          TIÊU ĐỀ
          ===================================================== */}

      <div className="members-page-header">

        <div className="members-page-heading">

          <div className="members-page-kicker">
            QUẢN LÝ CHI ĐOÀN
          </div>

          <h1>
            Danh sách đoàn viên
          </h1>

          <p>
            Quản lý hồ sơ, đánh giá và thông tin đoàn viên D-K66.
          </p>

        </div>


        {/* ACTIONS */}

        <div className="members-page-actions">

          <div className="members-search">

            <span>⌕</span>

            <input
              type="text"
              placeholder="Tìm theo họ tên hoặc mã đoàn viên..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>


          <div className="members-action-group">

            <button
              onClick={async () => {
                await exportMembersToExcel(
                  filteredMembers
                );

                toast.success(
                  "Xuất Excel thành công!",
                  {
                    description:
                      "File DanhSachDoanVien.xlsx đã được tải xuống.",
                  }
                );
              }}
              className="members-action members-action-excel"
            >
              📄
              <span>
                Xuất Excel
              </span>
            </button>


            <button
              onClick={() => {
                exportMembersToPDF(
                  filteredMembers
                );

                toast.success(
                  "Xuất PDF thành công!",
                  {
                    description:
                      "File DanhSachDoanVien.pdf đã được tải xuống.",
                  }
                );
              }}
              className="members-action members-action-pdf"
            >
              📕
              <span>
                Xuất PDF
              </span>
            </button>


            <Link
              href="/dashboard/members/new"
              className="members-action members-action-primary"
            >
              +
              <span>
                Thêm đoàn viên
              </span>
            </Link>

          </div>

        </div>

      </div>


      {/* =====================================================
          THỐNG KÊ
          ===================================================== */}

      <div className="mb-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

        <StatCard
          title="Tổng đoàn viên"
          value={members.length}
          color="green"
          icon={<Users size={36} />}
        />


        <StatCard
          title="Nam"
          value={maleCount}
          color="blue"
          icon={<User size={36} />}
        />


        <StatCard
          title="Nữ"
          value={femaleCount}
          color="pink"
          icon={<UserRoundCheck size={36} />}
        />


        <StatCard
          title="Xuất sắc"
          value={excellentCount}
          color="emerald"
          icon={<UserRoundCheck size={36} />}
        />


        <StatCard
          title="Khá"
          value={goodCount}
          color="sky"
          icon={<UserRoundCheck size={36} />}
        />


        <StatCard
          title="Trung bình"
          value={averageCount}
          color="amber"
          icon={<UserRoundCheck size={36} />}
        />


        <StatCard
          title="Yếu"
          value={weakCount}
          color="red"
          icon={<UserRoundCheck size={36} />}
        />

      </div>


      {/* =====================================================
          THỐNG KÊ TRỰC QUAN
          ===================================================== */}

      <div className="members-analytics">

        {/* SECTION HEADER */}

        <div className="members-section-heading">

          <div>

            <span className="members-section-kicker">
              PHÂN TÍCH
            </span>

            <h2>
              Thống kê trực quan
            </h2>

            <p>
              Tổng quan về cơ cấu và kết quả đánh giá đoàn viên.
            </p>

          </div>

        </div>


        {/* ===================================================
            CHART GRID
            =================================================== */}

        <div className="members-chart-grid">


          {/* =================================================
              GENDER CHART
              ================================================= */}

          <div className="members-chart-card">

            <div className="members-chart-card-header">

              <div>

                <span className="members-chart-label">
                  CƠ CẤU
                </span>

                <h3>
                  Tỷ lệ đoàn viên
                </h3>

                <p className="members-chart-description">
                  Phân bố đoàn viên theo giới tính.
                </p>

              </div>


              <div className="members-chart-total">

                {members.length}

                <span>
                  người
                </span>

              </div>

            </div>


            {/* BIỂU ĐỒ GIỚI TÍNH */}

<div className="members-chart-visual">
  <GenderChart
    male={maleCount}
    female={femaleCount}
  />
</div>

</div>


{/* =================================================
    RATING CHART
    ================================================= */}

<div className="members-chart-card">

  <div className="members-chart-card-header">

    <div>

      <span className="members-chart-label">
        ĐÁNH GIÁ
      </span>

      <h3>
        Xếp loại đoàn viên
      </h3>

      <p className="members-chart-description">
        Kết quả đánh giá và phân loại đoàn viên.
      </p>

    </div>

    <div className="members-chart-total">
      {ratedCount}
      <span>
        đã xếp loại
      </span>
    </div>

  </div>


  {/* BIỂU ĐỒ XẾP LOẠI */}

  <div className="members-chart-visual">
    <RatingChart
      excellent={excellentCount}
      good={goodCount}
      average={averageCount}
      weak={weakCount}
    />
  </div>

</div>

</div>

</div>


      {/* =====================================================
          DANH SÁCH ĐOÀN VIÊN
          ===================================================== */}

      <div className="members-list-section">

        {/* LIST HEADER */}

        <div className="members-list-header">

          <div>

            <span className="members-section-kicker">
              HỒ SƠ ĐOÀN VIÊN
            </span>

            <h2>
              Danh sách đoàn viên
            </h2>

            <p>
              {filteredMembers.length} đoàn viên được hiển thị
            </p>

          </div>


          <div className="members-list-count">

            <span>
              {filteredMembers.length}
            </span>

            kết quả

          </div>

        </div>


        {/* ===================================================
            TABLE
            =================================================== */}

        <div className="members-table-shell">

          <div className="members-table-scroll">

            <table className="members-table">

              <thead>

                <tr>

                  <th>
                    Đoàn viên
                  </th>

                  <th>
                    Lớp
                  </th>

                  <th>
                    Giới tính
                  </th>

                  <th>
                    Tổng điểm
                  </th>

                  <th>
                    Xếp loại
                  </th>

                  <th className="members-table-action-heading">
                    Thao tác
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredMembers.map(
                  (member) => (

                    <tr
                      key={member.id}
                    >

                      {/* =================================
                          ĐOÀN VIÊN
                          ================================= */}

                      <td>

                        <div className="member-profile">

                          <div className="member-avatar">

                            {member.avatar ? (

                              <img
                                src={member.avatar}
                                alt={member.full_name}
                              />

                            ) : (

                              <span>
                                {member.full_name
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                            )}

                          </div>


                          <div className="member-profile-info">

                            <strong>
                              {member.full_name}
                            </strong>

                            <span>
                              {member.student_id}
                            </span>

                          </div>

                        </div>

                      </td>


                      {/* =================================
                          LỚP
                          ================================= */}

                      <td>

                        <span className="member-class">
                          {member.class_name}
                        </span>

                      </td>


                      {/* =================================
                          GIỚI TÍNH
                          ================================= */}

                      <td>

                        <span
                          className={`member-gender ${
                            member.gender === "Nam"
                              ? "member-gender-male"
                              : "member-gender-female"
                          }`}
                        >

                          <span className="member-status-dot" />

                          {member.gender}

                        </span>

                      </td>


                      {/* =================================
                          TỔNG ĐIỂM
                          ================================= */}

                      <td>

                        <div className="member-score">

                          <strong>
                            {member.total_score ?? "—"}
                          </strong>

                          {member.total_score !== null && (
                            <span>
                              / 100
                            </span>
                          )}

                        </div>

                      </td>


                      {/* =================================
                          XẾP LOẠI
                          ================================= */}

                      <td>

                        <span
                          className={`member-rating ${
                            member.rating === "Xuất sắc"
                              ? "member-rating-excellent"
                              : member.rating === "Khá"
                              ? "member-rating-good"
                              : member.rating === "Trung bình"
                              ? "member-rating-average"
                              : member.rating === "Yếu"
                              ? "member-rating-weak"
                              : "member-rating-none"
                          }`}
                        >

                          {member.rating ||
                            "Chưa xếp loại"}

                        </span>

                      </td>


                      {/* =================================
                          THAO TÁC
                          ================================= */}

                      <td>

                        <div className="member-actions">


                          {/* SỬA */}

                          <Link
                            href={`/dashboard/members/edit/${member.id}`}
                            className="member-action member-action-edit"
                            title="Chỉnh sửa"
                          >

                            <Pencil size={17} />

                          </Link>


                          {/* CHẤM ĐIỂM */}

                          <Link
                            href={`/dashboard/members/score/${member.id}`}
                            className="member-action member-action-score"
                            title="Chấm điểm"
                          >
                            ⭐
                          </Link>


                          {/* XÓA */}

                          <button
                            onClick={() => {
                              setDeleteId(
                                member.id
                              );

                              setDeleteName(
                                member.full_name
                              );
                            }}
                            className="member-action member-action-delete"
                            title="Xóa đoàn viên"
                          >

                            <Trash2 size={17} />

                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}


                {/* =========================================
                    EMPTY
                    ========================================= */}

                {filteredMembers.length === 0 && (

                  <tr>

                    <td
                      colSpan={6}
                      className="members-empty"
                    >

                      <div className="members-empty-icon">

                        <Users size={30} />

                      </div>


                      <strong>
                        Không tìm thấy đoàn viên
                      </strong>


                      <span>
                        Hãy thử thay đổi từ khóa tìm kiếm.
                      </span>

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>


      {/* =====================================================
          DELETE CONFIRMATION
          ===================================================== */}

      {deleteId !== null && (
  <div className="member-delete-overlay">

    <div className="member-delete-backdrop" />

    <div className="member-delete-dialog">

      <div className="member-delete-icon">
        <Trash2 size={23} />
      </div>

      <div className="member-delete-content">

        <span className="member-delete-kicker">
          XÁC NHẬN THAO TÁC
        </span>

        <h3>
          Xóa đoàn viên?
        </h3>

        <p>
          Bạn sắp xóa hồ sơ của{" "}
          <strong>
            {deleteName}
          </strong>
          .
          <br />
          Hành động này không thể hoàn tác.
        </p>

      </div>


      <div className="member-delete-warning">

        <span>
          !
        </span>

        <p>
          Tất cả thông tin đoàn viên trong danh sách
          sẽ bị xóa khỏi hệ thống.
        </p>

      </div>


      <div className="member-delete-actions">

        <button
          type="button"
          onClick={() => {
            setDeleteId(null);
            setDeleteName("");
          }}
          className="member-delete-cancel"
        >
          Hủy
        </button>

        <button
          type="button"
          onClick={() => {
            if (deleteId !== null) {
              deleteMember(deleteId);
            }
          }}
          className="member-delete-confirm"
        >
          <Trash2 size={16} />
          Xóa đoàn viên
        </button>

      </div>

    </div>

  </div>
)}

    </section>
  );
}