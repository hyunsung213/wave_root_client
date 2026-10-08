import type { ReactNode } from "react";

export function RequestError({ message = "정보를 불러오지 못했어요. 연결 상태를 확인한 뒤 다시 시도해주세요.", onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
      <p className="text-sm font-semibold text-red-800">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-xl bg-white px-5 font-bold text-red-700 shadow-sm">다시 시도</button>
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
      <p className="text-sm font-semibold text-gray-600">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
