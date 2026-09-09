"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Account = {
  id: string;
  email: string;
  status: "active" | "locked";
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
};

type MemberRow = {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
  gender: string | null;
  birth_year: number | null;
  member_accounts: Account[] | Account | null;
};

type ResultRow = {
  member_id: number;
  full_name: string;
  email?: string;
  temporary_password?: string;
  status: string;
  message?: string;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function authHeader() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : null;
}

export default function MemberAccountsPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);

  async function load() {
    setLoading(true);

    const headers = await authHeader();

    if (!headers) {
      window.location.href = "/admin";
      return;
    }

    try {
      const response = await fetch("/api/admin/member-accounts", {
        headers,
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(
          response.status === 403
            ? "Tài khoản hiện tại chưa có quyền BCH."
            : data.error || "Không thể tải danh sách tài khoản."
        );

        setMembers([]);
        setLoading(false);
        return;
      }

      setMembers((data.members ?? []) as MemberRow[]);
    } catch {
      toast.error("Không thể kết nối đến hệ thống.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return members;

    return members.filter((member) => {
      return (
        member.full_name.toLowerCase().includes(keyword) ||
        member.student_id.toLowerCase().includes(keyword) ||
        member.class_name.toLowerCase().includes(keyword)
      );
    });
  }, [members, search]);

  const selectable = filtered.filter(
    (member) => !one(member.member_accounts)
  );

  function toggleMember(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleAllVisible() {
    const ids = selectable.map((item) => item.id);

    if (!ids.length) return;

    const allSelected = ids.every((id) => selected.includes(id));

    setSelected((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : Array.from(new Set([...current, ...ids]))
    );
  }

  async function execute(
    action: "create" | "reset",
    memberIds = selected
  ) {
    if (!memberIds.length || working) return;

    setWorking(true);
    setResults([]);

    const headers = await authHeader();

    if (!headers) {
      window.location.href = "/admin";
      return;
    }

    try {
      const response = await fetch("/api/admin/member-accounts", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberIds,
          action,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Thao tác thất bại.");
        return;
      }

      setResults((data.results ?? []) as ResultRow[]);

      await load();

      setSelected([]);

      toast.success(
        action === "create"
          ? "Đã xử lý cấp tài khoản."
          : "Đã reset mật khẩu tạm thời."
      );
    } catch {
      toast.error("Không thể kết nối đến hệ thống.");
    } finally {
      setWorking(false);
    }
  }

  const totalMembers = members.length;

  const provisionedCount = members.filter(
    (member) => !!one(member.member_accounts)
  ).length;

  const unprovisionedCount = totalMembers - provisionedCount;

  const selectedUnprovisionedCount = selected.filter((id) =>
    selectable.some((member) => member.id === id)
  ).length;

  return (
    <main className="member-accounts-page">
      <div className="member-accounts-shell">

        {/* =====================================================
            HERO
           ===================================================== */}

        <section className="member-accounts-hero">

          <div className="member-accounts-hero-glow member-accounts-hero-glow-one" />
          <div className="member-accounts-hero-glow member-accounts-hero-glow-two" />

          <div className="member-accounts-hero-content">

            <div className="member-accounts-eyebrow">
              <span className="member-accounts-eyebrow-icon">
                <KeyRound size={15} />
              </span>

              <span>QUẢN LÝ TÀI KHOẢN ĐOÀN VIÊN</span>
            </div>

            <div className="member-accounts-hero-main">

              <div className="member-accounts-hero-copy">

                <h1>
                  Tài khoản đoàn viên
                </h1>

                <p>
                  Cấp tài khoản, theo dõi trạng thái đăng nhập và
                  quản lý mật khẩu tạm thời cho toàn bộ đoàn viên
                  từ một không gian thống nhất.
                </p>

                <div className="member-accounts-hero-meta">

                  <span>
                    <ShieldCheck size={14} />
                    Supabase Auth
                  </span>

                  <span>
                    <Users size={14} />
                    {totalMembers} đoàn viên
                  </span>

                  <span>
                    Nhiệm kỳ 2025 — 2028
                  </span>

                </div>

              </div>

              <div className="member-accounts-metrics">

                <Metric
                  label="Đã cấp tài khoản"
                  value={provisionedCount}
                  tone="success"
                />

                <Metric
                  label="Chưa cấp"
                  value={unprovisionedCount}
                  tone="warning"
                />

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            TOOLBAR
           ===================================================== */}

        <section className="member-accounts-toolbar-card">

          <div className="member-accounts-toolbar">

            <div className="member-accounts-search">

              <Search size={17} />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo họ tên, mã đoàn viên hoặc lớp..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={15} />
                </button>
              )}

            </div>

            <div className="member-accounts-actions">

              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={!selectable.length || working}
                className="member-accounts-button member-accounts-button-secondary"
              >
                <Check size={16} />
                Chọn chưa cấp
              </button>

              <button
                type="button"
                onClick={() => void execute("create")}
                disabled={!selectedUnprovisionedCount || working}
                className="member-accounts-button member-accounts-button-primary"
              >
                <UserPlus size={16} />

                {working
                  ? "ĐANG XỬ LÝ..."
                  : `Cấp tài khoản đã chọn (${selectedUnprovisionedCount})`}
              </button>

            </div>

          </div>


          <div className="member-accounts-rule">

            <div className="member-accounts-rule-icon">
              <ShieldCheck size={16} />
            </div>

            <div className="member-accounts-rule-content">

              <strong>
                Quy tắc cấp tài khoản
              </strong>

              <span>
                Email:
                <b> hovaten@dk66.vn</b>
              </span>

              <span className="member-accounts-rule-separator">
                •
              </span>

              <span>
                Mật khẩu tạm:
                <b> họ tên không dấu + năm sinh</b>
              </span>

              <span className="member-accounts-rule-separator">
                •
              </span>

              <span>
                Lần đăng nhập đầu tiên bắt buộc đổi mật khẩu.
              </span>

            </div>

          </div>

        </section>


        {/* =====================================================
            RESULTS
           ===================================================== */}

        {results.length > 0 && (
          <section className="member-accounts-results-card">

            <div className="member-accounts-results-header">

              <div>

                <span className="member-accounts-results-label">
                  CẤP TÀI KHOẢN
                </span>

                <h2>
                  Kết quả xử lý
                </h2>

                <p>
                  Mật khẩu tạm chỉ hiển thị trong phiên này
                  để BCH bàn giao cho đoàn viên.
                </p>

              </div>

              <button
                type="button"
                onClick={() => setResults([])}
                className="member-accounts-icon-button"
                aria-label="Đóng kết quả"
              >
                <X size={17} />
              </button>

            </div>

            <div className="member-accounts-results-list">

              {results.map((row) => (
                <CredentialRow
                  key={`${row.member_id}-${row.status}`}
                  row={row}
                />
              ))}

            </div>

          </section>
        )}


        {/* =====================================================
            LIST
           ===================================================== */}

        <section className="member-accounts-list-card">

          <div className="member-accounts-list-header">

            <div>

              <span>
                MEMBER ACCOUNTS
              </span>

              <h2>
                Danh sách đoàn viên
              </h2>

              <p>
                Quản lý trạng thái tài khoản và cấp lại
                mật khẩu tạm thời.
              </p>

            </div>

            <div className="member-accounts-list-count">
              <strong>
                {filtered.length}
              </strong>

              <span>
                đoàn viên
              </span>
            </div>

          </div>


          {loading ? (

            <div className="member-accounts-loading">

              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="member-accounts-loading-row"
                >
                  <span />
                  <div>
                    <b />
                    <i />
                  </div>
                  <em />
                </div>
              ))}

            </div>

          ) : filtered.length === 0 ? (

            <div className="member-accounts-empty">

              <div className="member-accounts-empty-icon">
                <Users size={27} />
              </div>

              <h3>
                Không tìm thấy đoàn viên
              </h3>

              <p>
                Thử thay đổi từ khóa tìm kiếm.
              </p>

            </div>

          ) : (

            <div className="member-accounts-list">

              {filtered.map((member) => {

                const account = one(member.member_accounts);

                const checked = selected.includes(member.id);

                const lastName =
                  member.full_name
                    .trim()
                    .split(/\s+/)
                    .slice(-1)[0]
                    ?.charAt(0)
                    .toUpperCase() || "Đ";

                return (
                  <article
                    key={member.id}
                    className={`member-account-row ${
                      checked
                        ? "member-account-row-selected"
                        : ""
                    }`}
                  >

                    <label className="member-account-checkbox">

                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!!account || working}
                        onChange={() =>
                          toggleMember(member.id)
                        }
                      />

                      <span />

                    </label>


                    <div className="member-account-person">

                      <div className="member-account-avatar">
                        {lastName}
                      </div>

                      <div className="member-account-person-copy">

                        <h3>
                          {member.full_name}
                        </h3>

                        <p>
                          <span>
                            {member.student_id}
                          </span>

                          <i />

                          <span>
                            {member.class_name}
                          </span>

                          {member.birth_year && (
                            <>
                              <i />

                              <span>
                                {member.birth_year}
                              </span>
                            </>
                          )}

                        </p>

                      </div>

                    </div>


                    <div className="member-account-status">

                      {account ? (

                        <>
                          <div className="member-account-status-top">

                            <span className="member-account-email">
                              {account.email}
                            </span>

                            <span
                              className={`member-account-status-badge ${
                                account.status === "active"
                                  ? "is-active"
                                  : "is-locked"
                              }`}
                            >
                              {account.status === "active"
                                ? "Đang hoạt động"
                                : "Đã khóa"}
                            </span>

                          </div>

                          <div className="member-account-status-bottom">

                            {account.must_change_password ? (
                              <span className="member-account-password-state is-warning">
                                Cần đổi mật khẩu
                              </span>
                            ) : (
                              <span className="member-account-password-state is-ok">
                                Mật khẩu đã được thay đổi
                              </span>
                            )}

                            <span className="member-account-last-login">
                              {account.last_login_at
                                ? `Đăng nhập gần nhất ${new Date(
                                    account.last_login_at
                                  ).toLocaleDateString("vi-VN")}`
                                : "Chưa đăng nhập"}
                            </span>

                          </div>
                        </>

                      ) : (

                        <span className="member-account-unprovisioned">
                          <Users size={15} />
                          Chưa cấp tài khoản
                        </span>

                      )}

                    </div>


                    {account && (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() =>
                          void execute("reset", [member.id])
                        }
                        className="member-account-reset"
                      >
                        <RefreshCw size={15} />
                        <span>Reset mật khẩu</span>
                      </button>
                    )}

                  </article>
                );
              })}

            </div>

          )}

        </section>


        {/* =====================================================
            FOOT NOTE
           ===================================================== */}

        <div className="member-accounts-footnote">

          <ShieldCheck size={14} />

          <span>
            Mật khẩu được quản lý bởi Supabase Auth.
            Hệ thống không lưu mật khẩu dạng văn bản trong hồ sơ đoàn viên.
          </span>

        </div>

      </div>
    </main>
  );
}


function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning";
}) {
  return (
    <div className={`member-accounts-metric is-${tone}`}>

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


function CredentialRow({
  row,
}: {
  row: ResultRow;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCredentials() {
    if (!row.temporary_password || !row.email) return;

    try {
      await navigator.clipboard.writeText(
        [
          `Đoàn viên: ${row.full_name}`,
          `Tài khoản: ${row.email}`,
          `Mật khẩu tạm: ${row.temporary_password}`,
        ].join("\n")
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      toast.error("Không thể sao chép thông tin.");
    }
  }

  return (
    <div className="member-accounts-credential">

      <div className="member-accounts-credential-main">

        <div className="member-accounts-credential-avatar">
          {row.full_name
            .trim()
            .split(/\s+/)
            .slice(-1)[0]
            ?.charAt(0)
            .toUpperCase() || "Đ"}
        </div>

        <div>

          <h3>
            {row.full_name}
          </h3>

          {row.status === "error" ? (

            <p className="member-accounts-credential-error">
              {row.message || "Không thể cấp tài khoản."}
            </p>

          ) : (

            <div className="member-accounts-credential-values">

              <span>
                {row.email || "—"}
              </span>

              <b>
                {row.temporary_password || "—"}
              </b>

            </div>

          )}

        </div>

      </div>


      {row.temporary_password && (
        <button
          type="button"
          onClick={() => void copyCredentials()}
          className="member-accounts-copy"
        >
          {copied ? (
            <Check size={15} />
          ) : (
            <Copy size={15} />
          )}

          {copied ? "Đã sao chép" : "Sao chép"}
        </button>
      )}

    </div>
  );
}