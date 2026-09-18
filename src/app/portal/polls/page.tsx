"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Info,
  Loader2,
  RefreshCw,
  Send,
  Vote,
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
  createdAt: string;
  votedOptionIds: string[];
  totalVotes: number;
  options: PollOption[];
};

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRemainingText(endsAt: string | null) {
  if (!endsAt) return "Không giới hạn thời gian";

  const remaining =
    new Date(endsAt).getTime() - Date.now();

  if (remaining <= 0) {
    return "Đã hết thời gian";
  }

  const minutes = Math.floor(remaining / 60000);

  if (minutes < 60) {
    return `Còn ${minutes} phút`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Còn ${hours} giờ`;
  }

  const days = Math.floor(hours / 24);

  return `Còn ${days} ngày`;
}

export default function PortalPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedOptions, setSelectedOptions] =
    useState<Record<string, string[]>>({});

  const [submitting, setSubmitting] = useState<
    string | null
  >(null);

  async function getAccessToken() {
    const { data, error } =
      await supabase.auth.getSession();

    if (
      error ||
      !data.session?.access_token
    ) {
      throw new Error(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );
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

      const response = await fetch(
        "/api/member/polls",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Không thể tải các cuộc bình chọn."
        );
      }

      setPolls(data as Poll[]);
    } catch (error) {
      console.error(
        "[PORTAL POLLS LOAD]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải cuộc bình chọn."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadPolls();
  }, []);

  const votedCount = useMemo(
    () =>
      polls.filter(
        (poll) =>
          poll.votedOptionIds.length > 0
      ).length,
    [polls]
  );

  const openCount = polls.length;

  function toggleOption(
    poll: Poll,
    optionId: string
  ) {
    if (poll.votedOptionIds.length > 0) {
      return;
    }

    setSelectedOptions((current) => {
      const currentSelection =
        current[poll.id] ?? [];

      if (!poll.allowMultiple) {
        return {
          ...current,
          [poll.id]: [optionId],
        };
      }

      if (currentSelection.includes(optionId)) {
        return {
          ...current,
          [poll.id]: currentSelection.filter(
            (id) => id !== optionId
          ),
        };
      }

      return {
        ...current,
        [poll.id]: [
          ...currentSelection,
          optionId,
        ],
      };
    });
  }

  async function submitVote(poll: Poll) {
    if (submitting) return;

    if (poll.votedOptionIds.length > 0) {
      toast.info(
        "Bạn đã bình chọn cho cuộc khảo sát này."
      );
      return;
    }

    const optionIds =
      selectedOptions[poll.id] ?? [];

    if (optionIds.length === 0) {
      toast.error(
        "Hãy chọn ít nhất một đáp án."
      );
      return;
    }

    try {
      setSubmitting(poll.id);

      const token = await getAccessToken();

      const response = await fetch(
        "/api/member/polls",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pollId: poll.id,
            optionIds,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Không thể gửi bình chọn."
        );
      }

      toast.success(
        "Bình chọn của bạn đã được ghi nhận."
      );

      setSelectedOptions((current) => {
        const next = {
          ...current,
        };

        delete next[poll.id];

        return next;
      });

      await loadPolls(true);
    } catch (error) {
      console.error(
        "[PORTAL POLL VOTE]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể gửi bình chọn."
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <main className="portal-polls-page">
      <style jsx global>{`
        .portal-polls-page {
          min-height: 100vh;
          padding: 28px;
          background:
            radial-gradient(
              circle at 8% 5%,
              rgba(59, 130, 246, 0.1),
              transparent 28%
            ),
            radial-gradient(
              circle at 92% 8%,
              rgba(124, 58, 237, 0.1),
              transparent 28%
            ),
            linear-gradient(
              180deg,
              #f8fafc 0%,
              #f5f7fb 55%,
              #f8fafc 100%
            );
          color: #0f172a;
        }

        .portal-polls-shell {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        /* HEADER */

        .portal-polls-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .portal-polls-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 38px;
          padding: 0 12px;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.85);
          color: #475569;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition:
            transform 0.18s ease,
            background 0.18s ease;
        }

        .portal-polls-back:hover {
          transform: translateX(-2px);
          background: #ffffff;
        }

        .portal-polls-refresh {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.85);
          color: #475569;
          cursor: pointer;
        }

        /* HERO */

        .portal-polls-hero {
          position: relative;
          overflow: hidden;
          margin-bottom: 18px;
          padding: 29px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.98),
              rgba(248, 250, 252, 0.95)
            );
          box-shadow:
            0 18px 48px rgba(15, 23, 42, 0.055),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }

        .portal-polls-hero::before {
          content: "";
          position: absolute;
          width: 390px;
          height: 390px;
          top: -250px;
          right: -80px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(99, 102, 241, 0.16),
              transparent 68%
            );
          pointer-events: none;
        }

        .portal-polls-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.4;
          background-image:
            linear-gradient(
              rgba(148, 163, 184, 0.04) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148, 163, 184, 0.04) 1px,
              transparent 1px
            );
          background-size: 30px 30px;
          mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.8),
            transparent 80%
          );
        }

        .portal-polls-hero-content {
          position: relative;
          z-index: 1;
        }

        .portal-polls-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 12px;
          padding: 7px 10px;
          border: 1px solid #e0e7ff;
          border-radius: 999px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .portal-polls-title {
          margin: 0;
          font-size: clamp(30px, 5vw, 44px);
          line-height: 1;
          letter-spacing: -0.055em;
          font-weight: 850;
          background:
            linear-gradient(
              110deg,
              #0f172a,
              #334155 55%,
              #4f46e5
            );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .portal-polls-description {
          max-width: 690px;
          margin: 13px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.75;
        }

        /* SUMMARY */

        .portal-polls-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 11px;
          margin-bottom: 18px;
        }

        .portal-polls-summary-card {
          position: relative;
          overflow: hidden;
          padding: 17px;
          border: 1px solid #e2e8f0;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.93);
          box-shadow:
            0 12px 32px rgba(15, 23, 42, 0.04);
        }

        .portal-polls-summary-card::after {
          content: "";
          position: absolute;
          width: 90px;
          height: 90px;
          right: -30px;
          bottom: -35px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.07);
        }

        .portal-polls-summary-icon {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          margin-bottom: 13px;
          border-radius: 11px;
          background: #f1f5f9;
          color: #475569;
        }

        .portal-polls-summary-card:nth-child(1)
          .portal-polls-summary-icon {
          background: #eff6ff;
          color: #2563eb;
        }

        .portal-polls-summary-card:nth-child(2)
          .portal-polls-summary-icon {
          background: #f0fdf4;
          color: #16a34a;
        }

        .portal-polls-summary-card:nth-child(3)
          .portal-polls-summary-icon {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .portal-polls-summary-card span {
          display: block;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.07em;
        }

        .portal-polls-summary-card strong {
          display: block;
          margin-top: 6px;
          font-size: 27px;
          line-height: 1;
          letter-spacing: -0.045em;
        }

        /* LIST */

        .portal-poll-list {
          display: grid;
          gap: 16px;
        }

        .portal-poll-card {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 21px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow:
            0 16px 40px rgba(15, 23, 42, 0.045);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .portal-poll-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 20px 48px rgba(15, 23, 42, 0.07);
        }

        .portal-poll-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 21px 22px 15px;
        }

        .portal-poll-card-title-wrap {
          min-width: 0;
        }

        .portal-poll-kicker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #6366f1;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.13em;
        }

        .portal-poll-kicker::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #6366f1;
        }

        .portal-poll-card h2 {
          margin: 7px 0 6px;
          font-size: 20px;
          line-height: 1.25;
          letter-spacing: -0.035em;
        }

        .portal-poll-card-description {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.7;
        }

        .portal-poll-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          padding: 7px 10px;
          border: 1px solid #bbf7d0;
          border-radius: 999px;
          background: #f0fdf4;
          color: #15803d;
          font-size: 9px;
          font-weight: 850;
        }

        .portal-poll-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 0 4px rgba(34, 197, 94, 0.1);
        }

        /* META */

        .portal-poll-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 22px 15px;
        }

        .portal-poll-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 9px;
          border: 1px solid #eef2f7;
          border-radius: 9px;
          background: #f8fafc;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        /* OPTIONS */

        .portal-poll-options {
          padding: 1px 22px 21px;
        }

        .portal-poll-option {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          margin-top: 9px;
          padding: 13px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #ffffff;
          color: #334155;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.18s ease,
            background 0.18s ease,
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .portal-poll-option:hover {
          transform: translateX(2px);
          border-color: #cbd5e1;
          background: #fafbff;
        }

        .portal-poll-option.selected {
          border-color: #6366f1;
          background:
            linear-gradient(
              135deg,
              #eef2ff,
              #f5f3ff
            );
          box-shadow:
            0 7px 20px rgba(79, 70, 229, 0.08);
        }

        .portal-poll-option.disabled {
          cursor: default;
        }

        .portal-poll-control {
          width: 20px;
          height: 20px;
          display: grid;
          flex-shrink: 0;
          place-items: center;
          border: 2px solid #cbd5e1;
          border-radius: 50%;
          background: #ffffff;
        }

        .portal-poll-option.selected
          .portal-poll-control {
          border-color: #6366f1;
          background: #6366f1;
        }

        .portal-poll-control.multi {
          border-radius: 6px;
        }

        .portal-poll-option-text {
          flex: 1;
          min-width: 0;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.5;
        }

        .portal-poll-check {
          display: grid;
          place-items: center;
          color: #ffffff;
        }

        /* RESULTS */

        .portal-poll-results {
          margin-top: 17px;
          padding: 15px;
          border: 1px solid #eef2f7;
          border-radius: 15px;
          background: #f8fafc;
        }

        .portal-poll-results-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .portal-poll-results-title strong {
          color: #334155;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.06em;
        }

        .portal-poll-results-title span {
          color: #64748b;
          font-size: 10px;
        }

        .portal-poll-result {
          margin-bottom: 11px;
        }

        .portal-poll-result:last-child {
          margin-bottom: 0;
        }

        .portal-poll-result-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 6px;
          font-size: 11px;
        }

        .portal-poll-result-top strong {
          color: #334155;
        }

        .portal-poll-result-top span {
          color: #64748b;
          font-weight: 800;
        }

        .portal-poll-result-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .portal-poll-result-fill {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #2563eb,
              #4f46e5,
              #7c3aed
            );
          transition: width 0.45s ease;
        }

        /* FOOTER */

        .portal-poll-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 22px 20px;
          border-top: 1px solid #eef2f7;
        }

        .portal-poll-footer-info {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #94a3b8;
          font-size: 10px;
        }

        .portal-poll-vote-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 16px;
          border: 0;
          border-radius: 12px;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5,
              #7c3aed
            );
          color: white;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 10px 23px rgba(79, 70, 229, 0.19);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            opacity 0.18s ease;
        }

        .portal-poll-vote-button:hover {
          transform: translateY(-1px);
          box-shadow:
            0 13px 28px rgba(79, 70, 229, 0.25);
        }

        .portal-poll-vote-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }

        .portal-poll-voted-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 39px;
          padding: 0 12px;
          border: 1px solid #bbf7d0;
          border-radius: 11px;
          background: #f0fdf4;
          color: #15803d;
          font-size: 11px;
          font-weight: 850;
        }

        /* EMPTY */

        .portal-polls-empty {
          padding: 75px 25px;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.94);
          text-align: center;
        }

        .portal-polls-empty-icon {
          width: 68px;
          height: 68px;
          display: grid;
          place-items: center;
          margin: 0 auto 15px;
          border: 1px solid #e0e7ff;
          border-radius: 20px;
          background:
            linear-gradient(
              145deg,
              #eff6ff,
              #f5f3ff
            );
          color: #6366f1;
        }

        .portal-polls-empty strong {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 15px;
        }

        .portal-polls-empty span {
          display: block;
          color: #64748b;
          font-size: 12px;
        }

        /* LOADING */

        .portal-polls-loading {
          min-height: 300px;
          display: grid;
          place-items: center;
          color: #6366f1;
        }

        /* MOBILE */

        @media (max-width: 700px) {
          .portal-polls-page {
            padding: 14px 10px 75px;
          }

          .portal-polls-top {
            margin-bottom: 12px;
          }

          .portal-polls-hero {
            padding: 21px;
            border-radius: 19px;
          }

          .portal-polls-title {
            font-size: 31px;
          }

          .portal-polls-description {
            font-size: 12px;
          }

          .portal-polls-summary {
            gap: 7px;
          }

          .portal-polls-summary-card {
            padding: 13px;
            border-radius: 14px;
          }

          .portal-polls-summary-card strong {
            font-size: 22px;
          }

          .portal-poll-card {
            border-radius: 18px;
          }

          .portal-poll-card-header {
            display: block;
            padding: 18px 17px 13px;
          }

          .portal-poll-status {
            margin-top: 11px;
          }

          .portal-poll-card h2 {
            font-size: 18px;
          }

          .portal-poll-meta {
            padding-left: 17px;
            padding-right: 17px;
          }

          .portal-poll-options {
            padding-left: 17px;
            padding-right: 17px;
          }

          .portal-poll-card-footer {
            align-items: stretch;
            flex-direction: column;
            padding-left: 17px;
            padding-right: 17px;
          }

          .portal-poll-vote-button,
          .portal-poll-voted-badge {
            width: 100%;
          }

          .portal-poll-footer-info {
            justify-content: center;
          }
        }
      `}</style>

      <div className="portal-polls-shell">
        <div className="portal-polls-top">
          <Link
            href="/portal"
            className="portal-polls-back"
          >
            <ArrowLeft size={15} />
            Về cổng đoàn viên
          </Link>

          <button
            type="button"
            className="portal-polls-refresh"
            onClick={() =>
              void loadPolls(true)
            }
            disabled={refreshing}
            aria-label="Làm mới"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
          </button>
        </div>

        <section className="portal-polls-hero">
          <div className="portal-polls-hero-content">
            <span className="portal-polls-badge">
              <Vote size={14} />
              CHI ĐOÀN D-K66 · Ý KIẾN ĐOÀN VIÊN
            </span>

            <h1 className="portal-polls-title">
              Bình chọn
            </h1>

            <p className="portal-polls-description">
              Tham gia các cuộc bình chọn do Ban Chấp
              hành tổ chức. Mỗi lựa chọn của bạn được
              ghi nhận trực tiếp vào hệ thống.
            </p>
          </div>
        </section>

        <section className="portal-polls-summary">
          <article className="portal-polls-summary-card">
            <div className="portal-polls-summary-icon">
              <BarChart3 size={18} />
            </div>

            <span>CUỘC ĐANG MỞ</span>

            <strong>{openCount}</strong>
          </article>

          <article className="portal-polls-summary-card">
            <div className="portal-polls-summary-icon">
              <CheckCircle2 size={18} />
            </div>

            <span>ĐÃ BÌNH CHỌN</span>

            <strong>{votedCount}</strong>
          </article>

          <article className="portal-polls-summary-card">
            <div className="portal-polls-summary-icon">
              <Vote size={18} />
            </div>

            <span>TỔNG LƯỢT VOTE</span>

            <strong>
              {polls.reduce(
                (sum, poll) =>
                  sum + poll.totalVotes,
                0
              )}
            </strong>
          </article>
        </section>

        {loading ? (
          <div className="portal-polls-loading">
            <Loader2
              size={28}
              className="animate-spin"
            />
          </div>
        ) : polls.length === 0 ? (
          <section className="portal-polls-empty">
            <div className="portal-polls-empty-icon">
              <Vote size={28} />
            </div>

            <strong>
              Hiện chưa có cuộc bình chọn nào
            </strong>

            <span>
              Khi Ban Chấp hành mở bình chọn mới,
              nội dung sẽ xuất hiện tại đây.
            </span>
          </section>
        ) : (
          <section className="portal-poll-list">
            {polls.map((poll) => {
              const hasVoted =
                poll.votedOptionIds.length > 0;

              const currentSelection =
                selectedOptions[poll.id] ?? [];

              const canSubmit =
                !hasVoted &&
                currentSelection.length > 0 &&
                submitting !== poll.id;

              return (
                <article
                  key={poll.id}
                  className="portal-poll-card"
                >
                  <div className="portal-poll-card-header">
                    <div className="portal-poll-card-title-wrap">
                      <span className="portal-poll-kicker">
                        CUỘC BÌNH CHỌN
                      </span>

                      <h2>{poll.title}</h2>

                      {poll.description && (
                        <p className="portal-poll-card-description">
                          {poll.description}
                        </p>
                      )}
                    </div>

                    <span className="portal-poll-status">
                      <span className="portal-poll-status-dot" />
                      {hasVoted
                        ? "ĐÃ BÌNH CHỌN"
                        : "ĐANG MỞ"}
                    </span>
                  </div>

                  <div className="portal-poll-meta">
                    <span className="portal-poll-meta-item">
                      <Clock3 size={13} />
                      {getRemainingText(
                        poll.endsAt
                      )}
                    </span>

                    <span className="portal-poll-meta-item">
                      <Vote size={13} />
                      {poll.totalVotes} lượt vote
                    </span>

                    <span className="portal-poll-meta-item">
                      <Info size={13} />
                      {poll.allowMultiple
                        ? "Có thể chọn nhiều"
                        : "Chọn một đáp án"}
                    </span>
                  </div>

                  <div className="portal-poll-options">
                    {poll.options.map(
                      (option) => {
                        const selected =
                          currentSelection.includes(
                            option.id
                          ) ||
                          poll.votedOptionIds.includes(
                            option.id
                          );

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`portal-poll-option ${
                              selected
                                ? "selected"
                                : ""
                            } ${
                              hasVoted
                                ? "disabled"
                                : ""
                            }`}
                            onClick={() =>
                              toggleOption(
                                poll,
                                option.id
                              )
                            }
                            disabled={hasVoted}
                          >
                            <span
                              className={`portal-poll-control ${
                                poll.allowMultiple
                                  ? "multi"
                                  : ""
                              }`}
                            >
                              {selected && (
                                <span className="portal-poll-check">
                                  <Check size={13} />
                                </span>
                              )}
                            </span>

                            <span className="portal-poll-option-text">
                              {option.optionText}
                            </span>
                          </button>
                        );
                      }
                    )}

                    {hasVoted && (
                      <div className="portal-poll-results">
                        <div className="portal-poll-results-title">
                          <strong>
                            KẾT QUẢ HIỆN TẠI
                          </strong>

                          <span>
                            {poll.totalVotes} lượt
                            bình chọn
                          </span>
                        </div>

                        {poll.options.map(
                          (option) => {
                            const percentage =
                              poll.totalVotes > 0
                                ? Math.round(
                                    (option.votes /
                                      poll.totalVotes) *
                                      100
                                  )
                                : 0;

                            return (
                              <div
                                key={option.id}
                                className="portal-poll-result"
                              >
                                <div className="portal-poll-result-top">
                                  <strong>
                                    {option.optionText}
                                  </strong>

                                  <span>
                                    {option.votes} ·{" "}
                                    {percentage}%
                                  </span>
                                </div>

                                <div className="portal-poll-result-track">
                                  <div
                                    className="portal-poll-result-fill"
                                    style={{
                                      width: `${percentage}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>

                  <div className="portal-poll-card-footer">
                    <div className="portal-poll-footer-info">
                      <Info size={13} />

                      <span>
                        {hasVoted
                          ? "Phiếu của bạn đã được ghi nhận."
                          : poll.allowMultiple
                            ? "Bạn có thể chọn nhiều đáp án."
                            : "Bạn chỉ có thể chọn một đáp án."}
                      </span>
                    </div>

                    {hasVoted ? (
                      <span className="portal-poll-voted-badge">
                        <CheckCircle2 size={15} />
                        Đã bình chọn
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="portal-poll-vote-button"
                        disabled={!canSubmit}
                        onClick={() =>
                          void submitVote(poll)
                        }
                      >
                        {submitting ===
                        poll.id ? (
                          <>
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                            Đang gửi...
                          </>
                        ) : (
                          <>
                            <Send size={15} />
                            Gửi bình chọn
                            <ChevronRight
                              size={15}
                            />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}