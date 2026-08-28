"use client";

import { Filter, Bell, Settings, X, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { motion, useAnimation, PanInfo, AnimatePresence } from "framer-motion";
import { createPlant } from "@/lib/post";
import { plantsData } from "@/lib/plantsData";

export default function MarketPage() {
  const router = useRouter();

  // Bottom Sheet States
  const [selectedPlant, setSelectedPlant] = useState<typeof plantsData[0] | null>(null);
  const [sheetState, setSheetState] = useState<"closed" | "half" | "full">("closed");
  const [customPlantName, setCustomPlantName] = useState("");

  // 식물 클릭 시 Bottom Sheet 오픈
  const openSheet = (plant: typeof plantsData[0]) => {
    setSelectedPlant(plant);
    setCustomPlantName(`우리집 ${plant.name}`);
    setSheetState("half");
  };

  // Bottom Sheet 닫기
  const closeSheet = () => {
    setSheetState("closed");
  };

  // 드래그(스와이프) 제어 로직
  const onDragEnd = (event: any, info: PanInfo) => {
    const velocityY = info.velocity.y;
    const offsetY = info.offset.y;

    if (sheetState === "half") {
      // 위로 강하게 치거나 위로 일정 이상 올리면 전체 화면
      if (velocityY < -200 || offsetY < -50) {
        setSheetState("full");
      } 
      // 아래로 강하게 치거나 내리면 닫힘
      else if (velocityY > 200 || offsetY > 50) {
        closeSheet();
      } 
    } else if (sheetState === "full") {
      // 위에서 아래로 내리면 절반 화면으로
      if (velocityY > 200 || offsetY > 50) {
        setSheetState("half");
      }
    }
  };

  // 모달 높이/위치 설정 (픽셀 기준: 850px 컨테이너 기준)
  const sheetVariants = {
    closed: { y: 850, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
    half: { y: 400, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } }, // 450px visible
    full: { y: 50, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },  // 800px visible
  };

  // 실제 분양 API 호출 (모달 하단 버튼 클릭 시)
  const submitAdoptPlant = async () => {
    if (!selectedPlant) return;
    if (!customPlantName.trim()) {
      alert("식물 이름을 입력해주세요.");
      return;
    }

    try {
      const responseData = await createPlant({
        name: customPlantName.trim(),
        type: selectedPlant.name,
      });

      if (responseData.success) {
        alert("분양이 완료되었습니다! 내 정원에서 확인해보세요.");
        router.push("/home");
      } else {
        alert(responseData.message || "분양에 실패했습니다.");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || "서버 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <div className="flex flex-col p-6 bg-white min-h-full">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-[26px] font-black text-[#6ea447] tracking-tight">싹키워</h1>
          </div>
          <div className="flex gap-3 text-gray-400">
            <button onClick={() => router.push('/notifications')} className="hover:text-gray-600 transition-colors relative">
              <Bell size={22} />
            </button>
            <button className="hover:text-gray-600 transition-colors">
              <Settings size={22} />
            </button>
          </div>
        </header>

        {/* 새 배너 디자인 */}
        <div className="bg-white border border-gray-100 rounded-[24px] p-5 mb-8 relative flex flex-col justify-center min-h-[140px] shadow-sm">
          <div className="z-10">
            <h4 className="text-[17px] font-extrabold text-gray-900 mb-2 leading-snug">
              새로운 식물과의 시작,<br />
              <span className="text-[#6ea447]">오늘부터 함께 키워봐요!</span>
            </h4>
            <p className="text-[12px] text-gray-500 mt-2 leading-relaxed font-medium">
              분양받은 식물은 정기적으로<br />
              관리하고 수확 후 보내드려요.
            </p>
          </div>
          <div className="absolute -right-2 bottom-0 w-[140px] h-[155px]">
            <Image 
              src="/images/kio_pad.png" 
              alt="새로운 식물 배너" 
              fill
              className="object-contain object-bottom mix-blend-multiply"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 text-xs">
          <span className="font-bold text-gray-700">추천순 <Filter size={12} className="inline ml-1" /></span>
          <span className="text-gray-400">필터</span>
        </div>

        <div className="flex flex-col gap-4">
          {plantsData.map((plant) => (
            <div 
              key={plant.id} 
              onClick={() => openSheet(plant)}
              className="flex gap-4 p-4 border border-gray-100 rounded-3xl shadow-sm hover:border-[#e2ecc8] transition-colors cursor-pointer active:bg-gray-50"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden border border-gray-100">
                <Image 
                  src={plant.imageUrl} 
                  alt={plant.name} 
                  fill
                  sizes="80px"
                  className="object-contain p-2.5 mix-blend-multiply"
                />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800">{plant.name}</h3>
                  <span className="bg-[#eef7e6] text-[#6ea447] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {plant.growthPeriod.split(' ')[0]}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mb-2 line-clamp-2 leading-tight pr-2">
                  {plant.characteristics}
                </p>
                <p className="font-bold text-sm text-[#6ea447]">{plant.price.toLocaleString()}원</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 스마트폰 프레임 내부용 고정 모달 컨테이너 */}
      <AnimatePresence>
        {sheetState !== "closed" && selectedPlant && (
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
                {/* 오버스크롤 시 하단 흰색 배경 보장용 */}
                <div className="absolute top-full left-0 right-0 h-[500px] bg-white"></div>

                {/* 드래그 핸들 */}
                <div className="flex justify-center pt-5 pb-3 cursor-grab active:cursor-grabbing shrink-0 w-full bg-white z-30 rounded-t-[32px]">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* 모달 내부 스크롤 가능한 콘텐츠 */}
                <div className="flex-1 overflow-y-auto px-6 pb-28">
                  <div className="w-full h-52 bg-gray-50 rounded-3xl relative mb-6 border border-gray-100 shrink-0 mt-2">
                    <Image 
                      src={selectedPlant.imageUrl} 
                      alt={selectedPlant.name}
                      fill
                      sizes="(max-width: 400px) 100vw, 400px"
                      priority
                      className="object-contain p-6 mix-blend-multiply drop-shadow-md"
                    />
                  </div>
                  
                  <div className="mb-6 flex justify-between items-end">
                    <div>
                      <h2 className="text-3xl font-extrabold text-gray-900 mb-1">{selectedPlant.name}</h2>
                      <span className="bg-[#eef7e6] text-[#6ea447] text-[12px] font-bold px-3 py-1 rounded-full">
                        {selectedPlant.growthPeriod}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-[#6ea447]">{selectedPlant.price.toLocaleString()}원</p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      식물 이름 정하기
                    </label>
                    <input
                      type="text"
                      value={customPlantName}
                      onChange={(e) => setCustomPlantName(e.target.value)}
                      placeholder={`예: 우리집 ${selectedPlant.name}`}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#6ea447] focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-5 border border-gray-100">
                    <div>
                      <h4 className="text-sm font-bold text-gray-500 mb-2">식물 특징</h4>
                      <p className="text-[15px] font-medium text-gray-800 leading-relaxed">
                        {selectedPlant.characteristics}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 text-[#6ea447] p-5 rounded-xl border border-gray-100">
                    <Info size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm font-bold leading-relaxed">
                      분양받은 식물은 스마트팜 환경에서 안전하게 대신 키워주며, 수확 시기에 맞추어 집으로 배송됩니다.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* 하단 고정 분양하기 버튼 (모달 밖으로 분리) */}
              <motion.div
                initial={{ y: 150 }}
                animate={{ y: 0 }}
                exit={{ y: 150 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12 pb-8 z-30 pointer-events-none"
              >
                <button 
                  onClick={submitAdoptPlant}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-colors active:scale-[0.98] pointer-events-auto"
                >
                  이 식물 분양받기
                </button>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

