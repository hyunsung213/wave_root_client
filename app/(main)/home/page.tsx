"use client";

import { useEffect, useState } from "react";
import { Bell, BookOpen, CalendarDays, ChevronRight, Leaf, Plus, RefreshCw, Settings, Sprout, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getActivity, getEvents, getPlants, getPlantsWithRecords } from "@/lib/get";
import { useStore, type Plant } from "@/store/useStore";
import { RequestError } from "@/components/ui/RequestState";
import PullToRefreshStatus from "@/components/ui/PullToRefreshStatus";
import { usePullToRefresh } from "@/lib/usePullToRefresh";

interface GrowthRecord {
  _id?: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  eventDate?: string;
  createdAt?: string;
}

interface PlantWithGrowthRecords extends Plant {
  eventRecords?: GrowthRecord[];
}

interface LatestGrowthRecord extends GrowthRecord {
  plantId: string;
  plantName: string;
}

interface ActivitySummary {
  growthRecordCount?: number;
  harvestCount?: number;
}

function getEventTimestamp(event: GrowthRecord) {
  const timestamp = new Date(event.eventDate || event.createdAt || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function selectLatestEvent(plants: Plant[], eventsByPlant?: GrowthRecord[][]): LatestGrowthRecord | null {
  const events = (plants as PlantWithGrowthRecords[]).flatMap((plant, index) => {
    const records = eventsByPlant?.[index] ?? plant.eventRecords ?? [];
    return records.map((event) => ({ ...event, plantId: plant._id, plantName: plant.name }));
  });

  events.sort((left, right) => getEventTimestamp(right) - getEventTimestamp(left));
  return events[0] ?? null;
}

function formatEventDate(value?: string) {
  if (!value) return "날짜 미상";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 미상";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(date);
}

export default function HomePage() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const myPlants = useStore((state) => state.myPlants) || [];
  const setMyPlants = useStore((state) => state.setMyPlants);
  
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [activityError, setActivityError] = useState(false);
  const [latestEvent, setLatestEvent] = useState<LatestGrowthRecord | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // 서버 렌더 시점과 시간대가 달라질 수 있어 마운트 후에 인사말을 정한다.
  const [greeting, setGreeting] = useState("반가워요");
  const pullState = usePullToRefresh(() => setRetryCount((value) => value + 1));

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const hour = new Date().getHours();
      if (hour < 11) setGreeting("좋은 아침이에요");
      else if (hour < 18) setGreeting("좋은 오후예요");
      else setGreeting("좋은 저녁이에요");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const fetchHomeSummary = async () => {
      setLoading(true);
      setLoadError(false);
      setActivityError(false);
      setEventsLoading(true);
      setEventsError(false);

      const [plantsResult, activityResult, recordsResult] = await Promise.allSettled([
        getPlants(),
        getActivity(),
        getPlantsWithRecords(),
      ]);

      try {
        if (!isCurrent) return;
        const primaryPlants = plantsResult.status === "fulfilled" && plantsResult.value.success
          ? plantsResult.value.plants || plantsResult.value.data || null
          : null;
        const plantsWithRecords: PlantWithGrowthRecords[] = recordsResult.status === "fulfilled" && recordsResult.value.success
          ? recordsResult.value.plants ?? []
          : [];
        const hasRecordsResponse = recordsResult.status === "fulfilled" && recordsResult.value.success;
        if (!primaryPlants && !hasRecordsResponse) {
          throw new Error("식물 목록을 불러오지 못했습니다.");
        }

        const plants: Plant[] = primaryPlants ?? plantsWithRecords;
        setMyPlants(plants);

        if (activityResult.status === "fulfilled" && activityResult.value.success && activityResult.value.activity) {
          setActivity(activityResult.value.activity ?? null);
        } else {
          setActivity(null);
          setActivityError(true);
        }

        if (plants.length === 0) {
          setLatestEvent(null);
          setEventsError(false);
          return;
        }

        if (recordsResult.status === "fulfilled" && recordsResult.value.success) {
          const recordsPlants = plants.map((plant) => plantsWithRecords.find((item) => item._id === plant._id) ?? plant);
          setLatestEvent(selectLatestEvent(recordsPlants));
          setEventsError(false);
          return;
        }

        const eventResults = await Promise.allSettled(
          plants.map((plant) => getEvents(plant._id, 1, 1, "desc")),
        );
        if (!isCurrent) return;
        const eventsByPlant = eventResults.map((result) => (
          result.status === "fulfilled" && result.value.success ? result.value.events ?? [] : []
        ));
        setLatestEvent(selectLatestEvent(plants, eventsByPlant));
        setEventsError(eventResults.some((result) => result.status === "rejected" || !result.value?.success));
      } catch (error) {
        console.error("Failed to fetch plants:", error);
        if (isCurrent) setLoadError(true);
      } finally {
        if (isCurrent) {
          setLoading(false);
          setEventsLoading(false);
        }
      }
    };
    
    fetchHomeSummary();
    return () => {
      isCurrent = false;
    };
  }, [setMyPlants, retryCount]);

  const growthPercentages = myPlants
    .map((plant) => plant.growthPercent)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageGrowth = myPlants.length > 0 && growthPercentages.length === myPlants.length
    ? Math.round(growthPercentages.reduce((sum, value) => sum + value, 0) / growthPercentages.length)
    : null;

  const formatGrowthDate = (event: GrowthRecord) => formatEventDate(event.eventDate || event.createdAt);

  const getPlantImage = (type: string = "") => {
    if (type.includes("토마토")) return "/plants/tomato.png";
    if (type.includes("바질")) return "/plants/basil.png";
    if (type.includes("상추")) return "/plants/lettuce.png";
    return "/plants/tomato.png";
  };

  return (
    <div className="flex flex-col bg-white min-h-full">
      <PullToRefreshStatus state={pullState} />
      {/* 헤더 */}
      <header className="app-page-header flex items-center justify-between">
        <h1 className="text-[26px] font-black text-[#6ea447] tracking-tight">싹키워</h1>
        <div className="flex gap-3 text-gray-500">
          <button type="button" aria-label="새로고침" onClick={() => setRetryCount((value) => value + 1)} className="icon-button"><RefreshCw size={20} /></button>
          <button aria-label="알림" onClick={() => router.push('/notifications')} className="icon-button hover:text-gray-800 transition-colors relative">
            <Bell size={24} strokeWidth={2} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button aria-label="회원 정보" onClick={() => router.push('/profile')} className="icon-button hover:text-gray-800 transition-colors">
            <Settings size={24} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="app-page-content flex flex-col gap-5">
        {/* 인사말 + 캐릭터 */}
        <section className="flex items-end gap-2 -mt-1">
          <div className="flex-1 min-w-0 pb-1">
            <h2 className="text-[22px] font-extrabold text-gray-900 tracking-tight leading-snug">
              {user?.name || (user?.email ? user.email.split('@')[0] : "정원사")}님,
              <br />
              {greeting}! 🌱
            </h2>
            <p className="text-[13px] font-medium text-gray-400 mt-1.5">
              오늘도 식물과 함께 시작해볼까요?
            </p>
          </div>
          <div className="relative w-[92px] h-[92px] shrink-0">
            <Image src="/images/kio_cute.png" alt="윙크하는 키오" fill className="object-contain object-bottom" priority />
          </div>
        </section>

        {/* 정원 요약 */}
        <section aria-labelledby="garden-summary-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="garden-summary-heading" className="flex items-center gap-2 text-[17px] font-extrabold text-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#edf5e7] text-[#5b873a]"><Sprout size={18} /></span>
              나의 정원 한눈에 보기
            </h2>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#91a77e]">garden notes</span>
          </div>

          {loading ? (
            <div role="status" className="grid grid-cols-2 gap-2.5 rounded-[1.6rem] border border-[#e9eee4] bg-[#f7f9f4] p-3 animate-pulse">
              <span className="sr-only">정원 요약을 불러오는 중</span>
              {[1, 2, 3, 4].map((item) => <div key={item} aria-hidden="true" className="h-[92px] rounded-[1.2rem] bg-white" />)}
            </div>
          ) : loadError ? (
            <RequestError onRetry={() => setRetryCount((value) => value + 1)} />
          ) : (
            <div className="rounded-[1.6rem] border border-[#e9eee4] bg-[#f7f9f4] p-3 shadow-[0_12px_32px_-28px_rgba(50,75,35,0.45)]">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[1.2rem] bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400">함께 자라는 식물</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eef5e8] text-[#679348]"><Leaf size={15} /></span>
                  </div>
                  <p className="text-[27px] font-black leading-none tracking-tight text-[#34442c]">{myPlants.length}<span className="ml-1 text-sm font-bold text-gray-400">그루</span></p>
                </div>
                <div className="rounded-[1.2rem] bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400">평균 성장</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f0df] text-[#b18a37]"><Sprout size={15} /></span>
                  </div>
                  <p className="text-[27px] font-black leading-none tracking-tight text-[#34442c]">{averageGrowth === null ? "—" : `${averageGrowth}%`}</p>
                </div>
                <div className="rounded-[1.2rem] bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400">성장 기록</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf2f6] text-[#65819a]"><BookOpen size={15} /></span>
                  </div>
                  <p className="text-[27px] font-black leading-none tracking-tight text-[#34442c]">{activity?.growthRecordCount ?? "—"}<span className="ml-1 text-sm font-bold text-gray-400">회</span></p>
                </div>
                <div className="rounded-[1.2rem] bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400">수확의 기쁨</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fbf0e7] text-[#c17d46]"><Trophy size={15} /></span>
                  </div>
                  <p className="text-[27px] font-black leading-none tracking-tight text-[#34442c]">{activity?.harvestCount ?? "—"}<span className="ml-1 text-sm font-bold text-gray-400">회</span></p>
                </div>
              </div>
              {activityError && <p role="status" className="px-1 pt-2 text-[11px] font-medium text-gray-400">활동 기록을 불러오지 못했어요. 나머지 정원 정보는 표시 중이에요.</p>}
            </div>
          )}
        </section>

        {/* 최근 성장 소식 */}
        <section aria-labelledby="latest-growth-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="latest-growth-heading" className="flex items-center gap-2 text-[17px] font-extrabold text-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f6f0e1] text-[#ad8b44]"><CalendarDays size={17} /></span>
              최근 성장 소식
            </h2>
            <button type="button" onClick={() => router.push("/record")} className="flex min-h-11 items-center gap-1 px-1 text-[12px] font-bold text-[#6e8c55]">
              기록 전체보기 <ChevronRight size={15} />
            </button>
          </div>

          {eventsLoading ? (
            <div role="status" className="h-[142px] animate-pulse rounded-[1.5rem] border border-[#eee9dc] bg-[#fbfaf6]"><span className="sr-only">최근 성장 기록을 불러오는 중</span></div>
          ) : latestEvent ? (
            <button type="button" onClick={() => router.push("/record")} className="group flex w-full items-stretch gap-3 rounded-[1.5rem] border border-[#eee9dc] bg-[#fbfaf6] p-4 text-left transition-transform active:scale-[0.99]">
              {latestEvent.imageUrl ? (
                <div className="relative h-[96px] w-[88px] shrink-0 overflow-hidden rounded-[1.1rem] bg-[#f0efe8]">
                  <Image src={latestEvent.imageUrl} alt="" fill sizes="88px" className="object-cover" />
                </div>
              ) : (
                <div aria-hidden="true" className="flex h-[96px] w-[88px] shrink-0 items-center justify-center rounded-[1.1rem] bg-[#edf3e6] text-[#75965c]"><Sprout size={33} strokeWidth={1.7} /></div>
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-[#e9f0df] px-2.5 py-1 text-[10px] font-extrabold text-[#65834d]">{latestEvent.plantName}</span>
                  <span className="text-[11px] font-semibold text-gray-400">{formatGrowthDate(latestEvent)}</span>
                </div>
                <h3 className="mb-1 line-clamp-1 text-[16px] font-extrabold tracking-tight text-[#34442c]">{latestEvent.title}</h3>
                <p className="line-clamp-2 break-words text-[12px] font-medium leading-relaxed text-gray-500">{latestEvent.content}</p>
              </div>
              <ChevronRight size={18} className="mt-auto mb-1 shrink-0 text-[#a8b49b] transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : eventsError ? (
            <div className="rounded-[1.5rem] border border-[#eee9dc] bg-[#fbfaf6] p-5">
              <p role="status" className="text-sm font-bold text-gray-600">최근 기록을 불러오지 못했어요.</p>
              <button type="button" onClick={() => setRetryCount((value) => value + 1)} className="mt-2 min-h-11 text-xs font-extrabold text-[#6e8c55]">다시 불러오기</button>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#e6e9df] bg-[#fafbf8] px-5 py-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#8da17b]"><Sprout size={20} /></div>
              <p className="text-sm font-extrabold text-gray-700">아직 성장 기록이 없어요</p>
              <p className="mt-1 text-xs font-medium text-gray-400">첫 기록을 남겨 정원의 변화를 모아보세요.</p>
            </div>
          )}
          {eventsError && latestEvent && <p role="status" className="px-1 pt-2 text-[11px] font-medium text-gray-400">일부 식물의 성장 기록을 확인하지 못했어요.</p>}
        </section>

        {/* 내 정원의 성장 */}
        <section>
          <h2 className="text-[17px] font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-[#6ea447] rounded-full"></span>
            내 정원의 성장
          </h2>

          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-w-[100px] h-[148px] bg-white border border-gray-100 rounded-[1.5rem] p-4 flex flex-col items-center justify-center animate-pulse shrink-0 shadow-sm">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mb-3"></div>
                  <div className="w-14 h-3 bg-gray-100 rounded-full mb-2"></div>
                  <div className="w-16 h-2 bg-gray-100 rounded-full"></div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <RequestError onRetry={() => setRetryCount((value) => value + 1)} />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
              {myPlants.map((plant, idx) => {
                const isActive = idx === 0;
                const percent = typeof plant.growthPercent === "number" && Number.isFinite(plant.growthPercent)
                  ? Math.max(0, Math.min(100, Math.round(plant.growthPercent)))
                  : null;
                return (
                  <button type="button"
                    key={plant._id} 
                    onClick={() => router.push(`/live/${plant._id}`)}
                    className={`snap-start min-w-[100px] h-[148px] rounded-[1.5rem] p-4 flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0 shadow-sm
                      ${isActive
                        ? 'bg-white border-[1.5px] border-[#6ea447]'
                        : 'bg-white border border-gray-100'
                      }`}
                  >
                    <div className="w-[48px] h-[48px] relative mb-2">
                      <Image 
                        src={getPlantImage(plant.type)} 
                        alt={plant.name} 
                        fill 
                        className="object-contain drop-shadow-sm"
                      />
                    </div>
                    <span className="text-[12px] font-extrabold text-gray-800 mb-1 text-center leading-tight">{plant.name}</span>
                    <span className={`text-[11px] font-extrabold mb-2 ${isActive ? 'text-[#6ea447]' : 'text-gray-400'}`}>
                      {percent === null ? "—" : `${percent}%`}
                    </span>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isActive ? 'bg-[#6ea447]' : 'bg-gray-300'}`}
                        style={{ width: `${percent ?? 0}%` }}
                      ></div>
                    </div>
                  </button>
                );
              })}
              
              <button 
                onClick={() => router.push('/market')}
                className="snap-start min-w-[100px] h-[148px] bg-white border border-dashed border-gray-200 rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-[#6ea447] hover:bg-gray-50 transition-colors shrink-0 shadow-sm"
              >
                <Plus size={28} strokeWidth={2.5} className="mb-2" />
                <span className="text-[12px] font-bold">식물 추가</span>
              </button>
            </div>
          )}
        </section>

      </div>

      {/* 하단 여백 */}
      <div className="h-12"></div>
    </div>
  );
}
