"use client";

import {
  BarChart3,
  Check,
  CirclePlus,
  Clock3,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type PollOption = {
  id: string;
  optionText: string;
  sortOrder: number;
  votes: number;
};

type Poll = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  allowMultiple: boolean;
  status: "draft" | "published" | "closed";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  totalVotes: number;
  totalVoters: number;
  options: PollOption[];
};

type FormOption = {
  id: string;
  text: string;
};

const EMPTY_OPTION = (): FormOption => ({
  id: crypto.randomUUID(),
  text: "",
});

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: Poll["status"]) {
  if (status === "published") return "Đang mở";
  if (status === "closed") return "Đã đóng";
  return "Bản nháp";
}

function getStatusClass(status: Poll["status"]) {
  if (status === "published") return "poll-status poll-status-open";
  if (status === "closed") return "poll-status poll-status-closed";
  return "poll-status poll-status-draft";
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [formOptions, setFormOptions] = useState<FormOption[]>([
    EMPTY_OPTION(),
    EMPTY_OPTION(),
  ]);

  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    return data.session.access_token;
  }

  async function loadPolls(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await getAccessToken();

      const response = await fetch("/api/admin/polls", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể tải danh sách poll.");
      }

      setPolls(data as Poll[]);
    } catch (error) {
      console.error("[DASHBOARD POLLS LOAD]", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách poll."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPolls();
  }, []);

  const statistics = useMemo(() => {
    const total = polls.length;

    const open = polls.filter(
      (poll) => poll.status === "published"
    ).length;

    const closed = polls.filter(
      (poll) => poll.status === "closed"
    ).length;

    const draft = polls.filter(
      (poll) => poll.status === "draft"
    ).length;

    const totalVotes = polls.reduce(
      (sum, poll) => sum + poll.totalVotes,
      0
    );

    const totalVoters = polls.reduce(
      (sum, poll) => sum + poll.totalVoters,
      0
    );

    return {
      total,
      open,
      closed,
      draft,
      totalVotes,
      totalVoters,
    };
  }, [polls]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setAllowMultiple(false);
    setStartsAt("");
    setEndsAt("");
    setFormOptions([EMPTY_OPTION(), EMPTY_OPTION()]);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function closeCreateForm() {
    if (saving) return;
    setShowForm(false);
  }

  function updateOption(id: string, value: string) {
    setFormOptions((current) =>
      current.map((option) =>
        option.id === id
          ? {
              ...option,
              text: value,
            }
          : option
      )
    );
  }

  function addOption() {
    setFormOptions((current) => [
      ...current,
      EMPTY_OPTION(),
    ]);
  }

  function removeOption(id: string) {
    setFormOptions((current) => {
      if (current.length <= 2) {
        toast.error("Poll cần ít nhất 2 lựa chọn.");
        return current;
      }

      return current.filter((option) => option.id !== id);
    });
  }

  async function handleCreatePoll(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    const cleanTitle = title.trim();

    const cleanOptions = formOptions
      .map((option) => option.text.trim())
      .filter(Boolean);

    if (!cleanTitle) {
      toast.error("Vui lòng nhập tiêu đề poll.");
      return;
    }

    if (cleanOptions.length < 2) {
      toast.error("Poll cần ít nhất 2 lựa chọn.");
      return;
    }

    if (
      startsAt &&
      endsAt &&
      new Date(startsAt).getTime() >=
        new Date(endsAt).getTime()
    ) {
      toast.error(
        "Thời gian kết thúc phải sau thời gian bắt đầu."
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getAccessToken();

      const response = await fetch("/api/admin/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: cleanTitle,
          description: description.trim() || null,
          startsAt: startsAt
            ? new Date(startsAt).toISOString()
            : null,
          endsAt: endsAt
            ? new Date(endsAt).toISOString()
            : null,
          allowMultiple,
          status: "draft",
          options: cleanOptions.map(
            (optionText, index) => ({
              optionText,
              sortOrder: index,
            })
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể tạo poll."
        );
      }

      toast.success("Tạo poll thành công.");

      setShowForm(false);
      resetForm();

      await loadPolls(true);
    } catch (error) {
      console.error("[DASHBOARD POLLS CREATE]", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tạo poll."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    poll: Poll,
    status: Poll["status"]
  ) {
    try {
      const token = await getAccessToken();

      const response = await fetch("/api/admin/polls", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: poll.id,
          title: poll.title,
          description: poll.description,
          startsAt: poll.startsAt,
          endsAt: poll.endsAt,
          allowMultiple: poll.allowMultiple,
          status,
          options: poll.options.map((option) => ({
            id: option.id,
            optionText: option.optionText,
            sortOrder: option.sortOrder,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể cập nhật poll."
        );
      }

      toast.success(
        status === "published"
          ? "Đã mở poll."
          : status === "closed"
            ? "Đã đóng poll."
            : "Đã chuyển poll về bản nháp."
      );

      await loadPolls(true);

      if (selectedPoll?.id === poll.id) {
        setSelectedPoll(null);
      }
    } catch (error) {
      console.error("[DASHBOARD POLLS STATUS]", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái."
      );
    }
  }

  async function deletePoll(poll: Poll) {
    const confirmed = window.confirm(
      `Xóa poll "${poll.title}"?\n\nToàn bộ phiếu bình chọn của poll này cũng sẽ bị xóa.`
    );

    if (!confirmed) return;

    try {
      const token = await getAccessToken();

      const response = await fetch(
        `/api/admin/polls?id=${encodeURIComponent(poll.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể xóa poll."
        );
      }

      toast.success("Đã xóa poll.");

      if (selectedPoll?.id === poll.id) {
        setSelectedPoll(null);
      }

      await loadPolls(true);
    } catch (error) {
      console.error("[DASHBOARD POLLS DELETE]", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xóa poll."
      );
    }
  }

  return (
    <main className="polls-page">
      <style jsx global>{`
        .polls-page {
          padding: 28px;
          min-height: calc(100vh - 70px);
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(59, 130, 246, 0.08),
              transparent 34%
            ),
            radial-gradient(
              circle at 90% 10%,
              rgba(139, 92, 246, 0.08),
              transparent 30%
            ),
            #f7f8fc;
        }

        .polls-container {
          max-width: 1450px;
          margin: 0 auto;
        }

        .polls-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .polls-eyebrow {
          margin: 0 0 7px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #64748b;
        }

        .polls-title {
          margin: 0;
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1;
          letter-spacing: -0.04em;
          color: #0f172a;
        }

        .polls-description {
          margin: 12px 0 0;
          max-width: 720px;
          color: #64748b;
          line-height: 1.7;
          font-size: 14px;
        }

        .polls-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .poll-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 16px;
          border: 0;
          border-radius: 12px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            opacity 0.18s ease;
        }

        .poll-btn:hover {
          transform: translateY(-1px);
        }

        .poll-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
        }

        .poll-btn-primary {
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #2563eb,
            #7c3aed
          );
          box-shadow:
            0 10px 25px rgba(37, 99, 235, 0.2);
        }

        .poll-btn-secondary {
          color: #334155;
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }

        .poll-btn-danger {
          color: #b91c1c;
          background: #fff1f2;
          border: 1px solid #fecdd3;
        }

        .poll-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .poll-stat-card {
          position: relative;
          overflow: hidden;
          padding: 19px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .poll-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .poll-stat-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #f1f5f9;
          color: #475569;
        }

        .poll-stat-label {
          margin-top: 18px;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }

        .poll-stat-value {
          margin-top: 3px;
          font-size: 29px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.04em;
          color: #0f172a;
        }

        .poll-main-card {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 16px 45px rgba(15, 23, 42, 0.05);
        }

        .poll-main-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
        }

        .poll-section-title {
          margin: 0;
          font-size: 16px;
          color: #0f172a;
        }

        .poll-section-subtitle {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .poll-table-wrap {
          overflow-x: auto;
        }

        .poll-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .poll-table th {
          padding: 13px 18px;
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #64748b;
          background: #f8fafc;
          text-transform: uppercase;
        }

        .poll-table td {
          padding: 16px 18px;
          border-top: 1px solid #eef2f7;
          vertical-align: middle;
          font-size: 13px;
          color: #334155;
        }

        .poll-name {
          max-width: 360px;
        }

        .poll-name strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .poll-name span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #64748b;
        }

        .poll-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .poll-status-open {
          color: #166534;
          background: #dcfce7;
        }

        .poll-status-closed {
          color: #475569;
          background: #e2e8f0;
        }

        .poll-status-draft {
          color: #92400e;
          background: #fef3c7;
        }

        .poll-vote-number {
          font-weight: 800;
          color: #0f172a;
        }

        .poll-table-actions {
          display: flex;
          justify-content: flex-end;
          gap: 7px;
        }

        .poll-icon-btn {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
        }

        .poll-icon-btn:hover {
          background: #f8fafc;
        }

        .poll-empty {
          padding: 65px 24px;
          text-align: center;
          color: #64748b;
        }

        .poll-empty-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 16px;
          background: #f1f5f9;
          color: #64748b;
        }

        .poll-loading {
          padding: 70px 24px;
          display: flex;
          justify-content: center;
          color: #64748b;
        }

        .poll-form-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          background: rgba(15, 23, 42, 0.52);
          backdrop-filter: blur(7px);
        }

        .poll-form-modal {
          width: min(720px, 100%);
          max-height: min(900px, calc(100vh - 44px));
          overflow-y: auto;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.24);
        }

        .poll-form-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px 16px;
          border-bottom: 1px solid #eef2f7;
        }

        .poll-form-title {
          margin: 0;
          font-size: 20px;
          color: #0f172a;
        }

        .poll-form-subtitle {
          margin: 5px 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .poll-close-btn {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          cursor: pointer;
          color: #475569;
        }

        .poll-form {
          padding: 22px 24px 24px;
        }

        .poll-field {
          margin-bottom: 17px;
        }

        .poll-field label {
          display: block;
          margin-bottom: 7px;
          font-size: 12px;
          font-weight: 800;
          color: #334155;
        }

        .poll-field input,
        .poll-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dbe3ec;
          border-radius: 11px;
          outline: none;
          background: #ffffff;
          color: #0f172a;
          padding: 11px 12px;
          font: inherit;
          font-size: 13px;
        }

        .poll-field input:focus,
        .poll-field textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .poll-field textarea {
          min-height: 90px;
          resize: vertical;
        }

        .poll-two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .poll-switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 2px 0 20px;
          padding: 13px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #f8fafc;
        }

        .poll-switch-copy strong {
          display: block;
          font-size: 13px;
          color: #334155;
        }

        .poll-switch-copy span {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          color: #64748b;
        }

        .poll-switch {
          position: relative;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .poll-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .poll-switch-slider {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: #cbd5e1;
          cursor: pointer;
          transition: 0.2s;
        }

        .poll-switch-slider::before {
          content: "";
          position: absolute;
          width: 18px;
          height: 18px;
          left: 3px;
          top: 3px;
          border-radius: 50%;
          background: white;
          transition: 0.2s;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.16);
        }

        .poll-switch input:checked + .poll-switch-slider {
          background: #4f46e5;
        }

        .poll-switch
          input:checked
          + .poll-switch-slider::before {
          transform: translateX(20px);
        }

        .poll-options-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 9px;
        }

        .poll-options-header label {
          margin: 0;
        }

        .poll-add-option {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 0;
          background: transparent;
          color: #4f46e5;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .poll-option-row {
          display: grid;
          grid-template-columns: 30px 1fr 34px;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .poll-option-number {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: #f1f5f9;
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
        }

        .poll-option-remove {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 9px;
          background: #fff1f2;
          color: #e11d48;
          cursor: pointer;
        }

        .poll-form-footer {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 23px;
          padding-top: 18px;
          border-top: 1px solid #eef2f7;
        }

        .poll-detail-overlay {
          position: fixed;
          inset: 0;
          z-index: 70;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(6px);
        }

        .poll-detail-modal {
          width: min(760px, 100%);
          max-height: calc(100vh - 44px);
          overflow-y: auto;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.2);
        }

        .poll-detail-header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 23px 24px 16px;
          border-bottom: 1px solid #eef2f7;
        }

        .poll-detail-header h2 {
          margin: 0 0 6px;
          color: #0f172a;
          font-size: 20px;
        }

        .poll-detail-header p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        .poll-detail-body {
          padding: 23px 24px;
        }

        .poll-result-option {
          margin-bottom: 18px;
        }

        .poll-result-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 7px;
          font-size: 13px;
        }

        .poll-result-label {
          font-weight: 700;
          color: #334155;
        }

        .poll-result-count {
          font-weight: 800;
          color: #0f172a;
        }

        .poll-result-bar {
          height: 11px;
          overflow: hidden;
          border-radius: 999px;
          background: #eef2f7;
        }

        .poll-result-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #2563eb,
            #7c3aed
          );
        }

        .poll-result-meta {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
        }

        .poll-detail-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
          margin-bottom: 24px;
        }

        .poll-summary-box {
          padding: 12px;
          border-radius: 13px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .poll-summary-box span {
          display: block;
          font-size: 11px;
          color: #64748b;
        }

        .poll-summary-box strong {
          display: block;
          margin-top: 4px;
          font-size: 20px;
          color: #0f172a;
        }

        .poll-action-menu {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 24px 22px;
        }

        @media (max-width: 1000px) {
          .poll-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .polls-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 650px) {
          .polls-page {
            padding: 18px 14px;
          }

          .poll-stat-grid {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .poll-stat-card {
            padding: 14px;
          }

          .poll-stat-value {
            font-size: 24px;
          }

          .poll-two-columns {
            grid-template-columns: 1fr;
          }

          .poll-form-overlay,
          .poll-detail-overlay {
            padding: 10px;
          }

          .poll-form-modal,
          .poll-detail-modal {
            max-height: calc(100vh - 20px);
          }

          .poll-form,
          .poll-detail-body {
            padding-left: 16px;
            padding-right: 16px;
          }

          .poll-form-header,
          .poll-detail-header {
            padding-left: 16px;
            padding-right: 16px;
          }

          .poll-detail-summary {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        
         /* =========================================================
   POLLS V2 — PREMIUM DASHBOARD UI
   ========================================================= */

.polls-page {
  position: relative;
  isolation: isolate;
  padding: 30px;
  min-height: calc(100vh - 70px);
  background:
    radial-gradient(
      circle at 8% 4%,
      rgba(59, 130, 246, 0.1),
      transparent 30%
    ),
    radial-gradient(
      circle at 92% 8%,
      rgba(124, 58, 237, 0.1),
      transparent 28%
    ),
    linear-gradient(
      180deg,
      #f8fafc 0%,
      #f5f7fb 48%,
      #f8fafc 100%
    );
}

.polls-page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    linear-gradient(
      rgba(148, 163, 184, 0.045) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.045) 1px,
      transparent 1px
    );
  background-size: 32px 32px;
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.8),
    transparent 78%
  );
}

/* ================= HEADER ================= */

.polls-header {
  position: relative;
  overflow: hidden;
  align-items: stretch;
  margin-bottom: 22px;
  padding: 28px;
  min-height: 170px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 24px;
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.98),
      rgba(248, 250, 252, 0.94)
    );
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.055),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.polls-header::before {
  content: "";
  position: absolute;
  width: 380px;
  height: 380px;
  top: -220px;
  right: -90px;
  border-radius: 50%;
  background:
    radial-gradient(
      circle,
      rgba(99, 102, 241, 0.16),
      rgba(99, 102, 241, 0)
    );
  pointer-events: none;
}

.polls-header::after {
  content: "";
  position: absolute;
  width: 240px;
  height: 240px;
  right: 24%;
  bottom: -200px;
  border-radius: 50%;
  background:
    radial-gradient(
      circle,
      rgba(37, 99, 235, 0.08),
      rgba(37, 99, 235, 0)
    );
  pointer-events: none;
}

.polls-header > div:first-child {
  position: relative;
  z-index: 1;
  max-width: 800px;
}

.polls-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 11px;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.82);
  color: #64748b;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.polls-eyebrow::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
}

.polls-title {
  font-size: clamp(33px, 4vw, 46px);
  font-weight: 850;
  letter-spacing: -0.055em;
  background:
    linear-gradient(
      115deg,
      #0f172a 10%,
      #334155 52%,
      #4f46e5 100%
    );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.polls-description {
  max-width: 680px;
  margin-top: 13px;
  font-size: 13px;
  line-height: 1.75;
  color: #64748b;
}

.polls-header-actions {
  position: relative;
  z-index: 2;
  align-self: center;
}

.poll-btn {
  min-height: 43px;
  padding: 0 17px;
  border-radius: 12px;
}

.poll-btn-primary {
  background:
    linear-gradient(
      135deg,
      #2563eb 0%,
      #4f46e5 52%,
      #7c3aed 100%
    );
  box-shadow:
    0 12px 26px rgba(79, 70, 229, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.poll-btn-primary:hover {
  box-shadow:
    0 15px 32px rgba(79, 70, 229, 0.27),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.poll-btn-secondary {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 5px 15px rgba(15, 23, 42, 0.035);
}

/* ================= STAT CARDS ================= */

.poll-stat-grid {
  gap: 14px;
  margin-bottom: 22px;
}

.poll-stat-card {
  position: relative;
  overflow: hidden;
  min-height: 132px;
  padding: 18px 19px 17px;
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow:
    0 13px 34px rgba(15, 23, 42, 0.045),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.poll-stat-card::after {
  content: "";
  position: absolute;
  right: -22px;
  bottom: -42px;
  width: 115px;
  height: 115px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.08),
    transparent 70%
  );
  pointer-events: none;
}

.poll-stat-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.075),
    inset 0 1px 0 rgba(255, 255, 255, 1);
}

.poll-stat-card:nth-child(1) {
  border-top: 3px solid #2563eb;
}

.poll-stat-card:nth-child(2) {
  border-top: 3px solid #22c55e;
}

.poll-stat-card:nth-child(3) {
  border-top: 3px solid #8b5cf6;
}

.poll-stat-card:nth-child(4) {
  border-top: 3px solid #f59e0b;
}

.poll-stat-icon {
  width: 39px;
  height: 39px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
}

.poll-stat-card:nth-child(1) .poll-stat-icon {
  color: #2563eb;
  background: #eff6ff;
}

.poll-stat-card:nth-child(2) .poll-stat-icon {
  color: #16a34a;
  background: #f0fdf4;
}

.poll-stat-card:nth-child(3) .poll-stat-icon {
  color: #7c3aed;
  background: #f5f3ff;
}

.poll-stat-card:nth-child(4) .poll-stat-icon {
  color: #d97706;
  background: #fffbeb;
}

.poll-stat-label {
  margin-top: 16px;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.poll-stat-value {
  margin-top: 7px;
  font-size: 30px;
  font-weight: 850;
  letter-spacing: -0.055em;
}

/* ================= MAIN TABLE ================= */

.poll-main-card {
  border-radius: 21px;
  border-color: rgba(226, 232, 240, 0.96);
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 18px 46px rgba(15, 23, 42, 0.045),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.poll-main-card-header {
  padding: 18px 21px;
  background:
    linear-gradient(
      180deg,
      rgba(248, 250, 252, 0.95),
      rgba(255, 255, 255, 0.94)
    );
}

.poll-section-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.poll-section-subtitle {
  font-size: 11px;
}

.poll-table th {
  padding: 12px 18px;
  font-size: 9px;
  letter-spacing: 0.1em;
  background: #f8fafc;
  color: #94a3b8;
}

.poll-table td {
  padding: 17px 18px;
  transition: background 0.18s ease;
}

.poll-table tbody tr:hover td {
  background: #fafbff;
}

.poll-table tbody tr {
  transition: background 0.18s ease;
}

.poll-name strong {
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: 800;
}

.poll-name span {
  font-size: 11px;
  max-width: 430px;
}

.poll-status {
  border: 1px solid transparent;
  padding: 6px 10px;
  font-size: 10px;
  letter-spacing: 0.02em;
}

.poll-status-open {
  color: #15803d;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.poll-status-closed {
  color: #475569;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.poll-status-draft {
  color: #a16207;
  background: #fffbeb;
  border-color: #fde68a;
}

.poll-vote-number {
  font-size: 14px;
  font-weight: 850;
}

.poll-table-actions {
  gap: 6px;
}

.poll-icon-btn {
  border-radius: 9px;
  transition:
    transform 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}

.poll-icon-btn:hover {
  transform: translateY(-1px);
  background: #f8fafc;
  border-color: #cbd5e1;
}

/* ================= EMPTY STATE ================= */

.poll-empty {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 55px 24px;
}

.poll-empty-icon {
  width: 68px;
  height: 68px;
  margin-bottom: 15px;
  border-radius: 20px;
  background:
    linear-gradient(
      145deg,
      #eff6ff,
      #f5f3ff
    );
  border: 1px solid #e0e7ff;
  box-shadow:
    0 12px 30px rgba(79, 70, 229, 0.08);
}

/* ================= MODAL ================= */

.poll-form-overlay,
.poll-detail-overlay {
  background:
    rgba(15, 23, 42, 0.54);
  backdrop-filter: blur(10px);
}

.poll-form-modal,
.poll-detail-modal {
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow:
    0 35px 90px rgba(15, 23, 42, 0.27),
    0 8px 30px rgba(15, 23, 42, 0.08);
}

.poll-form-header,
.poll-detail-header {
  background:
    linear-gradient(
      180deg,
      #ffffff,
      #fafbff
    );
}

.poll-form-title,
.poll-detail-header h2 {
  font-weight: 850;
  letter-spacing: -0.035em;
}

.poll-field input,
.poll-field textarea {
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.poll-field input:hover,
.poll-field textarea:hover {
  border-color: #cbd5e1;
}

.poll-option-row {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.poll-option-row:hover {
  transform: translateX(2px);
}

.poll-option-number {
  border: 1px solid #e2e8f0;
  background:
    linear-gradient(
      145deg,
      #f8fafc,
      #eef2ff
    );
  color: #475569;
}

.poll-option-remove:hover {
  background: #ffe4e6;
}

/* ================= RESULTS ================= */

.poll-detail-summary {
  gap: 10px;
}

.poll-summary-box {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  background:
    linear-gradient(
      145deg,
      #f8fafc,
      #ffffff
    );
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.poll-summary-box:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 25px rgba(15, 23, 42, 0.05);
}

.poll-summary-box strong {
  font-weight: 850;
}

.poll-result-option {
  padding: 13px 14px;
  margin-bottom: 10px;
  border: 1px solid #eef2f7;
  border-radius: 14px;
  background: #ffffff;
}

.poll-result-bar {
  height: 9px;
  background: #eef2f7;
}

.poll-result-fill {
  background:
    linear-gradient(
      90deg,
      #2563eb,
      #4f46e5,
      #7c3aed
    );
  box-shadow:
    0 2px 9px rgba(79, 70, 229, 0.18);
}

.poll-result-meta {
  font-size: 10px;
}

/* ================= MOBILE ================= */

@media (max-width: 1000px) {
  .polls-header {
    padding: 24px;
  }
}

@media (max-width: 650px) {
  .polls-page {
    padding: 14px 10px;
  }

  .polls-header {
    min-height: auto;
    padding: 20px;
    border-radius: 19px;
  }

  .polls-title {
    font-size: 31px;
  }

  .polls-description {
    font-size: 12px;
  }

  .polls-header-actions {
    width: 100%;
  }

  .polls-header-actions .poll-btn {
    flex: 1;
  }

  .poll-stat-grid {
    gap: 8px;
  }

  .poll-stat-card {
    min-height: 118px;
    padding: 13px;
  }

  .poll-stat-label {
    font-size: 9px;
  }

  .poll-stat-value {
    font-size: 24px;
  }

  .poll-main-card {
    border-radius: 17px;
  }

  .poll-table {
    min-width: 840px;
  }

  .poll-detail-summary {
    gap: 7px;
  }

  .poll-summary-box {
    padding: 10px;
  }

  .poll-summary-box strong {
    font-size: 18px;
  }
}
      `}</style>


      <div className="polls-container">
        <header className="polls-header">
          <div>
            <p className="polls-eyebrow">
              CHI ĐOÀN D-K66 · QUẢN TRỊ
            </p>

            <h1 className="polls-title">
              Khảo sát & Bình chọn
            </h1>

            <p className="polls-description">
              Tạo các cuộc bình chọn trong chi đoàn,
              theo dõi số người tham gia và xem kết quả
              theo từng lựa chọn.
            </p>
          </div>

          <div className="polls-header-actions">
            <button
              type="button"
              className="poll-btn poll-btn-secondary"
              onClick={() => loadPolls(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Làm mới
            </button>

            <button
              type="button"
              className="poll-btn poll-btn-primary"
              onClick={openCreateForm}
            >
              <CirclePlus size={17} />
              Tạo poll
            </button>
          </div>
        </header>

        <section className="poll-stat-grid">
          <article className="poll-stat-card">
            <div className="poll-stat-top">
              <div className="poll-stat-icon">
                <BarChart3 size={19} />
              </div>
            </div>

            <div className="poll-stat-label">
              TỔNG CUỘC BÌNH CHỌN
            </div>

            <div className="poll-stat-value">
              {statistics.total}
            </div>
          </article>

          <article className="poll-stat-card">
            <div className="poll-stat-top">
              <div className="poll-stat-icon">
                <Clock3 size={19} />
              </div>
            </div>

            <div className="poll-stat-label">
              ĐANG MỞ
            </div>

            <div className="poll-stat-value">
              {statistics.open}
            </div>
          </article>

          <article className="poll-stat-card">
            <div className="poll-stat-top">
              <div className="poll-stat-icon">
                <Check size={19} />
              </div>
            </div>

            <div className="poll-stat-label">
              TỔNG LƯỢT BÌNH CHỌN
            </div>

            <div className="poll-stat-value">
              {statistics.totalVotes}
            </div>
          </article>

          <article className="poll-stat-card">
            <div className="poll-stat-top">
              <div className="poll-stat-icon">
                <Users size={19} />
              </div>
            </div>

            <div className="poll-stat-label">
              TỔNG NGƯỜI THAM GIA
            </div>

            <div className="poll-stat-value">
              {statistics.totalVoters}
            </div>
          </article>
        </section>

        <section className="poll-main-card">
          <div className="poll-main-card-header">
            <div>
              <h2 className="poll-section-title">
                Danh sách cuộc bình chọn
              </h2>

              <p className="poll-section-subtitle">
                {statistics.open} đang mở ·{" "}
                {statistics.draft} bản nháp ·{" "}
                {statistics.closed} đã đóng
              </p>
            </div>

            <button
              type="button"
              className="poll-icon-btn"
              title="Làm mới"
              onClick={() => loadPolls(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />
            </button>
          </div>

          {loading ? (
            <div className="poll-loading">
              <Loader2
                size={22}
                className="animate-spin"
              />
            </div>
          ) : polls.length === 0 ? (
            <div className="poll-empty">
              <div className="poll-empty-icon">
                <BarChart3 size={24} />
              </div>

              <strong
                style={{
                  display: "block",
                  color: "#334155",
                  marginBottom: 5,
                }}
              >
                Chưa có cuộc bình chọn nào
              </strong>

              <span>
                Tạo poll đầu tiên để bắt đầu thu thập ý
                kiến đoàn viên.
              </span>
            </div>
          ) : (
            <div className="poll-table-wrap">
              <table className="poll-table">
                <thead>
                  <tr>
                    <th>Cuộc bình chọn</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    <th>Người tham gia</th>
                    <th>Lượt vote</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {polls.map((poll) => (
                    <tr key={poll.id}>
                      <td>
                        <div className="poll-name">
                          <strong>{poll.title}</strong>

                          <span>
                            {poll.description ||
                              `${poll.options.length} lựa chọn`}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            poll.status
                          )}
                        >
                          {getStatusLabel(poll.status)}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                        >
                          <div>
                            {formatDate(poll.startsAt)}
                          </div>
                          <div
                            style={{ color: "#64748b" }}
                          >
                            → {formatDate(poll.endsAt)}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="poll-vote-number">
                          {poll.totalVoters}
                        </span>
                      </td>

                      <td>
                        <span className="poll-vote-number">
                          {poll.totalVotes}
                        </span>
                      </td>

                      <td>
                        <div className="poll-table-actions">
                          <button
                            type="button"
                            className="poll-icon-btn"
                            title="Xem kết quả"
                            onClick={() =>
                              setSelectedPoll(poll)
                            }
                          >
                            <BarChart3 size={16} />
                          </button>

                          {poll.status !==
                            "published" && (
                            <button
                              type="button"
                              className="poll-icon-btn"
                              title="Mở poll"
                              onClick={() =>
                                changeStatus(
                                  poll,
                                  "published"
                                )
                              }
                            >
                              <Check size={16} />
                            </button>
                          )}

                          {poll.status ===
                            "published" && (
                            <button
                              type="button"
                              className="poll-icon-btn"
                              title="Đóng poll"
                              onClick={() =>
                                changeStatus(
                                  poll,
                                  "closed"
                                )
                              }
                            >
                              <XCircle size={16} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="poll-icon-btn"
                            title="Xóa poll"
                            onClick={() =>
                              deletePoll(poll)
                            }
                          >
                            <Trash2 size={16} />
                          </button>

                          <button
                            type="button"
                            className="poll-icon-btn"
                            title="Thêm tùy chọn"
                            onClick={() =>
                              toast.info(
                                "Chức năng chỉnh sửa poll sẽ được nối ở bước tiếp theo."
                              )
                            }
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <div
          className="poll-form-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateForm();
            }
          }}
        >
          <div
            className="poll-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="poll-create-title"
          >
            <div className="poll-form-header">
              <div>
                <h2
                  id="poll-create-title"
                  className="poll-form-title"
                >
                  Tạo cuộc bình chọn
                </h2>

                <p className="poll-form-subtitle">
                  Poll mới sẽ được lưu ở trạng thái bản
                  nháp.
                </p>
              </div>

              <button
                type="button"
                className="poll-close-btn"
                onClick={closeCreateForm}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="poll-form"
              onSubmit={handleCreatePoll}
            >
              <div className="poll-field">
                <label htmlFor="poll-title">
                  Tiêu đề *
                </label>

                <input
                  id="poll-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Ví dụ: Chọn hoạt động ngoại khóa tháng 10"
                  maxLength={180}
                  required
                />
              </div>

              <div className="poll-field">
                <label htmlFor="poll-description">
                  Mô tả
                </label>

                <textarea
                  id="poll-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Mô tả ngắn về nội dung bình chọn..."
                  maxLength={1000}
                />
              </div>

              <div className="poll-two-columns">
                <div className="poll-field">
                  <label htmlFor="poll-start">
                    Bắt đầu
                  </label>

                  <input
                    id="poll-start"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) =>
                      setStartsAt(event.target.value)
                    }
                  />
                </div>

                <div className="poll-field">
                  <label htmlFor="poll-end">
                    Kết thúc
                  </label>

                  <input
                    id="poll-end"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(event) =>
                      setEndsAt(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="poll-switch-row">
                <div className="poll-switch-copy">
                  <strong>
                    Cho phép chọn nhiều đáp án
                  </strong>

                  <span>
                    Tắt: mỗi đoàn viên chỉ chọn một đáp
                    án.
                  </span>
                </div>

                <label className="poll-switch">
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(event) =>
                      setAllowMultiple(
                        event.target.checked
                      )
                    }
                  />

                  <span className="poll-switch-slider" />
                </label>
              </div>

              <div className="poll-field">
                <div className="poll-options-header">
                  <label>
                    Các lựa chọn *
                  </label>

                  <button
                    type="button"
                    className="poll-add-option"
                    onClick={addOption}
                  >
                    <Plus size={14} />
                    Thêm lựa chọn
                  </button>
                </div>

                {formOptions.map(
                  (option, index) => (
                    <div
                      className="poll-option-row"
                      key={option.id}
                    >
                      <div className="poll-option-number">
                        {index + 1}
                      </div>

                      <input
                        type="text"
                        value={option.text}
                        onChange={(event) =>
                          updateOption(
                            option.id,
                            event.target.value
                          )
                        }
                        placeholder={`Lựa chọn ${index + 1}`}
                        maxLength={250}
                        required
                      />

                      <button
                        type="button"
                        className="poll-option-remove"
                        title="Xóa lựa chọn"
                        onClick={() =>
                          removeOption(option.id)
                        }
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )
                )}
              </div>

              <div className="poll-form-footer">
                <button
                  type="button"
                  className="poll-btn poll-btn-secondary"
                  onClick={closeCreateForm}
                  disabled={saving}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="poll-btn poll-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Tạo poll
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPoll && (
        <div
          className="poll-detail-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPoll(null);
            }
          }}
        >
          <div
            className="poll-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="poll-result-title"
          >
            <div className="poll-detail-header">
              <div>
                <h2 id="poll-result-title">
                  {selectedPoll.title}
                </h2>

                <p>
                  {selectedPoll.description ||
                    "Thống kê kết quả bình chọn"}
                </p>
              </div>

              <button
                type="button"
                className="poll-close-btn"
                onClick={() => setSelectedPoll(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="poll-detail-body">
              <div className="poll-detail-summary">
                <div className="poll-summary-box">
                  <span>Người tham gia</span>
                  <strong>
                    {selectedPoll.totalVoters}
                  </strong>
                </div>

                <div className="poll-summary-box">
                  <span>Tổng lượt vote</span>
                  <strong>
                    {selectedPoll.totalVotes}
                  </strong>
                </div>

                <div className="poll-summary-box">
                  <span>Lựa chọn</span>
                  <strong>
                    {selectedPoll.options.length}
                  </strong>
                </div>
              </div>

              {selectedPoll.options.map(
                (option) => {
                  const percentage =
                    selectedPoll.totalVotes > 0
                      ? Math.round(
                          (option.votes /
                            selectedPoll.totalVotes) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      className="poll-result-option"
                      key={option.id}
                    >
                      <div className="poll-result-top">
                        <span className="poll-result-label">
                          {option.optionText}
                        </span>

                        <span className="poll-result-count">
                          {option.votes} · {percentage}%
                        </span>
                      </div>

                      <div className="poll-result-bar">
                        <div
                          className="poll-result-fill"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <div className="poll-result-meta">
                        {option.votes === 1
                          ? "1 lượt bình chọn"
                          : `${option.votes} lượt bình chọn`}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="poll-action-menu">
              {selectedPoll.status !== "published" && (
                <button
                  type="button"
                  className="poll-btn poll-btn-primary"
                  onClick={() =>
                    changeStatus(
                      selectedPoll,
                      "published"
                    )
                  }
                >
                  <Check size={16} />
                  Mở poll
                </button>
              )}

              {selectedPoll.status === "published" && (
                <button
                  type="button"
                  className="poll-btn poll-btn-secondary"
                  onClick={() =>
                    changeStatus(
                      selectedPoll,
                      "closed"
                    )
                  }
                >
                  <XCircle size={16} />
                  Đóng poll
                </button>
              )}

              <button
                type="button"
                className="poll-btn poll-btn-danger"
                onClick={() =>
                  deletePoll(selectedPoll)
                }
              >
                <Trash2 size={16} />
                Xóa poll
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}