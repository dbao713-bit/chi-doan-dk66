"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  isValidElement,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  X,
  Send,
  Sparkles,
  User,
  Loader2,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type MessageSource =
  | "ai"
  | "internal"
  | "supabase"
  | "cache"
  | "local_fallback"
  | "unavailable"
  | "error";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  source?: MessageSource;
  model?: string;
};

type WebsiteAIProps = {
  mode?: "public" | "admin";
};

type ApiResponse = {
  message?: string;
  error?: string;
  source?: MessageSource;
  model?: string;
};

/* =========================================================
   HELPERS
========================================================= */

function extractNodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractNodeText).join("");
  }

  if (isValidElement(node)) {
    const props = node.props as {
      children?: ReactNode;
    };

    return extractNodeText(props.children);
  }

  return "";
}

function getFriendlySource(
  source?: MessageSource,
  model?: string
) {
  if (source === "ai") {
    return model
      ? `Gemini · ${model}`
      : "AI";
  }

  if (source === "supabase") {
    return "Dữ liệu hệ thống";
  }

  if (source === "internal") {
    return "Knowledge website";
  }

  if (source === "cache") {
    return "AI · nhanh";
  }

  if (source === "local_fallback") {
    return "Thông tin website";
  }

  return "";
}

/* =========================================================
   COMPONENT
========================================================= */

export default function WebsiteAI({
  mode = "public",
}: WebsiteAIProps) {
  const initialMessage: ChatMessage = {
    role: "assistant",
    content:
      mode === "admin"
        ? "Xin chào! Mình là trợ lý AI dành cho Ban Chấp hành. Mình có thể hỗ trợ bạn về Dashboard, thành viên, thông báo, hoạt động, tài liệu, OnlyOffice và cả những câu hỏi kiến thức thông thường."
        : "Xin chào! Mình là trợ lý AI của website Chi đoàn D-K66. Bạn có thể hỏi mình về website, Chi đoàn hoặc bất kỳ chủ đề nào bạn cần hỗ trợ.",
    source: "internal",
  };

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([initialMessage]);

  const [copiedIndex, setCopiedIndex] = useState<
    number | null
  >(null);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const messagesContainerRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 30);

    return () => {
      window.clearTimeout(timer);
    };
  }, [messages, loading]);

  /* =======================================================
     FOCUS
  ======================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  /* =======================================================
     BODY SCROLL PROTECTION ON MOBILE
  ======================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    /*
     * Chỉ khóa body ở màn hình nhỏ.
     */
    if (window.innerWidth <= 600) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  async function sendMessage(
    overrideMessage?: string,
    overrideHistory?: ChatMessage[]
  ) {
    const message = (
      overrideMessage ?? input
    ).trim();

    if (!message || loading) {
      return;
    }

    const historyForRequest =
      overrideHistory ?? messages;

    const userMessage: ChatMessage = {
      role: "user",
      content: message,
    };

    /*
     * Nếu là tin nhắn mới bình thường,
     * thêm user message vào UI ngay.
     *
     * Khi regenerate, overrideHistory sẽ được dùng
     * để tránh nhân đôi lịch sử.
     */
    if (!overrideHistory) {
      setMessages((current) => [
        ...current,
        userMessage,
      ]);
      setInput("");
    }

    setLoading(true);

    /*
     * AbortController cho phép hủy request khi cần.
     */
    const controller =
      new AbortController();

    abortControllerRef.current =
      controller;

    try {
      const response = await fetch(
        "/api/ai",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message,
            history: historyForRequest,
            page:
              typeof window !== "undefined"
                ? window.location.pathname
                : "/",
            mode,
          }),
          signal: controller.signal,
        }
      );

      let data: ApiResponse = {};

      try {
        data = (await response.json()) as ApiResponse;
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Không thể kết nối với AI."
        );
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content:
          data.message ||
          "Mình chưa có câu trả lời cho câu hỏi này.",
        source: data.source,
        model: data.model,
      };

      /*
       * Trường hợp regenerate:
       * overrideHistory đã là lịch sử chuẩn,
       * nên thay trạng thái theo lịch sử đó
       * rồi thêm câu trả lời mới.
       */
      if (overrideHistory) {
        setMessages([
          ...overrideHistory,
          userMessage,
          assistantMessage,
        ]);
      } else {
        setMessages((current) => [
          ...current,
          assistantMessage,
        ]);
      }
    } catch (error) {
      /*
       * Abort không phải lỗi cần hiện cho người dùng.
       */
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "[WebsiteAI]",
        error
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Xin lỗi, mình gặp lỗi khi kết nối AI.\n\n${error.message}`
              : "Xin lỗi, hiện tại mình không thể kết nối với AI.",
          source: "error",
        },
      ]);
    } finally {
      setLoading(false);
      abortControllerRef.current =
        null;

      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }

  /* =======================================================
     STOP
  ======================================================= */

  function stopGenerating() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
  }

  /* =======================================================
     ENTER
  ======================================================= */

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!loading) {
        sendMessage();
      }
    }
  }

  /* =======================================================
     CLEAR CHAT
  ======================================================= */

  function clearChat() {
    if (loading) {
      stopGenerating();
    }

    setMessages([
      {
        role: "assistant",
        content:
          mode === "admin"
            ? "Mình đã bắt đầu lại cuộc trò chuyện. Bạn cần hỗ trợ phần nào trong khu vực quản lý?"
            : "Mình đã bắt đầu lại cuộc trò chuyện. Bạn muốn hỏi mình điều gì?",
        source: "internal",
      },
    ]);

    setInput("");

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  /* =======================================================
     COPY
  ======================================================= */

  async function copyMessage(
    content: string,
    index: number
  ) {
    try {
      await navigator.clipboard.writeText(
        content
      );

      setCopiedIndex(index);

      window.setTimeout(() => {
        setCopiedIndex((current) =>
          current === index
            ? null
            : current
        );
      }, 1800);
    } catch (error) {
      console.error(
        "[WebsiteAI copy]",
        error
      );
    }
  }

  /* =======================================================
     REGENERATE
  ======================================================= */

  function regenerateMessage(
    assistantIndex: number
  ) {
    if (loading) {
      return;
    }

    /*
     * Tìm user message ngay trước assistant.
     */
    let userIndex = -1;

    for (
      let i = assistantIndex - 1;
      i >= 0;
      i -= 1
    ) {
      if (
        messages[i].role === "user"
      ) {
        userIndex = i;
        break;
      }
    }

    if (userIndex === -1) {
      return;
    }

    const userQuestion =
      messages[userIndex].content;

    /*
     * History gửi backend phải bao gồm
     * các tin trước câu hỏi hiện tại,
     * không bao gồm assistant response cũ.
     */
    const historyBeforeQuestion =
      messages.slice(
        0,
        userIndex
      );

    setMessages(
      historyBeforeQuestion
    );

    sendMessage(
      userQuestion,
      historyBeforeQuestion
    );
  }

  /* =======================================================
     QUICK PROMPTS
  ======================================================= */

  const quickPrompts =
    mode === "admin"
      ? [
          "Dashboard có những chức năng gì?",
          "Làm sao quản lý thành viên?",
          "Làm sao tạo thông báo?",
          "OnlyOffice dùng để làm gì?",
        ]
      : [
          "Bí thư BCH là ai?",
          "Ai sáng lập website?",
          "Website này có những chức năng gì?",
          "Trường THPT Hà Trung nằm ở đâu?",
        ];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* ===================================================
          LAUNCHER
      =================================================== */}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý AI"
          className="website-ai-launcher"
        >
          <span className="website-ai-launcher-glow" />

          <span className="website-ai-launcher-icon">
            <Bot
              size={25}
              strokeWidth={2}
            />
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

      {/* ===================================================
          CHAT PANEL
      =================================================== */}

      {open && (
        <section
          className="website-ai-panel"
          aria-label="Trợ lý AI D-K66"
        >
          {/* ===============================================
              HEADER
          =============================================== */}

          <header className="website-ai-header">
            <div className="website-ai-header-left">
              <div className="website-ai-avatar">
                <Bot
                  size={23}
                  strokeWidth={2}
                />
              </div>

              <div className="website-ai-header-copy">
                <div className="website-ai-title">
                  Trợ lý AI D-K66
                </div>

                <div className="website-ai-status">
                  <span className="website-ai-status-dot" />
                  <span>
                    {mode === "admin"
                      ? "Trợ lý quản trị"
                      : "Đang sẵn sàng hỗ trợ"}
                  </span>
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
                <Trash2 size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (loading) {
                    stopGenerating();
                  }

                  setOpen(false);
                }}
                title="Đóng"
                aria-label="Đóng trợ lý AI"
                className="website-ai-header-button"
              >
                <X size={19} />
              </button>
            </div>
          </header>

          {/* ===============================================
              MESSAGE AREA
          =============================================== */}

          <div
            ref={messagesContainerRef}
            className="website-ai-messages"
          >
            {/* WELCOME */}
            {messages.length === 1 && (
              <div className="website-ai-welcome">
                <div className="website-ai-welcome-icon">
                  <Sparkles size={18} />
                </div>

                <div className="website-ai-welcome-copy">
                  <strong>
                    {mode === "admin"
                      ? "Xin chào, quản trị viên!"
                      : "Xin chào! 👋"}
                  </strong>

                  <p>
                    {mode === "admin"
                      ? "Bạn có thể hỏi mình về Dashboard, thành viên, thông báo, hoạt động, tài liệu hoặc bất kỳ vấn đề nào bạn cần hỗ trợ."
                      : "Mình có thể hỗ trợ về website Chi đoàn D-K66 và cả những câu hỏi kiến thức thông thường."}
                  </p>
                </div>
              </div>
            )}

            {/* QUICK PROMPTS */}
            {messages.length === 1 &&
              !loading && (
                <div className="website-ai-quick-section">
                  <div className="website-ai-quick-title">
                    Gợi ý cho bạn
                  </div>

                  <div className="website-ai-quick-grid">
                    {quickPrompts.map(
                      (prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="website-ai-quick-button"
                          onClick={() => {
                            sendMessage(
                              prompt
                            );
                          }}
                        >
                          <MessageCircle
                            size={14}
                          />

                          <span>
                            {prompt}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* MESSAGES */}
            {messages.map(
              (message, index) => {
                const isUser =
                  message.role ===
                  "user";

                const isLastMessage =
                  index ===
                  messages.length - 1;

                const sourceLabel =
                  getFriendlySource(
                    message.source,
                    message.model
                  );

                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={`website-ai-message ${
                      isUser
                        ? "is-user"
                        : "is-assistant"
                    }`}
                  >
                    {/* ASSISTANT AVATAR */}
                    {!isUser && (
                      <div className="website-ai-message-avatar">
                        <Bot size={15} />
                      </div>
                    )}

                    <div className="website-ai-message-column">
                      <div className="website-ai-bubble">
                        {isUser ? (
                          <div className="website-ai-user-content">
                            {message.content}
                          </div>
                        ) : (
                          <div className="website-ai-markdown">
                            <ReactMarkdown
                              remarkPlugins={[
                                remarkGfm,
                                remarkMath,
                              ]}
                              rehypePlugins={[
                                rehypeKatex,
                              ]}
                              components={{
                                h1: ({ children }) => (
                                  <h1>{children}</h1>
                                ),

                                h2: ({ children }) => (
                                  <h2>{children}</h2>
                                ),

                                h3: ({ children }) => (
                                  <h3>{children}</h3>
                                ),

                                h4: ({ children }) => (
                                  <h4>{children}</h4>
                                ),

                                p: ({ children }) => (
                                  <p>{children}</p>
                                ),

                                ul: ({ children }) => (
                                  <ul>{children}</ul>
                                ),

                                ol: ({ children }) => (
                                  <ol>{children}</ol>
                                ),

                                li: ({ children }) => (
                                  <li>{children}</li>
                                ),

                                strong: ({ children }) => (
                                  <strong>{children}</strong>
                                ),

                                em: ({ children }) => (
                                  <em>{children}</em>
                                ),

                                blockquote: ({
                                  children,
                                }) => (
                                  <blockquote>
                                    {children}
                                  </blockquote>
                                ),

                                hr: () => <hr />,

                                table: ({
                                  children,
                                }) => (
                                  <div className="website-ai-table-wrap">
                                    <table>
                                      {children}
                                    </table>
                                  </div>
                                ),

                                thead: ({
                                  children,
                                }) => (
                                  <thead>{children}</thead>
                                ),

                                tbody: ({
                                  children,
                                }) => (
                                  <tbody>{children}</tbody>
                                ),

                                tr: ({ children }) => (
                                  <tr>{children}</tr>
                                ),

                                th: ({ children }) => (
                                  <th>{children}</th>
                                ),

                                td: ({ children }) => (
                                  <td>{children}</td>
                                ),

                                a: ({
                                  href,
                                  children,
                                }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {children}
                                    <ExternalLink
                                      size={11}
                                    />
                                  </a>
                                ),

                                code: ({
                                  className,
                                  children,
                                }) => {
                                  const isBlock =
                                    Boolean(
                                      className
                                    );

                                  if (isBlock) {
                                    return (
                                      <code
                                        className={
                                          className
                                        }
                                      >
                                        {children}
                                      </code>
                                    );
                                  }

                                  return (
                                    <code>
                                      {children}
                                    </code>
                                  );
                                },

                                pre: ({
                                  children,
                                }) => {
                                  const text =
                                    extractNodeText(
                                      children
                                    );

                                  return (
                                    <div className="website-ai-code-wrapper">
                                      <div className="website-ai-code-header">
                                        <span>
                                          Code
                                        </span>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            copyMessage(
                                              text,
                                              index
                                            )
                                          }
                                        >
                                          {copiedIndex ===
                                          index ? (
                                            <>
                                              <Check
                                                size={
                                                  13
                                                }
                                              />
                                              Đã copy
                                            </>
                                          ) : (
                                            <>
                                              <Copy
                                                size={
                                                  13
                                                }
                                              />
                                              Copy
                                            </>
                                          )}
                                        </button>
                                      </div>

                                      <pre>
                                        {children}
                                      </pre>
                                    </div>
                                  );
                                },
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* META / ACTIONS */}
                      {!isUser && (
                        <div className="website-ai-message-tools">
                          <div className="website-ai-message-source">
                            {sourceLabel}
                          </div>

                          <div className="website-ai-message-actions">
                            <button
                              type="button"
                              onClick={() =>
                                copyMessage(
                                  message.content,
                                  index
                                )
                              }
                              title="Sao chép"
                              aria-label="Sao chép câu trả lời"
                              disabled={
                                loading &&
                                isLastMessage
                              }
                            >
                              {copiedIndex ===
                              index ? (
                                <Check
                                  size={13}
                                />
                              ) : (
                                <Copy
                                  size={13}
                                />
                              )}
                            </button>

                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  regenerateMessage(
                                    index
                                  )
                                }
                                title="Tạo lại câu trả lời"
                                aria-label="Tạo lại câu trả lời"
                                disabled={
                                  loading
                                }
                              >
                                <RotateCcw
                                  size={13}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* USER AVATAR */}
                    {isUser && (
                      <div className="website-ai-user-avatar">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                );
              }
            )}

            {/* LOADING */}
            {loading && (
              <div className="website-ai-message is-assistant">
                <div className="website-ai-message-avatar">
                  <Bot size={15} />
                </div>

                <div className="website-ai-message-column">
                  <div className="website-ai-bubble website-ai-loading">
                    <div className="website-ai-loading-dots">
                      <span />
                      <span />
                      <span />
                    </div>

                    <span>
                      AI đang suy nghĩ...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div
              ref={messagesEndRef}
              aria-hidden="true"
            />
          </div>

          {/* ===============================================
              INPUT
          =============================================== */}

          <div className="website-ai-input-area">
            <div className="website-ai-input-box">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === "admin"
                    ? "Hỏi về quản trị website hoặc bất kỳ điều gì..."
                    : "Bạn muốn hỏi điều gì?"
                }
                disabled={loading}
                maxLength={5000}
                aria-label="Nhập câu hỏi cho trợ lý AI"
              />

              {loading ? (
                <button
                  type="button"
                  onClick={
                    stopGenerating
                  }
                  aria-label="Dừng AI"
                  title="Dừng"
                  className="website-ai-stop"
                >
                  <span />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    sendMessage()
                  }
                  disabled={
                    !input.trim()
                  }
                  aria-label="Gửi tin nhắn"
                  title="Gửi"
                  className="website-ai-send"
                >
                  <Send
                    size={18}
                    strokeWidth={2.2}
                  />
                </button>
              )}
            </div>

            <div className="website-ai-footer">
              <span>
                AI có thể mắc lỗi. Hãy kiểm tra
                thông tin quan trọng.
              </span>

              <span>
                {input.length}/5000
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================
          STYLES
      =================================================== */}

      <style jsx global>{`
        /* =====================================================
           LAUNCHER
        ===================================================== */

        .website-ai-launcher {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 9990;

          display: flex;
          align-items: center;
          gap: 11px;

          min-width: 190px;
          padding: 10px 15px 10px 10px;

          border: 1px solid
            rgba(255, 255, 255, 0.82);

          border-radius: 19px;

          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.98),
              rgba(246, 251, 255, 0.96)
            );

          color: #123b5d;

          box-shadow:
            0 20px 55px
              rgba(15, 55, 85, 0.18),
            0 5px 18px
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
            0 25px 70px
              rgba(15, 55, 85, 0.22),
            0 7px 20px
              rgba(15, 55, 85, 0.1);
        }

        .website-ai-launcher:active {
          transform: translateY(-1px)
            scale(0.99);
        }

        .website-ai-launcher-glow {
          position: absolute;
          inset: -2px;

          border-radius: 21px;

          background:
            linear-gradient(
              135deg,
              rgba(59, 130, 246, 0.2),
              rgba(16, 185, 129, 0.12),
              rgba(255, 255, 255, 0)
            );

          z-index: -1;
          pointer-events: none;
        }

        .website-ai-launcher-icon {
          width: 44px;
          height: 44px;

          flex: 0 0 44px;

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
            0 8px 20px
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
          line-height: 1.35;
          font-weight: 600;
          color: #71808b;
        }

        .website-ai-sparkle {
          margin-left: auto;
          color: #2182bd;

          animation:
            website-ai-float 2.4s
            ease-in-out infinite;
        }

        /* =====================================================
           PANEL
        ===================================================== */

        .website-ai-panel {
          position: fixed;
          right: 24px;
          bottom: 24px;

          z-index: 9991;

          width: min(
            450px,
            calc(100vw - 32px)
          );

          height: min(
            720px,
            calc(100vh - 48px)
          );

          display: flex;
          flex-direction: column;

          overflow: hidden;

          border: 1px solid
            rgba(220, 230, 237, 0.96);

          border-radius: 26px;

          background: #ffffff;

          box-shadow:
            0 35px 100px
              rgba(15, 45, 70, 0.24),
            0 10px 30px
              rgba(15, 45, 70, 0.11);

          animation:
            website-ai-panel-in
            0.25s
            ease-out;
        }

        @keyframes website-ai-panel-in {
          from {
            opacity: 0;
            transform:
              translateY(12px)
              scale(0.985);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        /* =====================================================
           HEADER
        ===================================================== */

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

          flex-shrink: 0;
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
            0 8px 20px
              rgba(0, 0, 0, 0.13);
        }

        .website-ai-header-copy {
          min-width: 0;
        }

        .website-ai-title {
          font-size: 15px;
          font-weight: 850;
          line-height: 1.2;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .website-ai-status {
          display: flex;
          align-items: center;
          gap: 6px;

          margin-top: 5px;

          font-size: 10px;
          font-weight: 600;

          color:
            rgba(
              255,
              255,
              255,
              0.78
            );
        }

        .website-ai-status-dot {
          width: 7px;
          height: 7px;

          border-radius: 999px;

          background: #4ade80;

          box-shadow:
            0 0 0 4px
              rgba(
                74,
                222,
                128,
                0.13
              );
        }

        .website-ai-header-actions {
          display: flex;
          align-items: center;
          gap: 5px;

          flex-shrink: 0;
        }

        .website-ai-header-button {
          width: 34px;
          height: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: none;
          border-radius: 10px;

          color:
            rgba(
              255,
              255,
              255,
              0.88
            );

          background:
            rgba(
              255,
              255,
              255,
              0.1
            );

          cursor: pointer;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .website-ai-header-button:hover {
          color: white;

          background:
            rgba(
              255,
              255,
              255,
              0.18
            );

          transform: translateY(-1px);
        }

        /* =====================================================
           MESSAGE AREA
        ===================================================== */

        .website-ai-messages {
          flex: 1;
          min-height: 0;

          overflow-y: auto;
          overscroll-behavior: contain;

          padding: 18px 16px 24px;

          background:
            linear-gradient(
              180deg,
              #f7fafc 0%,
              #ffffff 100%
            );

          scrollbar-width: thin;
          scrollbar-color:
            #c5d2db
            transparent;
        }

        .website-ai-messages::-webkit-scrollbar {
          width: 7px;
        }

        .website-ai-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .website-ai-messages::-webkit-scrollbar-thumb {
          border-radius: 99px;
          background: #cbd7df;
        }

        /* =====================================================
           WELCOME
        ===================================================== */

        .website-ai-welcome {
          display: flex;
          gap: 10px;

          padding: 13px;

          margin-bottom: 14px;

          border:
            1px solid #e0ebf2;

          border-radius: 16px;

          background:
            linear-gradient(
              135deg,
              #f2f8fc,
              #f8fbfd
            );
        }

        .website-ai-welcome-icon {
          width: 35px;
          height: 35px;

          flex: 0 0 35px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          color: #1769aa;
          background: white;

          box-shadow:
            0 3px 10px
              rgba(
                20,
                70,
                100,
                0.06
              );
        }

        .website-ai-welcome-copy {
          min-width: 0;
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
          line-height: 1.6;

          color: #6d7d88;
        }

        /* =====================================================
           QUICK PROMPTS
        ===================================================== */

        .website-ai-quick-section {
          margin-bottom: 15px;
        }

        .website-ai-quick-title {
          margin-bottom: 8px;

          font-size: 10px;
          font-weight: 800;

          color: #78909d;
        }

        .website-ai-quick-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 7px;
        }

        .website-ai-quick-button {
          display: flex;
          align-items: flex-start;
          gap: 7px;

          min-width: 0;
          padding: 9px 10px;

          border:
            1px solid #dfe9ef;

          border-radius: 12px;

          background: white;

          color: #3b5667;

          font-family: inherit;
          font-size: 10px;
          font-weight: 650;
          line-height: 1.45;

          text-align: left;

          cursor: pointer;

          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .website-ai-quick-button svg {
          flex-shrink: 0;
          margin-top: 1px;
          color: #2583b8;
        }

        .website-ai-quick-button:hover {
          border-color: #a8c7d8;

          background: #f7fbfd;

          transform: translateY(-1px);
        }

        /* =====================================================
           MESSAGE
        ===================================================== */

        .website-ai-message {
          display: flex;
          align-items: flex-end;
          gap: 7px;

          margin: 13px 0;
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
          background: #e7f3fa;
        }

        .website-ai-user-avatar {
          color: white;
          background: #1769aa;
        }

        .website-ai-message-column {
          max-width: calc(100% - 35px);
          min-width: 0;
        }

        .website-ai-bubble {
          width: fit-content;
          max-width: 100%;

          padding: 11px 13px;

          border-radius: 15px;

          font-size: 12px;
          line-height: 1.7;

          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .website-ai-message.is-assistant
          .website-ai-bubble {
          color: #334b5b;

          border:
            1px solid #e4ebef;

          border-bottom-left-radius: 5px;

          background: white;

          box-shadow:
            0 4px 13px
              rgba(
                20,
                55,
                75,
                0.045
              );
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
            0 6px 18px
              rgba(
                23,
                105,
                170,
                0.16
              );
        }

        .website-ai-user-content {
          white-space: pre-wrap;
        }

        /* =====================================================
           MESSAGE TOOLS
        ===================================================== */

        .website-ai-message-tools {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;

          min-height: 22px;

          padding: 3px 3px 0 4px;
        }

        .website-ai-message-source {
          min-width: 0;

          font-size: 8px;
          font-weight: 650;

          color: #99a6ae;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .website-ai-message-actions {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .website-ai-message-actions button {
          width: 25px;
          height: 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: none;
          border-radius: 8px;

          color: #82929d;
          background: transparent;

          cursor: pointer;

          transition:
            background 0.18s ease,
            color 0.18s ease;
        }

        .website-ai-message-actions button:hover:not(
            :disabled
          ) {
          color: #1769aa;
          background: #edf5f9;
        }

        .website-ai-message-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        /* =====================================================
           MARKDOWN
        ===================================================== */

        .website-ai-markdown {
          font-size: 12px;
          line-height: 1.72;
        }

        .website-ai-markdown
          > *:first-child {
          margin-top: 0;
        }

        .website-ai-markdown
          > *:last-child {
          margin-bottom: 0;
        }

        .website-ai-markdown h1,
        .website-ai-markdown h2,
        .website-ai-markdown h3,
        .website-ai-markdown h4 {
          color: #173f5d;

          line-height: 1.35;

          font-weight: 850;
        }

        .website-ai-markdown h1 {
          margin:
            1rem 0
              0.7rem;

          font-size: 1.3rem;
        }

        .website-ai-markdown h2 {
          margin:
            0.9rem 0
              0.65rem;

          font-size: 1.12rem;
        }

        .website-ai-markdown h3 {
          margin:
            0.85rem 0
              0.55rem;

          font-size: 1rem;
        }

        .website-ai-markdown h4 {
          margin:
            0.75rem 0
              0.45rem;

          font-size: 0.95rem;
        }

        .website-ai-markdown p {
          margin:
            0.55rem
              0;
        }

        .website-ai-markdown ul,
        .website-ai-markdown ol {
          margin:
            0.65rem
              0;

          padding-left: 1.4rem;
        }

        .website-ai-markdown ul {
          list-style:
            disc;
        }

        .website-ai-markdown ol {
          list-style:
            decimal;
        }

        .website-ai-markdown li {
          margin:
            0.28rem 0;
        }

        .website-ai-markdown
          li
          > p {
          margin:
            0.25rem
              0;
        }

        .website-ai-markdown strong {
          color: #143f5f;
          font-weight: 850;
        }

        .website-ai-markdown
          blockquote {
          margin:
            0.8rem
              0;

          padding:
            0.25rem
              0
              0.25rem
              0.9rem;

          border-left:
            3px solid
            #79b4d3;

          color: #657b87;
        }

        .website-ai-markdown hr {
          margin:
            1rem
              0;

          border: none;

          border-top:
            1px solid
            #e5edf2;
        }

        .website-ai-markdown code {
          padding:
            0.15rem
              0.38rem;

          border-radius:
            0.35rem;

          background:
            #eef3f6;

          color: #134b6c;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;

          font-size:
            0.88em;
        }

        .website-ai-markdown
          a {
          display: inline-flex;
          align-items: center;
          gap: 3px;

          color: #1769aa;

          font-weight: 700;

          text-decoration:
            underline;
          text-underline-offset:
            2px;
        }

        .website-ai-markdown
          a:hover {
          color: #0f5684;
        }

        /* =====================================================
           TABLE
        ===================================================== */

        .website-ai-table-wrap {
          max-width: 100%;

          margin:
            0.8rem
              0;

          overflow-x: auto;

          border:
            1px solid #e1e9ee;

          border-radius:
            10px;
        }

        .website-ai-table-wrap
          table {
          width: 100%;

          min-width:
            320px;

          border-collapse:
            collapse;

          font-size:
            11px;
        }

        .website-ai-table-wrap
          th,
        .website-ai-table-wrap
          td {
          padding:
            8px
              9px;

          border-bottom:
            1px solid
            #e6edf1;

          text-align: left;

          vertical-align:
            top;
        }

        .website-ai-table-wrap
          th {
          color: #23485f;

          font-weight:
            800;

          background:
            #f4f8fa;
        }

        .website-ai-table-wrap
          tr:last-child
          td {
          border-bottom:
            none;
        }

        /* =====================================================
           CODE
        ===================================================== */

        .website-ai-code-wrapper {
          margin:
            0.8rem
              0;

          overflow: hidden;

          border:
            1px solid
            #1f2937;

          border-radius:
            12px;

          background:
            #111827;
        }

        .website-ai-code-header {
          min-height: 34px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding:
            0
              9px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          color:
            rgba(
              255,
              255,
              255,
              0.66
            );

          font-size:
            9px;

          font-weight:
            700;
        }

        .website-ai-code-header
          button {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding:
            5px
              7px;

          border: none;
          border-radius:
            6px;

          color:
            rgba(
              255,
              255,
              255,
              0.8
            );

          background:
            rgba(
              255,
              255,
              255,
              0.06
            );

          cursor:
            pointer;

          font-family:
            inherit;

          font-size:
            9px;

          font-weight:
            700;
        }

        .website-ai-code-header
          button:hover {
          color: white;

          background:
            rgba(
              255,
              255,
              255,
              0.12
            );
        }

        .website-ai-code-wrapper
          pre {
          margin: 0;

          overflow-x: auto;

          padding:
            12px;

          color:
            #e5e7eb;

          background:
            #111827;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;

          font-size:
            10.5px;

          line-height:
            1.65;
        }

        .website-ai-code-wrapper
          pre
          code {
          padding: 0;

          background:
            transparent;

          color:
            inherit;

          border-radius: 0;
        }

        /* =====================================================
           LOADING
        ===================================================== */

        .website-ai-loading {
          display: flex;
          align-items: center;
          gap: 9px;

          color: #71808b !important;
        }

        .website-ai-loading-dots {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .website-ai-loading-dots
          span {
          width: 5px;
          height: 5px;

          border-radius: 50%;

          background:
            #5d849b;

          animation:
            website-ai-dot
            1.15s
            infinite
            ease-in-out;
        }

        .website-ai-loading-dots
          span:nth-child(2) {
          animation-delay:
            0.15s;
        }

        .website-ai-loading-dots
          span:nth-child(3) {
          animation-delay:
            0.3s;
        }

        @keyframes website-ai-dot {
          0%,
          60%,
          100% {
            opacity: 0.3;
            transform:
              translateY(0);
          }

          30% {
            opacity: 1;
            transform:
              translateY(-3px);
          }
        }

        /* =====================================================
           INPUT
        ===================================================== */

        .website-ai-input-area {
          flex-shrink: 0;

          padding:
            12px
              13px
              10px;

          border-top:
            1px solid #e8eef2;

          background:
            white;
        }

        .website-ai-input-box {
          display: flex;
          align-items: center;
          gap: 8px;

          padding:
            5px
              5px
              5px
              13px;

          border:
            1px solid
            #dce6ec;

          border-radius:
            15px;

          background:
            #f8fafb;

          transition:
            border-color
              0.2s ease,
            box-shadow
              0.2s ease;
        }

        .website-ai-input-box:focus-within {
          border-color:
            #75afd0;

          box-shadow:
            0 0 0 3px
              rgba(
                33,
                130,
                189,
                0.08
              );
        }

        .website-ai-input-box
          input {
          flex: 1;

          min-width: 0;

          border: none;
          outline: none;

          background:
            transparent;

          color:
            #243b4a;

          font-family:
            inherit;

          font-size:
            12px;
        }

        .website-ai-input-box
          input::placeholder {
          color:
            #98a7b1;
        }

        .website-ai-input-box
          input:disabled {
          opacity:
            0.72;
        }

        .website-ai-send,
        .website-ai-stop {
          width: 36px;
          height: 36px;

          flex: 0 0 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: none;
          border-radius: 11px;

          cursor: pointer;

          transition:
            transform
              0.2s ease,
            opacity
              0.2s ease;
        }

        .website-ai-send {
          color: white;

          background:
            #1769aa;
        }

        .website-ai-send:hover:not(
            :disabled
          ) {
          transform:
            translateY(-1px);

          background:
            #0f5b91;
        }

        .website-ai-send:disabled {
          cursor:
            not-allowed;

          opacity:
            0.4;
        }

        .website-ai-stop {
          position: relative;

          color: white;

          background:
            #d94f4f;
        }

        .website-ai-stop::before {
          content: "";

          width: 11px;
          height: 11px;

          border-radius:
            3px;

          background:
            white;
        }

        .website-ai-stop:hover {
          transform:
            translateY(-1px);
        }

        .website-ai-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;

          padding:
            7px
              3px
              0;

          font-size:
            8px;

          color:
            #9aa7af;
        }

        /* =====================================================
           FLOAT ANIMATION
        ===================================================== */

        @keyframes website-ai-float {
          0%,
          100% {
            transform:
              translateY(0);
          }

          50% {
            transform:
              translateY(-2px);
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 600px) {
          .website-ai-launcher {
            right: 14px;
            bottom: 14px;

            min-width:
              auto;

            padding-right:
              12px;
          }

          .website-ai-launcher-text
            small {
            display:
              none;
          }

          .website-ai-panel {
            top: 10px;
            right: 10px;
            bottom: 10px;
            left: 10px;

            width:
              auto;

            height:
              auto;

            max-height:
              none;

            border-radius:
              21px;
          }

          .website-ai-messages {
            padding:
              15px
                12px
                18px;
          }

          .website-ai-quick-grid {
            grid-template-columns:
              1fr;
          }

          .website-ai-bubble {
            font-size:
              12px;
          }

          .website-ai-markdown {
            font-size:
              12px;
          }

          .website-ai-message-column {
            max-width:
              calc(
                100% - 34px
              );
          }

          .website-ai-footer {
            font-size:
              7.5px;
          }
        }

        @media (max-width: 390px) {
          .website-ai-launcher {
            min-width:
              0;

            padding:
              9px;
          }

          .website-ai-launcher-text {
            display:
              none;
          }

          .website-ai-sparkle {
            display:
              none;
          }

          .website-ai-launcher-icon {
            width:
              42px;

            height:
              42px;

            flex-basis:
              42px;
          }
        }

        /* =====================================================
           ACCESSIBILITY
        ===================================================== */

        .website-ai-launcher:focus-visible,
        .website-ai-header-button:focus-visible,
        .website-ai-send:focus-visible,
        .website-ai-stop:focus-visible,
        .website-ai-quick-button:focus-visible,
        .website-ai-message-actions
          button:focus-visible,
        .website-ai-code-header
          button:focus-visible {
          outline:
            2px solid
            #3c91c1;

          outline-offset:
            2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .website-ai-launcher,
          .website-ai-panel,
          .website-ai-loading-dots
            span,
          .website-ai-sparkle {
            animation:
              none !important;

            transition:
              none !important;
          }
        }
      `}</style>
    </>
  );
}