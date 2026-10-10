import type { PullToRefreshState } from "@/lib/usePullToRefresh";

export default function PullToRefreshStatus({ state }: { state: PullToRefreshState }) {
  if (state === "idle") return null;
  const message = state === "refreshing" ? "새로고침을 요청했어요…" : state === "armed" ? "놓으면 새로고침" : "아래로 당겨 새로고침";
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="mx-auto my-2 min-h-8 w-fit rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
      {message}
    </div>
  );
}
