"use client";

/* eslint-disable @next/next/no-img-element -- MJPEG streams must bypass image optimization. */

import { useCallback, useEffect, useState } from "react";
import { Camera, ChevronDown, Edit3, Radio, RefreshCw, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { motion, PanInfo } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";
import { getPlantById } from "@/lib/get";
import { createEvent } from "@/lib/post";
import { useStore, type Plant } from "@/store/useStore";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";

export default function LivePage() {
  const params = useParams();
  const router = useRouter();
  const plantId = params.plantId;
  
  // 식물 데이터 가져오기
  const myPlants = useStore((state) => state.myPlants);
  const [fetchedPlant, setFetchedPlant] = useState<Plant | null>(null);
  const [plantRequest, setPlantRequest] = useState<{ id: string; status: "loading" | "error" | "ready" } | null>(null);
  const [plantRetry, setPlantRetry] = useState(0);
  const cachedPlant = myPlants.find((item) => item._id === plantId) || null;
  const plant = fetchedPlant?._id === plantId ? fetchedPlant : cachedPlant;
  const plantLoading = !plant && (plantRequest?.id !== plantId || plantRequest?.status === "loading");
  const plantError = !plant && plantRequest?.id === plantId && plantRequest?.status === "error";

  const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false);
  const [videoState, setVideoState] = useState<{ src: string | null; status: "loading" | "ready" | "error" | "unavailable" }>(() => ({
    src: plant?.streamingUrl ?? null,
    status: plant?.streamingUrl ? "loading" : "unavailable",
  }));
  const streamUrl = plant?.streamingUrl ?? null;
  const videoStatus = videoState.src === streamUrl ? videoState.status : streamUrl ? "loading" : "unavailable";
  const [videoRetry, setVideoRetry] = useState(0);
  const [autoReconnectCount, setAutoReconnectCount] = useState(0);
  const [recordForm, setRecordForm] = useState({ title: "", type: "기타", desc: "" });
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [recordImage, setRecordImage] = useState<{ plantId: string; file: File; previewUrl: string } | null>(null);
  const activeRecordImage = recordImage?.plantId === plantId ? recordImage : null;
  const [imageCaptureLoading, setImageCaptureLoading] = useState(false);
  const [imageCaptureFeedback, setImageCaptureFeedback] = useState("");

  useEffect(() => {
    const previewUrl = recordImage?.previewUrl;
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [recordImage]);

  useEffect(() => {
    if (typeof plantId !== "string") return;
    if (plant?.streamingUrl) return;
    let active = true;
    getPlantById(plantId).then((data) => {
      if (!active) return;
      const fetched = data.plant || data.data;
      if (data.success && fetched?._id) {
        setFetchedPlant(fetched);
        setPlantRequest({ id: plantId, status: "ready" });
      } else setPlantRequest({ id: plantId, status: "error" });
    }).catch(() => {
      if (active) setPlantRequest({ id: plantId, status: "error" });
    });
    return () => { active = false; };
  }, [plantId, plantRetry, plant?.streamingUrl]);

  const retryPlantStream = useCallback(async () => {
    if (typeof plantId !== "string") return;
    setVideoState({ src: streamUrl, status: "loading" });
    setPlantRequest({ id: plantId, status: "loading" });
    setVideoRetry((value) => value + 1);
    try {
      const data = await getPlantById(plantId);
      const refreshed = data.plant || data.data;
      if (!data.success || !refreshed?._id) throw new Error("식물 정보를 갱신할 수 없습니다.");
      setFetchedPlant(refreshed);
      setPlantRequest({ id: plantId, status: "ready" });
      if (!refreshed.streamingUrl) setVideoState({ src: null, status: "unavailable" });
    } catch (error) {
      console.error("Failed to refresh plant stream:", error);
      setVideoState({ src: streamUrl, status: "error" });
    }
  }, [plantId, streamUrl]);

  useEffect(() => {
    if (videoStatus !== "error" || !streamUrl || autoReconnectCount >= 3) return;
    const delayMs = 1000 * 2 ** autoReconnectCount;
    const timeoutId = window.setTimeout(() => {
      setAutoReconnectCount((count) => count + 1);
      void retryPlantStream();
    }, delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [autoReconnectCount, retryPlantStream, streamUrl, videoStatus]);

  useEffect(() => {
    if (typeof plantId !== "string") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let draft = { title: "", type: "기타", desc: "" };
      try {
        const saved = readDraft(`record:${plantId}`);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && "title" in parsed && "desc" in parsed && "type" in parsed && typeof parsed.title === "string" && typeof parsed.desc === "string" && typeof parsed.type === "string") draft = { title: parsed.title, desc: parsed.desc, type: parsed.type };
        }
      } catch { /* 손상된 임시 기록은 사용하지 않는다. */ }
      setRecordForm(draft);
      setDraftFor(plantId);
    });
    return () => { active = false; };
  }, [plantId]);

  useEffect(() => {
    if (draftFor !== plantId || typeof plantId !== "string") return;
    if (recordForm.title || recordForm.desc) writeDraft(`record:${plantId}`, JSON.stringify(recordForm));
    else removeDraft(`record:${plantId}`);
  }, [draftFor, plantId, recordForm]);

  const closeSheet = () => {
    setIsRecordSheetOpen(false);
  };

  const captureStreamFrame = async () => {
    if (!streamUrl || videoStatus !== "ready" || imageCaptureLoading) return;
    setImageCaptureLoading(true);
    setImageCaptureFeedback("");
    setRecordError("");
    try {
      const response = await fetch("/api/proxy-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: streamUrl }),
        cache: "no-store",
      });
      if (!response.ok || !response.headers.get("Content-Type")?.toLowerCase().startsWith("image/jpeg")) {
        throw new Error("Camera frame could not be captured");
      }
      const blob = await response.blob();
      if (!blob.size || blob.size > 5 * 1024 * 1024) throw new Error("Camera frame size is not supported");

      const file = new File([blob], `growth-${Date.now()}.jpg`, { type: "image/jpeg" });
      setRecordImage({ plantId: plantId as string, file, previewUrl: URL.createObjectURL(file) });
      setImageCaptureFeedback("현재 영상 화면을 기록 이미지로 준비했어요.");
    } catch (error) {
      console.error("Failed to capture a growth record image:", error);
      setImageCaptureFeedback("영상 캡처에 실패했어요. 영상 연결 상태를 확인하고 다시 시도해주세요.");
    } finally {
      setImageCaptureLoading(false);
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recordSubmitting) return;
    if (!recordForm.title.trim()) {
      setRecordError("제목을 입력해주세요.");
      return;
    }
    setRecordError("");
    setRecordSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("plantId", plantId as string);
      
      const formattedTitle = `[${recordForm.type}] ${recordForm.title.trim()}`;
      formData.append("title", formattedTitle);
      formData.append("content", recordForm.desc || "내용 없음");
      formData.append("eventDate", new Date().toISOString());
      if (activeRecordImage) formData.append("image", activeRecordImage.file);
      const responseData = await createEvent(formData);

      if (responseData.success) {
        removeDraft(`record:${plantId}`);
        closeSheet();
        setRecordForm({ title: "", type: "기타", desc: "" });
        setRecordImage(null);
        setImageCaptureFeedback("");
      } else {
        setRecordError(responseData.message || "기록을 저장하지 못했어요. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Failed to submit record:", error);
      setRecordError("기록을 저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setRecordSubmitting(false);
    }
  };
  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (!myPlants || myPlants.length <= 1) return;
    
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      // Swipe left -> Next plant
      const idx = myPlants.findIndex((item) => item._id === plantId);
      const nextIdx = (idx + 1) % myPlants.length;
      router.replace(`/live/${myPlants[nextIdx]._id}`);
    } else if (info.offset.x > swipeThreshold) {
      // Swipe right -> Previous plant
      const idx = myPlants.findIndex((item) => item._id === plantId);
      const prevIdx = (idx - 1 + myPlants.length) % myPlants.length;
      router.replace(`/live/${myPlants[prevIdx]._id}`);
    }
  };

  // Keep the active plant near the center of the indicator and show at most 3.
  const activePlantIndex = myPlants.findIndex((item) => item._id === plantId);
  const indicatorStart = Math.max(0, Math.min(activePlantIndex - 1, myPlants.length - 3));
  const visiblePlants = myPlants.slice(indicatorStart, indicatorStart + 3);

  if (!plant) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center text-white">
      <p role={plantError ? "alert" : "status"}>{plantLoading ? "식물 정보를 불러오는 중이에요…" : "식물 정보를 찾지 못했어요."}</p>
      {!plantLoading && <button type="button" onClick={() => { if (typeof plantId === "string") setPlantRequest({ id: plantId, status: "loading" }); setPlantRetry((value) => value + 1); }} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold">다시 시도</button>}
      {!plantLoading && <button type="button" onClick={() => router.push("/home")} className="min-h-11 px-5 font-semibold">홈으로 이동</button>}
    </div>
  );

  return (
    <>
      {/* ═══ Main Live View ═══ */}
      <motion.div 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="relative flex h-full min-h-full w-full flex-col gap-5 overflow-hidden bg-[#f7f8f3] px-5 pb-5 pt-6"
      >
        {/* ── Background / Live Stream ── */}
        {/* Stream lives on its own compositing layer to keep playback smooth. */}
        <div className="relative z-0 shrink-0 overflow-hidden rounded-[28px] border border-[#e7eadf] bg-white shadow-[0_12px_35px_rgba(51,69,39,0.12)]">
        <div className="relative aspect-video w-full overflow-hidden bg-[#20291f]" style={{ willChange: 'transform', isolation: 'isolate' as const }}>
          {plant.streamingUrl && (
            <img
              key={`${plant._id}:${videoRetry}:${plant.streamingUrl}`}
              src={plant.streamingUrl}
              alt={`${plant.name} 실시간 카메라 영상`}
              onLoad={() => { setAutoReconnectCount(0); setVideoState({ src: plant.streamingUrl ?? null, status: "ready" }); }}
              onError={() => setVideoState({ src: plant.streamingUrl ?? null, status: "error" })}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            />
          )}
          {/* Top vignette for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/20" />
          {/* Subtle ambient color overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-cyan-900/10" />
        </div>

        <section aria-label={`${plant.name} 실시간 카메라`} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-t border-[#f0f1ec] bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#92998c]">CURRENT PLANT</p>
              <h2 className="mt-0.5 truncate text-lg font-extrabold tracking-tight text-[#283722]">{plant.name}</h2>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${videoStatus === "ready" ? "bg-[#edf6e7] text-[#507837]" : "bg-[#f2f3ef] text-[#7e8578]"}`}>
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${videoStatus === "ready" ? "bg-[#6ea447]" : "bg-[#a6aca0]"}`} />
              {videoStatus === "ready" ? "LIVE" : videoStatus === "error" ? "연결 확인" : videoStatus === "loading" ? "연결 중" : "카메라 없음"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-bold text-[#34432d]">오늘의 성장 장면</p>
              <p className="mt-0.5 text-xs text-[#899084]">지금 보이는 순간을 메모로 남겨보세요.</p>
            </div>
            {streamUrl && <button type="button" onClick={() => { void retryPlantStream(); }} aria-label="카메라 영상 새로고침" className="icon-button shrink-0 rounded-full bg-[#f4f6f0] text-[#607653] hover:bg-[#eaf0e3]"><RefreshCw size={17} aria-hidden="true" /></button>}
          </div>
        </section>
        </div>


        {/* 센서값 및 연결 상태 배너는 표시하지 않습니다. */}
        {/* ═══ TOP: compact plant name ═══ */}
        <div className="relative z-20 -order-1 flex shrink-0 flex-col items-start px-1">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex flex-col items-start"
          >
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#6b8f4e]"><Radio size={14} aria-hidden="true" /> Garden live</p>
            <h1 className="text-[26px] font-black leading-tight tracking-[-0.04em] text-[#24351e]">실시간 돌봄</h1>
            <p className="mt-1 text-sm font-medium text-[#788174]">카메라로 {plant.name}의 오늘을 살펴보세요.</p>
          </motion.div>
        </div>

        {/* ═══ Bottom Action Button ═══ */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="relative z-20 order-last mt-auto flex w-full shrink-0 justify-center"
        >
          {/* Record Button */}
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label={`${plant.name} 성장 기록 남기기`}
            onClick={() => { setRecordError(""); setImageCaptureFeedback(""); setIsRecordSheetOpen(true); }}
            className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#5b873a] px-5 text-[15px] font-extrabold text-white shadow-[0_8px_18px_rgba(77,116,49,0.2)] transition-colors hover:bg-[#4f7732]"
          >
            <Edit3 size={19} strokeWidth={2.3} aria-hidden="true" />
            <span>메모 남기기</span>
          </motion.button>

        </motion.div>

        {/* 현재 식물 주변 최대 3개까지 가운데 정렬해 표시합니다. */}
        {myPlants && myPlants.length > 1 && (
          <div className="relative z-20 order-1 flex w-full shrink-0 justify-center gap-2">
            {visiblePlants.map((p: Plant) => (
              <button type="button"
                key={p._id}
                onClick={() => router.replace(`/live/${p._id}`)}
                aria-label={`${p.name} 화면으로 이동`}
                aria-current={p._id === plantId ? "true" : undefined}
                className={`min-h-10 min-w-11 rounded-full px-4 text-xs font-bold ${p._id === plantId ? "bg-[#eaf3e3] text-[#496d2f]" : "bg-white text-[#888f82]"}`}
              >{p.name}</button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ═══ Record Modal — 공용 바텀 시트 ═══ */}
      <BottomSheet
        open={isRecordSheetOpen}
        onClose={closeSheet}
        title="새로운 이벤트 기록"
        description="식물의 성장 기록을 남겨보세요"
        halfY={300}
      >
                <form onSubmit={handleRecordSubmit} className="flex flex-col gap-4 pb-8">
                  {/* Category select */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="record-type" className="ml-1 text-sm font-bold text-gray-600">분류</label>
                    <div className="relative">
                      <select 
                        id="record-type"
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-base font-medium text-gray-800 transition-colors focus:border-[#6ea447] focus:outline-none focus:ring-2 focus:ring-[#6ea447]/20"
                        value={recordForm.type}
                        onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                      >
                        <option value="기타">기타 (일반 관찰)</option>
                        <option value="싹">싹이 났어요 🌱</option>
                        <option value="열매">열매가 맺혔어요 🍎</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Title input */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="record-title" className="ml-1 text-sm font-bold text-gray-600">제목</label>
                    <input 
                      id="record-title"
                      type="text" 
                      placeholder="어떤 일이 있었나요?" 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base font-medium text-gray-800 placeholder:text-gray-400 transition-colors focus:border-[#6ea447] focus:outline-none focus:ring-2 focus:ring-[#6ea447]/20"
                      value={recordForm.title}
                      onChange={(e) => { setRecordForm({ ...recordForm, title: e.target.value }); setRecordError(""); }}
                      onBlur={() => { if (!recordForm.title.trim()) setRecordError("제목을 입력해주세요."); }}
                      aria-invalid={Boolean(recordError) && !recordForm.title.trim()}
                      aria-describedby={recordError ? "record-error" : undefined}
                      required
                    />
                  </div>

                  {/* Description textarea */}
                  <div className="flex flex-col gap-2 mb-2">
                    <label htmlFor="record-description" className="ml-1 text-sm font-bold text-gray-600">내용</label>
                    <textarea 
                      id="record-description"
                      placeholder="자세한 관찰 내용을 적어보세요." 
                      className="h-28 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base font-medium text-gray-800 placeholder:text-gray-400 transition-colors focus:border-[#6ea447] focus:outline-none focus:ring-2 focus:ring-[#6ea447]/20"
                      value={recordForm.desc}
                      onChange={(e) => setRecordForm({ ...recordForm, desc: e.target.value })}
                    />
                  </div>

                  <section aria-labelledby="record-capture-heading" className="mb-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Camera size={17} aria-hidden="true" className="text-[#496d2f]" />
                      <h3 id="record-capture-heading" className="text-sm font-extrabold text-gray-800">기록 이미지</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => { void captureStreamFrame(); }}
                      disabled={!streamUrl || videoStatus !== "ready" || imageCaptureLoading}
                      aria-describedby="record-capture-help"
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#496d2f] px-4 py-3 text-sm font-bold text-white hover:bg-[#3d5c27] disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      <Camera size={17} aria-hidden="true" />
                      {imageCaptureLoading ? "현재 화면 캡처 중…" : activeRecordImage ? "현재 화면 다시 캡처" : "현재 영상 화면 캡처"}
                    </button>
                    <p id="record-capture-help" className="mt-2 text-xs leading-relaxed text-gray-700">
                      {streamUrl ? "캡처한 이미지는 성장 기록을 저장할 때 함께 첨부돼요." : "카메라 영상이 연결되면 화면을 캡처할 수 있어요."}
                    </p>
                    {imageCaptureFeedback && <p role="status" aria-live="polite" className="mt-2 text-xs font-semibold text-gray-700">{imageCaptureFeedback}</p>}
                    {activeRecordImage && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-black/5">
                        <div className="flex items-center justify-between gap-3 bg-white/80 px-3 py-2">
                          <p className="min-w-0 truncate text-xs font-semibold text-gray-700">캡처 미리보기</p>
                          <button type="button" onClick={() => { setRecordImage(null); setImageCaptureFeedback("캡처 이미지를 삭제했어요."); }} aria-label="캡처 이미지 삭제" className="icon-button -mr-2 rounded-full text-gray-700 hover:bg-gray-100">
                            <X size={18} aria-hidden="true" />
                          </button>
                        </div>
                        <img src={activeRecordImage.previewUrl} alt="성장 기록에 첨부할 현재 영상 캡처" width={1280} height={720} className="block aspect-video w-full object-contain" />
                      </div>
                    )}
                  </section>

                  <p className="text-xs text-gray-600">작성 중인 내용은 이 탭에 임시 저장됩니다.</p>
                  {recordError && <p id="record-error" role="alert" className="text-sm text-red-700">{recordError}</p>}

                  {/* Submit button — shared garden-green accent */}
                  <button 
                    type="submit" 
                    disabled={recordSubmitting || imageCaptureLoading}
                    className="min-h-12 w-full rounded-xl bg-[#6ea447] py-3 text-base font-extrabold text-white shadow-sm transition-colors hover:bg-[#5b8d3b] disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {recordSubmitting ? "저장 중…" : "저장하기"}
                  </button>
                </form>
      </BottomSheet>
    </>
  );
}
