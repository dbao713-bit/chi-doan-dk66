"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Images,
  Pause,
  Play,
  Maximize2,
  CalendarDays,
  MapPin,
  Clock3,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import WebsiteAI from "@/components/ai/WebsiteAI";

/* =========================================================
   TYPES
========================================================= */

type ActivityStatus =
  | "scheduled"
  | "ongoing"
  | "completed"
  | "cancelled";

type Activity = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  status: ActivityStatus;
  created_at: string;
};

type DocumentCategory =
  | "van-ban"
  | "thong-bao"
  | "ke-hoach"
  | "bien-ban"
  | "khac";

type DocumentItem = {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  author: string | null;
  created_at: string;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
};

type MemberStats = {
  total: number;
  male: number;
  female: number;
};

type GalleryItem = {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  sort_order: number;
  is_visible: boolean;
};

/* =========================================================
   CONSTANTS
========================================================= */

const GALLERY_DURATION = 3500;

const activityStatusLabels: Record<
  ActivityStatus,
  string
> = {
  scheduled: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

const documentCategoryLabels: Record<
  DocumentCategory,
  string
> = {
  "van-ban": "Văn bản Đoàn",
  "thong-bao": "Thông báo",
  "ke-hoach": "Kế hoạch",
  "bien-ban": "Biên bản",
  khac: "Tài liệu khác",
};

/* =========================================================
   BCH
========================================================= */

const bchMembers = [
  {
    role: "BÍ THƯ CHI ĐOÀN",
    name: "Nguyễn Thị Huyền",
    image: "/bch-1.jpg",
    description:
      "Phụ trách công tác chung của Chi đoàn, tổ chức và điều hành các hoạt động.",
  },
  {
    role: "PHÓ BÍ THƯ CHI ĐOÀN",
    name: "Đinh Anh Bảo",
    image: "/bch-2.jpg",
    description:
      "Phối hợp quản lý, tổ chức các hoạt động, phong trào và công tác đoàn viên.",
  },
  {
    role: "ỦY VIÊN BCH",
    name: "Đỗ Ngọc Châu",
    image: "/bch-3.jpg",
    description:
      "Tham gia xây dựng phong trào, hỗ trợ công tác và hoạt động của Chi đoàn.",
  },
];

/* =========================================================
   HOME
========================================================= */

export default function Home() {
  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [memberStats, setMemberStats] = useState<MemberStats>({
    total: 0,
    male: 0,
    female: 0,
  });

  const [gallery, setGallery] = useState<
    GalleryItem[]
  >([]);

  const [activities, setActivities] = useState<
    Activity[]
  >([]);

  const [documents, setDocuments] = useState<
    DocumentItem[]
  >([]);

  const [galleryIndex, setGalleryIndex] =
    useState(0);

  const [galleryPaused, setGalleryPaused] =
    useState(false);

  const [galleryModalOpen, setGalleryModalOpen] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [loadingGallery, setLoadingGallery] =
    useState(true);

  const [loadingActivities, setLoadingActivities] =
    useState(true);

  const [loadingDocuments, setLoadingDocuments] =
    useState(true);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadMembers();
    loadAnnouncements();
    loadGallery();
    loadActivities();
    loadDocuments();
  }, []);

  /* =======================================================
     MEMBERS
  ======================================================= */

  async function loadMembers() {
    const { data, error } = await supabase.rpc(
      "get_public_member_stats"
    );

    if (error) {
      console.error(
        "LOAD MEMBER STATS ERROR:",
        error
      );
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    setMemberStats({
      total: Number(row?.total ?? 0),
      male: Number(row?.male ?? 0),
      female: Number(row?.female ?? 0),
    });
  }

  /* =======================================================
     ANNOUNCEMENTS
  ======================================================= */

  async function loadAnnouncements() {
    const { data, error } = await supabase
      .from("announcements")
      .select(
        "id, title, content, author, created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(3);

    if (error) {
      console.error(
        "LOAD ANNOUNCEMENTS ERROR:",
        error
      );
      return;
    }

    setAnnouncements(
      (data ?? []) as Announcement[]
    );
  }

  /* =======================================================
     GALLERY
  ======================================================= */

async function loadGallery() {
  console.log("=== GALLERY: START ===");

  setLoadingGallery(true);

  const { data, error } = await supabase
    .from("gallery")
    .select(`
      id,
      title,
      description,
      image_url,
      sort_order,
      is_visible
    `)
    .eq("is_visible", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: false,
    });

  console.log("GALLERY DATA:", data);
  console.log("GALLERY ERROR:", error);
  console.log(
    "GALLERY COUNT:",
    data?.length ?? 0
  );

  if (data && data.length > 0) {
    console.log(
      "GALLERY FIRST ITEM:",
      data[0]
    );

    console.log(
      "GALLERY FIRST IMAGE URL:",
      data[0].image_url
    );
  }

  if (error) {
    console.error(
      "LOAD GALLERY ERROR:",
      error
    );

    setGallery([]);
    setLoadingGallery(false);
    return;
  }

  setGallery(
    (data ?? []) as GalleryItem[]
  );

  setGalleryIndex(0);
  setLoadingGallery(false);

  console.log("=== GALLERY: END ===");
}

  /* =======================================================
     ACTIVITIES
  ======================================================= */

  async function loadActivities() {
    setLoadingActivities(true);

    const { data, error } = await supabase
      .from("activities")
      .select(
        `
          id,
          title,
          description,
          location,
          start_at,
          end_at,
          status,
          created_at
        `
      )
      .in("status", [
        "scheduled",
        "ongoing",
      ])
      .order("start_at", {
        ascending: true,
      })
      .limit(4);

    if (error) {
      console.error(
        "LOAD ACTIVITIES ERROR:",
        error
      );

      setActivities([]);
      setLoadingActivities(false);
      return;
    }

    setActivities(
      (data ?? []) as Activity[]
    );

    setLoadingActivities(false);
  }

  /* =======================================================
     DOCUMENTS
  ======================================================= */

  async function loadDocuments() {
    setLoadingDocuments(true);

    const { data, error } = await supabase
      .from("documents")
      .select(
        `
          id,
          title,
          description,
          category,
          file_path,
          file_name,
          mime_type,
          file_size,
          author,
          created_at
        `
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(5);

    if (error) {
      console.error(
        "LOAD DOCUMENTS ERROR:",
        error
      );

      setDocuments([]);
      setLoadingDocuments(false);
      return;
    }

    setDocuments(
      (data ?? []) as DocumentItem[]
    );

    setLoadingDocuments(false);
  }

  /* =======================================================
     MEMBER STATS
  ======================================================= */

  const total = memberStats.total;
  const male = memberStats.male;
  const female = memberStats.female;

  /* =======================================================
     GALLERY CONTROLS
  ======================================================= */

  function previousGallery() {
    if (gallery.length === 0) return;

    setGalleryIndex((current) =>
      current === 0
        ? gallery.length - 1
        : current - 1
    );
  }

  function nextGallery() {
    if (gallery.length === 0) return;

    setGalleryIndex((current) =>
      current === gallery.length - 1
        ? 0
        : current + 1
    );
  }

  function openGallery(index: number) {
    setGalleryIndex(index);
    setGalleryModalOpen(true);
  }

  function closeGallery() {
    setGalleryModalOpen(false);
  }

  /* =======================================================
     AUTO GALLERY
  ======================================================= */

  useEffect(() => {
    if (
      gallery.length <= 1 ||
      galleryPaused ||
      galleryModalOpen
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setGalleryIndex((current) =>
        current === gallery.length - 1
          ? 0
          : current + 1
      );
    }, GALLERY_DURATION);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    gallery.length,
    galleryPaused,
    galleryModalOpen,
  ]);

  /* =======================================================
     LIGHTBOX KEYBOARD
  ======================================================= */

  useEffect(() => {
    if (!galleryModalOpen) return;

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        closeGallery();
      }

      if (event.key === "ArrowLeft") {
        previousGallery();
      }

      if (event.key === "ArrowRight") {
        nextGallery();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow = "";
    };
  }, [
    galleryModalOpen,
    gallery.length,
  ]);

  /* =======================================================
     HELPERS
  ======================================================= */

  function formatActivityDay(
    value: string
  ) {
    return new Date(value).getDate();
  }

  function formatActivityMonth(
    value: string
  ) {
    return new Date(value)
      .toLocaleDateString("vi-VN", {
        month: "short",
      })
      .replace(".", "")
      .toUpperCase();
  }

  function formatActivityDate(
    value: string
  ) {
    return new Date(value).toLocaleDateString(
      "vi-VN",
      {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function formatActivityTime(
    value: string
  ) {
    return new Date(value).toLocaleTimeString(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatDocumentDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleDateString("vi-VN");
  }

  function getDocumentUrl(
    path: string
  ) {
    const { data } =
      supabase.storage
        .from("documents")
        .getPublicUrl(path);

    return data.publicUrl;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main
      id="top"
      className="site"
    >

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="header">

        <div className="header-inner">

          <a
            href="#top"
            className="brand"
          >

            <div className="brand-logo">

              <Image
                src="/logo-truong.png"
                alt="Logo trường THPT Hà Trung"
                width={58}
                height={58}
                priority
              />

            </div>

            <div className="brand-text">

              <strong>
                CHI ĐOÀN D-K66
              </strong>

              <span>
                TRƯỜNG THPT HÀ TRUNG
              </span>

            </div>

          </a>


          <nav
            className={`nav ${
              menuOpen
                ? "nav-open"
                : ""
            }`}
          >

            <a
              href="#gioi-thieu"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              Giới thiệu
            </a>

            <a
              href="#hoat-dong"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              Hoạt động
            </a>

            <a
              href="#tai-lieu"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              Tài liệu
            </a>

            <a
              href="#thu-vien"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              Thư viện
            </a>

            <a
              href="#lien-he"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              Liên hệ
            </a>

            <Link
              href="/portal"
              onClick={() =>
                setMenuOpen(false)
              }
              className="mobile-admin-link"
            >
              Cổng đoàn viên
            </Link>

            <Link
  href="/portal"
  onClick={() =>
    setMenuOpen(false)
  }
  className="mobile-portal-link"
>
  Cổng đoàn viên
</Link>

<Link
  href="/admin"
  onClick={() =>
    setMenuOpen(false)
  }
  className="mobile-admin-link"
>
  Đăng nhập BCH / Admin
</Link>

          </nav>


<div className="header-actions">
  <Link
    href="/portal"
    className="member-portal-header-button"
  >
    CỔNG ĐOÀN VIÊN
  </Link>

  <Link
    href="/admin"
    className="admin-button"
  >
    BCH / ADMIN
  </Link>
</div>


          <button
            className="mobile-menu"
            onClick={() =>
              setMenuOpen(!menuOpen)
            }
            aria-label="Mở menu"
            aria-expanded={
              menuOpen
            }
          >
            ☰
          </button>

        </div>

      </header>


      {/* ===================================================
          HERO
      =================================================== */}

      <section className="hero">

        <div className="hero-background" />

        <div className="hero-overlay" />

        <div className="drum-pattern drum-one">
          ✦
        </div>

        <div className="drum-pattern drum-two">
          ✦
        </div>

        <div className="hero-content">

          <div className="hero-badge">
            CHI ĐOÀN THANH NIÊN
          </div>

          <h1>
            CHI ĐOÀN
            <span>
              D-K66
            </span>
          </h1>

          <div className="hero-school">
            TRƯỜNG THPT HÀ TRUNG
          </div>

          <div className="hero-divider" />

          <p className="hero-year">
            Nhiệm kỳ{" "}
            <strong>
              2025 — 2028
            </strong>
          </p>

          <p className="hero-motto">
            Đoàn kết · Trách nhiệm · Tiên phong · Sáng tạo
          </p>

          <div className="stats">

            <div className="stat">

              <strong>
                {total}
              </strong>

              <span>
                ĐOÀN VIÊN
              </span>

            </div>


            <div className="stat">

              <strong>
                {male}
              </strong>

              <span>
                NAM
              </span>

            </div>


            <div className="stat">

              <strong>
                {female}
              </strong>

              <span>
                NỮ
              </span>

            </div>

          </div>


          <a
            href="#gioi-thieu"
            className="hero-button"
          >
            KHÁM PHÁ CHI ĐOÀN

            <span>
              ↓
            </span>

          </a>

        </div>

      </section>


      {/* ===================================================
          COMMAND CENTER
          SINH HOẠT + TÀI LIỆU
      =================================================== */}

      <section className="home-command-center">

        <div className="home-command-container">

          <div className="home-command-heading">

            <div>

              <span>
                CẬP NHẬT CHI ĐOÀN
              </span>

              <h2>
                Sinh hoạt & Tài liệu
              </h2>

              <p>
                Những hoạt động và tài liệu mới nhất
                được cập nhật trực tiếp từ hệ thống quản trị.
              </p>

            </div>


            <Sparkles
              size={30}
            />

          </div>


          <div className="home-command-grid">

            {/* =================================================
                ACTIVITIES
            ================================================= */}

            <section className="home-command-panel">

              <div className="home-command-panel-header">

                <div className="home-command-panel-title">

                  <div className="home-command-icon activity">
                    <CalendarDays
                      size={20}
                    />
                  </div>

                  <div>

                    <span>
                      LỊCH CHI ĐOÀN
                    </span>

                    <h3>
                      Sinh hoạt sắp tới
                    </h3>

                  </div>

                </div>


                <Link
                  href="/dashboard/activities"
                  className="home-command-view"
                >
                  Quản trị

                  <ArrowRight
                    size={15}
                  />

                </Link>

              </div>


              {loadingActivities ? (

                <div className="home-command-loading">

                  <div />
                  <div />
                  <div />

                </div>

              ) : activities.length === 0 ? (

                <div className="home-command-empty">

                  <CalendarDays
                    size={30}
                  />

                  <strong>
                    Chưa có hoạt động
                  </strong>

                  <span>
                    Lịch sinh hoạt của Chi đoàn
                    sẽ được cập nhật tại đây.
                  </span>

                </div>

              ) : (

                <div className="home-activity-list">

                  {activities
                    .slice(0, 4)
                    .map((activity) => (

                      <article
                        key={activity.id}
                        className="home-activity-item"
                      >

                        <div className="home-activity-date">

                          <span>
                            {formatActivityDay(
                              activity.start_at
                            )}
                          </span>

                          <strong>
                            {formatActivityMonth(
                              activity.start_at
                            )}
                          </strong>

                        </div>


                        <div className="home-activity-main">

                          <div className="home-activity-title-row">

                            <h4>
                              {activity.title}
                            </h4>

                            <span
                              className={`home-activity-status ${activity.status}`}
                            >
                              {
                                activityStatusLabels[
                                  activity.status
                                ]
                              }
                            </span>

                          </div>


                          <div className="home-activity-meta">

                            <span>

                              <Clock3
                                size={14}
                              />

                              {formatActivityDate(
                                activity.start_at
                              )}

                              {" · "}

                              {formatActivityTime(
                                activity.start_at
                              )}

                            </span>


                            {activity.location && (
                              <span>

                                <MapPin
                                  size={14}
                                />

                                {activity.location}

                              </span>
                            )}

                          </div>


                          {activity.description && (
                            <p>
                              {activity.description}
                            </p>
                          )}

                        </div>

                      </article>

                    ))}

                </div>

              )}


{activities.length > 0 && (
  <Link
    href="/activities"
    className="home-command-footer"
  >
    Xem toàn bộ lịch sinh hoạt
    <ArrowRight
      size={16}
    />
  </Link>
)}

            </section>


            {/* =================================================
                DOCUMENTS
            ================================================= */}

            <section className="home-command-panel">

              <div className="home-command-panel-header">

                <div className="home-command-panel-title">

                  <div className="home-command-icon document">

                    <FileText
                      size={20}
                    />

                  </div>

                  <div>

                    <span>
                      KHO TRI THỨC
                    </span>

                    <h3>
                      Tài liệu mới nhất
                    </h3>

                  </div>

                </div>


                <Link
                  href="/documents"
                  className="home-command-view"
                >
                  Xem kho

                  <ArrowRight
                    size={15}
                  />

                </Link>

              </div>


              {loadingDocuments ? (

                <div className="home-command-loading">

                  <div />
                  <div />
                  <div />

                </div>

              ) : documents.length === 0 ? (

                <div className="home-command-empty">

                  <FileText
                    size={30}
                  />

                  <strong>
                    Chưa có tài liệu
                  </strong>

                  <span>
                    Tài liệu mới sẽ xuất hiện
                    trong khu vực này.
                  </span>

                </div>

              ) : (

                <div className="home-document-list">

                  {documents
                    .slice(0, 5)
                    .map((document) => (

                      <a
                        key={document.id}
                        href={getDocumentUrl(
                          document.file_path
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="home-document-item"
                      >

                        <div className="home-document-icon">

                          <FileText
                            size={18}
                          />

                        </div>


                        <div className="home-document-main">

                          <div className="home-document-title-row">

                            <h4>
                              {document.title}
                            </h4>

                            <span>
                              {
                                documentCategoryLabels[
                                  document.category
                                ]
                              }
                            </span>

                          </div>


                          <p>
                            {document.description ||
                              "Tài liệu của Chi đoàn D-K66"}
                          </p>


                          <small>

                            {document.author ||
                              "Admin"}

                            {" · "}

                            {formatDocumentDate(
                              document.created_at
                            )}

                            {" · "}

                            {document.file_name}

                          </small>

                        </div>


                        <ArrowRight
                          size={16}
                          className="home-document-arrow"
                        />

                      </a>

                    ))}

                </div>

              )}


              <Link
                href="/documents"
                className="home-command-footer"
              >
                Mở thư viện tài liệu

                <ArrowRight
                  size={16}
                />

              </Link>

            </section>

          </div>

        </div>

      </section>


      {/* ===================================================
          GIỚI THIỆU
      =================================================== */}

      <section
        id="gioi-thieu"
        className="section introduction"
      >

        <div className="section-heading">

          <span className="section-number">
            01
          </span>

          <div>

            <span className="eyebrow">
              VỀ CHÚNG TÔI
            </span>

            <h2>
              Giới thiệu Chi đoàn
            </h2>

          </div>

        </div>


        <div className="intro-grid">

          <div className="intro-text">

            <p className="lead">
              Chi đoàn D-K66 là tập thể thanh
              niên thuộc Trường THPT Hà Trung,
              nhiệm kỳ 2025 — 2028.
            </p>

            <p>
              Với tinh thần đoàn kết, trách
              nhiệm và sáng tạo, Chi đoàn hướng
              tới xây dựng một tập thể học sinh
              năng động, tích cực tham gia các
              hoạt động học tập, phong trào
              thanh niên và hoạt động xã hội.
            </p>

            <p>
              Website này được xây dựng như một
              không gian số riêng của Chi đoàn,
              phục vụ công tác quản lý đoàn viên,
              lưu trữ tài liệu, thông báo và ghi
              lại những hoạt động đáng nhớ của
              tập thể.
            </p>

          </div>


          <div className="intro-card">

            <div className="card-symbol">
              ✦
            </div>

            <h3>
              ĐOÀN KẾT
              <br />

              <span>
                TRÁCH NHIỆM
              </span>

            </h3>

            <div className="card-line" />

            <p>
              Tiên phong trong học tập
              <br />
              Sáng tạo trong hoạt động
            </p>

          </div>

        </div>

      </section>


      {/* ===================================================
          BCH
      =================================================== */}

      <section className="section bch-section">

        <div className="section-heading">

          <span className="section-number">
            02
          </span>

          <div>

            <span className="eyebrow">
              BAN CHẤP HÀNH
            </span>

            <h2>
              BCH Chi đoàn
            </h2>

          </div>

        </div>


        <div className="bch-grid">

          {bchMembers.map(
            (member) => (

              <article
                className="bch-person"
                key={member.name}
              >

                <div className="bch-photo">

                  <Image
                    src={member.image}
                    alt={`${member.role} - ${member.name}`}
                    fill
                    sizes="(max-width: 800px) 100vw, 33vw"
                  />

                </div>


                <div className="bch-info">

                  <span className="bch-role">
                    {member.role}
                  </span>

                  <h3>
                    {member.name}
                  </h3>

                  <p>
                    {member.description}
                  </p>

                </div>

              </article>

            )
          )}

        </div>

      </section>


      {/* ===================================================
          HOẠT ĐỘNG / THÔNG BÁO
      =================================================== */}

      <section
        id="hoat-dong"
        className="section activity-section"
      >

        <div className="section-heading">

          <span className="section-number">
            03
          </span>

          <div>

            <span className="eyebrow">
              TIN TỨC & SỰ KIỆN
            </span>

            <h2>
              Hoạt động Chi đoàn
            </h2>

          </div>

        </div>


        <div className="activity-grid">

          <article className="activity-card featured">

            <div className="activity-image">

              <Image
                src="/anh-lop.jpg"
                alt="Tập thể lớp D-K66"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
              />

            </div>


            <div className="activity-content">

              <span>
                HOẠT ĐỘNG
              </span>

              <h3>
                Những khoảnh khắc đáng nhớ
                của tập thể D-K66
              </h3>

              <p>
                Khám phá những hình ảnh và
                hoạt động đáng nhớ của Chi đoàn
                trong thư viện.
              </p>

              <a href="#thu-vien">
                Xem thư viện →
              </a>

            </div>

          </article>


          <div className="activity-side">

            {announcements.length > 0 ? (

              announcements.map(
                (
                  announcement,
                  index
                ) => (

                  <article
                    className="mini-card"
                    key={
                      announcement.id
                    }
                  >

                    <span className="mini-number">

                      {String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}

                    </span>


                    <div>

                      <span>
                        THÔNG BÁO
                      </span>


                      <Link
                        href={`/announcement/${announcement.id}`}
                      >

                        <h3>
                          {
                            announcement.title
                          }
                        </h3>

                      </Link>


                      <p>

                        {announcement.content.substring(
                          0,
                          100
                        )}

                        {announcement.content
                          .length > 100
                          ? "..."
                          : ""}

                      </p>


                      <small
                        style={{
                          display:
                            "block",
                          marginTop:
                            "12px",
                          color:
                            "#64748b",
                        }}
                      >
                        {
                          announcement.author
                        }{" "}
                        •{" "}
                        {new Date(
                          announcement.created_at
                        ).toLocaleDateString(
                          "vi-VN"
                        )}
                      </small>


                      <Link
                        href={`/announcement/${announcement.id}`}
                        className="mt-4 inline-block text-blue-600 font-semibold hover:underline"
                      >
                        Xem chi tiết →
                      </Link>

                    </div>

                  </article>

                )
              )

            ) : (

              <article className="mini-card">

                <span className="mini-number">
                  01
                </span>

                <div>

                  <span>
                    THÔNG BÁO
                  </span>

                  <h3>
                    Chưa có thông báo
                  </h3>

                  <p>
                    Hiện chưa có thông báo
                    nào.
                  </p>

                </div>

              </article>

            )}

          </div>

        </div>

      </section>


      {/* ===================================================
          TÀI LIỆU
      =================================================== */}

      <section
        id="tai-lieu"
        className="section documents-section"
      >

        <div className="section-heading">

          <span className="section-number">
            04
          </span>

          <div>

            <span className="eyebrow">
              KHO TRI THỨC
            </span>

            <h2>
              Tài liệu Chi đoàn
            </h2>

          </div>

        </div>


        <div className="document-grid">

          <Link
            href="/documents?category=van-ban"
            className="document-card"
          >

            <div className="document-icon">
              01
            </div>

            <h3>
              Văn bản Đoàn
            </h3>

            <p>
              Văn bản, quy định và hướng dẫn
              công tác Đoàn.
            </p>

            <span className="document-card-action">
              Xem văn bản →
            </span>

          </Link>


          <Link
            href="/documents?category=ke-hoach"
            className="document-card"
          >

            <div className="document-icon">
              02
            </div>

            <h3>
              Kế hoạch
            </h3>

            <p>
              Kế hoạch hoạt động của Chi đoàn
              theo từng giai đoạn.
            </p>

            <span className="document-card-action">
              Xem kế hoạch →
            </span>

          </Link>


          <Link
            href="/documents?category=bien-ban"
            className="document-card"
          >

            <div className="document-icon">
              03
            </div>

            <h3>
              Biên bản
            </h3>

            <p>
              Biên bản họp và các tài liệu nội
              bộ của Chi đoàn.
            </p>

            <span className="document-card-action">
              Xem biên bản →
            </span>

          </Link>


          <Link
            href="/documents?category=khac"
            className="document-card"
          >

            <div className="document-icon">
              04
            </div>

            <h3>
              Tài liệu khác
            </h3>

            <p>
              Kho lưu trữ các tài liệu phục vụ
              hoạt động.
            </p>

            <span className="document-card-action">
              Xem tài liệu →
            </span>

          </Link>

        </div>

      </section>


      {/* ===================================================
          THƯ VIỆN
      =================================================== */}

      <section
        id="thu-vien"
        className="section library-section"
      >

        <div className="section-heading">

          <span className="section-number">
            05
          </span>

          <div>

            <span className="eyebrow">
              KỶ NIỆM
            </span>

            <h2>
              Thư viện hình ảnh
            </h2>

          </div>

        </div>


        {loadingGallery ? (

          <div className="home-gallery-loading">

            <div className="home-gallery-loading-ring" />

            <span>
              Đang tải thư viện...
            </span>

          </div>

        ) : gallery.length === 0 ? (

          <div className="home-gallery-empty">

            <div className="home-gallery-empty-icon">

              <Images
                size={34}
              />

            </div>

            <span>
              THƯ VIỆN CHI ĐOÀN
            </span>

            <h3>
              Chưa có hình ảnh hoạt động
            </h3>

            <p>
              Khoảnh khắc của Chi đoàn sẽ
              được cập nhật tại đây.
            </p>

          </div>

        ) : (

          <div
            className="home-gallery"
            onMouseEnter={() =>
              setGalleryPaused(true)
            }
            onMouseLeave={() =>
              setGalleryPaused(false)
            }
          >

            {/* =========================================
                MAIN
            ========================================= */}

            <div className="home-gallery-stage">

              <button
                type="button"
                className="home-gallery-main"
                onClick={() =>
                  openGallery(
                    galleryIndex
                  )
                }
                aria-label="Mở ảnh lớn"
              >

                {gallery.map(
                  (
                    item,
                    index
                  ) => (

                    <div
                      key={item.id}
                      className={`home-gallery-slide ${
                        index ===
                        galleryIndex
                          ? "active"
                          : ""
                      }`}
                    >

                      <Image
                        src={
                          item.image_url
                        }
                        alt={
                          item.title ||
                          "Ảnh hoạt động"
                        }
                        fill
                        sizes="(max-width: 900px) 100vw, 70vw"
                        style={{
                          objectFit:
                            "cover",
                        }}
                        priority={
                          index === 0
                        }
                      />

                    </div>

                  )
                )}


                <div className="home-gallery-overlay" />


                <div className="home-gallery-caption">

                  <div>

                    <span>
                      {String(
                        galleryIndex +
                          1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <strong>
                      {gallery[
                        galleryIndex
                      ]?.title ||
                        "Khoảnh khắc Chi đoàn"}
                    </strong>

                  </div>


                  {gallery[
                    galleryIndex
                  ]?.description && (

                    <p>
                      {
                        gallery[
                          galleryIndex
                        ].description
                      }
                    </p>

                  )}

                </div>


                <div className="home-gallery-expand">

                  <Maximize2
                    size={18}
                  />

                </div>

              </button>


              {gallery.length > 1 && (
                <>

                  <button
                    type="button"
                    className="home-gallery-nav home-gallery-prev"
                    onClick={(
                      event
                    ) => {

                      event.stopPropagation();

                      previousGallery();

                    }}
                    aria-label="Ảnh trước"
                  >

                    <ChevronLeft
                      size={20}
                    />

                  </button>


                  <button
                    type="button"
                    className="home-gallery-nav home-gallery-next"
                    onClick={(
                      event
                    ) => {

                      event.stopPropagation();

                      nextGallery();

                    }}
                    aria-label="Ảnh tiếp theo"
                  >

                    <ChevronRight
                      size={20}
                    />

                  </button>

                </>
              )}


              {gallery.length > 1 && (

                <div
                  className="home-gallery-progress"
                  aria-hidden="true"
                >

                  <div
                    key={
                      galleryIndex
                    }
                    className={`home-gallery-progress-bar ${
                      galleryPaused
                        ? "paused"
                        : ""
                    }`}
                  />

                </div>

              )}

            </div>


            {/* =========================================
                SIDE
            ========================================= */}

            <div className="home-gallery-side">

              <div className="home-gallery-side-top">

                <div>

                  <span>
                    HÌNH ẢNH
                  </span>

                  <strong>

                    {String(
                      galleryIndex +
                        1
                    ).padStart(
                      2,
                      "0"
                    )}

                    <small>
                      {" "}
                      /{" "}
                      {String(
                        gallery.length
                      ).padStart(
                        2,
                        "0"
                      )}
                    </small>

                  </strong>

                </div>


                <button
                  type="button"
                  className="home-gallery-pause"
                  onClick={() =>
                    setGalleryPaused(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  aria-label={
                    galleryPaused
                      ? "Phát slideshow"
                      : "Tạm dừng slideshow"
                  }
                >

                  {galleryPaused ? (

                    <Play
                      size={17}
                    />

                  ) : (

                    <Pause
                      size={17}
                    />

                  )}

                </button>

              </div>


              <div className="home-gallery-thumbnails">

                {gallery.map(
                  (
                    item,
                    index
                  ) => (

                    <button
                      key={
                        item.id
                      }
                      type="button"
                      className={`home-gallery-thumb ${
                        index ===
                        galleryIndex
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setGalleryIndex(
                          index
                        )
                      }
                    >

                      <Image
                        src={
                          item.image_url
                        }
                        alt={
                          item.title ||
                          "Ảnh hoạt động"
                        }
                        fill
                        sizes="160px"
                        style={{
                          objectFit:
                            "cover",
                        }}
                      />

                      <span>
                        {String(
                          index +
                            1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>

                    </button>

                  )
                )}

              </div>


              <div className="home-gallery-side-footer">

                <Images
                  size={17}
                />

                <span>
                  {
                    gallery.length
                  }{" "}
                  hình ảnh
                </span>

                <Link href="#tai-lieu">
                  Xem tài liệu →
                </Link>

              </div>

            </div>

          </div>

        )}

      </section>


      {/* ===================================================
          LIÊN HỆ
      =================================================== */}

      <section
        id="lien-he"
        className="contact-section"
      >

        <div className="contact-container">

          <div className="contact-heading">

            <span className="small-title">
              THÔNG TIN LIÊN HỆ
            </span>

            <h2>
              BCH Chi đoàn D-K66
            </h2>

            <p>
              Không gian kết nối và trao đổi
              chính thức của Ban Chấp hành Chi
              đoàn D-K66 — Trường THPT Hà Trung.
            </p>

          </div>


          <div className="contact-grid">

            <div className="contact-card">

              <h3>
                Thông tin liên hệ
              </h3>


              <div className="contact-item">

                <div className="contact-icon">
                  ✦
                </div>

                <div>

                  <strong>
                    Đơn vị
                  </strong>

                  <span>
                    Chi đoàn D-K66
                    <br />
                    Trường THPT Hà Trung
                  </span>

                </div>

              </div>


              <div className="contact-item">

                <div className="contact-icon">
                  ☎
                </div>

                <div>

                  <strong>
                    Điện thoại
                  </strong>

                  <span>
                    0967 505 501
                  </span>

                </div>

              </div>


              <div className="contact-item">

                <div className="contact-icon">
                  @
                </div>

                <div>

                  <strong>
                    Email
                  </strong>

                  <span>
                    contactdbao0112@gmail.com
                  </span>

                </div>

              </div>


              <div className="contact-item">

                <div className="contact-icon">
                  ◇
                </div>

                <div>

                  <strong>
                    Địa chỉ
                  </strong>

                  <span>
                    THPT Hà Trung
                    <br />
                    Hoạt Giang, Thanh Hóa
                  </span>

                </div>

              </div>

            </div>


            <div className="bch-card">

              <h3>
                Ban Chấp hành
              </h3>

              <p>
                Thông tin Ban Chấp hành Chi đoàn
                D-K66.
              </p>


              <div className="bch-member">

                <div className="bch-avatar">
                  PBT
                </div>

                <div>

                  <strong>
                    Đinh Anh Bảo
                  </strong>

                  <span>
                    Phó Bí thư Chi đoàn
                  </span>

                </div>

              </div>


              <div className="bch-member">

                <div className="bch-avatar">
                  BT
                </div>

                <div>

                  <strong>
                    Nguyễn Thị Huyền
                  </strong>

                  <span>
                    Bí thư Chi đoàn
                  </span>

                </div>

              </div>


              <div className="bch-member">

                <div className="bch-avatar">
                  UV
                </div>

                <div>

                  <strong>
                    Đỗ Ngọc Châu
                  </strong>

                  <span>
                    Ủy viên BCH
                  </span>

                </div>

              </div>


              <div className="bch-member">

                <div className="bch-avatar">
                  ĐV
                </div>

                <div>

                  <strong>
                    {total} Đoàn viên
                  </strong>

                  <span>
                    Tổng số đoàn viên hiện tại
                  </span>

                </div>

              </div>

            </div>

          </div>


          <div className="contact-footer">
            CHI ĐOÀN D-K66 · TRƯỜNG THPT HÀ TRUNG ·
            XÃ HOẠT GIANG · TỈNH THANH HÓA ·
            NHIỆM KỲ 2025 — 2028
          </div>

        </div>

      </section>


      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="footer">

        <div className="footer-brand">

          <Image
            src="/logo-truong.png"
            alt="THPT Hà Trung"
            width={48}
            height={48}
          />

          <div>

            <strong>
              CHI ĐOÀN D-K66
            </strong>

            <span>
              TRƯỜNG THPT HÀ TRUNG
            </span>

          </div>

        </div>


        <p>
          © 2025 — 2028 · PBT. Đinh Anh Bảo ·
          BCH Chi đoàn D-K66
        </p>


        <a href="#top">
          ↑
        </a>

      </footer>


      {/* ===================================================
          GALLERY LIGHTBOX
      =================================================== */}

      {galleryModalOpen &&
        gallery.length > 0 && (

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Xem hình ảnh"
            onMouseDown={(
              event
            ) => {

              if (
                event.target ===
                event.currentTarget
              ) {
                closeGallery();
              }

            }}
            style={{
              position:
                "fixed",
              inset: 0,
              zIndex: 9999,
              background:
                "rgba(2, 6, 23, .94)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding: "30px",
            }}
          >

            <button
              type="button"
              onClick={
                closeGallery
              }
              aria-label="Đóng"
              style={{
                position:
                  "absolute",
                top: "20px",
                right: "20px",
                zIndex: 2,
                width: "44px",
                height: "44px",
                borderRadius:
                  "50%",
                border: 0,
                background:
                  "rgba(255,255,255,.12)",
                color: "#fff",
                display: "grid",
                placeItems:
                  "center",
                cursor: "pointer",
              }}
            >

              <X
                size={22}
              />

            </button>


            <button
              type="button"
              onClick={
                previousGallery
              }
              aria-label="Ảnh trước"
              style={{
                position:
                  "absolute",
                left: "20px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                zIndex: 2,
                width: "48px",
                height: "48px",
                borderRadius:
                  "50%",
                border: 0,
                background:
                  "rgba(255,255,255,.12)",
                color: "#fff",
                display: "grid",
                placeItems:
                  "center",
                cursor: "pointer",
              }}
            >

              <ChevronLeft
                size={26}
              />

            </button>


            <div
              style={{
                width:
                  "min(1100px, 90vw)",
                height:
                  "min(760px, 82vh)",
                position:
                  "relative",
              }}
            >

              <Image
                src={
                  gallery[
                    galleryIndex
                  ].image_url
                }
                alt={
                  gallery[
                    galleryIndex
                  ].title ||
                  "Ảnh hoạt động"
                }
                fill
                sizes="90vw"
                style={{
                  objectFit:
                    "contain",
                }}
                priority
              />


              <div
                style={{
                  position:
                    "absolute",
                  left: 0,
                  right: 0,
                  bottom:
                    "-55px",
                  textAlign:
                    "center",
                  color: "#fff",
                }}
              >

                <strong>
                  {gallery[
                    galleryIndex
                  ].title ||
                    "Ảnh hoạt động"}
                </strong>

                <span
                  style={{
                    marginLeft:
                      "12px",
                    opacity:
                      0.6,
                    fontSize:
                      "13px",
                  }}
                >
                  {galleryIndex +
                    1}{" "}
                  /{" "}
                  {gallery.length}
                </span>

              </div>

            </div>


            <button
              type="button"
              onClick={
                nextGallery
              }
              aria-label="Ảnh tiếp theo"
              style={{
                position:
                  "absolute",
                right: "20px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                zIndex: 2,
                width: "48px",
                height: "48px",
                borderRadius:
                  "50%",
                border: 0,
                background:
                  "rgba(255,255,255,.12)",
                color: "#fff",
                display: "grid",
                placeItems:
                  "center",
                cursor: "pointer",
              }}
            >

              <ChevronRight
                size={26}
              />

            </button>

          </div>

        )}
        <WebsiteAI />

    </main>
  );
}