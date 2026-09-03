"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  X,
  Send,
  Sparkles,
  User,
  Loader2,
  Minimize2,
} from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type WebsiteAIProps = {
  mode?: "public" | "admin";
};

export default function WebsiteAI({
  mode = "public",
}: WebsiteAIProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        mode === "admin"
          ? "Xin chào! Mình là trợ lý AI dành cho Ban Chấp hành. Mình có thể hướng dẫn bạn sử dụng khu vực quản lý website."
          : "Xin chào! Mình là trợ lý AI của website Chi đoàn D-K66. Bạn có thể hỏi mình bất cứ điều gì về website.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [open]);

  async function sendMessage() {
    const message = input.trim();

    if (!message || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: message,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: messages,
          page: window.location.pathname,
          mode,
        }),
      });

      const data = await response.json();

if (!response.ok) {
  if (data?.message) {
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: data.message,
      },
    ]);

    return;
  }

  throw new Error(
    data?.error ||
      "Không thể kết nối với AI."
  );
}

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data?.message ||
            "Mình chưa có câu trả lời cho câu hỏi này.",
        },
      ]);
    } catch (error) {
      console.error("[WebsiteAI]", error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Xin lỗi, đã xảy ra lỗi: ${error.message}`
              : "Xin lỗi, hiện tại mình không thể kết nối với AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([
      {
        role: "assistant",
        content:
          mode === "admin"
            ? "Mình đã bắt đầu lại cuộc trò chuyện. Bạn cần hướng dẫn phần nào trong khu vực quản lý?"
            : "Mình đã bắt đầu lại cuộc trò chuyện. Bạn muốn tìm hiểu điều gì trên website?",
      },
    ]);
  }

  return (
    <>
      {/* =====================================================
          NÚT AI GÓC PHẢI BÊN DƯỚI
      ===================================================== */}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý AI"
          className="website-ai-launcher"
        >
          <span className="website-ai-launcher-glow" />

          <span className="website-ai-launcher-icon">
            <Bot size={25} strokeWidth={2} />
          </span>

          <span className="website-ai-launcher-text">
            <strong>Trợ lý AI</strong>
            <small>
              {mode === "admin"
                ? "Hỗ trợ quản trị"
                : "Hỏi mình bất cứ điều gì"}
            </small>
          </span>

          <Sparkles
            className="website-ai-sparkle"
            size={16}
          />
        </button>
      )}

      {/* =====================================================
          KHUNG CHAT
      ===================================================== */}

      {open && (
        <div className="website-ai-panel">
          {/* HEADER */}

          <div className="website-ai-header">
            <div className="website-ai-header-left">
              <div className="website-ai-avatar">
                <Bot
                  size={23}
                  strokeWidth={2}
                />
              </div>

              <div>
                <div className="website-ai-title">
                  Trợ lý AI D-K66
                </div>

                <div className="website-ai-status">
                  <span />
                  {mode === "admin"
                    ? "Trợ lý quản trị"
                    : "Đang sẵn sàng hỗ trợ"}
                </div>
              </div>
            </div>

            <div className="website-ai-header-actions">
              <button
                type="button"
                onClick={clearChat}
                title="Cuộc trò chuyện mới"
                aria-label="Cuộc trò chuyện mới"
                className="website-ai-header-button"
              >
                <Minimize2 size={17} />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Đóng"
                aria-label="Đóng trợ lý AI"
                className="website-ai-header-button"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          {/* MESSAGE AREA */}

          <div className="website-ai-messages">
            <div className="website-ai-welcome">
              <div className="website-ai-welcome-icon">
                <Sparkles size={18} />
              </div>

              <div>
                <strong>
                  {mode === "admin"
                    ? "Xin chào, quản trị viên!"
                    : "Xin chào! 👋"}
                </strong>

                <p>
                  {mode === "admin"
                    ? "Hãy hỏi mình cách quản lý thông báo, thành viên, tài liệu, hoạt động hoặc các chức năng khác."
                    : "Mình có thể giúp bạn tìm hiểu và sử dụng website Chi đoàn D-K66."}
                </p>
              </div>
            </div>

            {messages.map(
              (message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`website-ai-message ${
                    message.role === "user"
                      ? "is-user"
                      : "is-assistant"
                  }`}
                >
                  {message.role ===
                    "assistant" && (
                    <div className="website-ai-message-avatar">
                      <Bot size={15} />
                    </div>
                  )}

                  <div className="website-ai-bubble">
                    {message.content}
                  </div>

                  {message.role === "user" && (
                    <div className="website-ai-user-avatar">
                      <User size={15} />
                    </div>
                  )}
                </div>
              )
            )}

            {loading && (
              <div className="website-ai-message is-assistant">
                <div className="website-ai-message-avatar">
                  <Bot size={15} />
                </div>

                <div className="website-ai-bubble website-ai-loading">
                  <Loader2
                    size={16}
                    className="website-ai-spinner"
                  />

                  <span>
                    AI đang suy nghĩ...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}

          <div className="website-ai-input-area">
            <div className="website-ai-input-box">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === "admin"
                    ? "Hỏi về cách quản trị website..."
                    : "Bạn muốn hỏi điều gì?"
                }
                disabled={loading}
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={
                  loading ||
                  !input.trim()
                }
                aria-label="Gửi tin nhắn"
                className="website-ai-send"
              >
                {loading ? (
                  <Loader2
                    size={18}
                    className="website-ai-spinner"
                  />
                ) : (
                  <Send
                    size={18}
                    strokeWidth={2.2}
                  />
                )}
              </button>
            </div>

            <div className="website-ai-footer">
              <span>
                AI có thể mắc lỗi. Hãy kiểm tra
                thông tin quan trọng.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          STYLE RIÊNG CỦA AI
      ===================================================== */}

      <style jsx global>{`
        .website-ai-launcher {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 9990;

          display: flex;
          align-items: center;
          gap: 11px;

          min-width: 178px;
          padding: 10px 15px 10px 10px;

          border: 1px solid
            rgba(255, 255, 255, 0.75);
          border-radius: 18px;

          background: rgba(
            255,
            255,
            255,
            0.94
          );

          color: #123b5d;

          box-shadow:
            0 15px 45px
              rgba(15, 55, 85, 0.18),
            0 3px 10px
              rgba(15, 55, 85, 0.08);

          backdrop-filter: blur(18px);

          cursor: pointer;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .website-ai-launcher:hover {
          transform: translateY(-4px);

          box-shadow:
            0 22px 55px
              rgba(15, 55, 85, 0.22),
            0 5px 15px
              rgba(15, 55, 85, 0.1);
        }

        .website-ai-launcher-glow {
          position: absolute;
          inset: -2px;

          border-radius: 20px;

          background: linear-gradient(
            135deg,
            rgba(59, 130, 246, 0.18),
            rgba(16, 185, 129, 0.12),
            rgba(255, 255, 255, 0)
          );

          z-index: -1;
          pointer-events: none;
        }

        .website-ai-launcher-icon {
          width: 43px;
          height: 43px;

          flex: 0 0 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 14px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #1769aa,
              #2486c7
            );

          box-shadow:
            0 7px 18px
              rgba(23, 105, 170, 0.28);
        }

        .website-ai-launcher-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;

          text-align: left;
        }

        .website-ai-launcher-text strong {
          font-size: 13px;
          line-height: 1.2;
          font-weight: 850;
          color: #123b5d;
        }

        .website-ai-launcher-text small {
          font-size: 9px;
          line-height: 1.3;
          font-weight: 600;
          color: #71808b;
        }

        .website-ai-sparkle {
          margin-left: auto;
          color: #2182bd;
        }

        .website-ai-panel {
          position: fixed;
          right: 24px;
          bottom: 24px;

          z-index: 9991;

          width: min(
            420px,
            calc(100vw - 32px)
          );

          height: min(
            680px,
            calc(100vh - 48px)
          );

          display: flex;
          flex-direction: column;

          overflow: hidden;

          border: 1px solid
            rgba(218, 228, 235, 0.95);

          border-radius: 25px;

          background: #ffffff;

          box-shadow:
            0 30px 90px
              rgba(15, 45, 70, 0.24),
            0 8px 25px
              rgba(15, 45, 70, 0.1);
        }

        .website-ai-header {
          min-height: 78px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 14px 15px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #0b4d78,
              #126da1
            );
        }

        .website-ai-header-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .website-ai-avatar {
          width: 45px;
          height: 45px;

          flex: 0 0 45px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 15px;

          color: #0d5b8d;

          background: white;

          box-shadow:
            0 7px 20px
              rgba(0, 0, 0, 0.12);
        }

        .website-ai-title {
          font-size: 15px;
          font-weight: 850;
          line-height: 1.2;
        }

        .website-ai-status {
          display: flex;
          align-items: center;
          gap: 6px;

          margin-top: 4px;

          font-size: 10px;
          font-weight: 600;

          color: rgba(
            255,
            255,
            255,
            0.78
          );
        }

        .website-ai-status span {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #4ade80;

          box-shadow:
            0 0 0 4px
              rgba(74, 222, 128, 0.13);
        }

        .website-ai-header-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .website-ai-header-button {
          width: 34px;
          height: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: none;
          border-radius: 10px;

          color: rgba(
            255,
            255,
            255,
            0.85
          );

          background: rgba(
            255,
            255,
            255,
            0.1
          );

          cursor: pointer;

          transition:
            background 0.2s ease,
            color 0.2s ease;
        }

        .website-ai-header-button:hover {
          color: white;

          background: rgba(
            255,
            255,
            255,
            0.18
          );
        }

        .website-ai-messages {
          flex: 1;

          overflow-y: auto;

          padding: 18px 16px 20px;

          background:
            linear-gradient(
              180deg,
              #f7fafc 0%,
              #ffffff 100%
            );

          scrollbar-width: thin;
        }

        .website-ai-welcome {
          display: flex;
          gap: 10px;

          padding: 13px;

          margin-bottom: 16px;

          border: 1px solid #e4edf3;
          border-radius: 15px;

          background: #f4f9fc;
        }

        .website-ai-welcome-icon {
          width: 34px;
          height: 34px;

          flex: 0 0 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          color: #1769aa;
          background: white;
        }

        .website-ai-welcome strong {
          display: block;

          font-size: 12px;
          font-weight: 850;

          color: #173f5d;
        }

        .website-ai-welcome p {
          margin: 4px 0 0;

          font-size: 10.5px;
          line-height: 1.55;

          color: #6d7d88;
        }

        .website-ai-message {
          display: flex;
          align-items: flex-end;
          gap: 7px;

          margin: 11px 0;
        }

        .website-ai-message.is-user {
          justify-content: flex-end;
        }

        .website-ai-message-avatar,
        .website-ai-user-avatar {
          width: 28px;
          height: 28px;

          flex: 0 0 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;
        }

        .website-ai-message-avatar {
          color: #1769aa;
          background: #e8f3fa;
        }

        .website-ai-user-avatar {
          color: white;
          background: #1769aa;
        }

        .website-ai-bubble {
          max-width: 78%;

          padding: 10px 12px;

          border-radius: 14px;

          font-size: 12px;
          line-height: 1.6;

          white-space: pre-wrap;
          word-break: break-word;
        }

        .website-ai-message.is-assistant
          .website-ai-bubble {
          color: #334b5b;

          border:
            1px solid #e4ebef;

          border-bottom-left-radius: 5px;

          background: white;

          box-shadow:
            0 3px 10px
              rgba(20, 55, 75, 0.04);
        }

        .website-ai-message.is-user
          .website-ai-bubble {
          color: white;

          border-bottom-right-radius: 5px;

          background:
            linear-gradient(
              135deg,
              #1769aa,
              #2182bd
            );

          box-shadow:
            0 5px 15px
              rgba(23, 105, 170, 0.15);
        }

        .website-ai-loading {
          display: flex;
          align-items: center;
          gap: 7px;

          color: #71808b !important;
        }

        .website-ai-spinner {
          animation:
            website-ai-spin 0.9s
            linear infinite;
        }

        @keyframes website-ai-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .website-ai-input-area {
          padding: 12px 13px 10px;

          border-top: 1px solid #e9eef2;

          background: white;
        }

        .website-ai-input-box {
          display: flex;
          align-items: center;
          gap: 8px;

          padding: 5px 5px 5px 13px;

          border: 1px solid #dce6ec;
          border-radius: 15px;

          background: #f8fafb;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .website-ai-input-box:focus-within {
          border-color: #75afd0;

          box-shadow:
            0 0 0 3px
              rgba(
                33,
                130,
                189,
                0.08
              );
        }

        .website-ai-input-box input {
          flex: 1;

          min-width: 0;

          border: none;
          outline: none;

          background: transparent;

          color: #243b4a;

          font-family: inherit;
          font-size: 12px;
        }

        .website-ai-input-box input::placeholder {
          color: #98a7b1;
        }

        .website-ai-send {
          width: 36px;
          height: 36px;

          flex: 0 0 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: none;
          border-radius: 11px;

          color: white;

          background: #1769aa;

          cursor: pointer;

          transition:
            transform 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease;
        }

        .website-ai-send:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #0f5b91;
        }

        .website-ai-send:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        .website-ai-footer {
          padding: 7px 3px 0;

          text-align: center;

          font-size: 8px;

          color: #9aa7af;
        }

        @media (max-width: 600px) {
          .website-ai-launcher {
            right: 14px;
            bottom: 14px;

            min-width: auto;

            padding-right: 12px;
          }

          .website-ai-launcher-text small {
            display: none;
          }

          .website-ai-panel {
            right: 10px;
            bottom: 10px;

            width: calc(100vw - 20px);
            height: calc(100vh - 20px);

            border-radius: 21px;
          }
        }
      `}</style>
    </>
  );
}