import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "คู่มือการตั้งค่า",
  description: "สร้างคู่มือการตั้งค่าจากรูปภาพด้วย AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
