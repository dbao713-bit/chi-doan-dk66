"use client";

import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

type Props = {
  announcementId: string;
};

export default function AnnouncementDocument({
  announcementId,
}: Props) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      try {
        setLoading(true);
        setError(null);

        const documentId =
          `announcement-${announcementId}`;

        const url =
          `/api/onlyoffice/file/${encodeURIComponent(
            documentId
          )}`;

        console.log(
          "[DOCX VIEWER] Loading:",
          url
        );

        const response =
          await fetch(url, {
            cache: "no-store",
          });

        console.log(
          "[DOCX VIEWER] HTTP:",
          response.status
        );

        if (!response.ok) {
          const text =
            await response.text();

          throw new Error(
            `Không thể tải DOCX. HTTP ${response.status}: ${text}`
          );
        }

        const blob =
          await response.blob();

        console.log(
          "[DOCX VIEWER] Blob size:",
          blob.size
        );

        console.log(
          "[DOCX VIEWER] Blob type:",
          blob.type
        );

        if (blob.size === 0) {
          throw new Error(
            "File DOCX rỗng."
          );
        }

        if (cancelled) {
          return;
        }

        /*
         * Container luôn được render trong JSX,
         * kể cả khi loading = true.
         */

        const container =
          containerRef.current;

        if (!container) {
          throw new Error(
            "Không tìm thấy vùng hiển thị DOCX."
          );
        }

        container.innerHTML = "";

        console.log(
          "[DOCX VIEWER] Rendering DOCX..."
        );

        console.log(
          "[DOCX VIEWER] BEFORE renderAsync"
        );

        await renderAsync(
  blob,
  container,
  undefined,
  {
    className: "docx",
    inWrapper: true,

    // Cho phép docx-preview xử lý ngắt trang
    breakPages: true,
    ignoreLastRenderedPageBreak: false,

    ignoreWidth: false,
    ignoreHeight: false,
    ignoreFonts: false,

    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,

    experimental: false,

    trimXmlDeclaration: true,

    useBase64URL: true,

    renderChanges: false,
  }
);

        console.log(
          "[DOCX VIEWER] AFTER renderAsync"
        );

        console.log(
          "[DOCX VIEWER] Children:",
          container.children.length
        );

        console.log(
          "[DOCX VIEWER] HTML length:",
          container.innerHTML.length
        );

        if (
          container.children.length === 0
        ) {
          throw new Error(
            "docx-preview không tạo được trang Word."
          );
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        console.error(
          "[DOCX VIEWER ERROR]",
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể hiển thị DOCX."
          );

          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [announcementId]);

  return (
    <div className="announcement-document">

      {loading && (
        <div className="announcement-document-loading">
          <div className="announcement-document-spinner" />

          <p>
            Đang tải văn bản...
          </p>
        </div>
      )}

      {error && (
        <div className="announcement-document-error">
          <h3>
            Không thể hiển thị văn bản
          </h3>

          <p>
            {error}
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        className="docx-container"
        style={{
          display:
            loading || error
              ? "none"
              : "block",
        }}
      />

    </div>
  );
}