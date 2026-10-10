"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, Settings, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { getEvents, getPlantsWithRecords } from "@/lib/get";
import { getGrowth } from "@/lib/growth";
import { useStore, type Plant } from "@/store/useStore";
import { EmptyState, RequestError } from "@/components/ui/RequestState";
import PullToRefreshStatus from "@/components/ui/PullToRefreshStatus";
import { usePullToRefresh } from "@/lib/usePullToRefresh";

const BottomSheet = dynamic(() => import("@/components/ui/BottomSheet"), { ssr: false });

interface GrowthEvent {
  _id?: string;
  title: string;
  content: string;
  imageUrl?: string;
  eventDate?: string;
  createdAt?: string;
}

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function RecordPage() {
  const router = useRouter();
  const myPlants = useStore((state) => state.myPlants);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [plantsList, setPlantsList] = useState<Plant[]>(myPlants);
  
  const currentPlant = plantsList[activeIndex];
  
  const [eventsHistory, setEventsHistory] = useState<GrowthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantsLoading, setPlantsLoading] = useState(true);
  const [plantsError, setPlantsError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const isMounted = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  
  // Modal States
  const [selectedEvent, setSelectedEvent] = useState<GrowthEvent | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const pullState = usePullToRefresh(() => setRetryCount((value) => value + 1));

  const openSheet = (event: GrowthEvent) => {
    setSelectedEvent(event);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => setSelectedEvent(null), 400);
  };

  useEffect(() => {
    const fetchPlants = async () => {
      setPlantsLoading(true);
      setPlantsError(false);
      try {
        const data = await getPlantsWithRecords();
        if (data.success) {
          const fetched = data.plants || data.data || [];
          setPlantsList(fetched);
          setActiveIndex((index) => index >= fetched.length ? 0 : index);
        } else throw new Error("식물 목록을 불러오지 못했습니다.");
      } catch (err) {
        console.error("Failed to fetch plants with records", err);
        setPlantsError(true);
      } finally {
        setPlantsLoading(false);
      }
    };
    fetchPlants();
  }, [retryCount]);

  useEffect(() => {
    const fetchHistories = async () => {
      if (plantsLoading) return;
      if (!currentPlant?._id) {
        setLoading(false);
        setEventsHistory([]);
        return;
      }
      setLoading(true);
      setHistoryError(false);
      try {
        const eventsData = await getEvents(currentPlant._id, 1, 30, 'desc');
        if (!eventsData.success) throw new Error("기록을 불러오지 못했습니다.");
        const events = eventsData.events || [];
        setEventsHistory(events);
        setPage(1);
        setHasMore(events.length === 30);
      } catch (error) {
        console.error("Failed to fetch histories", error);
        setHistoryError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistories();
  }, [currentPlant?._id, plantsLoading, retryCount]);

  const loadMore = async () => {
    if (!currentPlant?._id || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const nextPage = page + 1;
      const data = await getEvents(currentPlant._id, nextPage, 30, 'desc');
      if (!data.success) throw new Error("추가 기록을 불러오지 못했습니다.");
      const events = data.events || [];
      setEventsHistory((previous) => [...previous, ...events]);
      setPage(nextPage);
      setHasMore(events.length === 30);
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const getPlantImage = (type: string = "") => {
    if (type.includes("토마토")) return "/plants/tomato.png";
    if (type.includes("바질")) return "/plants/basil.png";
    if (type.includes("상추")) return "/plants/lettuce.png";
    return "/plants/tomato.png";
  };

  const calculateDday = (createdAt: string) => {
    const start = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "날짜 미상";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "날짜 미상";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const ampm = d.getHours() < 12 ? "오전" : "오후";
    let hh = d.getHours() % 12;
    if (hh === 0) hh = 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${mm}.${dd} ${ampm} ${hh}:${min}`;
  };

  const renderSkeleton = (label: string) => (
    <div role="status" aria-label={label} className="mt-2">
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-gray-100"></div>
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="h-3 w-20 rounded-full bg-gray-100"></div>
              <div className="h-2.5 w-32 rounded-full bg-gray-50"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-white min-h-full">
      <PullToRefreshStatus state={pullState} />
      {/* 헤더 */}
      <header className="flex justify-between items-center px-6 pt-6 pb-4">
        <h1 className="text-[26px] font-black text-[#6ea447] tracking-tight">싹키워</h1>
        <div className="flex gap-3 text-gray-500">
          <button type="button" aria-label="새로고침" onClick={() => setRetryCount((value) => value + 1)} className="icon-button"><RefreshCw size={20} /></button>
          <button aria-label="알림" onClick={() => router.push('/notifications')} className="icon-button hover:text-gray-800 transition-colors relative">
            <Bell size={24} strokeWidth={2} />
          </button>
          <button aria-label="회원 정보" onClick={() => router.push('/profile')} className="icon-button hover:text-gray-800 transition-colors">
            <Settings size={24} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="px-6 flex flex-col gap-5">
        {plantsError ? <RequestError onRetry={() => setRetryCount((value) => value + 1)} /> : plantsLoading ? renderSkeleton("식물 목록을 불러오는 중") : plantsList.length === 0 ? (
          <EmptyState message="아직 기록할 식물이 없어요." action={<button type="button" onClick={() => router.push('/market')} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold text-white">식물 둘러보기</button>} />
        ) : <>
        {/* 식물 캐러셀 */}
        <section>
          <div 
            className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 hide-scrollbar"
            onScroll={(e) => {
              const container = e.currentTarget;
              const newIndex = Math.round(container.scrollLeft / container.clientWidth);
              if (newIndex !== activeIndex && newIndex >= 0 && newIndex < plantsList.length) {
                setActiveIndex(newIndex);
              }
            }}
          >
            {plantsList.map((p) => {
              const { percent, remaining } = getGrowth(p.createdAt);
              return (
              <div key={p._id} className="w-full shrink-0 snap-center">
                <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex gap-4 items-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0 relative overflow-hidden">
                    <Image src={getPlantImage(p.type)} alt={p.name || ""} fill className="object-contain p-1.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h2 className="text-[17px] font-extrabold text-gray-800 truncate">{p.name || "알 수 없는 식물"}</h2>
                      <span className="bg-[#eef7e6] text-[#6ea447] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">재배 중</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-gray-700">D+{p.createdAt ? calculateDday(p.createdAt) : 1}</span>
                        <span className="text-[10px] text-gray-400">
                          {isMounted && p.createdAt ? new Date(p.createdAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : ""}  시작
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-extrabold text-[#6ea447]">{percent}%</span>
                        <span className="text-[10px] text-gray-400">성장률</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-extrabold text-gray-700">
                          {remaining > 0 ? `약 ${remaining}일` : "수확 시기"}
                        </span>
                        <span className="text-[10px] text-gray-400">예상 수확까지</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {plantsList.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {plantsList.map((_, i) => (
                <div 
                  key={i} 
                  className={`rounded-full transition-[width,background-color] ${i === activeIndex ? "w-4 h-1.5 bg-[#6ea447]" : "w-1.5 h-1.5 bg-gray-200"}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* 타임라인 */}
        <section>
          {loading ? renderSkeleton("성장 기록을 불러오는 중") : historyError ? <RequestError message="성장 기록을 불러오지 못했어요." onRetry={() => setRetryCount((value) => value + 1)} /> : (
            <div className="relative pl-7">
              {/* 세로 타임라인 선 - 기록이 있을 때만 표시 */}
              {eventsHistory.length > 0 && (
                <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-200 rounded-full"></div>
              )}

              <div className="flex flex-col gap-7">
                {eventsHistory.length === 0 ? (
                  <div className="bg-white border border-gray-100 rounded-[1.25rem] py-8 text-center -ml-7 shadow-sm">
                    <p className="text-sm font-bold text-gray-400">아직 성장 일지가 없어요 🌱</p>
                  </div>
                ) : (
                  eventsHistory.map((event, idx) => {
                      let emoji = "📝";
                      let iconBgColor = "bg-orange-50";
                      let iconBorderColor = "border-orange-100";
                      let dotColor = idx === 0 ? "bg-orange-400" : "bg-gray-300";
                      let titleColor = "text-orange-500";

                      if (event.title?.includes("싹")) {
                        emoji = "🌱"; iconBgColor = "bg-[#eef7e6]"; iconBorderColor = "border-gray-100"; titleColor = "text-[#6ea447]";
                        if (idx === 0) dotColor = "bg-[#6ea447]";
                      } else if (event.title?.includes("열매")) {
                        emoji = "🍎"; iconBgColor = "bg-red-50"; iconBorderColor = "border-red-100"; titleColor = "text-red-500";
                        if (idx === 0) dotColor = "bg-red-400";
                      }

                      return (
                        <div key={event._id || idx} className="relative">
                          <div className={`absolute -left-[22px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${dotColor}`}></div>
                          <button type="button"
                            className="bg-white border border-gray-100 rounded-[1.25rem] p-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => openSheet(event)}
                          >
                            <div className="flex items-start gap-3">
                              {event.imageUrl ? (
                                <div className="w-12 h-12 relative rounded-xl overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                                  <Image 
                                    src={event.imageUrl} 
                                    alt="기록 이미지" 
                                    fill 
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className={`w-12 h-12 ${iconBgColor} rounded-xl flex items-center justify-center text-2xl shrink-0 border ${iconBorderColor}`}>
                                  {emoji}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-extrabold text-sm mb-0.5 truncate ${titleColor}`}>{event.title}</h4>
                                <p className="text-[12px] font-medium text-gray-600 mb-1 truncate">{event.content}</p>
                                <p className="text-[11px] font-medium text-gray-400">
                                  {isMounted ? formatDate(event.eventDate || event.createdAt) : ""}
                                </p>
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                  })
                )}
              </div>
            </div>
          )}
          {!loading && !historyError && hasMore && <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-4 min-h-11 w-full rounded-xl border border-gray-200 font-bold text-gray-700">{loadingMore ? "불러오는 중…" : "기록 더 보기"}</button>}
          {moreError && <p role="alert" className="mt-2 text-sm text-red-700">추가 기록을 불러오지 못했어요. 다시 시도해주세요.</p>}
        </section>
        </>}
      </div>

      <div className="h-12"></div>

      {selectedEvent && <BottomSheet open={isSheetOpen} onClose={closeSheet}>
        {selectedEvent && (
          <>
                  <div className="flex items-center gap-4 mb-6 mt-2">
                    {(() => {
                      let emoji = "📝";
                      let iconBgColor = "bg-orange-50";
                      let iconBorderColor = "border-orange-100";
                      let titleColor = "text-orange-500";
                      
                      if (selectedEvent.title?.includes("싹")) {
                        emoji = "🌱"; iconBgColor = "bg-[#eef7e6]"; iconBorderColor = "border-gray-100"; titleColor = "text-[#6ea447]";
                      } else if (selectedEvent.title?.includes("열매")) {
                        emoji = "🍎"; iconBgColor = "bg-red-50"; iconBorderColor = "border-red-100"; titleColor = "text-red-500";
                      }
                      
                      return (
                        <>
                          {selectedEvent.imageUrl ? (
                            <div className="w-16 h-16 relative rounded-2xl overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                              <Image 
                                src={selectedEvent.imageUrl} 
                                alt="기록 이미지" 
                                fill 
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className={`w-16 h-16 ${iconBgColor} rounded-2xl flex items-center justify-center text-3xl shrink-0 border ${iconBorderColor}`}>
                              {emoji}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-extrabold text-[17px] mb-1.5 leading-tight ${titleColor}`}>{selectedEvent.title}</h4>
                            <p className="text-[13px] font-medium text-gray-400">
                              {isMounted ? formatDate(selectedEvent.eventDate || selectedEvent.createdAt) : ""}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
                    <p className="text-[15px] font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {selectedEvent.content}
                    </p>
                  </div>

                  {selectedEvent.imageUrl && (
                    <div className="w-full aspect-[9/16] relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-black/5">
                      <Image 
                        src={selectedEvent.imageUrl} 
                        alt="성장 일지 이미지" 
                        fill 
                        className="object-contain"
                      />
                    </div>
                  )}
          </>
        )}
      </BottomSheet>}
    </div>
  );
}
