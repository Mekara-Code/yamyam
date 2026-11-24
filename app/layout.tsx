import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "یام‌یام | از گوجه تا قوطی",
  description: "ویدیوی رب گوجه‌فرنگی یام‌یام را با اسکرول دنبال کنید.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">رفتن به محتوای اصلی</a>
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>{children}</main>
      </body>
    </html>
  );
}
