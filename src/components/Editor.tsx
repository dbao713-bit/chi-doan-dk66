"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DocumentEditor = dynamic(
  () =>
    import("@onlyoffice/document-editor-react").then(
      (mod) => mod.DocumentEditor
    ),
  {
    ssr: false,
  }
);

type Props = {
  editable?: boolean;

  documentId: string;

  documentTitle?: string;

  onReady?: () => void;

  onDocumentChange?: (
    changed: boolean
  ) => void;

  onError?: (
    message: string
  ) => void;

  height?: string;

  width?: string;
};

type OnlyOfficeConfigResponse = {
  config: Record<string, unknown>;
  documentServerUrl: string;
};

export default function Editor({
  editable = true,

  documentId,

  documentTitle = "Thông báo.docx",

  onReady,

  onDocumentChange,

  onError,

  height = "calc(100vh - 180px)",

  width = "100%",
}: Props) {
  const [config, setConfig] =
    useState<Record<string, unknown> | null>(null);

  const [documentServerUrl, setDocumentServerUrl] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /**
   * =========================================================
   * LOAD ONLYOFFICE CONFIG
   * =========================================================
   *
   * Chỉ reload khi:
   *
   * - documentId thay đổi
   * - editable thay đổi
   *
   * Không reload khi documentTitle thay đổi.
   *
   * Điều này giúp tránh ONLYOFFICE bị unmount/remount
   * trong lúc người dùng đang chỉnh sửa tiêu đề.
   */

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);
        setConfig(null);

        if (!documentId) {
          throw new Error(
            "Chưa có documentId."
          );
        }

        const params = new URLSearchParams();

        params.set(
          "documentId",
          documentId
        );

        params.set(
          "documentTitle",
          documentTitle
        );

        params.set(
          "mode",
          editable
            ? "edit"
            : "view"
        );

        const response =
          await fetch(
            `/api/onlyoffice/config?${params.toString()}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          const text =
            await response.text();

          throw new Error(
            text ||
              `Không thể lấy cấu hình ONLYOFFICE (${response.status}).`
          );
        }

        const data =
          (await response.json()) as OnlyOfficeConfigResponse;

        if (
          !data ||
          !data.config ||
          !data.documentServerUrl
        ) {
          throw new Error(
            "API ONLYOFFICE không trả về đầy đủ config hoặc documentServerUrl."
          );
        }

        if (cancelled) {
          return;
        }

        setConfig(
          data.config
        );

        setDocumentServerUrl(
          data.documentServerUrl
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Không thể khởi tạo ONLYOFFICE.";

        console.error(
          "[ONLYOFFICE]",
          err
        );

        setError(message);

        onError?.(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadConfig();

    return () => {
      cancelled = true;
    };

    // Cố ý không đưa documentTitle / onError vào dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    documentId,
    editable,
  ]);

  /**
   * =========================================================
   * DOCUMENT READY
   * =========================================================
   */

  function handleDocumentReady() {
    console.log(
      "[ONLYOFFICE] Document ready:",
      documentId
    );

    onReady?.();
  }

  /**
   * =========================================================
   * DOCUMENT STATE CHANGE
   * =========================================================
   */

  function handleDocumentStateChange(
    event: unknown
  ) {
    console.log(
      "[ONLYOFFICE] DocumentStateChange:",
      event
    );

    const data =
      event as {
        data?: boolean;
      };

    const changed =
      Boolean(data?.data);

    console.log(
      "[ONLYOFFICE] changed =",
      changed
    );

    onDocumentChange?.(
      changed
    );
  }

  /**
   * =========================================================
   * ONLYOFFICE ERROR
   * =========================================================
   */

  function handleLoadComponentError(
    errorCode: number,
    errorDescription: string
  ) {
    console.error(
      "[ONLYOFFICE] Component error:",
      errorCode,
      errorDescription
    );

    let message =
      errorDescription ||
      "Không thể tải ONLYOFFICE.";

    switch (errorCode) {
      case -1:
        message =
          "ONLYOFFICE gặp lỗi không xác định khi khởi động.";
        break;

      case -2:
        message =
          "Không thể kết nối tới ONLYOFFICE Document Server.";
        break;

      case -3:
        message =
          "DocsAPI không được tải. Kiểm tra ONLYOFFICE Document Server.";
        break;
    }

    setError(message);

    onError?.(message);
  }

  /**
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border bg-white"
        style={{
          width,
          height,
        }}
      >
        <div className="flex flex-col items-center gap-3">

          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <p className="text-sm text-gray-500">
            Đang khởi động trình soạn thảo...
          </p>

        </div>
      </div>
    );
  }

  /**
   * =========================================================
   * ERROR
   * =========================================================
   */

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8"
        style={{
          width,
          height,
        }}
      >
        <div className="max-w-xl text-center">

          <h2 className="text-lg font-semibold text-red-700">
            Không thể mở trình soạn thảo
          </h2>

          <p className="mt-2 whitespace-pre-wrap text-sm text-red-600">
            {error}
          </p>

          <div className="mt-5 rounded-lg bg-white p-4 text-left text-xs text-gray-600">

            <p className="font-semibold">
              Thông tin:
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-5">

              <li>
                Document ID: {documentId}
              </li>

              <li>
                Chế độ:{" "}
                {editable
                  ? "Chỉnh sửa"
                  : "Chỉ xem"}
              </li>

              <li>
                Docker ONLYOFFICE đang chạy.
              </li>

              <li>
                API file trả về DOCX.
              </li>

              <li>
                Callback ONLYOFFICE hoạt động.
              </li>

            </ul>

          </div>

        </div>
      </div>
    );
  }

  /**
   * =========================================================
   * NO CONFIG
   * =========================================================
   */

  if (!config) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border bg-white"
        style={{
          width,
          height,
        }}
      >
        <p className="text-sm text-gray-500">
          Chưa có cấu hình ONLYOFFICE.
        </p>
      </div>
    );
  }

  /**
   * =========================================================
   * ONLYOFFICE
   * =========================================================
   */

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      <DocumentEditor
        id={
          `chiDoanDK66OnlyOfficeEditor-${documentId}`
        }

        documentServerUrl={
          documentServerUrl ||
          "http://localhost:8080"
        }

        config={config}

        width="100%"

        height="100%"

        events_onDocumentReady={() => {
          console.log(
            "[ONLYOFFICE] Document ready"
          );

          handleDocumentReady();
        }}

        events_onDocumentStateChange={(
          event
        ) => {
          handleDocumentStateChange(
            event
          );
        }}

        events_onError={(event) => {
          console.error(
            "[ONLYOFFICE] ERROR:",
            event
          );
        }}

        events_onWarning={(event) => {
          console.warn(
            "[ONLYOFFICE] WARNING:",
            event
          );
        }}

        events_onInfo={(event) => {
          console.log(
            "[ONLYOFFICE] INFO:",
            event
          );
        }}

        onLoadComponentError={
          handleLoadComponentError
        }
      />
    </div>
  );
}