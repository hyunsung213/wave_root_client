import type { ReactNode } from "react";

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-white sm:flex sm:items-center sm:justify-center sm:bg-gray-100 sm:p-4">
      <a href="#main-content" className="sr-only z-[200] rounded-lg bg-white px-4 py-3 font-bold text-gray-900 shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        본문으로 건너뛰기
      </a>
      <div className="relative flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white sm:h-[min(850px,calc(100dvh-32px))] sm:w-[400px] sm:rounded-[3rem] sm:border-[12px] sm:border-gray-900 sm:shadow-2xl">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-900 sm:block" />
        <main id="main-content" tabIndex={-1} className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
          {children}
        </main>
      </div>
    </div>
  );
}
