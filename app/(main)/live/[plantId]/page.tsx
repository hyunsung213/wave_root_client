"use client";

/* eslint-disable @next/next/no-img-element -- MJPEG streams must bypass image optimization. */

import { useCallback, useEffect, useState } from "react";
import { Droplets, Thermometer, Sprout, ChevronDown, Edit3, Sun, Leaf } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";
import { getPlantById, getPlantCurrent } from "@/lib/get";
import { createEvent } from "@/lib/post";
import { useStore, type Plant } from "@/store/useStore";
import { soilMoisturePercent } from "@/lib/sensors";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";

/* ─── Liquid Glass style presets ─── */
/* willChange + isolation forces each glass element onto its own GPU compositing
   layer so that backdropFilter does NOT re-sample the rapidly-changing stream
   frames on every paint — this eliminates the "flicker pass-through" artifact. */
const glass = {
  pill: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 100%)',
    backdropFilter: 'blur(60px) saturate(200%) brightness(1.1)',
    WebkitBackdropFilter: 'blur(60px) saturate(200%) brightness(1.1)',
    border: '1px solid rgba(255,255,255,0.45)',
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.6),
      inset 0 -1px 0 rgba(255,255,255,0.1),
      0 8px 32px rgba(0,0,0,0.12),
      0 2px 8px rgba(0,0,0,0.08)
    `,
    willChange: 'transform' as const,
    isolation: 'isolate' as const,
  },
  card: {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 100%)',
    backdropFilter: 'blur(60px) saturate(200%) brightness(1.05)',
    WebkitBackdropFilter: 'blur(60px) saturate(200%) brightness(1.05)',
    border: '1px solid rgba(255,255,255,0.35)',
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.5),
      inset 0 -1px 0 rgba(255,255,255,0.08),
      0 12px 40px rgba(0,0,0,0.15),
      0 2px 8px rgba(0,0,0,0.06)
    `,
    willChange: 'transform' as const,
    isolation: 'isolate' as const,
  },
  button: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 100%)',
    backdropFilter: 'blur(60px) saturate(200%) brightness(1.1)',
    WebkitBackdropFilter: 'blur(60px) saturate(200%) brightness(1.1)',
    border: '1px solid rgba(255,255,255,0.4)',
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.55),
      inset 0 -1px 0 rgba(255,255,255,0.1),
      0 8px 32px rgba(0,0,0,0.18),
      0 2px 8px rgba(0,0,0,0.06)
    `,
    willChange: 'transform' as const,
    isolation: 'isolate' as const,
  },
  input: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.35) 100%)',
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
    border: '1px solid rgba(255,255,255,0.5)',
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.6),
      inset 0 2px 4px rgba(0,0,0,0.03),
      0 2px 8px rgba(0,0,0,0.04)
    `,
  },
} as const;

export default function LivePage() {
  const params = useParams();
  const router = useRouter();
  const plantId = params.plantId;
  
  // 식물 데이터 가져오기
  const myPlants = useStore((state) => state.myPlants);
  const [fetchedPlant, setFetchedPlant] = useState<Plant | null>(null);
  const [plantRequest, setPlantRequest] = useState<{ id: string; status: "loading" | "error" | "ready" } | null>(null);
  const [plantRetry, setPlantRetry] = useState(0);
  const [todayMs, setTodayMs] = useState<number | null>(null);
  const cachedPlant = myPlants.find((item) => item._id === plantId) || null;
  const plant = fetchedPlant?._id === plantId ? fetchedPlant : cachedPlant;
  const plantLoading = !plant && (plantRequest?.id !== plantId || plantRequest?.status === "loading");
  const plantError = !plant && plantRequest?.id === plantId && plantRequest?.status === "error";
  
  // D-day 계산 (임시: createdAt 기준 또는 1일)
  const daysWithPlant = plant?.createdAt && todayMs !== null
    ? Math.max(1, Math.floor((todayMs - new Date(plant.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false);
  const [videoState, setVideoState] = useState<{ src: string | null; status: "loading" | "ready" | "error" | "unavailable" }>(() => ({
    src: plant?.streamingUrl ?? null,
    status: plant?.streamingUrl ? "loading" : "unavailable",
  }));
  const streamUrl = plant?.streamingUrl ?? null;
  const videoStatus = videoState.src === streamUrl ? videoState.status : streamUrl ? "loading" : "unavailable";
  const currentPlantRequestStatus = plantRequest && plantRequest.id === plantId ? plantRequest.status : null;
  const [videoRetry, setVideoRetry] = useState(0);
  const [autoReconnectCount, setAutoReconnectCount] = useState(0);
  const [recordForm, setRecordForm] = useState({ title: "", type: "기타", desc: "" });
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [recordFeedback, setRecordFeedback] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTodayMs(Date.now()));
    return () => cancelAnimationFrame(frame);
  }, [plant?.createdAt]);

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

      // 데모 영상 프레임은 실제 성장 기록 이미지로 첨부하지 않는다.
      const responseData = await createEvent(formData);

      if (responseData.success) {
        removeDraft(`record:${plantId}`);
        setRecordFeedback("성장 일지가 저장되었어요.");
        closeSheet();
        setRecordForm({ title: "", type: "기타", desc: "" });
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
  const [sensorStatus, setSensorStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sensors, setSensors] = useState<{ degree: number | null; moisture_air: number | null; moisture_soil: number | null; rux: number | null } | null>(null);
  const [sensorUpdatedAt, setSensorUpdatedAt] = useState<Date | null>(null);

  const fetchCurrentSensor = useCallback(async () => {
    if (typeof plantId !== "string") return;
    try {
      const data = await getPlantCurrent(plantId);
      if (!data.success || !data.sensor) throw new Error("센서 정보를 확인할 수 없습니다.");
      const degree = data.sensor.degree == null || data.sensor.degree === "" ? NaN : Number(data.sensor.degree);
      const air = data.sensor.moisture_air == null || data.sensor.moisture_air === "" ? NaN : Number(data.sensor.moisture_air);
      const light = data.sensor.rux == null || data.sensor.rux === "" ? NaN : Number(data.sensor.rux);
      setSensors({
        degree: Number.isFinite(degree) ? degree : null,
        moisture_air: Number.isFinite(air) ? air : null,
        moisture_soil: soilMoisturePercent(data.sensor.moisture_soil),
        rux: Number.isFinite(light) ? Math.max(0, Math.min(100, light / 4095 * 100)) : null,
      });
      setSensorUpdatedAt(new Date());
      setSensorStatus("ready");
    } catch (error) {
      console.error("Failed to fetch sensor data:", error);
      setSensorStatus("error");
    }
  }, [plantId]);

  useEffect(() => {
    if (!plantId) return;
    
    // 초기 1회 호출
    const firstFrame = requestAnimationFrame(() => { void fetchCurrentSensor(); });

    // 1분마다 폴링
    const interval = setInterval(() => {
      if (!document.hidden) fetchCurrentSensor();
    }, 60000);

    const onVisibilityChange = () => {
      if (!document.hidden) fetchCurrentSensor();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(firstFrame);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [plantId, fetchCurrentSensor]);

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

  /* ─── Sensor data config for rendering ─── */
  const sensorItems = [
    { icon: Thermometer, label: "온도", value: sensors?.degree != null ? `${sensors.degree.toFixed(1)}°` : "–", color: "#FF6B6B" },
    { icon: Droplets, label: "습도", value: sensors?.moisture_air != null ? `${sensors.moisture_air.toFixed(0)}%` : "–", color: "#4ECDC4" },
    { icon: Leaf, label: "토양", value: sensors?.moisture_soil != null ? `${sensors.moisture_soil.toFixed(0)}%` : "–", color: "#6BCB77" },
    { icon: Sun, label: "조도", value: sensors?.rux != null ? `${sensors.rux.toFixed(0)}%` : "–", color: "#FFD93D" },
  ].map((item) => ({ ...item, color: sensorStatus === "error" ? "#9CA3AF" : item.color }));

  if (!plant) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center text-white">
      <p role={plantError ? "alert" : "status"}>{plantLoading ? "식물 정보를 불러오는 중이에요…" : "식물 정보를 찾지 못했어요."}</p>
      {!plantLoading && <button type="button" onClick={() => { if (typeof plantId === "string") setPlantRequest({ id: plantId, status: "loading" }); setPlantRetry((value) => value + 1); }} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold">다시 시도</button>}
      {!plantLoading && <button type="button" onClick={() => router.push("/home")} className="min-h-11 px-5 font-semibold">홈으로 이동</button>}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {videoStatus === "loading" && plant.streamingUrl && (
          <motion.div role="status" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-gray-950 text-white">
            <Sprout size={48} className="animate-pulse text-[#8CD867]" />
            <p className="text-sm font-semibold">실시간 영상을 연결하고 있어요…</p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ═══ Main Live View ═══ */}
      <motion.div 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="relative flex flex-col h-full min-h-full w-full overflow-hidden bg-gray-900 cursor-grab active:cursor-grabbing"
      >
        {/* ── Background / Live Stream ── */}
        {/* Stream is on its own GPU layer (will-change) so repaints don't
            propagate to the glass overlay elements above. */}
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

        {videoStatus === "error" && <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center gap-3 bg-gray-950/90 px-8 text-center text-white"><p role="alert" className="text-sm font-semibold">{autoReconnectCount < 3 ? "영상 연결이 끊겨 자동으로 다시 연결하고 있어요." : "실시간 카메라에 연결하지 못했어요."}</p>{autoReconnectCount >= 3 && <button type="button" onClick={() => { setAutoReconnectCount(0); void retryPlantStream(); }} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold">다시 연결</button>}</div>}
        {videoStatus === "unavailable" && <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center gap-3 bg-gray-950/80 px-8 text-center text-white"><p role="status" className="text-sm font-semibold">{currentPlantRequestStatus === "error" ? "카메라 연결 정보를 불러오지 못했어요." : currentPlantRequestStatus === "ready" ? "이 식물에 연결된 실시간 카메라가 없어요." : "카메라 연결 정보를 확인하고 있어요…"}</p>{currentPlantRequestStatus && currentPlantRequestStatus !== "loading" && <button type="button" onClick={() => { void retryPlantStream(); }} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold">연결 다시 확인</button>}</div>}

        {/* ── Flicker Stabilization Layer ──
            Semi-transparent buffer between the video and all glass UI elements.
            backdropFilter on this layer blurs the stream once and stays stable,
            so the glass cards above sample *this* calm surface instead of the
            raw flickering video frames. */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: 'rgba(0,0,0,0.08)',
            backdropFilter: 'blur(1px)',
            WebkitBackdropFilter: 'blur(1px)',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />

        {/* ═══ TOP: Plant Name — Liquid Glass Pill ═══ */}
        <div className="relative z-20 flex justify-center pt-12 px-6">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex flex-col items-center"
          >
            <div
              className="relative flex items-center gap-2 px-6 py-2.5 rounded-full overflow-hidden"
              style={glass.pill}
            >
              {/* Specular highlight shimmer */}
              <div 
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.05) 50%, transparent 55%)',
                }}
              />
              <h2 className="text-[17px] font-extrabold text-white tracking-tight relative z-10"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
              >
                {plant.name}
              </h2>
              {daysWithPlant !== null && <span className="relative z-10 text-[12px] font-extrabold text-white/90 bg-black/25 px-2 py-0.5 rounded-full">D+{daysWithPlant}</span>}
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="absolute top-[140px] left-5 z-20"
        >
          <div
            className="relative rounded-full pl-2.5 pr-3.5 py-[7px] flex items-center gap-2 overflow-hidden"
            style={glass.pill}
          >
            {/* Pulsing glow ring */}
              <div className="relative w-2.5 h-2.5">
              <div className={`relative w-2.5 h-2.5 rounded-full ${videoStatus === "ready" ? "bg-emerald-400" : "bg-amber-400"}`}
                style={{ boxShadow: videoStatus === "ready" ? '0 0 8px rgba(52,211,153,0.6)' : '0 0 8px rgba(251,191,36,0.5)' }}
              />
            </div>
            <span className="text-white font-extrabold text-[10px] tracking-[0.18em]"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
              {videoStatus === "ready" ? "LIVE" : videoStatus === "loading" ? "CONNECTING" : "OFFLINE"}
            </span>
          </div>
        </motion.div>

        <div className="absolute left-5 right-5 top-[230px] z-20 flex justify-end">
          {sensorStatus === "error" ? <button type="button" onClick={fetchCurrentSensor} className="min-h-11 rounded-xl bg-black/65 px-3 text-xs font-bold text-white">센서 갱신 실패 · 다시 시도</button> : sensorStatus === "loading" ? <p role="status" className="rounded-lg bg-black/55 px-3 py-2 text-xs text-white">센서 확인 중…</p> : sensorUpdatedAt ? <p className="rounded-lg bg-black/55 px-3 py-2 text-xs text-white">{sensorUpdatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 갱신</p> : null}
        </div>

        {/* ═══ Sensor Cards — Liquid Glass Grid ═══ */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="absolute top-[136px] right-5 z-20"
        >
          <div className="grid grid-cols-2 gap-[6px]">
            {sensorItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  className="relative rounded-2xl px-2.5 py-2 flex flex-col items-center min-w-[68px] overflow-hidden"
                  style={glass.card}
                >
                  {/* Subtle colored glow behind icon */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full opacity-30 blur-md"
                    style={{ background: item.color }}
                  />
                  <Icon 
                    size={14} 
                    className="relative z-10 mb-0.5"
                    style={{ color: item.color, filter: `drop-shadow(0 0 4px ${item.color}60)` }}
                  />
                  <span className="text-white font-extrabold text-[13px] relative z-10 leading-tight"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {item.value}
                  </span>
                  <span className="text-white/50 font-semibold text-[8px] tracking-wide relative z-10">
                    {item.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══ Bottom Action Buttons — Liquid Glass ═══ */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="absolute bottom-12 left-0 right-0 z-20 flex justify-center gap-6"
        >
          {/* Record Button */}
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => { setRecordError(""); setRecordFeedback(""); setIsRecordSheetOpen(true); }}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className="relative flex items-center justify-center w-[64px] h-[64px] rounded-[22px] overflow-hidden"
              style={glass.button}
            >
              {/* Specular highlight */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                }}
              />
              <Edit3 size={24} strokeWidth={2.2} className="text-white relative z-10" 
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
              />
            </div>
            <span className="text-white/70 text-[10px] font-bold tracking-wide"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              기록
            </span>
          </motion.button>

        </motion.div>

        {recordFeedback && <p role="status" className="absolute bottom-32 left-5 right-5 z-20 rounded-xl bg-black/70 p-3 text-center text-sm font-semibold text-white">{recordFeedback}</p>}

        {/* Plant indicator dots — shows which plant is active */}
        {myPlants && myPlants.length > 1 && (
          <div className="absolute bottom-[152px] left-0 right-0 z-20 flex justify-center gap-1.5">
            {myPlants.map((p: Plant) => (
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
                        className="w-full rounded-2xl px-5 py-3.5 text-[15px] font-medium focus:outline-none appearance-none transition-all cursor-pointer text-gray-800"
                        style={{
                          ...glass.input,
                          paddingRight: '40px',
                        }}
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
                      className="w-full rounded-2xl px-5 py-3.5 text-[15px] font-medium focus:outline-none transition-all text-gray-800 placeholder:text-gray-400"
                      style={glass.input}
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
                      className="w-full rounded-2xl px-5 py-3.5 text-[15px] font-medium h-28 resize-none focus:outline-none transition-all text-gray-800 placeholder:text-gray-400"
                      style={glass.input}
                      value={recordForm.desc}
                      onChange={(e) => setRecordForm({ ...recordForm, desc: e.target.value })}
                    />
                  </div>

                  <p className="text-xs text-gray-600">작성 중인 내용은 이 탭에 임시 저장됩니다.</p>
                  {recordError && <p id="record-error" role="alert" className="text-sm text-red-700">{recordError}</p>}

                  {/* Submit button — Liquid Glass accent */}
                  <button 
                    type="submit" 
                    disabled={recordSubmitting}
                    className="relative w-full overflow-hidden text-white font-extrabold py-4 rounded-2xl text-[15px] transition-all active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(110,164,71,0.85) 0%, rgba(80,160,60,0.7) 100%)',
                      backdropFilter: 'blur(40px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      boxShadow: `
                        inset 0 1px 0 rgba(255,255,255,0.4),
                        0 8px 24px rgba(110,164,71,0.3),
                        0 2px 8px rgba(0,0,0,0.06)
                      `,
                    }}
                  >
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)' }}
                    />
                    <span className="relative z-10">{recordSubmitting ? "저장 중…" : "저장하기"}</span>
                  </button>
                </form>
      </BottomSheet>
    </>
  );
}
