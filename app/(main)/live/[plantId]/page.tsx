"use client";

/* eslint-disable @next/next/no-img-element -- MJPEG streams must bypass image optimization. */

import { useCallback, useEffect, useState } from "react";
import { Camera, ChevronDown, Edit3, X } from "lucide-react";
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
        className="relative flex flex-col h-full min-h-full w-full overflow-hidden bg-gray-900 cursor-grab active:cursor-grabbing"
      >
        {/* ── Background / Live Stream ── */}
        {/* Stream lives on its own compositing layer to keep playback smooth. */}
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ willChange: 'transform', isolation: 'isolate' as const }}>
          {plant.streamingUrl && (
            <img
              key={`${plant._id}:${videoRetry}:${plant.streamingUrl}`}
              src={plant.streamingUrl}
              alt={`${plant.name} 실시간 카메라 영상`}
              onLoad={() => { setAutoReconnectCount(0); setVideoState({ src: plant.streamingUrl ?? null, status: "ready" }); }}
              onError={() => setVideoState({ src: plant.streamingUrl ?? null, status: "error" })}
              className="w-full h-full object-cover"
              style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            />
          )}
          {/* Top vignette for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40" />
          {/* Subtle ambient color overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-cyan-900/10" />
        </div>


        {/* 센서값 및 연결 상태 배너는 표시하지 않습니다. */}
        {/* ═══ TOP: compact plant name ═══ */}
        <div className="relative z-20 flex justify-center pt-12 px-6">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex flex-col items-center"
          >
            <div className="max-w-full rounded-full border border-white/80 bg-white/95 px-3.5 py-1.5 shadow-lg backdrop-blur-sm">
              <h2 className="max-w-[70vw] truncate text-[10px] font-extrabold tracking-tight text-[#496d2f]">
                {plant.name}
              </h2>
            </div>
          </motion.div>
        </div>

        {/* ═══ Bottom Action Button ═══ */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="absolute bottom-12 left-0 right-0 z-20 flex justify-center"
        >
          {/* Record Button */}
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label={`${plant.name} 성장 기록 남기기`}
            onClick={() => { setRecordError(""); setImageCaptureFeedback(""); setIsRecordSheetOpen(true); }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-[#eef7e6] text-[#496d2f] shadow-lg">
              <Edit3 size={22} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <span className="text-[10px] font-bold tracking-wide text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
              기록
            </span>
          </motion.button>

        </motion.div>

        {/* 현재 식물 주변 최대 3개까지 가운데 정렬해 표시합니다. */}
        {myPlants && myPlants.length > 1 && (
          <div role="group" aria-label="식물 전환" className="absolute bottom-[152px] left-0 right-0 z-20 flex justify-center gap-4">
            {visiblePlants.map((p: Plant) => (
              <button type="button"
                key={p._id}
                onClick={() => router.replace(`/live/${p._id}`)}
                aria-label={`${p.name} 화면으로 이동`}
                aria-current={p._id === plantId ? "true" : undefined}
                className="flex min-h-11 min-w-11 items-center justify-center"
              ><span className={`block h-2 rounded-full ${p._id === plantId ? "w-5 bg-white" : "w-2 bg-white/40"}`} /></button>
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
                    <label htmlFor="record-type" className="text-[13px] font-bold text-gray-600 ml-1">분류</label>
                    <div className="relative">
                      <select 
                        id="record-type"
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-[15px] font-medium text-gray-800 transition-colors focus:border-[#6ea447] focus:outline-none focus:ring-2 focus:ring-[#6ea447]/20"
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
                    <label htmlFor="record-title" className="text-[13px] font-bold text-gray-600 ml-1">제목</label>
                    <input 
                      id="record-title"
                      type="text" 
                      placeholder="어떤 일이 있었나요?" 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] font-medium text-gray-800 placeholder:text-gray-400 transition-colors focus:border-[#6ea447] focus:outline-none focus:ring-2 focus:ring-[#6ea447]/20"
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
                    <label htmlFor="record-description" className="text-[13px] font-bold text-gray-600 ml-1">내용</label>
                    <textarea 
                      id="record-description"
                      placeholder="자세한 관찰 내용을 적어보세요." 
                      className="h-28 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] font-medium text-gray-800 placeholder:text-gray-400 transition-colors focus:border-[#6ea447] focus:outline-none focus:ring-2 focus:ring-[#6ea447]/20"
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
                    className="min-h-12 w-full rounded-xl bg-[#6ea447] py-3 text-[15px] font-extrabold text-white shadow-sm transition-colors hover:bg-[#5b8d3b] disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {recordSubmitting ? "저장 중…" : "저장하기"}
                  </button>
                </form>
      </BottomSheet>
    </>
  );
}
