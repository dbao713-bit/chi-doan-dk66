"use client";

import {
  BookOpen,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Search,
  Star,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type ResourceType =
  | "study"
  | "reference"
  | "practice"
  | "exam"
  | "template";

type StudyResource = {
  id: number | string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  subject: string | null;
  grade_level: string | null;
  tags: string[];
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  author: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

const RESOURCE_TYPE_LABELS: Record<
  ResourceType,
  string
> = {
  study: "Tài liệu học tập",
  reference: "Tài liệu tham khảo",
  practice: "Bài tập",
  exam: "Đề thi",
  template: "Template",
};

const SUBJECT_OPTIONS = [
  "Toán",
  "Ngữ văn",
  "Tiếng Anh",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Lịch sử",
  "Địa lý",
  "Tin học",
  "GDCD",
  "Khác",
];

const GRADE_OPTIONS = [
  "K10",
  "K11",
  "K12",
  "THPT",
  "Tất cả",
];

function formatFileSize(
  bytes: number | null
) {
  if (!bytes || bytes <= 0) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "short",
    }
  ).format(new Date(value));
}

function getAccessToken() {
  return supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (
        error ||
        !data.session?.access_token
      ) {
        throw new Error(
          "Phiên đăng nhập đã hết hạn."
        );
      }

      return data.session.access_token;
    });
}

export default function PortalStudyHubPage() {
  const [resources, setResources] =
    useState<StudyResource[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState<"all" | ResourceType>(
      "all"
    );

  const [subjectFilter, setSubjectFilter] =
    useState("all");

  const [gradeFilter, setGradeFilter] =
    useState("all");

  const [downloadingId, setDownloadingId] =
    useState<string | number | null>(
      null
    );

  async function loadStudyHub() {
    try {
      setLoading(true);

      const token =
        await getAccessToken();

      const response = await fetch(
        "/api/member/study-hub",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Không thể tải Study Hub."
        );
      }

      setResources(
        Array.isArray(data.resources)
          ? data.resources.map(
              (
                resource: StudyResource
              ) => ({
                ...resource,
                tags: Array.isArray(
                  resource.tags
                )
                  ? resource.tags
                  : [],
                is_featured:
                  Boolean(
                    resource.is_featured
                  ),
              })
            )
          : []
      );
    } catch (error) {
      console.error(
        "[PORTAL STUDY HUB]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải Study Hub."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudyHub();
  }, []);

  const filteredResources =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return resources.filter(
        (resource) => {
          if (
            typeFilter !== "all" &&
            resource.resource_type !==
              typeFilter
          ) {
            return false;
          }

          if (
            subjectFilter !== "all" &&
            resource.subject !==
              subjectFilter
          ) {
            return false;
          }

          if (
            gradeFilter !== "all" &&
            resource.grade_level !==
              gradeFilter
          ) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          const text = [
            resource.title,
            resource.description,
            resource.file_name,
            resource.subject,
            resource.grade_level,
            resource.author,
            ...resource.tags,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(
            keyword
          );
        }
      );
    }, [
      resources,
      search,
      typeFilter,
      subjectFilter,
      gradeFilter,
    ]);

  const featuredResources =
    useMemo(() => {
      return resources
        .filter(
          (resource) =>
            resource.is_featured
        )
        .slice(0, 4);
    }, [resources]);

  async function handleDownload(
    resource: StudyResource
  ) {
    if (
      downloadingId !== null
    ) {
      return;
    }

    try {
      setDownloadingId(resource.id);

      const token =
        await getAccessToken();

      const response = await fetch(
        `/api/member/study-hub/download?id=${encodeURIComponent(
          String(resource.id)
        )}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Không thể tải tài liệu."
        );
      }

      if (!data.url) {
        throw new Error(
          "Không nhận được liên kết tải xuống."
        );
      }

      window.open(
        data.url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "[PORTAL STUDY HUB DOWNLOAD]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải tài liệu."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className="portal-study-page">
      <style jsx global>{`
        .portal-study-page {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(59, 130, 246, 0.1),
              transparent 27%
            ),
            radial-gradient(
              circle at 95% 3%,
              rgba(124, 58, 237, 0.1),
              transparent 27%
            ),
            linear-gradient(
              180deg,
              #f8fafc 0%,
              #f1f5f9 100%
            );
        }

        .portal-study-container {
          width: min(1400px, 100%);
          margin: 0 auto;
        }

        .portal-study-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 15px;
        }

        .portal-study-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          text-decoration: none;
          font-size: 11px;
          font-weight: 750;
        }

        .portal-study-back:hover {
          color: #4f46e5;
        }

        .portal-study-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid #e0e7ff;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .portal-study-hero {
          position: relative;
          overflow: hidden;
          padding: 27px;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.98),
              rgba(248, 250, 252, 0.95)
            );
          box-shadow:
            0 18px 45px
              rgba(15, 23, 42, 0.05);
        }

        .portal-study-hero::before {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          top: -270px;
          right: -80px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(99, 102, 241, 0.15),
              transparent 68%
            );
          pointer-events: none;
        }

        .portal-study-hero h1 {
          position: relative;
          z-index: 1;
          margin: 12px 0 0;
          color: #0f172a;
          font-size: clamp(
            30px,
            4vw,
            44px
          );
          line-height: 1;
          letter-spacing: -0.055em;
          font-weight: 850;
        }

        .portal-study-hero p {
          position: relative;
          z-index: 1;
          max-width: 760px;
          margin: 12px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.75;
        }

        .portal-study-featured {
          margin-top: 15px;
        }

        .portal-study-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .portal-study-section-head strong {
          color: #0f172a;
          font-size: 14px;
        }

        .portal-study-section-head span {
          color: #94a3b8;
          font-size: 10px;
        }

        .portal-study-featured-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .portal-study-featured-card {
          padding: 14px;
          border: 1px solid #e0e7ff;
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              #ffffff,
              #f8f7ff
            );
        }

        .portal-study-featured-card
          .portal-study-mini-label {
          color: #6366f1;
        }

        .portal-study-mini-label {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #94a3b8;
          font-size: 8px;
          font-weight: 850;
        }

        .portal-study-featured-card h3 {
          margin: 8px 0 0;
          color: #334155;
          font-size: 12px;
          line-height: 1.5;
        }

        .portal-study-featured-card p {
          overflow: hidden;
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 9px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .portal-study-toolbar {
          display: grid;
          grid-template-columns:
            minmax(250px, 1fr)
            180px
            160px
            150px;
          gap: 9px;
          margin: 15px 0;
        }

        .portal-study-search {
          position: relative;
        }

        .portal-study-search svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .portal-study-input,
        .portal-study-select {
          width: 100%;
          height: 42px;
          box-sizing: border-box;
          border: 1px solid #dbe3ec;
          border-radius: 11px;
          outline: none;
          background: #ffffff;
          color: #334155;
          font: inherit;
          font-size: 11px;
        }

        .portal-study-input {
          padding: 0 12px 0 38px;
        }

        .portal-study-select {
          padding: 0 32px 0 11px;
          appearance: none;
        }

        .portal-study-input:focus,
        .portal-study-select:focus {
          border-color: #6366f1;
          box-shadow:
            0 0 0 4px
              rgba(99, 102, 241, 0.08);
        }

        .portal-study-filter {
          position: relative;
        }

        .portal-study-chevron {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #64748b;
        }

        .portal-study-card {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 21px;
          background: #ffffff;
          box-shadow:
            0 18px 44px
              rgba(15, 23, 42, 0.045);
        }

        .portal-study-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 16px 18px;
          border-bottom: 1px solid #eef2f7;
        }

        .portal-study-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .portal-study-icon {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #eef2ff;
          color: #4f46e5;
        }

        .portal-study-title-wrap strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
        }

        .portal-study-title-wrap span {
          display: block;
          margin-top: 2px;
          color: #94a3b8;
          font-size: 9px;
        }

        .portal-study-count {
          color: #64748b;
          font-size: 10px;
          font-weight: 750;
        }

        .portal-study-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 14px;
        }

        .portal-study-resource {
          display: flex;
          flex-direction: column;
          min-height: 255px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 17px;
          background:
            linear-gradient(
              145deg,
              #ffffff,
              #fafbff
            );
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .portal-study-resource:hover {
          transform: translateY(-2px);
          border-color: #c7d2fe;
          box-shadow:
            0 14px 30px
              rgba(79, 70, 229, 0.07);
        }

        .portal-study-resource-featured {
          border-color: #fde68a;
        }

        .portal-study-resource-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .portal-study-type {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 8px;
          font-weight: 850;
        }

        .portal-study-featured-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #b45309;
          font-size: 8px;
          font-weight: 850;
        }

        .portal-study-resource h3 {
          margin: 11px 0 0;
          color: #0f172a;
          font-size: 14px;
          line-height: 1.45;
        }

        .portal-study-resource-description {
          min-height: 35px;
          margin: 6px 0 11px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.6;
        }

        .portal-study-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .portal-study-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 7px;
          border: 1px solid #eef2f7;
          border-radius: 8px;
          background: #f8fafc;
          color: #64748b;
          font-size: 8px;
          font-weight: 700;
        }

        .portal-study-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 9px;
        }

        .portal-study-tag {
          padding: 4px 6px;
          border-radius: 7px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 7px;
          font-weight: 750;
        }

        .portal-study-spacer {
          flex: 1;
        }

        .portal-study-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 9px;
          margin-top: 13px;
          padding-top: 11px;
          border-top: 1px solid #eef2f7;
        }

        .portal-study-file {
          min-width: 0;
        }

        .portal-study-file strong {
          display: block;
          overflow: hidden;
          color: #64748b;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .portal-study-file span {
          display: block;
          margin-top: 2px;
          color: #94a3b8;
          font-size: 8px;
        }

        .portal-study-download {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 33px;
          padding: 0 10px;
          flex-shrink: 0;
          border: 0;
          border-radius: 9px;
          color: #ffffff;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );
          font-size: 9px;
          font-weight: 850;
          cursor: pointer;
          box-shadow:
            0 8px 18px
              rgba(79, 70, 229, 0.16);
        }

        .portal-study-download:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .portal-study-loading,
        .portal-study-empty {
          min-height: 330px;
          display: grid;
          place-items: center;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
        }

        .portal-study-empty-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .portal-study-empty-icon {
          width: 60px;
          height: 60px;
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          border-radius: 18px;
          background: #eef2ff;
          color: #6366f1;
        }

        .portal-study-empty-inner strong {
          margin-bottom: 4px;
          color: #334155;
          font-size: 13px;
        }

        @media (max-width: 1100px) {
          .portal-study-featured-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .portal-study-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .portal-study-toolbar {
            grid-template-columns:
              minmax(200px, 1fr)
              1fr
              1fr;
          }
        }

        @media (max-width: 700px) {
          .portal-study-page {
            padding: 13px 10px;
          }

          .portal-study-hero {
            padding: 20px;
            border-radius: 19px;
          }

          .portal-study-hero h1 {
            font-size: 31px;
          }

          .portal-study-featured-grid,
          .portal-study-grid {
            grid-template-columns: 1fr;
          }

          .portal-study-toolbar {
            grid-template-columns: 1fr 1fr;
          }

          .portal-study-search {
            grid-column: span 2;
          }

          .portal-study-topbar {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="portal-study-container">
        <div className="portal-study-topbar">
          <Link
            href="/portal"
            className="portal-study-back"
          >
            ← Quay lại cổng đoàn viên
          </Link>

          <span className="portal-study-kicker">
            <BookOpen size={12} />
            STUDY HUB · D-K66
          </span>
        </div>

        <section className="portal-study-hero">
          <h1>
            Study Hub
          </h1>

          <p>
            Kho học tập dành riêng cho đoàn viên
            D-K66. Tìm tài liệu theo môn, khối,
            loại tài liệu và tải xuống trực tiếp.
          </p>
        </section>

        {featuredResources.length >
          0 && (
          <section className="portal-study-featured">
            <div className="portal-study-section-head">
              <strong>
                Tài liệu nổi bật
              </strong>

              <span>
                BCH lựa chọn
              </span>
            </div>

            <div className="portal-study-featured-grid">
              {featuredResources.map(
                (resource) => (
                  <article
                    key={resource.id}
                    className="portal-study-featured-card"
                  >
                    <div className="portal-study-mini-label">
                      <Star
                        size={10}
                        fill="currentColor"
                      />
                      NỔI BẬT
                    </div>

                    <h3>
                      {resource.title}
                    </h3>

                    <p>
                      {resource.description ||
                        getResourceTypeLabel(
                          resource.resource_type
                        )}
                    </p>
                  </article>
                )
              )}
            </div>
          </section>
        )}

        <section className="portal-study-toolbar">
          <div className="portal-study-search">
            <Search size={16} />

            <input
              className="portal-study-input"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Tìm tài liệu, môn, tag..."
            />
          </div>

          <div className="portal-study-filter">
            <select
              className="portal-study-select"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value as
                    | "all"
                    | ResourceType
                )
              }
            >
              <option value="all">
                Tất cả loại
              </option>

              {Object.entries(
                RESOURCE_TYPE_LABELS
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={15}
              className="portal-study-chevron"
            />
          </div>

          <div className="portal-study-filter">
            <select
              className="portal-study-select"
              value={subjectFilter}
              onChange={(event) =>
                setSubjectFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                Tất cả môn
              </option>

              {SUBJECT_OPTIONS.map(
                (subject) => (
                  <option
                    key={subject}
                    value={subject}
                  >
                    {subject}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={15}
              className="portal-study-chevron"
            />
          </div>

          <div className="portal-study-filter">
            <select
              className="portal-study-select"
              value={gradeFilter}
              onChange={(event) =>
                setGradeFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                Tất cả khối
              </option>

              {GRADE_OPTIONS.map(
                (grade) => (
                  <option
                    key={grade}
                    value={grade}
                  >
                    {grade}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={15}
              className="portal-study-chevron"
            />
          </div>
        </section>

        <section className="portal-study-card">
          <div className="portal-study-card-header">
            <div className="portal-study-title-wrap">
              <div className="portal-study-icon">
                <BookOpen size={17} />
              </div>

              <div>
                <strong>
                  Kho tài liệu học tập
                </strong>

                <span>
                  Tài liệu đã được BCH xuất bản
                </span>
              </div>
            </div>

            <span className="portal-study-count">
              {filteredResources.length} tài liệu
            </span>
          </div>

          {loading ? (
            <div className="portal-study-loading">
              <Loader2
                size={27}
                className="animate-spin"
              />
            </div>
          ) : filteredResources.length ===
            0 ? (
            <div className="portal-study-empty">
              <div className="portal-study-empty-inner">
                <div className="portal-study-empty-icon">
                  <BookOpen size={26} />
                </div>

                <strong>
                  Không tìm thấy tài liệu
                </strong>

                <span>
                  Hãy thử thay đổi từ khóa hoặc
                  bộ lọc.
                </span>
              </div>
            </div>
          ) : (
            <div className="portal-study-grid">
              {filteredResources.map(
                (resource) => (
                  <article
                    key={resource.id}
                    className={`portal-study-resource ${
                      resource.is_featured
                        ? "portal-study-resource-featured"
                        : ""
                    }`}
                  >
                    <div className="portal-study-resource-top">
                      <span className="portal-study-type">
                        <BookOpen size={10} />
                        {
                          RESOURCE_TYPE_LABELS[
                            resource
                              .resource_type
                          ]
                        }
                      </span>

                      {resource.is_featured && (
                        <span className="portal-study-featured-label">
                          <Star
                            size={10}
                            fill="currentColor"
                          />
                          Nổi bật
                        </span>
                      )}
                    </div>

                    <h3>
                      {resource.title}
                    </h3>

                    <p className="portal-study-resource-description">
                      {resource.description ||
                        "Tài liệu học tập của Chi đoàn D-K66."}
                    </p>

                    <div className="portal-study-meta">
                      {resource.subject && (
                        <span className="portal-study-chip">
                          <BookOpen
                            size={10}
                          />
                          {resource.subject}
                        </span>
                      )}

                      {resource.grade_level && (
                        <span className="portal-study-chip">
                          Khối:{" "}
                          {resource.grade_level}
                        </span>
                      )}

                      <span className="portal-study-chip">
                        {formatFileSize(
                          resource.file_size
                        )}
                      </span>
                    </div>

                    {resource.tags.length >
                      0 && (
                      <div className="portal-study-tags">
                        {resource.tags.map(
                          (tag) => (
                            <span
                              key={tag}
                              className="portal-study-tag"
                            >
                              <Tag
                                size={8}
                              />{" "}
                              {tag}
                            </span>
                          )
                        )}
                      </div>
                    )}

                    <div className="portal-study-spacer" />

                    <div className="portal-study-footer">
                      <div className="portal-study-file">
                        <strong>
                          {resource.file_name ||
                            "Tài liệu"}
                        </strong>

                        <span>
                          {resource.author ||
                            "BCH"}{" "}
                          ·{" "}
                          {formatDate(
                            resource.updated_at
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="portal-study-download"
                        onClick={() =>
                          void handleDownload(
                            resource
                          )
                        }
                        disabled={
                          downloadingId !==
                          null
                        }
                      >
                        {downloadingId ===
                        resource.id ? (
                          <Loader2
                            size={12}
                            className="animate-spin"
                          />
                        ) : (
                          <Download
                            size={12}
                          />
                        )}

                        Tải xuống
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function getResourceTypeLabel(
  type: ResourceType
) {
  return (
    RESOURCE_TYPE_LABELS[type] ||
    "Tài liệu"
  );
}