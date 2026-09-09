"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Inbox,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type FeedbackStatus = "new" | "processing" | "resolved" | "archived";

type FeedbackItem = {
  id: string;
  member_id: number | null;
  is_anonymous: boolean;
  subject: string;
  content: string;
  status: FeedbackStatus;
  admin_note: string | null;
  member_response: string | null;
  responded_at: string | null;
  handled_at: string | null;
  created_at: string;
};

const statusMeta: Record<
  FeedbackStatus,
  { label: string; className: string }
> = {
  new: {
    label: "Mới",
    className: "border-blue-100 bg-blue-50 text-blue-700",
  },
  processing: {
    label: "Đang xử lý",
    className: "border-amber-100 bg-amber-50 text-amber-700",
  },
  resolved: {
    label: "Đã xử lý",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  archived: {
    label: "Đã lưu",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

export default function FeedbackDashboardPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | FeedbackStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [memberResponse, setMemberResponse] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("feedback")
      .select(
        "id,member_id,is_anonymous,subject,content,status,admin_note,member_response,responded_at,handled_at,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Không thể tải hộp phản ánh.", {
        description: error.message,
      });

      setLoading(false);
      return;
    }

    setItems((data ?? []) as FeedbackItem[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        filter === "all" || item.status === filter;

      const matchesSearch =
        !keyword ||
        item.subject.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [items, filter, search]);

  async function updateStatus(
    item: FeedbackItem,
    status: FeedbackStatus
  ) {
    if (saving || deleting) return;

    setSaving(true);

    const responseText = memberResponse.trim();
    const noteText = note.trim();

    const { error } = await supabase
      .from("feedback")
      .update({
        status,
        admin_note: noteText || null,
        member_response: responseText || null,
        responded_at: responseText
          ? new Date().toISOString()
          : null,
        handled_at:
          status === "resolved" || status === "archived"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", item.id);

    if (error) {
      toast.error("Không thể cập nhật phản ánh.", {
        description: error.message,
      });

      setSaving(false);
      return;
    }

    toast.success("Đã cập nhật phản ánh.");

    setSelected(null);
    setNote("");
    setMemberResponse("");

    await load();

    setSaving(false);
  }

  async function deleteFeedback(item: FeedbackItem) {
    if (deleting || saving) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa phản ánh "${item.subject}"?\n\nHành động này không thể hoàn tác.`
    );

    if (!confirmed) return;

    setDeleting(true);

    const { error } = await supabase
      .from("feedback")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast.error("Không thể xóa phản ánh.", {
        description: error.message,
      });

      setDeleting(false);
      return;
    }

    toast.success("Đã xóa phản ánh.");

    setSelected(null);
    setNote("");
    setMemberResponse("");

    await load();

    setDeleting(false);
  }

  const counts = {
    all: items.length,
    new: items.filter((item) => item.status === "new").length,
    processing: items.filter(
      (item) => item.status === "processing"
    ).length,
    resolved: items.filter(
      (item) => item.status === "resolved"
    ).length,
    archived: items.filter(
      (item) => item.status === "archived"
    ).length,
  };

  return (
    <main className="min-h-full bg-[#f5f8fc]">
      <div className="mx-auto w-full max-w-[1480px] px-4 pb-14 pt-5 sm:px-6 lg:px-8">
        {/* =====================================================
            HERO
           ===================================================== */}
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#102d4d] via-[#063b70] to-[#005bac] px-7 py-7 text-white shadow-[0_20px_55px_rgba(16,42,67,.15)] sm:px-9 sm:py-8 lg:px-10 lg:py-9">
  <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-white/[0.06]" />

  <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full border border-white/[0.06]" />

  <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
    <div className="max-w-[760px]">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[0.12em] ring-1 ring-white/15">
        <MessageSquare size={13} />
        TIẾP NHẬN Ý KIẾN
      </div>

      <h1 className="mt-4 text-3xl font-black leading-[1.08] tracking-[-0.045em] sm:text-4xl lg:text-[46px]">
        Hộp phản ánh & góp ý
      </h1>

      <p className="mt-3 max-w-[680px] text-sm leading-6 text-white/70">
        Tập trung toàn bộ góp ý của đoàn viên, hỗ trợ phân loại,
        xử lý và lưu trữ theo quy trình rõ ràng.
      </p>
    </div>

    <button
      type="button"
      onClick={() => void load()}
      disabled={loading}
      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-black ring-1 ring-white/15 transition hover:bg-white/15 disabled:opacity-60"
    >
      <RefreshCw
        size={16}
        className={loading ? "animate-spin" : ""}
      />
      {loading ? "ĐANG TẢI..." : "Tải lại"}
    </button>
  </div>
</section>

        {/* =====================================================
            SUMMARY
           ===================================================== */}
        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Summary
            label="Tất cả"
            value={counts.all}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />

          <Summary
            label="Mới"
            value={counts.new}
            active={filter === "new"}
            onClick={() => setFilter("new")}
          />

          <Summary
            label="Đang xử lý"
            value={counts.processing}
            active={filter === "processing"}
            onClick={() => setFilter("processing")}
          />

          <Summary
            label="Đã xử lý"
            value={counts.resolved}
            active={filter === "resolved"}
            onClick={() => setFilter("resolved")}
          />

          <Summary
            label="Đã lưu"
            value={counts.archived}
            active={filter === "archived"}
            onClick={() => setFilter("archived")}
          />
        </section>

        {/* =====================================================
            INBOX
           ===================================================== */}
        <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,.045)]">
          {/* Toolbar */}
          <div className="border-b border-slate-100 bg-gradient-to-b from-white to-[#fbfdff] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-[470px]">
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400"
  >
    <Search size={17} strokeWidth={2} />
  </span>

  <input
    value={search}
    onChange={(event) => setSearch(event.target.value)}
    placeholder="Tìm tiêu đề hoặc nội dung..."
    className="block h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 pl-[50px] pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#005bac] focus:bg-white focus:ring-4 focus:ring-[#005bac]/10"
  />
</div>

              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
                className="inline-flex min-h-[46px] shrink-0 items-center justify-center rounded-[13px] border border-slate-200 px-5 text-sm font-extrabold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[104px] animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[330px] flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#edf6fc] text-[#005bac]">
                <Inbox size={30} />
              </div>

              <h2 className="mt-5 text-lg font-black text-slate-900">
                Chưa có phản ánh phù hợp
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Hộp thư sẽ hiển thị các phản ánh do đoàn viên
                gửi lên.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    setNote(item.admin_note || "");
                    setMemberResponse(
                      item.member_response || ""
                    );
                  }}
                  className="group block w-full bg-white px-5 py-5 text-left transition hover:bg-[#f8fbff] sm:px-6 sm:py-6"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-slate-100 text-slate-500">
                      {item.is_anonymous ? (
                        <Archive size={18} />
                      ) : (
                        <UserRound size={18} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 break-words text-sm font-black leading-6 text-slate-900 sm:text-base">
                          {item.subject}
                        </h3>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusMeta[item.status].className}`}
                        >
                          {statusMeta[item.status].label}
                        </span>
                      </div>

                      <p className="mt-1.5 line-clamp-2 max-w-[980px] text-sm leading-6 text-slate-500">
                        {item.content}
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-bold text-slate-400">
                        <span>
                          {item.is_anonymous
                            ? "Ẩn danh"
                            : `Đoàn viên #${item.member_id}`}
                        </span>

                        <span aria-hidden="true">·</span>

                        <span>
                          {formatDateTime(item.created_at)}
                        </span>

                        {item.member_response && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-black text-blue-500">
                              Đã phản hồi
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span
                      aria-hidden="true"
                      className="mt-2 shrink-0 text-2xl font-black leading-none text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#005bac]"
                    >
                      ›
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* =======================================================
          DETAIL MODAL
         ======================================================= */}
{selected && (
  <div
    className="feedback-modal-overlay"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setSelected(null);
      }
    }}
  >
    <section className="feedback-modal">
      {/* =========================
          HEADER
         ========================= */}
      <header className="feedback-modal-header">
        <div className="feedback-modal-heading">
          <div className="feedback-modal-kicker">
            <MessageSquare size={13} />
            CHI TIẾT PHẢN ÁNH
          </div>

          <h2>{selected.subject}</h2>

          <div className="feedback-modal-meta">
            <span>
              {selected.is_anonymous
                ? "Ẩn danh"
                : `Đoàn viên #${selected.member_id}`}
            </span>

            <span className="feedback-modal-dot">•</span>

            <span>{formatDateTime(selected.created_at)}</span>

            <span
              className={`feedback-modal-status ${statusMeta[selected.status].className}`}
            >
              {statusMeta[selected.status].label}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSelected(null)}
          className="feedback-modal-close"
          aria-label="Đóng"
        >
          ×
        </button>
      </header>

      {/* =========================
          BODY
         ========================= */}
      <div className="feedback-modal-body">

        {/* Nội dung đoàn viên */}
        <section className="feedback-modal-message">
          <div className="feedback-modal-message-label">
            <span>NỘI DUNG ĐOÀN VIÊN GỬI</span>

            <span className="feedback-modal-message-chip">
              {selected.is_anonymous ? "ẨN DANH" : "CÓ TÀI KHOẢN"}
            </span>
          </div>

          <div className="feedback-modal-message-box">
            <p>
              {selected.content}
            </p>
          </div>
        </section>

        {/* Phản hồi đoàn viên */}
        <section className="feedback-modal-form-section">
          <div className="feedback-modal-section-head">
            <div>
              <h3>Phản hồi cho đoàn viên</h3>
              <p>
                Nội dung này sẽ được hiển thị trong cổng đoàn viên.
              </p>
            </div>

            <span className="feedback-modal-public-badge">
              ĐOÀN VIÊN SẼ NHÌN THẤY
            </span>
          </div>

          <textarea
            value={memberResponse}
            onChange={(event) =>
              setMemberResponse(event.target.value)
            }
            rows={5}
            maxLength={2000}
            placeholder="Nhập nội dung phản hồi chính thức gửi cho đoàn viên..."
            className="feedback-modal-textarea feedback-modal-textarea-public"
          />

          <div className="feedback-modal-counter">
            <span>
              Phản hồi chính thức từ Ban Chấp hành
            </span>

            <span>
              {memberResponse.length}/2000
            </span>
          </div>
        </section>

        {/* Ghi chú nội bộ */}
        <section className="feedback-modal-form-section">
          <div className="feedback-modal-section-head">
            <div>
              <h3>Ghi chú xử lý nội bộ</h3>
              <p>
                Chỉ BCH/Admin có quyền xem nội dung này.
              </p>
            </div>

            <span className="feedback-modal-private-badge">
              CHỈ BCH / ADMIN
            </span>
          </div>

          <textarea
            value={note}
            onChange={(event) =>
              setNote(event.target.value)
            }
            rows={4}
            maxLength={2000}
            placeholder="Ví dụ: Đã giao đồng chí phụ trách kiểm tra..."
            className="feedback-modal-textarea feedback-modal-textarea-private"
          />

          <div className="feedback-modal-counter">
            <span>
              Ghi chú không được gửi cho đoàn viên
            </span>

            <span>
              {note.length}/2000
            </span>
          </div>
        </section>

        {/* Trạng thái */}
        <section className="feedback-modal-status-section">
          <div className="feedback-modal-section-head">
            <div>
              <h3>Cập nhật trạng thái</h3>
              <p>
                Chọn trạng thái mới cho phản ánh này.
              </p>
            </div>
          </div>

          <div className="feedback-modal-status-grid">
            {(Object.keys(statusMeta) as FeedbackStatus[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  disabled={saving || deleting}
                  onClick={() =>
                    void updateStatus(selected, status)
                  }
                  className={`feedback-modal-status-button ${
                    selected.status === status
                      ? "is-active"
                      : ""
                  }`}
                >
                  <span
                    className={`feedback-modal-status-dot ${status}`}
                  />

                  <span>
                    {statusMeta[status].label}
                  </span>
                </button>
              )
            )}
          </div>
        </section>

        {/* Footer actions */}
        <footer className="feedback-modal-footer">
          <div className="feedback-modal-footer-info">
            <div className="feedback-modal-footer-icon">
              <Archive size={16} />
            </div>

            <div>
              <strong>Quản lý phản ánh</strong>
              <span>
                Lưu thay đổi bằng cách chọn trạng thái ở trên.
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => void deleteFeedback(selected)}
            className="feedback-modal-delete"
          >
            <Trash2 size={15} />

            {deleting
              ? "ĐANG XÓA..."
              : "XÓA PHẢN ÁNH"}
          </button>
        </footer>
      </div>
    </section>
  </div>
)}
    </main>
  );
}

function Summary({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[118px] rounded-[22px] border p-5 text-left transition ${
        active
          ? "border-[#9fc8e2] bg-[#edf6fc] shadow-[0_12px_28px_rgba(0,91,172,.08)] ring-2 ring-[#005bac]/10"
          : "border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-2.5 text-[31px] font-black leading-none tracking-[-0.04em] text-slate-900">
        {value}
      </p>
    </button>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}