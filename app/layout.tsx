import type { Metadata, Viewport } from "next";
import "./globals.css";
import PhoneFrame from "@/components/layout/PhoneFrame";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "싹키워 - 식물과 함께 건강한 일상",
  description: "스마트 식물 재배 앱 싹키워",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6ea447",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegistration />
        <PhoneFrame>{children}</PhoneFrame>
      </body>
    </html>
  );
}
