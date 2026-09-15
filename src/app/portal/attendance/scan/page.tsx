"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { supabase } from "@/lib/supabase";

type ScanState =
  | "checking"
  | "ready"
  | "starting"
  | "scanning"
  | "success"
  | "error";

export default function ScanAttendancePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<{
    stop: () => void;
  } | null>(null);

  const [scanState, setScanState] =
    useState<ScanState>("checking");

  const [message, setMessage] = useState(
    "Đang kiểm tra tài khoản..."
  );

  const [activityTitle, setActivityTitle] =
    useState("");

  const [starting, setStarting] = useState(false);

  const stopScanner = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      // ignore cleanup errors
    }

    controlsRef.current = null;

    const video = videoRef.current;

    if (video?.srcObject) {
      const stream =
        video.srcObject as MediaStream;

      stream.getTracks().forEach((track) => {
        track.stop();
      });

      video.srcObject = null;
    }
  }, []);

  const checkAccount = useCallback(async () => {
    setScanState("checking");
    setMessage("Đang kiểm tra tài khoản...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/portal/login";
        return;
      }

      const response = await fetch(
        "/api/member/me",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !payload?.account) {
        await supabase.auth.signOut();
        window.location.href = "/portal/login";
        return;
      }

      if (
        payload.account.must_change_password
      ) {
        window.location.href =
          "/portal/change-password";
        return;
      }

      setScanState("ready");
      setMessage(
        "Đưa mã QR điểm danh vào giữa khung hình."
      );
    } catch (error) {
      console.error(
        "[QR SCANNER ACCOUNT]",
        error
      );

      setScanState("error");
      setMessage(
        "Không thể kiểm tra tài khoản. Vui lòng thử lại."
      );
    }
  }, []);

  useEffect(() => {
    void checkAccount();

    return () => {
      stopScanner();
    };
  }, [checkAccount, stopScanner]);

  const handleCheckin = useCallback(
    async (token: string) => {
      stopScanner();

      setScanState("checking");
      setMessage("Đang xác thực mã QR...");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.href = "/portal/login";
          return;
        }

        const response = await fetch(
          "/api/attendance/qr/checkin",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              token,
            }),
          }
        );

        const payload =
          await response.json().catch(() => ({}));

        if (!response.ok) {
          setScanState("error");
          setMessage(
            payload?.error ||
              "Không thể điểm danh bằng mã QR."
          );
          return;
        }

        setActivityTitle(
          payload?.activity?.title || ""
        );

        setScanState("success");

        setMessage(
          payload?.alreadyCheckedIn
            ? "Bạn đã được ghi nhận có mặt trước đó."
            : "Điểm danh thành công."
        );
      } catch (error) {
        console.error(
          "[QR SCANNER CHECKIN]",
          error
        );

        setScanState("error");
        setMessage(
          "Không thể kết nối tới hệ thống điểm danh."
        );
      }
    },
    [stopScanner]
  );

  const startScanner = useCallback(async () => {
    if (starting) return;

    setStarting(true);
    setScanState("starting");
    setMessage("Đang mở camera...");

    try {
      stopScanner();

      if (!videoRef.current) {
        throw new Error(
          "Không tìm thấy vùng camera."
        );
      }

      const reader =
        new BrowserQRCodeReader();

      readerRef.current = reader;

      const controls =
        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result) return;

            const token =
              result.getText().trim();

            if (!token) return;

            void handleCheckin(token);
          }
        );

      controlsRef.current = controls;

      setScanState("scanning");
      setMessage(
        "Đang quét… hãy đưa mã QR vào khung."
      );
    } catch (error) {
      console.error(
        "[QR SCANNER CAMERA]",
        error
      );

      stopScanner();
      setScanState("error");

      setMessage(
        "Không thể mở camera. Hãy cấp quyền camera cho trình duyệt rồi thử lại."
      );
    } finally {
      setStarting(false);
    }
  }, [
    handleCheckin,
    starting,
    stopScanner,
  ]);

  const retry = () => {
    stopScanner();
    setActivityTitle("");
    void checkAccount();
  };

  return (
    <main className="member-portal-scan-page">
      <div className="member-portal-scan-shell">
        <header className="member-portal-scan-header">
          <Link
            href="/portal"
            className="member-portal-scan-back"
          >
            <ArrowLeft size={17} />
            Cổng đoàn viên
          </Link>

          <div className="member-portal-scan-brand">
            <div className="member-portal-scan-brand-icon">
              <QrCode size={20} />
            </div>

            <div>
              <strong>
                QUÉT QR ĐIỂM DANH
              </strong>

              <span>
                CHI ĐOÀN D-K66
              </span>
            </div>
          </div>
        </header>

        <section className="member-portal-scan-hero">
          <div className="member-portal-scan-kicker">
            <ShieldCheck size={15} />
            ĐIỂM DANH ĐIỆN TỬ
          </div>

          <h1>
            Quét mã QR
            <span> để xác nhận tham gia</span>
          </h1>

          <p>
            BCH sẽ hiển thị mã QR trên màn hình.
            Bạn chỉ cần mở camera và đưa mã vào
            chính giữa khung quét.
          </p>
        </section>

        <section className="member-portal-scan-card">
          <div className="member-portal-scan-camera-wrap">
            <video
              ref={videoRef}
              className="member-portal-scan-video"
              muted
              playsInline
            />

            <div className="member-portal-scan-frame">
              <span className="top-left" />
              <span className="top-right" />
              <span className="bottom-left" />
              <span className="bottom-right" />

              {scanState === "scanning" && (
                <span className="member-portal-scan-line" />
              )}
            </div>

            {scanState !== "scanning" && (
              <div className="member-portal-scan-camera-overlay">
                <div className="member-portal-scan-camera-overlay-icon">
                  {scanState === "success" ? (
                    <CheckCircle2 size={30} />
                  ) : scanState === "error" ? (
                    <XCircle size={30} />
                  ) : (
                    <Camera size={30} />
                  )}
                </div>

                <strong>
                  {scanState === "success"
                    ? "Đã hoàn tất"
                    : scanState === "error"
                    ? "Không thể quét"
                    : "Camera chưa hoạt động"}
                </strong>
              </div>
            )}
          </div>

          <div
            className={`member-portal-scan-status ${scanState}`}
          >
            <div className="member-portal-scan-status-icon">
              {scanState === "checking" ||
              scanState === "starting" ? (
                <Loader2
                  size={20}
                  className="member-portal-scan-spin"
                />
              ) : scanState === "success" ? (
                <CheckCircle2 size={20} />
              ) : scanState === "error" ? (
                <XCircle size={20} />
              ) : (
                <QrCode size={20} />
              )}
            </div>

            <div>
              <strong>
                {scanState === "success"
                  ? "ĐIỂM DANH THÀNH CÔNG"
                  : scanState === "error"
                  ? "CẦN KIỂM TRA"
                  : scanState === "scanning"
                  ? "ĐANG QUÉT MÃ QR"
                  : "SẴN SÀNG"}
              </strong>

              <span>{message}</span>
            </div>
          </div>

          {activityTitle && (
            <div className="member-portal-scan-activity">
              <span>HOẠT ĐỘNG</span>
              <strong>{activityTitle}</strong>
            </div>
          )}

          <div className="member-portal-scan-actions">
            {scanState === "ready" && (
              <button
                type="button"
                onClick={() =>
                  void startScanner()
                }
                disabled={starting}
                className="member-portal-scan-primary"
              >
                <Camera size={18} />
                MỞ CAMERA QUÉT QR
              </button>
            )}

            {scanState === "error" && (
              <button
                type="button"
                onClick={retry}
                className="member-portal-scan-primary"
              >
                <RefreshCw size={18} />
                THỬ LẠI
              </button>
            )}

            {scanState === "success" && (
              <>
                <button
                  type="button"
                  onClick={retry}
                  className="member-portal-scan-secondary"
                >
                  <RefreshCw size={17} />
                  QUÉT MÃ KHÁC
                </button>

                <Link
                  href="/portal"
                  className="member-portal-scan-primary link"
                >
                  VỀ CỔNG ĐOÀN VIÊN
                </Link>
              </>
            )}

            {scanState === "scanning" && (
              <button
                type="button"
                onClick={() => {
                  stopScanner();
                  setScanState("ready");
                  setMessage(
                    "Đưa mã QR điểm danh vào giữa khung hình."
                  );
                }}
                className="member-portal-scan-secondary"
              >
                DỪNG CAMERA
              </button>
            )}
          </div>
        </section>

        <section className="member-portal-scan-guide">
          <div>
            <span>01</span>
            <strong>Mở camera</strong>
            <p>
              Cho phép trình duyệt sử dụng camera
              khi được yêu cầu.
            </p>
          </div>

          <div>
            <span>02</span>
            <strong>Đưa QR vào khung</strong>
            <p>
              Giữ điện thoại ổn định và để toàn bộ
              mã QR nằm trong vùng quét.
            </p>
          </div>

          <div>
            <span>03</span>
            <strong>Hoàn tất</strong>
            <p>
              Hệ thống sẽ tự xác thực và ghi nhận
              có mặt cho tài khoản của bạn.
            </p>
          </div>
        </section>

        <footer className="member-portal-scan-footer">
          <ShieldCheck size={15} />
          <span>
            Mã QR chỉ có hiệu lực trong thời gian
            BCH mở điểm danh.
          </span>
        </footer>
      </div>
    </main>
  );
}