"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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
  LogIn,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const EMAIL_STORAGE_KEY = "dk66_portal_login_email";

type MemberAccountResponse = {
  account?: {
    status?: string | null;
    must_change_password?: boolean | null;
  };
  error?: string;
};

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
    if (storedEmail) setEmail(storedEmail);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
const { data: loginData, error: loginError } =
  await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

if (loginError || !loginData.session) {
  console.error("[PORTAL LOGIN / AUTH]", loginError);

  setError(
    loginError?.message ||
      "Không thể xác thực tài khoản. Vui lòng kiểm tra lại email và mật khẩu."
  );

  return;
}

if (rememberEmail) {
  window.localStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail);
} else {
  window.localStorage.removeItem(EMAIL_STORAGE_KEY);
}

const accountResponse = await fetch("/api/member/me", {
  method: "GET",
  cache: "no-store",
  headers: {
    Authorization: `Bearer ${loginData.session.access_token}`,
  },
});

const accountData = (await accountResponse.json()) as MemberAccountResponse;

      if (!accountResponse.ok || !accountData.account) {
        await supabase.auth.signOut();
        setError(
          accountData.error ||
            "Tài khoản đã đăng nhập nhưng chưa được liên kết với hồ sơ đoàn viên."
        );
        return;
      }

      if (accountData.account.status !== "active") {
        await supabase.auth.signOut();
        setError("Tài khoản hiện chưa ở trạng thái hoạt động. Vui lòng liên hệ Ban Chấp hành.");
        return;
      }

      if (accountData.account.must_change_password) {
        router.replace("/portal/change-password");
        router.refresh();
        return;
      }

      router.replace("/portal");
      router.refresh();
    } catch (submitError) {
      console.error("[PORTAL LOGIN]", submitError);
      setError("Không thể kết nối tới hệ thống lúc này. Vui lòng thử lại sau ít phút.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="portal-login-page">
      <header className="portal-login-header">
        <div className="portal-login-header-inner">
          <Link href="/" className="portal-login-brand" aria-label="Về trang chủ D-K66">
            <span className="portal-login-brand-mark">
              <img src="/logo-truong.png" alt="" />
            </span>
            <span className="portal-login-brand-copy">
              <strong>CỔNG ĐOÀN VIÊN</strong>
              <span>CHI ĐOÀN D-K66 · THPT HÀ TRUNG</span>
            </span>
          </Link>

          <Link href="/" className="portal-login-back-link">
            <ArrowLeft size={16} />
            <span>Về website</span>
          </Link>
        </div>
      </header>

      <div className="portal-login-main">
        <section className="portal-login-intro" aria-labelledby="portal-login-intro-title">
          <div className="portal-login-intro-topline">
            <span className="portal-login-kicker">KHÔNG GIAN RIÊNG CHO ĐOÀN VIÊN</span>
            <span className="portal-login-term">2025 — 2028</span>
          </div>

          <div className="portal-login-intro-content">
            <div className="portal-login-intro-icon">
              <UserRound size={25} />
            </div>
            <p className="portal-login-intro-eyebrow">CHI ĐOÀN D-K66</p>
            <h1 id="portal-login-intro-title">
              Mỗi hoạt động,
              <br />
              một dấu ấn.
            </h1>
            <p className="portal-login-intro-text">
              Một không gian để đoàn viên chủ động theo dõi hồ sơ, đăng ký hoạt động,
              xem điểm danh, lịch sử tham gia và kết nối trực tiếp với Ban Chấp hành.
            </p>

            <div className="portal-login-feature-list">
              <div className="portal-login-feature">
                <span className="portal-login-feature-icon"><CheckCircle2 size={17} /></span>
                <span>
                  <strong>Hồ sơ cá nhân</strong>
                  <small>Theo dõi thông tin đoàn viên của bạn.</small>
                </span>
              </div>
              <div className="portal-login-feature">
                <span className="portal-login-feature-icon"><CheckCircle2 size={17} /></span>
                <span>
                  <strong>Hoạt động & điểm danh</strong>
                  <small>Đăng ký và xem lịch sử tham gia minh bạch.</small>
                </span>
              </div>
              <div className="portal-login-feature">
                <span className="portal-login-feature-icon"><CheckCircle2 size={17} /></span>
                <span>
                  <strong>Điểm & phản ánh</strong>
                  <small>Tra cứu kết quả và gửi góp ý tới BCH.</small>
                </span>
              </div>
            </div>
          </div>

          <div className="portal-login-intro-footer">
            <span>Đoàn kết · Trách nhiệm · Tiên phong · Sáng tạo</span>
            <span>THPT HÀ TRUNG</span>
          </div>
        </section>

        <section className="portal-login-card" aria-labelledby="portal-login-title">
          <div className="portal-login-card-header">
            <div className="portal-login-status-row">
              <span className="portal-login-status-pill">
                <ShieldCheck size={15} />
                KHU VỰC ĐOÀN VIÊN
              </span>
              <span className="portal-login-security">
                <span className="portal-login-security-dot" />
                Kết nối bảo mật
              </span>
            </div>

            <h2 id="portal-login-title">Đăng nhập</h2>
            <p>
              Sử dụng tài khoản do Ban Chấp hành cấp. Ở lần đăng nhập đầu tiên,
              hệ thống sẽ yêu cầu bạn đổi mật khẩu.
            </p>
          </div>

          {error ? (
            <div className="portal-login-error" role="alert">
              <span className="portal-login-error-icon">!</span>
              <div>
                <strong>Không thể đăng nhập</strong>
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          <form className="portal-login-form" onSubmit={handleSubmit}>
            <label className="portal-login-field">
              <span className="portal-login-field-label">Tên đăng nhập</span>
              <span className="portal-login-field-box">
                <UserRound size={19} aria-hidden="true" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="hovaten@dk66.vn"
                  autoComplete="username"
                  inputMode="email"
                />
              </span>
            </label>

            <label className="portal-login-field">
              <span className="portal-login-field-label">Mật khẩu</span>
              <span className="portal-login-field-box">
                <LockKeyhole size={19} aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="portal-login-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <div className="portal-login-options">
              <label className="portal-login-remember">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(event) => setRememberEmail(event.target.checked)}
                />
                <span>Ghi nhớ tên đăng nhập</span>
              </label>
              <span className="portal-login-options-note">Chỉ lưu email trên thiết bị này</span>
            </div>

            <button className="portal-login-submit" type="submit" disabled={loading}>
              <span>{loading ? "ĐANG XÁC THỰC..." : "ĐĂNG NHẬP CỔNG ĐOÀN VIÊN"}</span>
              {loading ? <KeyRound size={18} className="portal-login-spinner" /> : <ArrowRight size={18} />}
            </button>
          </form>

          <div className="portal-login-help">
            <div className="portal-login-help-item">
              <LockKeyhole size={18} />
              <div>
                <strong>Tài khoản được cấp riêng</strong>
                <span>Chỉ sử dụng thông tin đăng nhập do BCH cung cấp.</span>
              </div>
            </div>
            <div className="portal-login-help-item">
              <CheckCircle2 size={18} />
              <div>
                <strong>Đổi mật khẩu lần đầu</strong>
                <span>Mật khẩu tạm thời chỉ dùng cho lần đăng nhập đầu tiên.</span>
              </div>
            </div>
          </div>

          <div className="portal-login-card-footer">
            <Link href="/" className="portal-login-home-link">
              <ArrowLeft size={16} />
              Về trang chủ
            </Link>
            <Link href="/admin" className="portal-login-admin-link">
              <ShieldCheck size={16} />
              BCH / Admin
            </Link>
          </div>
        </section>
      </div>

      <footer className="portal-login-footer">
        <span>© 2025 — 2028 · CHI ĐOÀN D-K66</span>
        <span>TRƯỜNG THPT HÀ TRUNG</span>
      </footer>
    </main>
  );
}
