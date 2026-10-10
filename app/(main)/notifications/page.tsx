"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell, Info, CheckCircle2, AlertTriangle, Sprout, RefreshCw } from "lucide-react";
import { getNotifications } from "@/lib/get";
import { readNotification } from "@/lib/patch";
import { RequestError } from "@/components/ui/RequestState";
import PullToRefreshStatus from "@/components/ui/PullToRefreshStatus";
import { usePullToRefresh } from "@/lib/usePullToRefresh";

interface NotificationItem {
  _id?: string;
  id?: string;
  title: string;
  message?: string;
  content?: string;
  createdAt: string;
  type?: string;
  isRead?: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionFeedback, setActionFeedback] = useState("");
  const pullState = usePullToRefresh(() => setRetryCount((value) => value + 1));

  useEffect(() => {
    const fetchNotis = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const data = await getNotifications();
        if (data?.success === false) throw new Error("알림을 불러오지 못했습니다.");
        const notis: NotificationItem[] = data?.notifications || [];
        // 시간 역순 정렬
        setNotifications([...notis].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setPage(1);
        setHasMore(notis.length === 30);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchNotis();
  }, [retryCount]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setActionError("");
    try {
      const nextPage = page + 1;
      const data = await getNotifications(nextPage);
      if (data?.success === false) throw new Error("추가 알림을 불러오지 못했습니다.");
      const items: NotificationItem[] = data?.notifications || [];
      setNotifications((previous) => [...previous, ...items]);
      setPage(nextPage);
      setHasMore(items.length === 30);
    } catch {
      setActionError("추가 알림을 불러오지 못했어요. 다시 시도해주세요.");
    } finally {
      setLoadingMore(false);
    }
  };

  const markAsRead = async (item: NotificationItem) => {
    const id = item._id || item.id;
    if (!id || item.isRead) return;
    setActionError("");
    setActionFeedback("");
    setNotifications((previous) => previous.map((value) => (value._id || value.id) === id ? { ...value, isRead: true } : value));
    try {
      const result = await readNotification(id);
      if (result.success === false) throw new Error("읽음 처리 실패");
      setActionFeedback("알림을 읽음 처리했어요.");
    } catch {
      setNotifications((previous) => previous.map((value) => (value._id || value.id) === id ? { ...value, isRead: false } : value));
      setActionError("알림을 읽음 처리하지 못했어요. 다시 시도해주세요.");
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "날짜 미상";
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      const ampm = d.getHours() < 12 ? "오전" : "오후";
      let hh = d.getHours() % 12;
      if (hh === 0) hh = 12;
      const min = String(d.getMinutes()).padStart(2, "0");
      return `오늘 ${ampm} ${hh}:${min}`;
    } else {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${mm}월 ${dd}일`;
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "info": return <Info size={20} className="text-blue-500" />;
      case "success": return <CheckCircle2 size={20} className="text-[#6ea447]" />;
      case "warning": return <AlertTriangle size={20} className="text-orange-500" />;
      case "sensor": return <AlertTriangle size={20} className="text-orange-500" />;
      case "plant": return <Sprout size={20} className="text-[#6ea447]" />;
      default: return <Bell size={20} className="text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      <PullToRefreshStatus state={pullState} />
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
        <button type="button" aria-label="뒤로 가기" onClick={() => router.back()} className="icon-button text-gray-800 hover:text-black transition-colors -ml-2">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <h1 className="text-lg font-extrabold text-gray-800">알림</h1>
        <button type="button" aria-label="알림 새로고침" onClick={() => setRetryCount((value) => value + 1)} className="icon-button text-gray-700"><RefreshCw size={20} /></button>
      </header>

      {/* 알림 목록 */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-20 hide-scrollbar">
        {loading ? (
          <div role="status" aria-label="알림을 불러오는 중" className="flex flex-col gap-4">
            <span className="sr-only">알림을 불러오는 중…</span>
            {[1, 2, 3, 4].map(i => (
              <div key={i} aria-hidden="true" className="flex animate-pulse gap-4 rounded-[1.25rem] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100"></div>
                <div className="flex flex-1 flex-col gap-2 pt-1">
                  <div className="h-4 w-32 rounded-full bg-gray-100"></div>
                  <div className="h-3 w-48 rounded-full bg-gray-50"></div>
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? <RequestError onRetry={() => setRetryCount((value) => value + 1)} /> : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Bell size={28} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">새로운 알림이 없어요</h3>
            <p className="text-sm font-medium text-gray-400">식물 성장 소식이나 새 소식이 오면 알려드릴게요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {notifications.map((noti, idx) => (
              <button type="button"
                key={noti._id || idx} 
                disabled={!(noti._id || noti.id)}
                onClick={() => markAsRead(noti)}
                aria-label={`${noti.title}, ${noti.isRead ? "읽음" : "읽지 않음. 눌러 읽음 처리"}`}
                aria-pressed={Boolean(noti.isRead)}
                className={`flex w-full gap-4 rounded-[1.25rem] border border-gray-100 bg-white p-5 text-left shadow-sm transition-colors disabled:cursor-default ${noti.isRead ? 'opacity-70' : 'hover:bg-gray-50'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${noti.isRead ? 'bg-gray-50' : 'bg-[#f4f8f1]'}`}>
                  {getIcon(noti.type || "default")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-[15px] font-extrabold text-gray-800 truncate pr-2">{noti.title}</h4>
                    <span className="text-[11px] font-bold text-gray-400 shrink-0 whitespace-nowrap mt-0.5">
                      {formatDate(noti.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-gray-600 leading-relaxed line-clamp-2">
                    {noti.message || noti.content}
                  </p>
                  <span className={`mt-1 inline-block text-[11px] font-bold ${noti.isRead ? "text-gray-500" : "text-[#496d2f]"}`}>
                    {noti.isRead ? "읽음" : "읽지 않음"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {!loading && !loadError && hasMore && <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-5 min-h-11 w-full rounded-xl border border-gray-200 font-bold text-gray-700">{loadingMore ? "불러오는 중…" : "알림 더 보기"}</button>}
        {actionFeedback && <p role="status" aria-live="polite" className="mt-3 text-center text-sm font-semibold text-[#496d2f]">{actionFeedback}</p>}
        {actionError && <p role="alert" className="mt-3 text-center text-sm text-red-700">{actionError}</p>}
      </div>
    </div>
  );
}
