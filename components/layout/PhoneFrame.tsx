import type { ReactNode } from "react";

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-white sm:flex sm:items-center sm:justify-center sm:bg-gray-100 sm:p-4">
      <div className="relative flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white sm:h-[min(850px,calc(100dvh-32px))] sm:w-[400px] sm:rounded-[3rem] sm:border-[12px] sm:border-gray-900 sm:shadow-2xl">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-900 sm:block" />
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
