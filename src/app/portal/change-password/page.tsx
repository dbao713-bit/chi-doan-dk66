"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const passwordChecks = useMemo(
    () => ({
      length: newPassword.length >= 8,
      match:
        confirm.length > 0 &&
        newPassword.length > 0 &&
        newPassword === confirm,
    }),
    [newPassword, confirm]
  );

  const strength = useMemo(() => {
    if (!newPassword) {
      return {
        level: 0,
        label: "Chưa nhập mật khẩu",
      };
    }

    let score = 0;

    if (newPassword.length >= 8) score += 1;
    if (newPassword.length >= 12) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[a-z]/.test(newPassword)) score += 1;
    if (/\d/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 2) {
      return {
        level: 1,
        label: "Mật khẩu yếu",
      };
    }

    if (score <= 4) {
      return {
        level: 2,
        label: "Mật khẩu khá an toàn",
      };
    }

    return {
      level: 3,
      label: "Mật khẩu mạnh",
    };
  }, [newPassword]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || success) return;

    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (newPassword !== confirm) {
      setError("Hai mật khẩu chưa khớp.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.replace("/portal/login");
        return;
      }

      const response = await fetch("/api/member/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error || "Không thể đổi mật khẩu.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      window.setTimeout(() => {
        router.replace("/portal");
        router.refresh();
      }, 1200);
    } catch (submitError) {
      console.error("[CHANGE PASSWORD]", submitError);
      setError("Không thể kết nối tới hệ thống. Vui lòng thử lại sau ít phút.");
      setLoading(false);
    }
  }

  return (
    <main className="portal-change-password-page">
      <div className="portal-change-password-background" aria-hidden="true">
        <div className="portal-change-password-orb portal-change-password-orb-left" />
        <div className="portal-change-password-orb portal-change-password-orb-right" />
        <div className="portal-change-password-grid" />
      </div>

      <div className="portal-change-password-shell">
        <header className="portal-change-password-header">
          <Link
            href="/"
            className="portal-change-password-brand"
            aria-label="Về trang chủ D-K66"
          >
            <span className="portal-change-password-brand-mark">
              <img src="/logo-truong.png" alt="" />
            </span>

            <span className="portal-change-password-brand-copy">
              <strong>CỔNG ĐOÀN VIÊN</strong>
              <span>CHI ĐOÀN D-K66 · THPT HÀ TRUNG</span>
            </span>
          </Link>

          <Link
            href="/portal"
            className="portal-change-password-back"
          >
            <ArrowLeft size={16} />
            <span>Về cổng đoàn viên</span>
          </Link>
        </header>

        <div className="portal-change-password-main">
          <section className="portal-change-password-card">
            <div className="portal-change-password-card-top">
              <div className="portal-change-password-icon">
                {success ? (
                  <CheckCircle2 size={28} />
                ) : (
                  <LockKeyhole size={28} />
                )}
              </div>

              <div className="portal-change-password-badge">
                <ShieldCheck size={14} />
                <span>
                  {success ? "HOÀN TẤT BẢO MẬT" : "BẢO MẬT TÀI KHOẢN"}
                </span>
              </div>
            </div>

            {!success ? (
              <>
                <div className="portal-change-password-heading">
                  <h1>Đổi mật khẩu lần đầu</h1>

                  <p>
                    Mật khẩu do Ban Chấp hành cấp chỉ là mật khẩu tạm thời.
                    Hãy tạo một mật khẩu riêng để bảo vệ tài khoản đoàn viên
                    của bạn.
                  </p>
                </div>

                <div className="portal-change-password-notice">
                  <div className="portal-change-password-notice-icon">
                    <KeyRound size={18} />
                  </div>

                  <div>
                    <strong>Đây là bước bảo mật bắt buộc</strong>
                    <span>
                      Sau khi hoàn tất, mật khẩu tạm thời sẽ không còn được
                      sử dụng cho các lần đăng nhập tiếp theo.
                    </span>
                  </div>
                </div>

                {error ? (
                  <div
                    className="portal-change-password-error"
                    role="alert"
                  >
                    <span className="portal-change-password-error-mark">
                      !
                    </span>

                    <div>
                      <strong>Không thể cập nhật</strong>
                      <span>{error}</span>
                    </div>
                  </div>
                ) : null}

                <form
                  onSubmit={submit}
                  className="portal-change-password-form"
                >
                  <label className="portal-change-password-field">
                    <span className="portal-change-password-label-row">
                      <span>Mật khẩu mới</span>

                      {newPassword ? (
                        <span
                          className={`portal-change-password-strength strength-${strength.level}`}
                        >
                          {strength.label}
                        </span>
                      ) : null}
                    </span>

                    <span className="portal-change-password-input-wrap">
                      <LockKeyhole
                        size={19}
                        className="portal-change-password-input-icon"
                        aria-hidden="true"
                      />

                      <input
                        type={showNewPassword ? "text" : "password"}
                        minLength={8}
                        required
                        value={newPassword}
                        onChange={(event) => {
                          setNewPassword(event.target.value);
                          setError("");
                        }}
                        placeholder="Tạo mật khẩu mới"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        className="portal-change-password-eye"
                        onClick={() =>
                          setShowNewPassword((visible) => !visible)
                        }
                        aria-label={
                          showNewPassword
                            ? "Ẩn mật khẩu mới"
                            : "Hiện mật khẩu mới"
                        }
                      >
                        {showNewPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </span>
                  </label>

                  <div className="portal-change-password-strength-track">
                    <span
                      className={
                        strength.level >= 1
                          ? "is-active"
                          : ""
                      }
                    />
                    <span
                      className={
                        strength.level >= 2
                          ? "is-active"
                          : ""
                      }
                    />
                    <span
                      className={
                        strength.level >= 3
                          ? "is-active"
                          : ""
                      }
                    />
                  </div>

                  <label className="portal-change-password-field">
                    <span className="portal-change-password-label-row">
                      <span>Nhập lại mật khẩu</span>

                      {confirm ? (
                        <span
                          className={
                            passwordChecks.match
                              ? "portal-change-password-match is-match"
                              : "portal-change-password-match"
                          }
                        >
                          {passwordChecks.match
                            ? "Khớp mật khẩu"
                            : "Chưa khớp"}
                        </span>
                      ) : null}
                    </span>

                    <span className="portal-change-password-input-wrap">
                      <LockKeyhole
                        size={19}
                        className="portal-change-password-input-icon"
                        aria-hidden="true"
                      />

                      <input
                        type={showConfirm ? "text" : "password"}
                        minLength={8}
                        required
                        value={confirm}
                        onChange={(event) => {
                          setConfirm(event.target.value);
                          setError("");
                        }}
                        placeholder="Nhập lại chính xác"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        className="portal-change-password-eye"
                        onClick={() =>
                          setShowConfirm((visible) => !visible)
                        }
                        aria-label={
                          showConfirm
                            ? "Ẩn mật khẩu xác nhận"
                            : "Hiện mật khẩu xác nhận"
                        }
                      >
                        {showConfirm ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </span>
                  </label>

                  <div className="portal-change-password-rules">
                    <div
                      className={
                        passwordChecks.length
                          ? "is-valid"
                          : ""
                      }
                    >
                      <span>
                        <CheckCircle2 size={15} />
                      </span>
                      <span>Ít nhất 8 ký tự</span>
                    </div>

                    <div
                      className={
                        passwordChecks.match
                          ? "is-valid"
                          : ""
                      }
                    >
                      <span>
                        <CheckCircle2 size={15} />
                      </span>
                      <span>Hai mật khẩu phải giống nhau</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="portal-change-password-submit"
                  >
                    <span>
                      {loading
                        ? "ĐANG CẬP NHẬT..."
                        : "LƯU MẬT KHẨU MỚI"}
                    </span>

                    {loading ? (
                      <span className="portal-change-password-spinner" />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </button>
                </form>

                <div className="portal-change-password-help">
                  <LockKeyhole size={17} />

                  <span>
                    Mật khẩu mới chỉ thuộc về bạn. Không chia sẻ mật khẩu
                    với người khác, kể cả Ban Chấp hành.
                  </span>
                </div>
              </>
            ) : (
              <div className="portal-change-password-success">
                <div className="portal-change-password-success-icon">
                  <CheckCircle2 size={34} />
                </div>

                <h1>Đổi mật khẩu thành công</h1>

                <p>
                  Tài khoản của bạn đã được bảo vệ bằng mật khẩu mới.
                  Hệ thống đang đưa bạn về Cổng đoàn viên.
                </p>

                <div className="portal-change-password-success-bar">
                  <span />
                </div>

                <span className="portal-change-password-success-note">
                  Đang chuyển tới Cổng đoàn viên...
                </span>
              </div>
            )}
          </section>
        </div>

        <footer className="portal-change-password-footer">
          <span>© 2025 — 2028 · CHI ĐOÀN D-K66</span>
          <span>TRƯỜNG THPT HÀ TRUNG</span>
        </footer>
      </div>
    </main>
  );
}