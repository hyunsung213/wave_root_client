"use client";

import { useEffect, useState } from "react";
import { Bell, Settings, Plus, ChevronRight, CheckSquare, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getPlants, getPlantCurrent } from "@/lib/get";
import { getGrowth } from "@/lib/growth";
import { useStore, type Plant } from "@/store/useStore";
import { soilMoisturePercent } from "@/lib/sensors";
import { EmptyState, RequestError } from "@/components/ui/RequestState";
import { usePullToRefresh } from "@/lib/usePullToRefresh";

export default function HomePage() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const myPlants = useStore((state) => state.myPlants) || [];
  const setMyPlants = useStore((state) => state.setMyPlants);
  
  const [loading, setLoading] = useState(true);
  const [alertPlant, setAlertPlant] = useState<Plant | null>(null);
  const [moisture, setMoisture] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [sensorError, setSensorError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // 서버 렌더 시점과 시간대가 달라질 수 있어 마운트 후에 인사말을 정한다.
  const [greeting, setGreeting] = useState("반가워요");
  usePullToRefresh(() => setRetryCount((value) => value + 1));

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
    const fetchPlants = async () => {
      setLoading(true);
      setLoadError(false);
      setSensorError(false);
      try {
        const data = await getPlants();
        if (!data.success) throw new Error("식물 목록을 불러오지 못했습니다.");
        {
          const plants = data.plants || data.data || [];
          setMyPlants(plants);
          setAlertPlant(null);
          setMoisture(null);
          
          if (plants && plants.length > 0) {
            const firstPlant = plants[0];
            try {
              const currentData = await getPlantCurrent(firstPlant._id);
              if (currentData.success && currentData.sensor) {
                const currentMoisture = soilMoisturePercent(currentData.sensor.moisture_soil);
                if (currentMoisture === null) throw new Error("토양 센서값을 확인할 수 없습니다.");
                setAlertPlant(firstPlant);
                setMoisture(currentMoisture);
              } else {
                throw new Error("센서 정보를 불러오지 못했습니다.");
              }
            } catch (err) {
              console.error("Failed to fetch current sensor:", err);
              setSensorError(true);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch plants:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlants();
  }, [setMyPlants, retryCount]);

  const getPlantImage = (type: string = "") => {
    if (type.includes("토마토")) return "/plants/tomato.png";
    if (type.includes("바질")) return "/plants/basil.png";
    if (type.includes("상추")) return "/plants/lettuce.png";
    return "/plants/tomato.png";
  };

  return (
    <div className="flex flex-col bg-white min-h-full">
      {/* 헤더 */}
      <header className="flex justify-between items-center px-6 pt-6 pb-4">
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

      <div className="px-6 flex flex-col gap-5">
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

        {/* 오늘의 할 일 */}
        <section>
          <h2 className="text-[17px] font-extrabold text-gray-800 flex items-center gap-2 mb-3">
            <CheckSquare size={20} strokeWidth={2.5} className="text-red-500" />
            오늘의 할 일
          </h2>

          {loading ? (
            <div role="status" className="h-40 animate-pulse rounded-[1.5rem] bg-gray-100"><span className="sr-only">오늘의 할 일을 불러오는 중</span></div>
          ) : loadError ? (
            <RequestError onRetry={() => setRetryCount((value) => value + 1)} />
          ) : myPlants.length === 0 ? (
            <EmptyState message="아직 분양받은 식물이 없어요." action={<button type="button" onClick={() => router.push('/market')} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold text-white">식물 둘러보기</button>} />
          ) : sensorError ? (
            <RequestError message="토양 센서 상태를 확인하지 못했어요." onRetry={() => setRetryCount((value) => value + 1)} />
          ) : alertPlant && moisture !== null ? (
            <button type="button"
              onClick={() => router.push(`/live/${alertPlant._id}`)}
              className="flex w-full items-stretch rounded-[1.5rem] border border-[#e2ecc8] bg-[#f7fbf3] p-5 text-left transition-transform active:scale-[0.98]"
            >
              <div className="w-[110px] h-[130px] relative -ml-3 -my-2 shrink-0 self-end">
                <Image 
                  src={getPlantImage(alertPlant.type)} 
                  alt="오늘의 할일 식물" 
                  fill
                  className="object-contain object-bottom drop-shadow-md"
                />
              </div>
              <div className="flex-1 flex flex-col justify-center pl-3 py-1">
                <h3 className="font-extrabold text-[20px] text-gray-800 mb-2">{alertPlant.name}</h3>
                <p className="text-[#5b873a] text-sm font-bold flex items-center gap-1.5 mb-1">
                  <span>💧</span> 토양 수분 {moisture.toFixed(0)}%
                </p>
                <p className="text-gray-600 text-sm font-bold">{moisture < 30 ? "토양 수분이 낮아요. 상태를 확인해주세요." : "현재 토양 상태를 확인해보세요."}</p>
              </div>
              <div className="flex items-center text-gray-500 ml-1 shrink-0">
                <ChevronRight size={20} strokeWidth={2.5} />
              </div>
            </button>
          ) : (
            <div className="bg-[#f7fbf3] border border-[#e2ecc8] rounded-[1.5rem] p-6 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#e2ecc8] flex items-center justify-center text-2xl shrink-0">
                ✅
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-[#5b873a] text-[15px]">오늘은 할 일이 없어요!</h3>
                <p className="text-[13px] font-medium text-gray-500 mt-0.5">식물들이 건강하게 자라고 있어요.</p>
              </div>
            </div>
          )}
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
                const { percent } = getGrowth(plant.createdAt);
                return (
                  <button type="button"
                    key={plant._id} 
                    onClick={() => router.push(`/live/${plant._id}`)}
                    className={`snap-start min-w-[100px] h-[148px] rounded-[1.5rem] p-4 flex flex-col items-center justify-center cursor-pointer transition-all shrink-0 shadow-sm
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
                      {percent}%
                    </span>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isActive ? 'bg-[#6ea447]' : 'bg-gray-300'}`}
                        style={{ width: `${percent}%` }}
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
