export default function Loading() {
  return (
    <div role="status" aria-label="화면을 불러오는 중" className="space-y-5 p-6">
      <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
      <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
      <span className="sr-only">화면을 불러오는 중입니다.</span>
    </div>
  );
}
