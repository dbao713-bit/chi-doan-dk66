"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Announcement = {
  id: string;
  title: string;
  content: string;
  image: string;
  author: string;
  created_at: string;
};

export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    loadMembers();
    loadAnnouncements();
  }, []);

  async function loadMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("*");

    if (error) {
      console.log(error);
      return;
    }

    setMembers(data ?? []);
  }

  async function loadAnnouncements() {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.log(error);
      return;
    }

    setAnnouncements(data ?? []);
  }

const total = members.length;

const male = members.filter(
  (m) => m.gender === "Nam"
).length;

const female = members.filter(
  (m) => m.gender === "Nữ"
).length;

  return (
    <main className="site">

      {/* ================= HEADER ================= */}
      <header className="header">
        <div className="header-inner">

          <a href="#" className="brand">
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
              <strong>CHI ĐOÀN D-K66</strong>
              <span>TRƯỜNG THPT HÀ TRUNG</span>
            </div>
          </a>

          <nav className={`nav ${menuOpen ? "nav-open" : ""}`}>
            <a href="#gioi-thieu">Giới thiệu</a>
            <a href="#hoat-dong">Hoạt động</a>
            <a href="#tai-lieu">Tài liệu</a>
            <a href="#thu-vien">Thư viện</a>
            <a href="#lien-he">Liên hệ</a>
          </nav>

          <a href="/admin" className="admin-button">
  BCH / ADMIN
</a>

          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Mở menu"
          >
            ☰
          </button>

        </div>
      </header>


      {/* ================= HERO ================= */}
      <section className="hero">

        <div className="hero-background" />

        <div className="hero-overlay" />

        {/* Họa tiết trống đồng */}
        <div className="drum-pattern drum-one">✦</div>
        <div className="drum-pattern drum-two">✦</div>

        <div className="hero-content">

          <div className="hero-badge">
            CHI ĐOÀN THANH NIÊN
          </div>

          <h1>
            CHI ĐOÀN
            <span>D-K66</span>
          </h1>

          <div className="hero-school">
            TRƯỜNG THPT HÀ TRUNG
          </div>

          <div className="hero-divider" />

          <p className="hero-year">
            Nhiệm kỳ <strong>2025 — 2028</strong>
          </p>

          <p className="hero-motto">
            Đoàn kết · Trách nhiệm · Tiên phong · Sáng tạo
          </p>


          {/* Thống kê */}
          <div className="stats">

  <div className="stat">
    <strong>{total}</strong>
    <span>ĐOÀN VIÊN</span>
  </div>

  <div className="stat">
    <strong>{male}</strong>
    <span>NAM</span>
  </div>

  <div className="stat">
    <strong>{female}</strong>
    <span>NỮ</span>
  </div>

</div>


          <a href="#gioi-thieu" className="hero-button">
            KHÁM PHÁ CHI ĐOÀN
            <span>↓</span>
          </a>

        </div>
      </section>


      {/* ================= GIỚI THIỆU ================= */}
      <section id="gioi-thieu" className="section introduction">

        <div className="section-heading">
          <span className="section-number">01</span>

          <div>
            <span className="eyebrow">VỀ CHÚNG TÔI</span>
            <h2>Giới thiệu Chi đoàn</h2>
          </div>
        </div>

        <div className="intro-grid">

          <div className="intro-text">
            <p className="lead">
              Chi đoàn D-K66 là tập thể thanh niên thuộc Trường THPT Hà Trung,
              nhiệm kỳ 2025 — 2028.
            </p>

            <p>
              Với tinh thần đoàn kết, trách nhiệm và sáng tạo, Chi đoàn hướng
              tới xây dựng một tập thể học sinh năng động, tích cực tham gia
              các hoạt động học tập, phong trào thanh niên và hoạt động xã hội.
            </p>

            <p>
              Website này được xây dựng như một không gian số riêng của Chi
              đoàn, phục vụ công tác quản lý đoàn viên, lưu trữ tài liệu,
              thông báo và ghi lại những hoạt động đáng nhớ của tập thể.
            </p>
          </div>

          <div className="intro-card">

            <div className="card-symbol">✦</div>

            <h3>
              ĐOÀN KẾT
              <br />
              <span>TRÁCH NHIỆM</span>
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


      {/* ================= BCH ================= */}
      <section className="section bch-section">

        <div className="section-heading">
          <span className="section-number">02</span>

          <div>
            <span className="eyebrow">BAN CHẤP HÀNH</span>
            <h2>BCH Chi đoàn</h2>
          </div>
        </div>

        <div className="bch-placeholder">

          <div className="placeholder-icon">♢</div>

          <h3>Ban Chấp hành Chi đoàn D-K66</h3>

          <p>
            Thông tin BCH sẽ được cập nhật tại đây.
          </p>

          <span>
            Bạn có thể thêm ảnh, chức vụ và thông tin liên hệ sau.
          </span>

        </div>

      </section>


      {/* ================= HOẠT ĐỘNG ================= */}
      <section id="hoat-dong" className="section activity-section">

        <div className="section-heading">
          <span className="section-number">03</span>

          <div>
            <span className="eyebrow">TIN TỨC & SỰ KIỆN</span>
            <h2>Hoạt động Chi đoàn</h2>
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
              <span>HOẠT ĐỘNG</span>
              <h3>
                Những khoảnh khắc đáng nhớ của tập thể D-K66
              </h3>
              <p>
                Nơi lưu giữ những hình ảnh và hoạt động đáng nhớ của Chi đoàn.
              </p>
            </div>
          </article>


          <div className="activity-side">

           <article className="mini-card">
  <span className="mini-number">01</span>

  <div>
    <span>THÔNG BÁO</span>

    <h3>
      {announcements.length > 0
        ? announcements[0].title
        : "Chưa có thông báo"}
    </h3>

    <p>
      {announcements.length > 0
        ? announcements[0].content.substring(0, 100) + "..."
        : "Hiện chưa có thông báo nào."}
    </p>

    {announcements.length > 0 && (
      <small
        style={{
          display: "block",
          marginTop: "10px",
          color: "#6b7280",
        }}
      >
        {announcements[0].author} •{" "}
        {new Date(
          announcements[0].created_at
        ).toLocaleDateString("vi-VN")}
      </small>
    )}
  </div>
</article>

            <div className="activity-side">

  {/* Thông báo mới nhất */}
  <article className="mini-card">
    <span className="mini-number">01</span>

    <div>
      <span>THÔNG BÁO</span>

      {announcements.length > 0 ? (
        <>
          <Link href={`/announcement/${announcements[0].id}`}>
            <h3 className="hover:text-blue-600 cursor-pointer transition">
              {announcements[0].title}
            </h3>
          </Link>

          <p>
            {announcements[0].content.substring(0, 100)}
            {announcements[0].content.length > 100 ? "..." : ""}
          </p>

          <small
            style={{
              display: "block",
              marginTop: "12px",
              color: "#64748b",
            }}
          >
            {announcements[0].author} •{" "}
            {new Date(
              announcements[0].created_at
            ).toLocaleDateString("vi-VN")}
          </small>

          <Link
            href={`/announcement/${announcements[0].id}`}
            className="mt-4 inline-block text-blue-600 font-semibold hover:underline"
          >
            Xem chi tiết →
          </Link>
        </>
      ) : (
        <>
          <h3>Chưa có thông báo</h3>
          <p>Hiện chưa có thông báo nào.</p>
        </>
      )}
    </div>
  </article>

  {/* Thông báo thứ hai */}
  <article className="mini-card">
    <span className="mini-number">02</span>

    <div>
      <span>THÔNG BÁO</span>

      {announcements.length > 1 ? (
        <>
          <Link href={`/announcement/${announcements[1].id}`}>
            <h3 className="hover:text-blue-600 cursor-pointer transition">
              {announcements[1].title}
            </h3>
          </Link>

          <p>
            {announcements[1].content.substring(0, 100)}
            {announcements[1].content.length > 100 ? "..." : ""}
          </p>

          <small
            style={{
              display: "block",
              marginTop: "12px",
              color: "#64748b",
            }}
          >
            {announcements[1].author} •{" "}
            {new Date(
              announcements[1].created_at
            ).toLocaleDateString("vi-VN")}
          </small>

          <Link
            href={`/announcement/${announcements[1].id}`}
            className="mt-4 inline-block text-blue-600 font-semibold hover:underline"
          >
            Xem chi tiết →
          </Link>
        </>
      ) : (
        <>
          <h3>Chưa có thông báo</h3>
          <p></p>
        </>
      )}
    </div>
  </article>

</div>

          </div>

        </div>
      </section>


      {/* ================= TÀI LIỆU ================= */}
      <section id="tai-lieu" className="section documents-section">

        <div className="section-heading">
          <span className="section-number">04</span>

          <div>
            <span className="eyebrow">KHO TRI THỨC</span>
            <h2>Tài liệu Chi đoàn</h2>
          </div>
        </div>

        <div className="document-grid">

          <div className="document-card">
            <div className="document-icon">01</div>
            <h3>Văn bản Đoàn</h3>
            <p>
              Văn bản, quy định và hướng dẫn công tác Đoàn.
            </p>
          </div>

          <div className="document-card">
            <div className="document-icon">02</div>
            <h3>Kế hoạch</h3>
            <p>
              Kế hoạch hoạt động của Chi đoàn theo từng giai đoạn.
            </p>
          </div>

          <div className="document-card">
            <div className="document-icon">03</div>
            <h3>Biên bản</h3>
            <p>
              Biên bản họp và các tài liệu nội bộ của Chi đoàn.
            </p>
          </div>

          <div className="document-card">
            <div className="document-icon">04</div>
            <h3>Tài liệu khác</h3>
            <p>
              Kho lưu trữ các tài liệu phục vụ hoạt động.
            </p>
          </div>

        </div>
      </section>


      {/* ================= THƯ VIỆN ================= */}
      <section id="thu-vien" className="section library-section">

        <div className="section-heading">
          <span className="section-number">05</span>

          <div>
            <span className="eyebrow">KỶ NIỆM</span>
            <h2>Thư viện hình ảnh</h2>
          </div>
        </div>

        <div className="gallery">

          <div className="gallery-main">
            <Image
              src="/anh-lop.jpg"
              alt="Tập thể D-K66"
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
            />
          </div>

          <div className="gallery-placeholder">
            <span>+</span>
            <p>
              Thêm hình ảnh hoạt động
            </p>
          </div>

        </div>
      </section>


      {/* ================= LIÊN HỆ ================= */}
<section id="lien-he" className="contact-section">

  <div className="contact-container">

    {/* Tiêu đề */}
    <div className="contact-heading">

      <span className="small-title">
        THÔNG TIN LIÊN HỆ
      </span>

      <h2>
        BCH Chi đoàn D-K66
      </h2>

      <p>
        Không gian kết nối và trao đổi chính thức của Ban Chấp hành
        Chi đoàn D-K66 — Trường THPT Hà Trung.
      </p>

    </div>


    {/* Nội dung */}
    <div className="contact-grid">

      {/* Thông tin liên hệ */}
      <div className="contact-card">

        <h3>
          Thông tin liên hệ
        </h3>


        <div className="contact-item">

          <div className="contact-icon">
            ✦
          </div>

          <div>
            <strong>Đơn vị</strong>

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
            <strong>Điện thoại</strong>

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
            <strong>Email</strong>

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
            <strong>Địa chỉ</strong>

            <span>
              THPT Hà Trung
              <br />
              Hoạt Giang, Thanh Hóa
            </span>
          </div>

        </div>

      </div>


      {/* BCH */}
      <div className="bch-card">

        <h3>
          Ban Chấp hành
        </h3>

        <p>
          Thông tin Ban Chấp hành Chi đoàn D-K66.
          Nội dung này có thể được cập nhật trực tiếp
          từ trang quản trị sau này.
        </p>


        <div className="bch-member">

          <div className="bch-avatar">
            PBT
          </div>

          <div>
            <strong>
              Đinh Anh Bảo (Web Developer)
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
              Uỷ Viên
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
      CHI ĐOÀN D-K66 · TRƯỜNG THPT HÀ TRUNG · NHIỆM KỲ 2025 — 2028
    </div>

  </div>

</section>


      {/* ================= FOOTER ================= */}
      <footer className="footer">

        <div className="footer-brand">

          <Image
            src="/logo-truong.png"
            alt="THPT Hà Trung"
            width={48}
            height={48}
          />

          <div>
            <strong>CHI ĐOÀN D-K66</strong>
            <span>TRƯỜNG THPT HÀ TRUNG</span>
          </div>

        </div>

        <p>
          © 2025 — 2028 · PBT. Đinh Anh Bảo · BCH Chi đoàn D-K66
        </p>

        <a href="#top">
          ↑
        </a>

      </footer>

    </main>
  );
}