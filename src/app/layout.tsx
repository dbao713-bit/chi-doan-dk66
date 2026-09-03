import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D-K66",
  description: "Chi đoàn D-K66 – Trường THPT Hà Trung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
