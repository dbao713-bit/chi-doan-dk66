"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImageUp,
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
  | "decoding"
  | "success"
  | "error";

export default function ScanAttendancePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageInputRef =
  useRef<HTMLInputElement | null>(null);
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

    const handleImageUpload = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      event.target.value = "";

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setScanState("error");
        setMessage(
          "Tệp đã chọn không phải là hình ảnh."
        );
        return;
      }

      const MAX_IMAGE_SIZE =
        10 * 1024 * 1024;

      if (file.size > MAX_IMAGE_SIZE) {
        setScanState("error");
        setMessage(
          "Ảnh QR quá lớn. Vui lòng chọn ảnh dưới 10 MB."
        );
        return;
      }

      stopScanner();

      setActivityTitle("");
      setScanState("decoding");
      setMessage(
        "Đang đọc mã QR từ ảnh..."
      );

      const imageUrl =
        URL.createObjectURL(file);

      try {
        const reader =
          readerRef.current ||
          new BrowserQRCodeReader();

        readerRef.current = reader;

        const result =
          await reader.decodeFromImageUrl(
            imageUrl
          );

        const token =
          result.getText().trim();

        if (!token) {
          throw new Error(
            "Không tìm thấy nội dung QR."
          );
        }

        await handleCheckin(token);
      } catch (error) {
        console.error(
          "[QR IMAGE DECODER]",
          error
        );

        setScanState("error");
        setMessage(
          "Không đọc được mã QR từ ảnh. Hãy chọn ảnh rõ hơn, có đầy đủ mã QR."
        );
      } finally {
        URL.revokeObjectURL(imageUrl);
      }
    },
    [handleCheckin, stopScanner]
  );

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
  Bạn có thể mở camera để quét trực tiếp
  hoặc tải ảnh QR đã chụp / chụp màn hình
  từ thiết bị của mình.
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
) : scanState === "decoding" ? (
  <Loader2
    size={30}
    className="member-portal-scan-spin"
  />
) : (
  <Camera size={30} />
)}
                </div>

                <strong>
  {scanState === "success"
    ? "Đã hoàn tất"
    : scanState === "error"
    ? "Không thể quét"
    : scanState === "decoding"
    ? "ĐANG ĐỌC ẢNH QR"
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
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(event) =>
                void handleImageUpload(event)
              }
              className="member-portal-scan-image-input"
            />

            {scanState === "ready" && (
              <>
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

                <button
                  type="button"
                  onClick={() =>
                    imageInputRef.current?.click()
                  }
                  className="member-portal-scan-upload"
                >
                  <ImageUp size={18} />
                  TẢI ẢNH QR
                </button>
              </>
            )}

            {scanState === "decoding" && (
              <div className="member-portal-scan-decoding">
                <Loader2
                  size={18}
                  className="member-portal-scan-spin"
                />
                ĐANG ĐỌC ẢNH QR...
              </div>
            )}

            {scanState === "error" && (
              <>
                <button
                  type="button"
                  onClick={retry}
                  className="member-portal-scan-primary"
                >
                  <RefreshCw size={18} />
                  THỬ LẠI
                </button>

                <button
                  type="button"
                  onClick={() =>
                    imageInputRef.current?.click()
                  }
                  className="member-portal-scan-upload"
                >
                  <ImageUp size={18} />
                  CHỌN ẢNH QR KHÁC
                </button>
              </>
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

                <button
                  type="button"
                  onClick={() =>
                    imageInputRef.current?.click()
                  }
                  className="member-portal-scan-upload"
                >
                  <ImageUp size={17} />
                  TẢI ẢNH QR KHÁC
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
    <strong>Mở camera hoặc tải ảnh</strong>
    <p>
      Quét QR trực tiếp hoặc chọn ảnh QR
      từ thư viện trên điện thoại.
    </p>
  </div>

  <div>
    <span>02</span>
    <strong>Đưa QR vào hệ thống</strong>
    <p>
      Với ảnh, hãy chọn ảnh có toàn bộ mã
      QR rõ nét và không bị che khuất.
    </p>
  </div>

  <div>
    <span>03</span>
    <strong>Hoàn tất</strong>
    <p>
      Hệ thống tự đọc mã, xác thực token
      và ghi nhận điểm danh cho tài khoản.
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