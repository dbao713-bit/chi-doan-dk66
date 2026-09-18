"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Star,
  Tag,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
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
  file_path: string | null;
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
  "Khối 10",
  "Khối 11",
  "Khối 12",
  "HSG",
  "Tất cả",
];

const ACCEPTED_EXTENSIONS =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.zip";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function getResourceTypeLabel(
  type: ResourceType
) {
  return (
    RESOURCE_TYPE_LABELS[type] ||
    "Tài liệu"
  );
}

export default function StudyHubDashboardPage() {
  const [resources, setResources] = useState<
    StudyResource[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] = useState("");

  const [resourceFilter, setResourceFilter] =
    useState<"all" | ResourceType>("all");

  const [subjectFilter, setSubjectFilter] =
    useState("all");

  const [gradeFilter, setGradeFilter] =
    useState("all");

  const [editingResource, setEditingResource] =
    useState<StudyResource | null>(null);

  const [saving, setSaving] = useState(false);

  const [editResourceType, setEditResourceType] =
    useState<ResourceType>("study");

  const [editSubject, setEditSubject] =
    useState("");

  const [editGradeLevel, setEditGradeLevel] =
    useState("");

  const [editTags, setEditTags] =
    useState<string[]>([]);

  const [tagInput, setTagInput] = useState("");

  const [editFeatured, setEditFeatured] =
    useState(false);

  const [editPublished, setEditPublished] =
    useState(true);

  const [uploadOpen, setUploadOpen] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [dragActive, setDragActive] =
    useState(false);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [uploadTitle, setUploadTitle] =
    useState("");

  const [uploadDescription, setUploadDescription] =
    useState("");

  const [uploadResourceType, setUploadResourceType] =
    useState<ResourceType>("study");

  const [uploadSubject, setUploadSubject] =
    useState("");

  const [uploadGradeLevel, setUploadGradeLevel] =
    useState("");

  const [uploadTags, setUploadTags] =
    useState("");

  const [uploadFeatured, setUploadFeatured] =
    useState(false);

  const [uploadPublished, setUploadPublished] =
    useState(true);

  async function loadResources(
    showRefresh = false
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/study-hub",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Không thể tải Study Hub."
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.resources)
        ? data.resources
        : [];

      setResources(
        list.map(
          (resource: StudyResource) => ({
            ...resource,
            tags: Array.isArray(resource.tags)
              ? resource.tags
              : [],
            is_featured:
              Boolean(resource.is_featured),
            is_published:
              resource.is_published !== false,
          })
        )
      );
    } catch (error) {
      console.error(
        "[STUDY HUB LOAD]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải Study Hub."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadResources();
  }, []);

  const filteredResources = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return resources.filter((resource) => {
      if (
        resourceFilter !== "all" &&
        resource.resource_type !==
          resourceFilter
      ) {
        return false;
      }

      if (
        subjectFilter !== "all" &&
        resource.subject !== subjectFilter
      ) {
        return false;
      }

      if (
        gradeFilter !== "all" &&
        resource.grade_level !== gradeFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        resource.title,
        resource.description,
        resource.file_name,
        resource.author,
        resource.subject,
        resource.grade_level,
        ...(resource.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(
        normalizedSearch
      );
    });
  }, [
    resources,
    search,
    resourceFilter,
    subjectFilter,
    gradeFilter,
  ]);

  const statistics = useMemo(() => {
    return {
      total: resources.length,

      study: resources.filter(
        (resource) =>
          resource.resource_type === "study"
      ).length,

      reference: resources.filter(
        (resource) =>
          resource.resource_type ===
          "reference"
      ).length,

      featured: resources.filter(
        (resource) =>
          resource.is_featured
      ).length,
    };
  }, [resources]);

  function openEditor(
    resource: StudyResource
  ) {
    setEditingResource(resource);

    setEditResourceType(
      resource.resource_type || "study"
    );

    setEditSubject(
      resource.subject || ""
    );

    setEditGradeLevel(
      resource.grade_level || ""
    );

    setEditTags(
      Array.isArray(resource.tags)
        ? resource.tags
        : []
    );

    setEditFeatured(
      Boolean(resource.is_featured)
    );

    setEditPublished(
      resource.is_published !== false
    );

    setTagInput("");
  }

  function closeEditor() {
    if (saving) {
      return;
    }

    setEditingResource(null);
    setTagInput("");
  }

  function addTag() {
    const value = tagInput.trim();

    if (!value) {
      return;
    }

    if (
      editTags.some(
        (tag) =>
          tag.toLowerCase() ===
          value.toLowerCase()
      )
    ) {
      setTagInput("");
      return;
    }

    if (editTags.length >= 20) {
      toast.error(
        "Tối đa 20 tag cho một tài liệu."
      );
      return;
    }

    setEditTags((current) => [
      ...current,
      value,
    ]);

    setTagInput("");
  }

  function removeTag(tag: string) {
    setEditTags((current) =>
      current.filter(
        (item) => item !== tag
      )
    );
  }

  function handleTagKeyDown(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter" ||
      event.key === ","
    ) {
      event.preventDefault();
      addTag();
    }
  }

  async function saveResource() {
    if (!editingResource || saving) {
      return;
    }

    try {
      setSaving(true);

      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/study-hub",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: editingResource.id,
            resourceType: editResourceType,
            subject:
              editSubject.trim() || null,
            gradeLevel:
              editGradeLevel.trim() || null,
            tags: editTags,
            isFeatured: editFeatured,
            isPublished: editPublished,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Không thể cập nhật tài liệu."
        );
      }

      toast.success(
        "Đã cập nhật tài liệu."
      );

      setEditingResource(null);

      await loadResources(true);
    } catch (error) {
      console.error(
        "[STUDY HUB SAVE]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể lưu thay đổi."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetUploadForm() {
    setSelectedFile(null);
    setUploadTitle("");
    setUploadDescription("");
    setUploadResourceType("study");
    setUploadSubject("");
    setUploadGradeLevel("");
    setUploadTags("");
    setUploadFeatured(false);
    setUploadPublished(true);
    setDragActive(false);
  }

  function closeUploadModal() {
    if (uploading) {
      return;
    }

    setUploadOpen(false);
    resetUploadForm();
  }

  function handleSelectFile(
    file: File | null
  ) {
    if (!file) {
      return;
    }

    if (file.size <= 0) {
      toast.error(
        "File rỗng hoặc không hợp lệ."
      );
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      toast.error(
        "Dung lượng file tối đa là 30MB."
      );
      return;
    }

    setSelectedFile(file);

    if (!uploadTitle.trim()) {
      const name = file.name.replace(
        /\.[^/.]+$/,
        ""
      );

      setUploadTitle(name);
    }
  }

  function handleDrop(
    event: DragEvent<HTMLLabelElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    const file =
      event.dataTransfer.files?.[0] || null;

    handleSelectFile(file);
  }

  async function uploadResource() {
    if (uploading) {
      return;
    }

    if (!selectedFile) {
      toast.error(
        "Vui lòng chọn tài liệu."
      );
      return;
    }

    if (!uploadTitle.trim()) {
      toast.error(
        "Vui lòng nhập tên tài liệu."
      );
      return;
    }

    try {
      setUploading(true);

      const token = await getAccessToken();

      const formData = new FormData();

      formData.append(
        "file",
        selectedFile
      );

      formData.append(
        "title",
        uploadTitle.trim()
      );

      formData.append(
        "description",
        uploadDescription.trim()
      );

      formData.append(
        "resourceType",
        uploadResourceType
      );

      formData.append(
        "subject",
        uploadSubject
      );

      formData.append(
        "gradeLevel",
        uploadGradeLevel
      );

      formData.append(
        "tags",
        uploadTags
      );

      formData.append(
        "isFeatured",
        String(uploadFeatured)
      );

      formData.append(
        "isPublished",
        String(uploadPublished)
      );

      const response = await fetch(
        "/api/admin/study-hub/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Không thể tải tài liệu lên."
        );
      }

      toast.success(
        "Đã tải tài liệu lên Study Hub."
      );

      setUploadOpen(false);
      resetUploadForm();

      await loadResources(true);
    } catch (error) {
      console.error(
        "[STUDY HUB UPLOAD]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải tài liệu lên."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="study-hub-page">
      <style jsx global>{`
        .study-hub-page {
          min-height: calc(100vh - 70px);
          padding: 28px;
          background:
            radial-gradient(
              circle at 8% 3%,
              rgba(59, 130, 246, 0.1),
              transparent 28%
            ),
            radial-gradient(
              circle at 92% 7%,
              rgba(124, 58, 237, 0.09),
              transparent 28%
            ),
            linear-gradient(
              180deg,
              #f8fafc 0%,
              #f5f7fb 55%,
              #f8fafc 100%
            );
        }

        .study-hub-container {
          width: min(1450px, 100%);
          margin: 0 auto;
        }

        .study-hub-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 25px;
          min-height: 175px;
          margin-bottom: 18px;
          padding: 28px;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.98),
              rgba(248, 250, 252, 0.94)
            );
          box-shadow:
            0 18px 48px rgba(15, 23, 42, 0.05);
        }

        .study-hub-hero::before {
          content: "";
          position: absolute;
          width: 400px;
          height: 400px;
          right: -120px;
          top: -250px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(79, 70, 229, 0.16),
              transparent 68%
            );
          pointer-events: none;
        }

        .study-hub-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.35;
          background-image:
            linear-gradient(
              rgba(148, 163, 184, 0.045) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148, 163, 184, 0.045) 1px,
              transparent 1px
            );
          background-size: 32px 32px;
          mask-image:
            linear-gradient(
              to bottom,
              black,
              transparent 82%
            );
        }

        .study-hub-hero-copy {
          position: relative;
          z-index: 1;
        }

        .study-hub-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 10px;
          padding: 6px 10px;
          border: 1px solid #e0e7ff;
          border-radius: 999px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.12em;
        }

        .study-hub-title {
          margin: 0;
          font-size: clamp(33px, 4vw, 46px);
          line-height: 1;
          letter-spacing: -0.055em;
          font-weight: 850;
          background:
            linear-gradient(
              110deg,
              #0f172a,
              #334155 55%,
              #4f46e5
            );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .study-hub-description {
          max-width: 700px;
          margin: 13px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.75;
        }

        .study-hub-hero-actions {
          position: relative;
          z-index: 2;
          display: flex;
          flex-shrink: 0;
          gap: 8px;
        }

        .study-hub-button {
          min-height: 41px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border: 0;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            opacity 0.18s ease;
        }

        .study-hub-button:hover {
          transform: translateY(-1px);
        }

        .study-hub-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }

        .study-hub-button-secondary {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
        }

        .study-hub-upload-button {
          color: #ffffff;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5,
              #7c3aed
            );
          box-shadow:
            0 10px 24px
              rgba(79, 70, 229, 0.18);
        }

        .study-hub-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 13px;
          margin-bottom: 18px;
        }

        .study-hub-stat {
          position: relative;
          overflow: hidden;
          padding: 17px 18px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow:
            0 12px 32px
              rgba(15, 23, 42, 0.04);
        }

        .study-hub-stat:nth-child(1) {
          border-top: 3px solid #2563eb;
        }

        .study-hub-stat:nth-child(2) {
          border-top: 3px solid #22c55e;
        }

        .study-hub-stat:nth-child(3) {
          border-top: 3px solid #8b5cf6;
        }

        .study-hub-stat:nth-child(4) {
          border-top: 3px solid #f59e0b;
        }

        .study-hub-stat-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          border-radius: 11px;
          background: #f1f5f9;
          color: #475569;
        }

        .study-hub-stat:nth-child(1)
          .study-hub-stat-icon {
          color: #2563eb;
          background: #eff6ff;
        }

        .study-hub-stat:nth-child(2)
          .study-hub-stat-icon {
          color: #16a34a;
          background: #f0fdf4;
        }

        .study-hub-stat:nth-child(3)
          .study-hub-stat-icon {
          color: #7c3aed;
          background: #f5f3ff;
        }

        .study-hub-stat:nth-child(4)
          .study-hub-stat-icon {
          color: #d97706;
          background: #fffbeb;
        }

        .study-hub-stat-label {
          display: block;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.08em;
        }

        .study-hub-stat-value {
          display: block;
          margin-top: 6px;
          font-size: 28px;
          font-weight: 850;
          letter-spacing: -0.05em;
          color: #0f172a;
        }

        .study-hub-toolbar {
          display: grid;
          grid-template-columns:
            minmax(250px, 1fr)
            180px
            160px
            150px;
          gap: 9px;
          margin-bottom: 14px;
        }

        .study-hub-search {
          position: relative;
        }

        .study-hub-search svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .study-hub-input,
        .study-hub-select {
          width: 100%;
          height: 41px;
          box-sizing: border-box;
          border: 1px solid #dbe3ec;
          border-radius: 11px;
          outline: none;
          background: #ffffff;
          color: #334155;
          font: inherit;
          font-size: 12px;
        }

        .study-hub-input {
          padding: 0 12px 0 38px;
        }

        .study-hub-select {
          padding: 0 32px 0 11px;
          appearance: none;
          cursor: pointer;
        }

        .study-hub-input:focus,
        .study-hub-select:focus {
          border-color: #6366f1;
          box-shadow:
            0 0 0 4px
              rgba(99, 102, 241, 0.09);
        }

        .study-hub-filter {
          position: relative;
        }

        .study-hub-filter-chevron {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #64748b;
        }

        .study-hub-card {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 21px;
          background: #ffffff;
          box-shadow:
            0 18px 44px
              rgba(15, 23, 42, 0.045);
        }

        .study-hub-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 17px 20px;
          border-bottom: 1px solid #eef2f7;
          background:
            linear-gradient(
              180deg,
              #fafbfc,
              #ffffff
            );
        }

        .study-hub-card-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .study-hub-card-header-icon {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #eef2ff;
          color: #4f46e5;
        }

        .study-hub-card-header strong {
          display: block;
          font-size: 14px;
          color: #0f172a;
        }

        .study-hub-card-header span {
          display: block;
          margin-top: 2px;
          font-size: 10px;
          color: #94a3b8;
        }

        .study-hub-result-count {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .study-hub-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
          padding: 15px;
        }

        .study-hub-document {
          position: relative;
          overflow: hidden;
          padding: 17px;
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

        .study-hub-document:hover {
          transform: translateY(-2px);
          border-color: #c7d2fe;
          box-shadow:
            0 12px 30px
              rgba(79, 70, 229, 0.07);
        }

        .study-hub-document-featured {
          box-shadow:
            inset 0 0 0 1px
              rgba(245, 158, 11, 0.12);
        }

        .study-hub-document-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 13px;
        }

        .study-hub-document-type {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 9px;
          font-weight: 850;
        }

        .study-hub-document-featured-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #b45309;
          font-size: 9px;
          font-weight: 850;
        }

        .study-hub-document h3 {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          line-height: 1.4;
          letter-spacing: -0.02em;
        }

        .study-hub-document-description {
          min-height: 38px;
          margin: 7px 0 13px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.65;
        }

        .study-hub-document-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .study-hub-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 7px;
          border: 1px solid #eef2f7;
          border-radius: 8px;
          background: #f8fafc;
          color: #64748b;
          font-size: 9px;
          font-weight: 700;
        }

        .study-hub-status-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 7px;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 800;
        }

        .study-hub-status-published {
          background: #f0fdf4;
          color: #15803d;
        }

        .study-hub-status-hidden {
          background: #fff7ed;
          color: #c2410c;
        }

        .study-hub-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 13px;
        }

        .study-hub-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
          border-radius: 7px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 8px;
          font-weight: 750;
        }

        .study-hub-document-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 11px;
          border-top: 1px solid #eef2f7;
        }

        .study-hub-file-info {
          min-width: 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .study-hub-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #64748b;
          font-size: 10px;
        }

        .study-hub-file-info span {
          display: block;
          margin-top: 2px;
        }

        .study-hub-edit-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 34px;
          padding: 0 10px;
          flex-shrink: 0;
          border: 1px solid #e0e7ff;
          border-radius: 9px;
          background: #f8f7ff;
          color: #4f46e5;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .study-hub-edit-button:hover {
          background: #eef2ff;
        }

        .study-hub-empty {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 45px;
          text-align: center;
        }

        .study-hub-empty-icon {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
          border-radius: 19px;
          background:
            linear-gradient(
              145deg,
              #eff6ff,
              #f5f3ff
            );
          color: #6366f1;
          border: 1px solid #e0e7ff;
        }

        .study-hub-empty strong {
          margin-bottom: 5px;
          font-size: 14px;
          color: #334155;
        }

        .study-hub-empty span {
          color: #94a3b8;
          font-size: 11px;
        }

        .study-hub-loading {
          min-height: 300px;
          display: grid;
          place-items: center;
          color: #6366f1;
        }

        .study-hub-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(9px);
        }

        .study-hub-modal {
          width: min(650px, 100%);
          max-height: calc(100vh - 36px);
          overflow-y: auto;
          border: 1px solid
            rgba(255, 255, 255, 0.75);
          border-radius: 22px;
          background: #ffffff;
          box-shadow:
            0 35px 90px
              rgba(15, 23, 42, 0.25);
        }

        .study-hub-modal-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 20px 22px 15px;
          border-bottom: 1px solid #eef2f7;
        }

        .study-hub-modal-kicker {
          margin: 0 0 5px;
          color: #6366f1;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.12em;
        }

        .study-hub-modal-title {
          margin: 0;
          color: #0f172a;
          font-size: 19px;
          font-weight: 850;
          letter-spacing: -0.03em;
        }

        .study-hub-modal-subtitle {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 10px;
        }

        .study-hub-close {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
        }

        .study-hub-modal-body {
          padding: 20px 22px 22px;
        }

        .study-hub-field {
          margin-bottom: 16px;
        }

        .study-hub-field label {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 11px;
          font-weight: 800;
        }

        .study-hub-field select,
        .study-hub-field input {
          width: 100%;
          box-sizing: border-box;
          height: 40px;
          padding: 0 11px;
          border: 1px solid #dbe3ec;
          border-radius: 10px;
          outline: none;
          background: #ffffff;
          color: #334155;
          font: inherit;
          font-size: 12px;
        }

        .study-hub-field select:focus,
        .study-hub-field input:focus {
          border-color: #6366f1;
          box-shadow:
            0 0 0 4px
              rgba(99, 102, 241, 0.09);
        }

        .study-hub-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .study-hub-upload-file {
          display: block;
          padding: 18px;
          border: 1.5px dashed #c7d2fe;
          border-radius: 15px;
          background:
            linear-gradient(
              145deg,
              #f8faff,
              #f5f3ff
            );
          text-align: center;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .study-hub-upload-file:hover {
          border-color: #818cf8;
          background:
            linear-gradient(
              145deg,
              #eff6ff,
              #eef2ff
            );
          transform: translateY(-1px);
        }

        .study-hub-upload-file-active {
          border-color: #6366f1;
          background: #eef2ff;
        }

        .study-hub-upload-file input {
          display: none;
        }

        .study-hub-upload-file-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin: 0 auto 9px;
          border-radius: 13px;
          background: #eef2ff;
          color: #4f46e5;
        }

        .study-hub-upload-file strong {
          display: block;
          color: #334155;
          font-size: 12px;
        }

        .study-hub-upload-file span {
          display: block;
          margin-top: 4px;
          color: #94a3b8;
          font-size: 9px;
          line-height: 1.5;
        }

        .study-hub-upload-selected {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding: 10px 11px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          color: #64748b;
          font-size: 10px;
        }

        .study-hub-upload-selected-main {
          min-width: 0;
        }

        .study-hub-upload-selected-main strong {
          display: block;
          overflow: hidden;
          color: #334155;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
        }

        .study-hub-upload-selected-main span {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 9px;
        }

        .study-hub-upload-clear {
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          color: #94a3b8;
          cursor: pointer;
        }

        .study-hub-upload-clear:hover {
          color: #ef4444;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .study-hub-upload-status {
          margin-top: 7px;
          padding: 8px 10px;
          border-radius: 9px;
          background: #f8fafc;
          color: #94a3b8;
          font-size: 9px;
          line-height: 1.6;
        }

        .study-hub-tag-editor {
          display: flex;
          gap: 7px;
        }

        .study-hub-tag-editor input {
          flex: 1;
        }

        .study-hub-tag-add {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid #e0e7ff;
          border-radius: 10px;
          background: #eef2ff;
          color: #4f46e5;
          cursor: pointer;
        }

        .study-hub-edit-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .study-hub-edit-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 8px;
          border-radius: 8px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 10px;
          font-weight: 750;
        }

        .study-hub-edit-tag button {
          width: 16px;
          height: 16px;
          display: grid;
          place-items: center;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: rgba(79, 70, 229, 0.1);
          color: #4f46e5;
          cursor: pointer;
        }

        .study-hub-featured-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 4px;
          padding: 13px;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #f8fafc;
        }

        .study-hub-featured-copy strong {
          display: block;
          color: #334155;
          font-size: 12px;
        }

        .study-hub-featured-copy span {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 9px;
          line-height: 1.5;
        }

        .study-hub-toggle {
          position: relative;
          width: 43px;
          height: 24px;
          flex-shrink: 0;
        }

        .study-hub-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .study-hub-toggle-slider {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: #cbd5e1;
          cursor: pointer;
          transition: 0.2s;
        }

        .study-hub-toggle-slider::before {
          content: "";
          position: absolute;
          width: 18px;
          height: 18px;
          left: 3px;
          top: 3px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow:
            0 2px 5px
              rgba(15, 23, 42, 0.16);
          transition: 0.2s;
        }

        .study-hub-toggle
          input:checked
          + .study-hub-toggle-slider {
          background: #4f46e5;
        }

        .study-hub-toggle
          input:checked
          + .study-hub-toggle-slider::before {
          transform: translateX(19px);
        }

        .study-hub-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #eef2f7;
        }

        .study-hub-save {
          color: #ffffff;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5,
              #7c3aed
            );
          box-shadow:
            0 10px 24px
              rgba(79, 70, 229, 0.18);
        }

        @media (max-width: 1000px) {
          .study-hub-toolbar {
            grid-template-columns:
              minmax(200px, 1fr)
              1fr
              1fr;
          }

          .study-hub-grid {
            grid-template-columns: 1fr;
          }

          .study-hub-hero {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 650px) {
          .study-hub-page {
            padding: 14px 10px;
          }

          .study-hub-hero {
            padding: 20px;
            border-radius: 19px;
          }

          .study-hub-title {
            font-size: 31px;
          }

          .study-hub-hero-actions {
            width: 100%;
          }

          .study-hub-hero-actions
            .study-hub-button {
            flex: 1;
          }

          .study-hub-stats {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .study-hub-stat {
            padding: 13px;
          }

          .study-hub-stat-value {
            font-size: 23px;
          }

          .study-hub-toolbar {
            grid-template-columns: 1fr 1fr;
          }

          .study-hub-search {
            grid-column: span 2;
          }

          .study-hub-grid {
            padding: 10px;
          }

          .study-hub-two-col {
            grid-template-columns: 1fr;
          }

          .study-hub-modal {
            max-height: calc(100vh - 20px);
          }

          .study-hub-modal-header,
          .study-hub-modal-body {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
      `}</style>

      <div className="study-hub-container">
        <section className="study-hub-hero">
          <div className="study-hub-hero-copy">
            <span className="study-hub-kicker">
              <BookOpen size={13} />
              CHI ĐOÀN D-K66 · KHO HỌC TẬP
            </span>

            <h1 className="study-hub-title">
              Study Hub
            </h1>

            <p className="study-hub-description">
              Trung tâm quản lý tài liệu học tập,
              tài liệu tham khảo, bài tập, đề thi
              và template. Tất cả tài liệu Study Hub
              được lưu trong kho riêng, tách biệt
              hoàn toàn khỏi Cổng tài liệu Đoàn.
            </p>
          </div>

          <div className="study-hub-hero-actions">
            <button
              type="button"
              className="study-hub-button study-hub-upload-button"
              onClick={() =>
                setUploadOpen(true)
              }
            >
              <Upload size={15} />
              Tải tài liệu lên
            </button>

            <button
              type="button"
              className="study-hub-button study-hub-button-secondary"
              onClick={() =>
                void loadResources(true)
              }
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={15} />
              )}
              Làm mới
            </button>
          </div>
        </section>

        <section className="study-hub-stats">
          <article className="study-hub-stat">
            <div className="study-hub-stat-icon">
              <FileText size={18} />
            </div>

            <span className="study-hub-stat-label">
              TỔNG TÀI LIỆU
            </span>

            <strong className="study-hub-stat-value">
              {statistics.total}
            </strong>
          </article>

          <article className="study-hub-stat">
            <div className="study-hub-stat-icon">
              <BookOpen size={18} />
            </div>

            <span className="study-hub-stat-label">
              TÀI LIỆU HỌC TẬP
            </span>

            <strong className="study-hub-stat-value">
              {statistics.study}
            </strong>
          </article>

          <article className="study-hub-stat">
            <div className="study-hub-stat-icon">
              <Tag size={18} />
            </div>

            <span className="study-hub-stat-label">
              TÀI LIỆU THAM KHẢO
            </span>

            <strong className="study-hub-stat-value">
              {statistics.reference}
            </strong>
          </article>

          <article className="study-hub-stat">
            <div className="study-hub-stat-icon">
              <Star size={18} />
            </div>

            <span className="study-hub-stat-label">
              TÀI LIỆU NỔI BẬT
            </span>

            <strong className="study-hub-stat-value">
              {statistics.featured}
            </strong>
          </article>
        </section>

        <section className="study-hub-toolbar">
          <div className="study-hub-search">
            <Search size={16} />

            <input
              className="study-hub-input"
              type="search"
              placeholder="Tìm theo tên, môn học, tag, tên file..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="study-hub-filter">
            <select
              className="study-hub-select"
              value={resourceFilter}
              onChange={(event) =>
                setResourceFilter(
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
              ).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </select>

            <ChevronDown
              size={15}
              className="study-hub-filter-chevron"
            />
          </div>

          <div className="study-hub-filter">
            <select
              className="study-hub-select"
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
              className="study-hub-filter-chevron"
            />
          </div>

          <div className="study-hub-filter">
            <select
              className="study-hub-select"
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
              className="study-hub-filter-chevron"
            />
          </div>
        </section>

        <section className="study-hub-card">
          <div className="study-hub-card-header">
            <div className="study-hub-card-header-title">
              <div className="study-hub-card-header-icon">
                <BookOpen size={17} />
              </div>

              <div>
                <strong>
                  Kho học tập
                </strong>

                <span>
                  Quản lý tài liệu riêng của
                  Study Hub
                </span>
              </div>
            </div>

            <span className="study-hub-result-count">
              {filteredResources.length} tài
              liệu
            </span>
          </div>

          {loading ? (
            <div className="study-hub-loading">
              <Loader2
                size={26}
                className="animate-spin"
              />
            </div>
          ) : filteredResources.length ===
            0 ? (
            <div className="study-hub-empty">
              <div className="study-hub-empty-icon">
                <BookOpen size={27} />
              </div>

              <strong>
                Chưa có tài liệu Study Hub
              </strong>

              <span>
                Nhấn “Tải tài liệu lên” để thêm
                tài liệu đầu tiên.
              </span>
            </div>
          ) : (
            <div className="study-hub-grid">
              {filteredResources.map(
                (resource) => (
                  <article
                    key={resource.id}
                    className={`study-hub-document ${
                      resource.is_featured
                        ? "study-hub-document-featured"
                        : ""
                    }`}
                  >
                    <div className="study-hub-document-top">
                      <span className="study-hub-document-type">
                        <BookOpen size={11} />
                        {getResourceTypeLabel(
                          resource.resource_type
                        )}
                      </span>

                      {resource.is_featured && (
                        <span className="study-hub-document-featured-label">
                          <Star
                            size={11}
                            fill="currentColor"
                          />
                          Nổi bật
                        </span>
                      )}
                    </div>

                    <h3>
                      {resource.title}
                    </h3>

                    <p className="study-hub-document-description">
                      {resource.description ||
                        "Tài liệu học tập của Chi đoàn D-K66."}
                    </p>

                    <div className="study-hub-document-meta">
                      {resource.subject && (
                        <span className="study-hub-meta-chip">
                          <BookOpen
                            size={11}
                          />
                          {resource.subject}
                        </span>
                      )}

                      {resource.grade_level && (
                        <span className="study-hub-meta-chip">
                          Khối:{" "}
                          {resource.grade_level}
                        </span>
                      )}

                      <span className="study-hub-meta-chip">
                        {formatFileSize(
                          resource.file_size
                        )}
                      </span>

                      {resource.is_published ? (
                        <span className="study-hub-status-chip study-hub-status-published">
                          <Check size={10} />
                          Đã xuất bản
                        </span>
                      ) : (
                        <span className="study-hub-status-chip study-hub-status-hidden">
                          Chưa xuất bản
                        </span>
                      )}
                    </div>

                    {resource.tags.length >
                      0 && (
                      <div className="study-hub-tags">
                        {resource.tags.map(
                          (tag) => (
                            <span
                              key={tag}
                              className="study-hub-tag"
                            >
                              <Tag size={9} />
                              {tag}
                            </span>
                          )
                        )}
                      </div>
                    )}

                    <div className="study-hub-document-footer">
                      <div className="study-hub-file-info">
                        <strong>
                          {resource.file_name ||
                            "Không có tên file"}
                        </strong>

                        <span>
                          {resource.author ||
                            "BCH"}{" "}
                          ·{" "}
                          {formatDate(
                            resource.updated_at ||
                              resource.created_at
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="study-hub-edit-button"
                        onClick={() =>
                          openEditor(resource)
                        }
                      >
                        <Tag size={13} />
                        Phân loại
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {uploadOpen && (
        <div
          className="study-hub-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !uploading
            ) {
              closeUploadModal();
            }
          }}
        >
          <div
            className="study-hub-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-hub-upload-title"
          >
            <div className="study-hub-modal-header">
              <div>
                <p className="study-hub-modal-kicker">
                  STUDY HUB · UPLOAD
                </p>

                <h2
                  id="study-hub-upload-title"
                  className="study-hub-modal-title"
                >
                  Tải tài liệu lên
                </h2>

                <p className="study-hub-modal-subtitle">
                  File được lưu vào kho Study Hub
                  riêng, không dùng Cổng tài liệu
                  Đoàn.
                </p>
              </div>

              <button
                type="button"
                className="study-hub-close"
                onClick={closeUploadModal}
                disabled={uploading}
              >
                <X size={17} />
              </button>
            </div>

            <div className="study-hub-modal-body">
              <div className="study-hub-field">
                <label>
                  Tài liệu
                </label>

                <label
                  className={`study-hub-upload-file ${
                    dragActive
                      ? "study-hub-upload-file-active"
                      : ""
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() =>
                    setDragActive(false)
                  }
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept={
                      ACCEPTED_EXTENSIONS
                    }
                    onChange={(event) => {
                      handleSelectFile(
                        event.target.files?.[0] ||
                          null
                      );

                      event.currentTarget.value =
                        "";
                    }}
                    disabled={uploading}
                  />

                  <div className="study-hub-upload-file-icon">
                    <Upload size={21} />
                  </div>

                  <strong>
                    {dragActive
                      ? "Thả file vào đây"
                      : "Nhấn để chọn hoặc kéo file vào đây"}
                  </strong>

                  <span>
                    PDF, Word, Excel, PowerPoint,
                    TXT, ảnh, ZIP · tối đa 30MB
                  </span>
                </label>

                {selectedFile && (
                  <div className="study-hub-upload-selected">
                    <div className="study-hub-upload-selected-main">
                      <strong>
                        {selectedFile.name}
                      </strong>

                      <span>
                        {formatFileSize(
                          selectedFile.size
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="study-hub-upload-clear"
                      onClick={() =>
                        setSelectedFile(null)
                      }
                      disabled={uploading}
                      aria-label="Xóa file đã chọn"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>

              <div className="study-hub-field">
                <label htmlFor="upload-title">
                  Tên tài liệu
                </label>

                <input
                  id="upload-title"
                  value={uploadTitle}
                  onChange={(event) =>
                    setUploadTitle(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Chuyên đề lượng giác lớp 11"
                  disabled={uploading}
                />
              </div>

              <div className="study-hub-field">
                <label htmlFor="upload-description">
                  Mô tả
                </label>

                <input
                  id="upload-description"
                  value={uploadDescription}
                  onChange={(event) =>
                    setUploadDescription(
                      event.target.value
                    )
                  }
                  placeholder="Mô tả ngắn về tài liệu..."
                  disabled={uploading}
                />
              </div>

              <div className="study-hub-field">
                <label htmlFor="upload-type">
                  Loại tài liệu
                </label>

                <select
                  id="upload-type"
                  value={uploadResourceType}
                  onChange={(event) =>
                    setUploadResourceType(
                      event.target
                        .value as ResourceType
                    )
                  }
                  disabled={uploading}
                >
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
              </div>

              <div className="study-hub-two-col">
                <div className="study-hub-field">
                  <label htmlFor="upload-subject">
                    Môn học
                  </label>

                  <select
                    id="upload-subject"
                    value={uploadSubject}
                    onChange={(event) =>
                      setUploadSubject(
                        event.target.value
                      )
                    }
                    disabled={uploading}
                  >
                    <option value="">
                      Chưa xác định
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
                </div>

                <div className="study-hub-field">
                  <label htmlFor="upload-grade">
                    Khối
                  </label>

                  <select
                    id="upload-grade"
                    value={
                      uploadGradeLevel
                    }
                    onChange={(event) =>
                      setUploadGradeLevel(
                        event.target.value
                      )
                    }
                    disabled={uploading}
                  >
                    <option value="">
                      Chưa xác định
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
                </div>
              </div>

              <div className="study-hub-field">
                <label htmlFor="upload-tags">
                  Tags
                </label>

                <input
                  id="upload-tags"
                  value={uploadTags}
                  onChange={(event) =>
                    setUploadTags(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: hàm số, ôn thi, học kỳ 1"
                  disabled={uploading}
                />

                <div className="study-hub-upload-status">
                  Nhập nhiều tag bằng dấu phẩy.
                </div>
              </div>

              <div className="study-hub-featured-row">
                <div className="study-hub-featured-copy">
                  <strong>
                    Tài liệu nổi bật
                  </strong>

                  <span>
                    Ưu tiên hiển thị tài liệu này
                    trong Study Hub.
                  </span>
                </div>

                <label className="study-hub-toggle">
                  <input
                    type="checkbox"
                    checked={uploadFeatured}
                    onChange={(event) =>
                      setUploadFeatured(
                        event.target.checked
                      )
                    }
                    disabled={uploading}
                  />

                  <span className="study-hub-toggle-slider" />
                </label>
              </div>

              <div
                className="study-hub-featured-row"
                style={{ marginTop: 9 }}
              >
                <div className="study-hub-featured-copy">
                  <strong>
                    Công khai cho đoàn viên
                  </strong>

                  <span>
                    Chỉ tài liệu xuất bản mới
                    xuất hiện ở cổng đoàn viên.
                  </span>
                </div>

                <label className="study-hub-toggle">
                  <input
                    type="checkbox"
                    checked={uploadPublished}
                    onChange={(event) =>
                      setUploadPublished(
                        event.target.checked
                      )
                    }
                    disabled={uploading}
                  />

                  <span className="study-hub-toggle-slider" />
                </label>
              </div>

              <div className="study-hub-modal-footer">
                <button
                  type="button"
                  className="study-hub-button study-hub-button-secondary"
                  onClick={closeUploadModal}
                  disabled={uploading}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  className="study-hub-button study-hub-save"
                  onClick={() =>
                    void uploadResource()
                  }
                  disabled={
                    uploading ||
                    !selectedFile ||
                    !uploadTitle.trim()
                  }
                >
                  {uploading ? (
                    <>
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Đang tải lên...
                    </>
                  ) : (
                    <>
                      <Upload size={15} />
                      Tải tài liệu lên
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingResource && (
        <div
          className="study-hub-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              closeEditor();
            }
          }}
        >
          <div
            className="study-hub-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-hub-edit-title"
          >
            <div className="study-hub-modal-header">
              <div>
                <p className="study-hub-modal-kicker">
                  PHÂN LOẠI STUDY HUB
                </p>

                <h2
                  id="study-hub-edit-title"
                  className="study-hub-modal-title"
                >
                  {editingResource.title}
                </h2>

                <p className="study-hub-modal-subtitle">
                  Chỉnh metadata để đoàn viên
                  dễ tìm tài liệu.
                </p>
              </div>

              <button
                type="button"
                className="study-hub-close"
                onClick={closeEditor}
                disabled={saving}
              >
                <X size={17} />
              </button>
            </div>

            <div className="study-hub-modal-body">
              <div className="study-hub-field">
                <label htmlFor="edit-resource-type">
                  Loại tài liệu
                </label>

                <select
                  id="edit-resource-type"
                  value={editResourceType}
                  onChange={(event) =>
                    setEditResourceType(
                      event.target
                        .value as ResourceType
                    )
                  }
                  disabled={saving}
                >
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
              </div>

              <div className="study-hub-two-col">
                <div className="study-hub-field">
                  <label htmlFor="edit-subject">
                    Môn học
                  </label>

                  <select
                    id="edit-subject"
                    value={editSubject}
                    onChange={(event) =>
                      setEditSubject(
                        event.target.value
                      )
                    }
                    disabled={saving}
                  >
                    <option value="">
                      Chưa xác định
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
                </div>

                <div className="study-hub-field">
                  <label htmlFor="edit-grade">
                    Khối / phạm vi
                  </label>

                  <select
                    id="edit-grade"
                    value={editGradeLevel}
                    onChange={(event) =>
                      setEditGradeLevel(
                        event.target.value
                      )
                    }
                    disabled={saving}
                  >
                    <option value="">
                      Chưa xác định
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
                </div>
              </div>

              <div className="study-hub-field">
                <label htmlFor="edit-tag">
                  Tags
                </label>

                <div className="study-hub-tag-editor">
                  <input
                    id="edit-tag"
                    type="text"
                    value={tagInput}
                    onChange={(event) =>
                      setTagInput(
                        event.target.value
                      )
                    }
                    onKeyDown={
                      handleTagKeyDown
                    }
                    placeholder="Nhập tag rồi Enter..."
                    maxLength={50}
                    disabled={saving}
                  />

                  <button
                    type="button"
                    className="study-hub-tag-add"
                    onClick={addTag}
                    disabled={saving}
                    aria-label="Thêm tag"
                  >
                    <Check size={15} />
                  </button>
                </div>

                {editTags.length > 0 && (
                  <div className="study-hub-edit-tags">
                    {editTags.map((tag) => (
                      <span
                        key={tag}
                        className="study-hub-edit-tag"
                      >
                        {tag}

                        <button
                          type="button"
                          onClick={() =>
                            removeTag(tag)
                          }
                          disabled={saving}
                          aria-label={`Xóa ${tag}`}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="study-hub-featured-row">
                <div className="study-hub-featured-copy">
                  <strong>
                    Tài liệu nổi bật
                  </strong>

                  <span>
                    Tài liệu này sẽ được ưu tiên
                    hiển thị trong Study Hub.
                  </span>
                </div>

                <label className="study-hub-toggle">
                  <input
                    type="checkbox"
                    checked={editFeatured}
                    onChange={(event) =>
                      setEditFeatured(
                        event.target.checked
                      )
                    }
                    disabled={saving}
                  />

                  <span className="study-hub-toggle-slider" />
                </label>
              </div>

              <div
                className="study-hub-featured-row"
                style={{ marginTop: 9 }}
              >
                <div className="study-hub-featured-copy">
                  <strong>
                    Công khai cho đoàn viên
                  </strong>

                  <span>
                    Tắt để giữ tài liệu ở trạng
                    thái chưa xuất bản.
                  </span>
                </div>

                <label className="study-hub-toggle">
                  <input
                    type="checkbox"
                    checked={editPublished}
                    onChange={(event) =>
                      setEditPublished(
                        event.target.checked
                      )
                    }
                    disabled={saving}
                  />

                  <span className="study-hub-toggle-slider" />
                </label>
              </div>

              <div className="study-hub-modal-footer">
                <button
                  type="button"
                  className="study-hub-button study-hub-button-secondary"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  className="study-hub-button study-hub-save"
                  onClick={() =>
                    void saveResource()
                  }
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}