"use client";

import { useEffect } from "react";

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error("화면 렌더링 오류", error);
  }, [error]);

  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold text-gray-900">화면을 표시하지 못했어요</h1>
      <p className="text-sm text-gray-600">잠시 후 다시 시도해주세요.</p>
      <button type="button" onClick={unstable_retry} className="min-h-11 rounded-xl bg-[#6ea447] px-6 font-bold text-white">다시 시도</button>
    </div>
  );
}
