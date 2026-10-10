"use client";

import { Filter, Bell, Settings, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import dynamic from "next/dynamic";
import { plantsData } from "@/lib/plantsData";
import { useStore } from "@/store/useStore";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";

const BottomSheet = dynamic(() => import("@/components/ui/BottomSheet"), { ssr: false });

export default function MarketPage() {
  const router = useRouter();
  const setPendingPlantName = useStore((state) => state.setPendingPlantName);

  // Bottom Sheet States
  const [selectedPlant, setSelectedPlant] = useState<typeof plantsData[0] | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [customPlantName, setCustomPlantName] = useState("");
  const [nameError, setNameError] = useState("");
  const [sortBy, setSortBy] = useState<"recommended" | "price">("recommended");

  const sortedPlants =
    sortBy === "price" ? [...plantsData].sort((a, b) => a.price - b.price) : plantsData;

  // 식물 클릭 시 Bottom Sheet 오픈
  const openSheet = (plant: typeof plantsData[0]) => {
    setSelectedPlant(plant);
    setCustomPlantName(readDraft(`plant-name:${plant.id}`) || `우리집 ${plant.name}`);
    setNameError("");
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => setSelectedPlant(null), 400);
  };

  // 상품 확인 화면으로 이동한다. 결제는 주문 API가 준비될 때까지 진행하지 않는다.
  const goToCheckout = () => {
    if (!selectedPlant) return;
    if (!customPlantName.trim()) {
      setNameError("식물 이름을 입력해주세요.");
      return;
    }

    removeDraft(`plant-name:${selectedPlant.id}`);
    setPendingPlantName(customPlantName.trim());
    router.push(`/checkout/${selectedPlant.id}`);
  };

  return (
    <>
      <div className="flex flex-col p-6 bg-white min-h-full">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-[26px] font-black text-[#6ea447] tracking-tight">싹키워</h1>
          </div>
          <div className="flex gap-3 text-gray-400">
            <button aria-label="알림" onClick={() => router.push('/notifications')} className="icon-button hover:text-gray-600 transition-colors relative">
              <Bell size={22} />
            </button>
            <button aria-label="회원 정보" onClick={() => router.push('/profile')} className="icon-button hover:text-gray-600 transition-colors">
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
            <p className="mt-2 text-xs font-semibold text-amber-700">결제 기능은 준비 중입니다.</p>
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

        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-gray-400">{plantsData.length}종</span>
          <button
            onClick={() => setSortBy(sortBy === "recommended" ? "price" : "recommended")}
            aria-label={sortBy === "recommended" ? "추천순 정렬, 가격 낮은순으로 변경" : "가격 낮은순 정렬, 추천순으로 변경"}
            className="flex min-h-11 items-center gap-1 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            <Filter size={12} />
            {sortBy === "recommended" ? "추천순" : "가격 낮은순"}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {sortedPlants.map((plant) => (
            <button type="button"
              key={plant.id} 
              onClick={() => openSheet(plant)}
              className="flex w-full gap-4 p-4 border border-gray-100 rounded-3xl shadow-sm hover:border-[#e2ecc8] transition-colors text-left cursor-pointer active:bg-gray-50"
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
            </button>
          ))}
        </div>
      </div>

      {selectedPlant && <BottomSheet
        open={isSheetOpen}
        onClose={closeSheet}
        title={selectedPlant.name}
        description="식물 정보를 확인하고 이름을 정해주세요."
        halfY={280}
        footer={
          <button
            onClick={goToCheckout}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-colors active:scale-[0.98]"
          >
            상품 확인하기
          </button>
        }
      >
        {selectedPlant && (
          <>
                  <div className="w-full h-36 bg-gray-50 rounded-3xl relative mb-5 border border-gray-100 shrink-0 mt-1">
                    <Image 
                      src={selectedPlant.imageUrl} 
                      alt={selectedPlant.name}
                      fill
                      sizes="(max-width: 400px) 100vw, 400px"
                      priority
                      className="object-contain p-6 mix-blend-multiply drop-shadow-md"
                    />
                  </div>
                  
                  <div className="mb-5 flex justify-between items-center gap-3">
                    <h2 className="text-[26px] font-extrabold text-gray-900 truncate">{selectedPlant.name}</h2>
                    <p className="text-2xl font-extrabold text-[#6ea447] shrink-0">
                      {selectedPlant.price.toLocaleString()}원
                    </p>
                  </div>

                  <div className="mb-6">
                     <label htmlFor="market-plant-name" className="block text-sm font-bold text-gray-700 mb-2">
                      식물 이름 정하기
                    </label>
                    <input
                       id="market-plant-name"
                      type="text"
                       autoComplete="off"
                      value={customPlantName}
                       onChange={(e) => { setCustomPlantName(e.target.value); setNameError(""); if (selectedPlant) writeDraft(`plant-name:${selectedPlant.id}`, e.target.value); }}
                       onBlur={() => setNameError(customPlantName.trim() ? "" : "식물 이름을 입력해주세요.")}
                       aria-invalid={Boolean(nameError)}
                       aria-describedby={nameError ? "market-plant-name-error" : undefined}
                      placeholder={`예: 우리집 ${selectedPlant.name}`}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#6ea447] focus:border-transparent transition-colors"
                    />
                     {nameError && <p id="market-plant-name-error" className="mt-2 text-xs text-red-700">{nameError}</p>}
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm font-bold text-gray-500 shrink-0">재배 기간</span>
                      <span className="text-[14px] font-extrabold text-gray-800 text-right">
                        {selectedPlant.growthPeriod}
                      </span>
                    </div>
                    <div className="h-px bg-gray-200"></div>
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
          </>
        )}
      </BottomSheet>}
    </>
  );
}

