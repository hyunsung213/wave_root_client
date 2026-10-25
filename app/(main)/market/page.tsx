"use client";

import { Filter, Bell, Settings, Info, Sprout } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { plantsData, type PlantInfo } from "@/lib/plantsData";
import { getCatalog, type CatalogProduct, type CatalogStatus } from "@/lib/get";
import { getPlantImage } from "@/lib/plantImages";
import { useStore } from "@/store/useStore";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";
import BrandLogo from "@/components/layout/BrandLogo";

const BottomSheet = dynamic(() => import("@/components/ui/BottomSheet"), { ssr: false });

type MarketCategoryId = "all" | "leafy-greens" | "herbs" | "edible-flowers";
type MarketPlant = PlantInfo & { status: CatalogStatus };

const marketCategories: { id: MarketCategoryId; label: string; plantIds: readonly string[] | null }[] = [
  { id: "all", label: "전체", plantIds: null },
  { id: "leafy-greens", label: "잎채소", plantIds: ["lettuce", "romaine", "arugula", "green_oakleaf_lettuce", "butterhead", "tatsoi", "bok_choy", "young_napa_cabbage"] },
  { id: "herbs", label: "허브", plantIds: ["basil"] },
  { id: "edible-flowers", label: "식용꽃", plantIds: ["marigold", "nasturtium"] },
] as const;

export default function MarketPage() {
  const router = useRouter();
  const setPendingPlantName = useStore((state) => state.setPendingPlantName);

  // Bottom Sheet States
  const [selectedPlant, setSelectedPlant] = useState<MarketPlant | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [customPlantName, setCustomPlantName] = useState("");
  const [nameError, setNameError] = useState("");
  const [sortBy, setSortBy] = useState<"recommended" | "price">("recommended");
  const [selectedCategory, setSelectedCategory] = useState<MarketCategoryId>("all");
  const [catalog, setCatalog] = useState<CatalogProduct[] | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRefresh, setCatalogRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    getCatalog().then((data) => {
      if (!active) return;
      setCatalog(Array.isArray(data.products) ? data.products : []);
      setCatalogError("");
    }).catch(() => {
      if (!active) return;
      setCatalog(null);
      setCatalogError("분양 상품을 불러오지 못했어요. 다시 시도해주세요.");
    });
    return () => { active = false; };
  }, [catalogRefresh]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setCatalogRefresh((value) => value + 1); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const category = marketCategories.find((item) => item.id === selectedCategory) ?? marketCategories[0];
  const catalogById = new Map(catalog?.map((product) => [product.id, product]));
  const categoryPlants: MarketPlant[] = plantsData
    .filter((plant) => {
      const status = catalogById.get(plant.id)?.status;
      return (status === "available" || status === "upcoming") && (!category.plantIds || category.plantIds.includes(plant.id));
    })
    .map((plant) => ({
      ...plant,
      price: catalogById.get(plant.id)!.price ?? plant.price,
      timeToHarvest: catalogById.get(plant.id)!.growthTargetDays ?? plant.timeToHarvest,
      status: catalogById.get(plant.id)!.status,
    }));
  const sortedPlants = sortBy === "price" ? [...categoryPlants].sort((a, b) => a.status === b.status ? a.price - b.price : a.status === "available" ? -1 : 1) : categoryPlants;

  // 식물 클릭 시 Bottom Sheet 오픈
  const openSheet = (plant: MarketPlant) => {
    if (plant.status !== "available") return;
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
    if (catalog?.find((product) => product.id === selectedPlant.id)?.status !== "available") {
      setNameError("이 식물은 현재 분양할 수 없습니다.");
      return;
    }
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
      <div className="app-page-content flex min-h-full flex-col bg-white pb-6 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 aria-label="싹키워"><BrandLogo /></h1>
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
              <p className="mt-2 text-xs font-semibold text-[#6ea447]">계좌이체 주문과 보유 쿠폰을 이용할 수 있어요.</p>
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

        <div role="group" aria-label="분양 카테고리" className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
          {marketCategories.map((item) => {
            const isSelected = item.id === selectedCategory;
            return (
              <button
                key={item.id}
                id={`market-category-${item.id}`}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedCategory(item.id)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors ${isSelected ? "border-[#5b873a] bg-[#5b873a] text-white" : "border-[#e5e9df] bg-white text-gray-600"}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mb-3 flex justify-between items-center">
          <span className="text-xs font-bold text-gray-400">{sortedPlants.length}종</span>
          <button
            onClick={() => setSortBy(sortBy === "recommended" ? "price" : "recommended")}
            aria-label={sortBy === "recommended" ? "추천순 정렬, 가격 낮은순으로 변경" : "가격 낮은순 정렬, 추천순으로 변경"}
            className="flex min-h-11 items-center gap-1 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            <Filter size={12} />
            {sortBy === "recommended" ? "추천순" : "가격 낮은순"}
          </button>
        </div>

        <div id="market-plant-list" aria-label={`${category.label} 상품`} className="flex flex-col gap-4">
          {!catalog && !catalogError && <div className="rounded-3xl bg-[#f8faf5] px-5 py-10 text-center text-sm font-semibold text-gray-500">분양 상품을 불러오는 중…</div>}
          {catalogError && <div className="rounded-3xl border border-[#dce5d4] bg-[#f8faf5] px-5 py-8 text-center"><p className="text-sm font-semibold text-gray-700">{catalogError}</p><button type="button" onClick={() => { setCatalogError(""); setCatalogRefresh((value) => value + 1); }} className="mt-4 min-h-11 rounded-xl bg-[#6ea447] px-5 text-sm font-bold text-white">다시 시도</button></div>}
          {sortedPlants.map((plant) => (
            <button type="button" disabled={plant.status !== "available"}
              key={plant.id} 
              onClick={() => openSheet(plant)}
              className="flex w-full gap-4 p-4 border border-gray-100 rounded-3xl shadow-sm hover:border-[#e2ecc8] transition-colors text-left cursor-pointer active:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-75"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden border border-gray-100">
                {plant.imageUrl ? <Image
                  src={getPlantImage(plant.id)}
                  alt={plant.name} 
                  fill
                  sizes="80px"
                  className="object-contain p-2.5 mix-blend-multiply"
                /> : <Sprout size={30} className="text-[#94b877]" aria-hidden="true" />}
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800">{plant.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${plant.status === "upcoming" ? "bg-amber-100 text-amber-800" : "bg-[#eef7e6] text-[#6ea447]"}`}>
                    {plant.status === "upcoming" ? "분양 예정" : "분양 진행 중"}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mb-2 line-clamp-2 leading-tight pr-2">
                  {plant.characteristics}
                </p>
                {plant.hashtags && <div aria-label={`${plant.name} 해시태그`} className="mb-2 flex flex-wrap gap-1.5">
                  {plant.hashtags.map((tag) => <span key={tag} className="rounded-full bg-[#f1f6ed] px-2 py-0.5 text-[10px] font-semibold text-[#587d3e]">#{tag}</span>)}
                </div>}
                <p className="font-bold text-sm text-[#6ea447]">{plant.status === "upcoming" ? "준비 중 · 선택할 수 없어요" : `${plant.price.toLocaleString()}원`}</p>
              </div>
            </button>
          ))}
          {catalog && sortedPlants.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#dce5d4] bg-[#f8faf5] px-5 py-10 text-center">
              <p className="font-bold text-gray-800">이 카테고리에 표시할 상품이 없어요</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">다른 카테고리에서 식물을 확인해 보세요.</p>
            </div>
          )}
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
            className="w-full rounded-2xl bg-gray-900 py-4 text-base font-bold text-white shadow-xl transition-colors hover:bg-gray-800 active:scale-[0.98]"
          >
            상품 확인하기
          </button>
        }
      >
        {selectedPlant && (
          <>
                  <div className="w-full h-36 bg-gray-50 rounded-3xl relative mb-5 border border-gray-100 shrink-0 mt-1">
                    {selectedPlant.imageUrl ? <Image
                      src={getPlantImage(selectedPlant.id)}
                      alt={selectedPlant.name}
                      fill
                      sizes="(max-width: 400px) 100vw, 400px"
                      priority
                      className="object-contain p-6 mix-blend-multiply drop-shadow-md"
                    /> : <div className="flex h-full items-center justify-center"><Sprout size={56} className="text-[#94b877]" aria-hidden="true" /></div>}
                  </div>
                  
                  <div className="mb-5 flex justify-between items-center gap-3">
                    <h2 className="truncate text-[22px] font-extrabold text-gray-900">{selectedPlant.name}</h2>
                    <p className="shrink-0 text-[22px] font-extrabold text-[#6ea447]">
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
                      <span className="text-sm font-bold text-gray-500 shrink-0">생장 형태</span>
                      <span className="text-[14px] font-extrabold text-gray-800 text-right">
                        {selectedPlant.growthPeriod}
                      </span>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm font-bold text-gray-500 shrink-0">첫 수확 예상</span>
                      <span className="text-sm font-extrabold text-gray-800">파종 후 약 {selectedPlant.timeToHarvest}일</span>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                    {selectedPlant.bestSeason && <><div className="flex justify-between gap-3"><span className="shrink-0 text-sm font-bold text-gray-500">적합 계절</span><span className="text-right text-sm font-extrabold text-gray-800">{selectedPlant.bestSeason}</span></div><div className="h-px bg-gray-200"></div></>}
                    {selectedPlant.temperatureTendency && <><div className="flex justify-between gap-3"><span className="shrink-0 text-sm font-bold text-gray-500">온도 성향</span><span className="text-right text-sm font-extrabold text-gray-800">{selectedPlant.temperatureTendency}</span></div><div className="h-px bg-gray-200"></div></>}
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-sm font-bold text-gray-500 shrink-0">적정 온도</span>
                      <span className="text-right text-sm font-extrabold text-gray-800">{selectedPlant.optimalTemperature}</span>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                    <div>
                      <h4 className="mb-1 text-sm font-bold text-gray-500">재배 관리</h4>
                      <p className="text-sm font-medium leading-relaxed text-gray-800">{selectedPlant.wateringCycle}</p>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-500 mb-2">식물 특징</h4>
                      <div className="space-y-3 text-sm font-medium leading-relaxed text-gray-800">
                        {selectedPlant.characteristics.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => (
                          <p key={`${selectedPlant.id}-characteristic-${index}`}>{paragraph}</p>
                        ))}
                      </div>
                      {selectedPlant.hashtags && <div className="mt-3 flex flex-wrap gap-2">{selectedPlant.hashtags.map((tag) => <span key={tag} className="rounded-full bg-[#eaf5e5] px-2.5 py-1 text-xs font-semibold text-[#4d7836]">#{tag}</span>)}</div>}
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

