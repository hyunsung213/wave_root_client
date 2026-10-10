"use client";

import { useEffect, useState } from "react";
import { Bell, Settings, ChevronRight, Plus, CalendarDays, Sprout, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { getPlants, getUserMe } from "@/lib/get";
import { updatePlant } from "@/lib/patch";
import { deletePlant } from "@/lib/delete";
import { getGrowth, formatDate, HARVEST_DAYS } from "@/lib/growth";
import { useRouter } from "next/navigation";
import { EmptyState, RequestError } from "@/components/ui/RequestState";
import { useStore } from "@/store/useStore";
import type { Plant, User } from "@/store/useStore";
import { getErrorMessage } from "@/lib/errors";
import PullToRefreshStatus from "@/components/ui/PullToRefreshStatus";
import { usePullToRefresh } from "@/lib/usePullToRefresh";

const BottomSheet = dynamic(() => import("@/components/ui/BottomSheet"), { ssr: false });

export default function MyPage() {
  const router = useRouter();
  const setStorePlants = useStore((state) => state.setMyPlants);
  const [myPlants, setMyPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantsError, setPlantsError] = useState(false);
  const [userError, setUserError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [savingName, setSavingName] = useState(false);
  const [actionError, setActionError] = useState("");
  
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [editName, setEditName] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [daysTogether, setDaysTogether] = useState<number | null>(null);
  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const [releasing, setReleasing] = useState(false);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const pullState = usePullToRefresh(() => setRetryCount((value) => value + 1));

  const closeSheet = () => {
    setIsSheetOpen(false);
    setConfirmingRelease(false);
    setTimeout(() => setSelectedPlant(null), 400);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setPlantsError(false);
      setUserError(false);
      const [plantsResult, userResult] = await Promise.allSettled([
          getPlants(),
          getUserMe()
        ]);
      if (plantsResult.status === "fulfilled" && plantsResult.value.success) {
        const plants = plantsResult.value.plants || plantsResult.value.data || [];
        setMyPlants(plants);
        setStorePlants(plants);
      } else setPlantsError(true);
      if (userResult.status === "fulfilled" && userResult.value.success && userResult.value.user) {
        setUser(userResult.value.user);
        const createdAt = userResult.value.user.createdAt;
        setDaysTogether(createdAt ? Math.max(1, Math.ceil((Date.now() - new Date(createdAt).getTime()) / (1000 * 3600 * 24))) : null);
      } else setUserError(true);
      setLoading(false);
    };
    
    fetchData();
  }, [retryCount, setStorePlants]);

  const getPlantImage = (type: string = "") => {
    if (type.includes("토마토")) return "/plants/tomato.png";
    if (type.includes("바질")) return "/plants/basil.png";
    if (type.includes("상추")) return "/plants/lettuce.png";
    return "/plants/tomato.png";
  };

  const handlePlantClick = (plant: Plant) => {
    setActionError("");
    setSelectedPlant(plant);
    setEditName(plant.name || "");
    setConfirmingRelease(false);
    setIsSheetOpen(true);
  };

  const handleRelease = async () => {
    if (!selectedPlant) return;
    setReleasing(true);
    try {
      const data = await deletePlant(selectedPlant._id);
      if (data.success) {
        const nextPlants = myPlants.filter((p) => p._id !== selectedPlant._id);
        setMyPlants(nextPlants);
        setStorePlants(nextPlants);
        closeSheet();
      } else {
        setActionError(data.message || "파양에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error: unknown) {
      console.error("Failed to release plant:", error);
      setActionError(getErrorMessage(error, "파양 중 오류가 발생했습니다. 다시 시도해주세요."));
    } finally {
      setReleasing(false);
    }
  };

  const handleSaveName = async () => {
    if (!selectedPlant || !editName.trim() || savingName) return;
    const previousPlants = myPlants;
    const nextName = editName.trim();
    const nextPlants = myPlants.map((plant) => plant._id === selectedPlant._id ? { ...plant, name: nextName } : plant);
    setActionError("");
    setSavingName(true);
    setMyPlants(nextPlants);
    setStorePlants(nextPlants);
    try {
      const data = await updatePlant(selectedPlant._id, { name: nextName });
      if (!data.success) throw new Error(data.message || "이름 수정에 실패했습니다.");
      closeSheet();
    } catch (error) {
      console.error("Failed to update name:", error);
      setMyPlants(previousPlants);
      setStorePlants(previousPlants);
      setActionError("이름 수정에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSavingName(false);
    }
  };

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
        {/* 프로필 카드 */}
        <section>
          {userError && !loading ? <RequestError message="회원 정보를 불러오지 못했어요." onRetry={() => setRetryCount((value) => value + 1)} /> : (
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
                   {user?.name || (user?.email ? user.email.split('@')[0] : "정원사")}님
                </h2>
              </div>
              <p className="text-xs font-medium text-gray-500">
                {daysTogether !== null ? `함께한 지 ${daysTogether}일` : "가입일 정보 없음"}
              </p>
            </div>
            <ChevronRight className="text-gray-400 shrink-0" size={20} />
          </button>
          )}
        </section>

        {/* 내 정원 */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[17px] font-extrabold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#6ea447] rounded-full"></span>
              내 정원
            </h3>
            <span className="text-xs font-semibold text-gray-400">{myPlants.length}개 키우는 중</span>
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
            ) : plantsError ? (
              <div className="px-5 pb-3"><RequestError onRetry={() => setRetryCount((value) => value + 1)} /></div>
            ) : myPlants.length === 0 ? (
              <div className="px-5 pb-3"><EmptyState message="아직 분양받은 식물이 없어요." action={<button type="button" onClick={() => router.push('/market')} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold text-white">식물 둘러보기</button>} /></div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar px-5">
                {myPlants.map((plant, idx) => {
                  const isActive = idx === 0;
                  const { percent } = getGrowth(plant.createdAt);
                  return (
                    <button type="button"
                      key={plant._id}
                      onClick={() => handlePlantClick(plant)}
                      className={`snap-start min-w-[96px] h-[140px] rounded-[1.25rem] p-3 flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0
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
              <h4 className="font-extrabold text-gray-800">싹키워 이용권</h4>
              <span className="text-[10px] text-gray-500 bg-gray-100 font-bold px-3 py-1 rounded-full">BETA</span>
            </div>
            <p className="text-xs font-medium text-gray-500">
              베타 기간에는 모든 기능을 무료로 이용할 수 있어요.
            </p>
          </div>
        </section>
      </div>

      {/* 하단 여백 */}
      <div className="h-12"></div>

      {/* 식물 설정 바텀 시트 */}
      {selectedPlant && <BottomSheet open={isSheetOpen} onClose={closeSheet} halfY={220}>
        {selectedPlant &&
          (() => {
                  const { startDate, harvestDate, remaining, percent } = getGrowth(selectedPlant.createdAt);

                  return (
                    <>
                      {/* 식물 헤더 */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-100 relative shrink-0 overflow-hidden">
                          <Image
                            src={getPlantImage(selectedPlant.type)}
                            alt={selectedPlant.name || ""}
                            fill
                            className="object-contain p-1.5"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[22px] font-extrabold text-gray-900 tracking-tight truncate">
                            {selectedPlant.name}
                          </h3>
                          <p className="text-[13px] font-medium text-gray-400 truncate">{selectedPlant.type}</p>
                        </div>
                      </div>

                      {/* 성장률 */}
                      <div className="bg-gray-50 border border-gray-100 rounded-[1.25rem] p-5 mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[13px] font-bold text-gray-500">성장률</span>
                          <span className="text-[15px] font-extrabold text-[#6ea447]">{percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#6ea447] rounded-full transition-[width]" style={{ width: `${percent}%` }}></div>
                        </div>
                        <p className="text-[11px] font-medium text-gray-400 mt-2">
                          평균 재배기간 {HARVEST_DAYS}일 기준
                        </p>
                      </div>

                      {/* 정보 */}
                      <div className="bg-white border border-gray-100 rounded-[1.25rem] p-5 mb-6 shadow-sm flex flex-col gap-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#eef7e6] rounded-xl flex items-center justify-center shrink-0 text-[#6ea447]">
                            <CalendarDays size={16} />
                          </div>
                          <span className="text-[13px] font-medium text-gray-500 flex-1">입양일</span>
                          <span className="text-[14px] font-extrabold text-gray-800">{formatDate(startDate)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#eef7e6] rounded-xl flex items-center justify-center shrink-0 text-[#6ea447]">
                            <Sprout size={16} />
                          </div>
                          <span className="text-[13px] font-medium text-gray-500 flex-1">예상 수확일</span>
                          <span className="text-[14px] font-extrabold text-gray-800">{formatDate(harvestDate)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#eef7e6] rounded-xl flex items-center justify-center shrink-0 text-[#6ea447]">
                            <Clock size={16} />
                          </div>
                          <span className="text-[13px] font-medium text-gray-500 flex-1">남은 일수</span>
                          <span className="text-[14px] font-extrabold text-[#6ea447]">
                            {remaining > 0 ? `${remaining}일` : "수확 시기예요!"}
                          </span>
                        </div>
                      </div>

                      {/* 이름 수정 */}
                      <div className="mb-6">
                        <label htmlFor="plant-nickname" className="block text-sm font-bold text-gray-500 mb-2">식물 이름 (애칭)</label>
                        <input
                          id="plant-nickname"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium text-gray-800 focus:border-[#6ea447] transition-colors shadow-sm mb-3"
                          placeholder="예: 귀여운 토마토"
                        />
                        <button
                          onClick={handleSaveName}
                          disabled={savingName || !editName.trim()}
                          className="w-full bg-[#6ea447] hover:bg-[#5b873a] text-white font-extrabold py-4 rounded-2xl transition-colors text-[16px] shadow-md active:scale-[0.98]"
                        >
                          {savingName ? "저장 중…" : "저장하기"}
                        </button>
                      </div>

                      {actionError && <p role="alert" className="mb-4 text-sm text-red-700">{actionError}</p>}
                      {/* 파양 */}
                      <div className="border-t border-gray-100 pt-6">
                        {confirmingRelease ? (
                          <div className="bg-red-50 border border-red-100 rounded-[1.25rem] p-5">
                            <div className="flex items-start gap-2.5 mb-4">
                              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                              <p className="text-[13px] font-bold text-red-600 leading-relaxed">
                                정말 {selectedPlant.name}을(를) 파양할까요?
                                <br />
                                <span className="font-medium text-red-400">
                                  성장 일지도 모두 삭제되며 되돌릴 수 없어요.
                                </span>
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmingRelease(false)}
                                disabled={releasing}
                                className="flex-1 bg-white border border-gray-200 text-gray-600 font-extrabold py-3.5 rounded-2xl text-[15px] hover:bg-gray-50 transition-colors active:scale-[0.98]"
                              >
                                취소
                              </button>
                              <button
                                onClick={handleRelease}
                                disabled={releasing}
                                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-extrabold py-3.5 rounded-2xl text-[15px] transition-colors active:scale-[0.98]"
                              >
                                {releasing ? "처리 중..." : "파양하기"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingRelease(true)}
                            className="w-full bg-white border border-red-200 text-red-500 font-extrabold py-4 rounded-2xl text-[16px] hover:bg-red-50 transition-colors active:scale-[0.98]"
                          >
                            파양하기
                          </button>
                        )}
                      </div>
              </>
            );
          })()}
      </BottomSheet>}
    </div>
  );
}
