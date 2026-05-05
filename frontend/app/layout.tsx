import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Border Checker | 클라우드 국외이전 컴플라이언스 검토",
  description:
    "클라우드 리소스의 국외이전 컴플라이언스 검토를 지원하는 워크플로우 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
