import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "课题组设备预约",
  description: "课题组内部实验设备预约 MVP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
