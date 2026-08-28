import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "싹키워 - 식물과 함께 건강한 일상",
  description: "스마트 식물 재배 앱 싹키워",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="flex items-center justify-center min-h-screen">
        {/* 스마트폰 테두리 프레임 */}
        <div className="relative w-full max-w-[400px] h-[850px] bg-white rounded-[3rem] border-[12px] border-gray-900 shadow-2xl overflow-hidden flex flex-col">
          {/* 노치(Notch) 디자인 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-50"></div>
          
          {/* 실제 페이지 콘텐츠 영역 (스크롤 가능) */}
          <div className="flex-1 overflow-y-auto flex flex-col relative w-full h-full">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
