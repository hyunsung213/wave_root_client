"use client";

import { useEffect, useState } from "react";
import { Bell, Settings, ChevronRight, Plus, Info } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { getPlants, getUserMe } from "@/lib/get";
import { updatePlant } from "@/lib/put";
import { useRouter } from "next/navigation";

export default function MyPage() {
  const router = useRouter();
  const [myPlants, setMyPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPlant, setSelectedPlant] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [user, setUser] = useState<any>(null);
  
  // 바텀 시트 상태
  const [sheetState, setSheetState] = useState<"closed" | "half" | "full">("closed");

  const sheetVariants = {
    closed: { y: 850, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
    half: { y: 400, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
    full: { y: 50, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
  };

  const closeSheet = () => {
    setSheetState("closed");
    setTimeout(() => setSelectedPlant(null), 400);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plantsData, userData] = await Promise.all([
          getPlants(),
          getUserMe()
        ]);
        
        if (plantsData.success) {
          setMyPlants(plantsData.plants || plantsData.data || []);
        }
        
        if (userData?.success && userData.user) {
          setUser(userData.user);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getPlantImage = (type: string = "") => {
    if (type.includes("토마토")) return "/plants/tomato.png";
    if (type.includes("바질")) return "/plants/basil.png";
    if (type.includes("상추")) return "/plants/lettuce.png";
    return "/plants/tomato.png";
  };

  const handlePlantClick = (plant: any) => {
    setSelectedPlant(plant);
    setEditName(plant.name || "");
    setSheetState("half");
  };

  const handleSaveName = async () => {
    if (!selectedPlant || !editName.trim()) return;
    try {
      const data = await updatePlant(selectedPlant._id, { name: editName });
      if (data.success) {
        setMyPlants(myPlants.map(p => p._id === selectedPlant._id ? { ...p, name: editName } : p));
        closeSheet();
      }
    } catch (error) {
      console.error("Failed to update name:", error);
      alert("이름 수정에 실패했습니다.");
    }
  };

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
        {/* 프로필 카드 */}
        <section>
          <button 
            onClick={() => router.push('/profile')}
            className="w-full text-left bg-white border border-gray-100 rounded-[1.5rem] p-5 flex items-center gap-4 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl border border-gray-100 shrink-0">
              🌱
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#6ea447] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">LV.1</span>
                <h2 className="text-[17px] font-extrabold text-gray-800 truncate">
                  {user?.name || (user?.email ? user.email.split('@')[0] : "연희")}님
                </h2>
              </div>
              <p className="text-xs font-medium text-gray-500">
                함께한 지 {user?.createdAt ? Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 3600 * 24)) : 28}일
              </p>
            </div>
            <ChevronRight className="text-gray-400 shrink-0" size={20} />
          </button>
        </section>

        {/* 내 정원 */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[17px] font-extrabold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#6ea447] rounded-full"></span>
              내 정원
            </h3>
            <button className="text-xs font-semibold text-[#6ea447] flex items-center gap-0.5">
              전체 보기 <ChevronRight size={14} />
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-[1.5rem] pt-5 pb-3 shadow-sm">
            {loading ? (
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar px-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="min-w-[96px] h-[140px] bg-white border border-gray-100 rounded-[1.25rem] p-3 flex flex-col items-center justify-center animate-pulse shrink-0">
                    <div className="w-11 h-11 bg-gray-100 rounded-full mb-2"></div>
                    <div className="w-12 h-2.5 bg-gray-100 rounded-full mb-1.5"></div>
                    <div className="w-14 h-1.5 bg-gray-100 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar px-5">
                {myPlants.map((plant, idx) => {
                  const isActive = idx === 0;
                  return (
                    <div 
                      key={plant._id} 
                      onClick={() => handlePlantClick(plant)}
                      className={`snap-start min-w-[96px] h-[140px] rounded-[1.25rem] p-3 flex flex-col items-center justify-center cursor-pointer transition-all shrink-0
                        ${isActive
                          ? 'bg-white border-[1.5px] border-[#6ea447]'
                          : 'bg-white border border-gray-100'
                        }`}
                    >
                      <div className="w-[44px] h-[44px] relative mb-2">
                        <Image 
                          src={getPlantImage(plant.type)} 
                          alt={plant.name} 
                          fill 
                          className="object-contain drop-shadow-sm"
                        />
                      </div>
                      <span className="text-[12px] font-extrabold text-gray-800 mb-1 text-center leading-tight">{plant.name}</span>
                      <span className={`text-[11px] font-extrabold mb-1.5 ${isActive ? 'text-[#6ea447]' : 'text-gray-400'}`}>
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
                  className="snap-start min-w-[96px] h-[140px] bg-white border border-dashed border-gray-200 rounded-[1.25rem] p-3 flex flex-col items-center justify-center text-[#6ea447] hover:bg-gray-50 transition-colors shrink-0"
                >
                  <Plus size={26} strokeWidth={2.5} className="mb-2" />
                  <span className="text-[12px] font-bold">식물 추가</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 구독 정보 */}
        <section>
          <h3 className="text-[17px] font-extrabold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-[#6ea447] rounded-full"></span>
            구독 정보
          </h3>
          <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-extrabold text-gray-800">베이직 플랜</h4>
              <span className="text-[10px] text-[#6ea447] bg-[#eef7e6] border border-gray-100 font-bold px-3 py-1 rounded-full">구독 관리</span>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-4">다음 결제일: 2026.05.18</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 rounded-xl p-3 flex flex-col items-center border border-gray-100">
                <span className="text-[10px] font-medium text-gray-400 mb-1">구독 기간</span>
                <span className="font-extrabold text-sm text-gray-700">1개월</span>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 flex flex-col items-center border border-gray-100">
                <span className="text-[10px] font-medium text-gray-400 mb-1">보유 포인트</span>
                <span className="font-extrabold text-sm text-[#6ea447]">2,150 P</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 하단 여백 */}
      <div className="h-6"></div>

      {/* 식물 이름 수정 바텀 시트 (Framer Motion 적용) */}
      <AnimatePresence>
        {selectedPlant && (
          <div className="absolute inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10" 
            />
            
            <motion.div
              variants={sheetVariants}
              initial="closed"
              animate={sheetState}
              exit="closed"
              drag="y"
              dragConstraints={{ top: 50 }}
              dragElastic={0.2}
              onDragEnd={onDragEnd}
              className="absolute top-0 left-0 right-0 h-[800px] bg-white rounded-t-[32px] z-20 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.15)]"
            >
              {/* 오버스크롤 대비 배경 */}
              <div className="absolute top-full left-0 right-0 h-[500px] bg-white"></div>

              {/* 드래그 핸들 */}
              <div className="flex justify-center pt-5 pb-3 cursor-grab active:cursor-grabbing shrink-0 w-full bg-white z-30 rounded-t-[32px]">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* 스크롤 영역 */}
              <div className="flex-1 overflow-y-auto px-6 pb-28 pt-2">
                <h3 className="text-[22px] font-extrabold text-gray-900 mb-6 tracking-tight">식물 정보 수정</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-500 mb-2">식물 이름 (애칭)</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium text-gray-800 outline-none focus:border-[#6ea447] transition-colors shadow-sm"
                    placeholder="예: 귀여운 토마토"
                  />
                </div>
                
                <button 
                  onClick={handleSaveName}
                  className="w-full bg-[#6ea447] hover:bg-[#5b873a] text-white font-extrabold py-4 rounded-2xl transition-colors text-[16px] shadow-md active:scale-[0.98]"
                >
                  저장하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
