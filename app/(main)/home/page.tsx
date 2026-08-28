"use client";

import { useEffect, useState } from "react";
import { Bell, Settings, Plus, ChevronRight, CheckSquare, Sun, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getPlants, getPlantCurrent } from "@/lib/get";
import { useStore } from "@/store/useStore";

export default function HomePage() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const myPlants = useStore((state) => state.myPlants) || [];
  const setMyPlants = useStore((state) => state.setMyPlants);
  
  const [loading, setLoading] = useState(true);
  const [alertPlant, setAlertPlant] = useState<any>(null);
  const [moisture, setMoisture] = useState<number | null>(null);

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const data = await getPlants();
        if (data.success) {
          const plants = data.plants || data.data || [];
          setMyPlants(plants);
          
          if (plants && plants.length > 0) {
            const firstPlant = plants[0];
            try {
              const currentData = await getPlantCurrent(firstPlant._id);
              if (currentData.success && currentData.sensor) {
                const currentMoisture = currentData.sensor.moisture_soil;
                setAlertPlant(firstPlant); 
                setMoisture(currentMoisture);
              }
            } catch (err) {
              console.log("Failed to fetch current sensor:", err);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch plants:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlants();
  }, [setMyPlants]);

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
          <button onClick={() => router.push('/notifications')} className="hover:text-gray-800 transition-colors relative">
            <Bell size={24} strokeWidth={2} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="hover:text-gray-800 transition-colors">
            <Settings size={24} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="px-6 flex flex-col gap-5">
        {/* 오늘의 할 일 */}
        <section>
          {/* 타이틀 + 캐릭터 행 */}
          <div className="flex items-end w-full">
            <div className="flex-[6] flex items-center pb-2">
              <h2 className="text-[17px] font-extrabold text-gray-800 flex items-center gap-2">
                <CheckSquare size={20} strokeWidth={2.5} className="text-red-500" />
                오늘의 할 일
              </h2>
            </div>
            <div className="flex-[4] flex justify-end">
              <div className="relative w-[85px] h-[85px] translate-y-[5px]">
                <Image src="/images/kio_cute.png" alt="윙크하는 키오" fill className="object-contain object-bottom" priority />
              </div>
            </div>
          </div>

          {alertPlant ? (
            <div 
              onClick={() => router.push(`/live/${alertPlant._id}`)}
              className="bg-[#fff1f1] border border-[#ffdddd] rounded-[1.5rem] p-5 flex items-stretch cursor-pointer active:scale-[0.98] transition-transform"
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
                <h3 className="font-extrabold text-[20px] text-[#5e0a0a] mb-2">{alertPlant.name || "방울 토마토"}</h3>
                <p className="text-[#e53e3e] text-sm font-bold flex items-center gap-1.5 mb-1">
                  <span>💧</span> 수분 부족 {moisture ? moisture.toFixed(0) : "32"}%
                </p>
                <p className="text-[#c53030] text-sm font-bold">물을 주세요! 🚨</p>
              </div>
              <div className="flex items-center text-gray-500 ml-1 shrink-0">
                <ChevronRight size={20} strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-6 text-center shadow-sm">
              <h3 className="font-bold text-[#6ea447] text-[15px]">오늘은 할 일이 없어요!</h3>
              <p className="text-sm font-medium text-gray-500 mt-1">식물들이 건강하게 자라고 있습니다.</p>
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
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
              {myPlants.map((plant, idx) => {
                const isActive = idx === 0;
                return (
                  <div 
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
                      {isActive ? "65%" : "20%"}
                    </span>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isActive ? 'bg-[#6ea447] w-[65%]' : 'bg-gray-300 w-[20%]'}`}></div>
                    </div>
                  </div>
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

        {/* 오늘의 날씨 */}
        <section>
          <h2 className="text-[17px] font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-[#6ea447] rounded-full"></span>
            오늘의 날씨
          </h2>
          <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex items-center gap-4 shadow-sm">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 text-orange-400">
              <Sun size={28} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h4 className="text-[13px] font-bold text-[#6ea447] mb-1 flex items-center gap-1">
                <MapPin size={12} /> 서울 마포구
              </h4>
              <p className="text-[16px] font-extrabold text-gray-800 mb-0.5">맑음 24°C</p>
              <p className="text-[12px] font-medium text-gray-500">야외 활동하기 좋은 날씨예요!</p>
            </div>
          </div>
        </section>
      </div>

      {/* 하단 여백 */}
      <div className="h-6"></div>
    </div>
  );
}
