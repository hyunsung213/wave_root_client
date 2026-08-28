"use client";

import { useEffect, useState } from "react";
import { Bell, Settings, Image as ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { getWaterRecords, getEvents, getPlantsWithRecords } from "@/lib/get";
import { useStore } from "@/store/useStore";

export default function RecordPage() {
  const router = useRouter();
  const myPlants = useStore((state) => state.myPlants);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [plantsList, setPlantsList] = useState<any[]>(myPlants);
  
  const currentPlant = plantsList[activeIndex];
  
  const [activeTab, setActiveTab] = useState<"water" | "events">("water");
  const [waterHistory, setWaterHistory] = useState<any[]>([]);
  const [eventsHistory, setEventsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  // Modal States
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [sheetState, setSheetState] = useState<"closed" | "half" | "full">("closed");

  const openSheet = (event: any) => {
    setSelectedEvent(event);
    setSheetState("half");
  };

  const closeSheet = () => {
    setSheetState("closed");
  };

  const onDragEnd = (event: any, info: PanInfo) => {
    const velocityY = info.velocity.y;
    const offsetY = info.offset.y;

    if (sheetState === "half") {
      if (velocityY < -200 || offsetY < -50) {
        setSheetState("full");
      } else if (velocityY > 200 || offsetY > 50) {
        closeSheet();
      }
    } else if (sheetState === "full") {
      if (velocityY > 200 || offsetY > 50) {
        setSheetState("half");
      }
    }
  };

  const sheetVariants = {
    closed: { y: 850, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
    half: { y: 400, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
    full: { y: 50, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
  };

  useEffect(() => {
    setIsMounted(true);
    
    const fetchPlants = async () => {
      try {
        const data = await getPlantsWithRecords();
        if (data.success) {
          const fetched = data.plants || data.data || [];
          setPlantsList(fetched);
          if (activeIndex >= fetched.length) {
            setActiveIndex(0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch plants with records", err);
      }
    };
    fetchPlants();
  }, []);

  useEffect(() => {
    const fetchHistories = async () => {
      if (!currentPlant?._id) return;
      setLoading(true);
      try {
        const [waterData, eventsData] = await Promise.all([
          getWaterRecords(currentPlant._id),
          getEvents(currentPlant._id, 1, 30, 'desc')
        ]);
        
        setWaterHistory(waterData.success && waterData.water ? waterData.water : []);
        setEventsHistory(eventsData.success && eventsData.events ? eventsData.events : []);
      } catch (error) {
        console.error("Failed to fetch histories", error);
        setWaterHistory([]);
        setEventsHistory([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistories();
  }, [currentPlant?._id]);

  const getEmojiForType = (type: string = "") => {
    if (type.includes("토마토")) return "🍅";
    if (type.includes("상추")) return "🥬";
    if (type.includes("바질")) return "🌿";
    return "🪴";
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

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const ampm = d.getHours() < 12 ? "오전" : "오후";
    let hh = d.getHours() % 12;
    if (hh === 0) hh = 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${mm}.${dd} ${ampm} ${hh}:${min}`;
  };

  const renderSkeleton = () => (
    <div className="flex flex-col gap-5 animate-pulse mt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl shrink-0"></div>
          <div className="flex-1 flex flex-col justify-center gap-2">
            <div className="h-3 w-20 bg-gray-100 rounded-full"></div>
            <div className="h-2.5 w-32 bg-gray-50 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col bg-white min-h-full">
      {/* 헤더 */}
      <header className="flex justify-between items-center px-6 pt-6 pb-4">
        <h1 className="text-[26px] font-black text-[#6ea447] tracking-tight">싹키워</h1>
        <div className="flex gap-3 text-gray-500">
          <button onClick={() => router.push('/notifications')} className="hover:text-gray-800 transition-colors relative">
            <Bell size={24} strokeWidth={2} />
          </button>
          <button className="hover:text-gray-800 transition-colors">
            <Settings size={24} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="px-6 flex flex-col gap-5">
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
            {plantsList.map((p) => (
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
                        <span className="font-extrabold text-[#6ea447]">50%</span>
                        <span className="text-[10px] text-gray-400">성장률</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-extrabold text-gray-700">약 14일</span>
                        <span className="text-[10px] text-gray-400">예상 수확까지</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {plantsList.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {plantsList.map((_, i) => (
                <div 
                  key={i} 
                  className={`rounded-full transition-all ${i === activeIndex ? "w-4 h-1.5 bg-[#6ea447]" : "w-1.5 h-1.5 bg-gray-200"}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* 탭 */}
        <section>
          <div className="flex gap-2 bg-gray-50 border border-gray-100 rounded-[1rem] p-1">
            <button 
              onClick={() => setActiveTab("water")}
              className={`flex-1 py-2.5 rounded-[0.75rem] font-extrabold text-sm transition-all ${
                activeTab === "water"
                  ? "bg-white text-[#3b82f6] shadow-sm border border-gray-100"
                  : "text-gray-400"
              }`}
            >
              💧 급수 기록
            </button>
            <button 
              onClick={() => setActiveTab("events")}
              className={`flex-1 py-2.5 rounded-[0.75rem] font-extrabold text-sm transition-all ${
                activeTab === "events"
                  ? "bg-white text-[#6ea447] shadow-sm border border-gray-100"
                  : "text-gray-400"
              }`}
            >
              🌱 성장 일지
            </button>
          </div>
        </section>

        {/* 타임라인 */}
        <section>
          {loading ? renderSkeleton() : (
            <div className="relative pl-7">
              {/* 세로 타임라인 선 - 기록이 있을 때만 표시 */}
              {((activeTab === "water" && waterHistory.length > 0) || (activeTab === "events" && eventsHistory.length > 0)) && (
                <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-200 rounded-full"></div>
              )}

              <div className="flex flex-col gap-7">
                {activeTab === "water" && (
                  waterHistory.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-[1.25rem] py-8 text-center -ml-7 shadow-sm">
                      <p className="text-sm font-bold text-gray-400">아직 급수 기록이 없어요 💧</p>
                    </div>
                  ) : (
                    waterHistory.map((record, idx) => {
                      const cupCount = record.volume ? Math.max(1, Math.floor(record.volume / 100)) : 1;
                      const displayCount = Math.min(5, cupCount);
                      
                      return (
                        <div key={record._id || idx} className="relative">
                          <div className={`absolute -left-[22px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${idx === 0 ? "bg-[#3b82f6]" : "bg-gray-300"}`}></div>
                          <div className="bg-white border border-gray-100 rounded-[1.25rem] p-4 flex items-center gap-3 shadow-sm">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[18px] shrink-0 border border-blue-100">
                              <div className="flex justify-center items-center -space-x-[6px]">
                                {Array.from({ length: displayCount }).map((_, i) => (
                                  <span key={i} className="relative block leading-none drop-shadow-sm">
                                    💧
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-extrabold text-sm text-gray-800 mb-0.5">
                                {record.volume ? (
                                  <><span className="text-[#3b82f6]">{record.volume}ml</span> 급수</>
                                ) : "급수"}
                              </h4>
                              <p className="text-[11px] font-medium text-gray-400">
                                {isMounted ? formatDate(record.createdAt) : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {activeTab === "events" && (
                  eventsHistory.length === 0 ? (
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
                          <div 
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
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="h-6"></div>

      {/* 스마트폰 프레임 내부용 고정 모달 컨테이너 (시장 페이지 양식) */}
      <AnimatePresence>
        {sheetState !== "closed" && selectedEvent && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[100]">
            <div className="relative w-full max-w-[400px] h-[850px] pointer-events-auto overflow-hidden rounded-[3rem]">
              
              {/* 반투명 배경 (클릭 시 닫힘) */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeSheet}
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-10"
              />

              {/* Bottom Sheet 영역 */}
              <motion.div
                initial="closed"
                animate={sheetState}
                exit="closed"
                variants={sheetVariants}
                drag="y"
                dragConstraints={{ top: 50 }}
                dragElastic={0.2}
                onDragEnd={onDragEnd}
                className="absolute top-0 left-0 right-0 h-[800px] bg-white rounded-t-[32px] z-20 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.15)]"
              >
                {/* 오버스크롤 시 하단 흰색 배경 보장용 */}
                <div className="absolute top-full left-0 right-0 h-[500px] bg-white"></div>

                {/* 드래그 핸들 */}
                <div className="flex justify-center pt-5 pb-3 cursor-grab active:cursor-grabbing shrink-0 w-full bg-white z-30 rounded-t-[32px]">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* 모달 내부 스크롤 가능한 콘텐츠 */}
                <div className="flex-1 overflow-y-auto px-6 pb-28 hide-scrollbar">
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
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
