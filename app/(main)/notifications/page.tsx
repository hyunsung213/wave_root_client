"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell, Info, CheckCircle2, AlertTriangle, Sprout } from "lucide-react";
import { getNotifications } from "@/lib/get";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotis = async () => {
      try {
        const data = await getNotifications();
        let notis = data?.notifications || [];
        // 시간 역순 정렬
        notis.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(notis);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotis();
  }, []);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
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
    switch (type) {
      case "info": return <Info size={20} className="text-blue-500" />;
      case "success": return <CheckCircle2 size={20} className="text-[#6ea447]" />;
      case "warning": return <AlertTriangle size={20} className="text-orange-500" />;
      case "plant": return <Sprout size={20} className="text-[#6ea447]" />;
      default: return <Bell size={20} className="text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
        <button onClick={() => router.back()} className="text-gray-800 hover:text-black transition-colors -ml-2 p-2">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <h1 className="text-lg font-extrabold text-gray-800">알림</h1>
        <div className="w-8"></div> {/* 여백용 */}
      </header>

      {/* 알림 목록 */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-20 hide-scrollbar">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-5 rounded-[1.25rem] border border-gray-100 shadow-sm animate-pulse flex gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0"></div>
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <div className="h-4 w-32 bg-gray-100 rounded-full"></div>
                  <div className="h-3 w-48 bg-gray-50 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
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
              <div 
                key={noti._id || idx} 
                className={`bg-white p-5 rounded-[1.25rem] border border-gray-100 shadow-sm transition-colors cursor-pointer hover:bg-gray-50 flex gap-4 ${noti.isRead ? 'opacity-60' : ''}`}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
