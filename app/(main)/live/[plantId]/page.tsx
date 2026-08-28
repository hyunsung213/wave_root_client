"use client";

import { useEffect, useState, useRef } from "react";
import { Droplets, Thermometer, Sprout, MapPin, ChevronRight, ChevronDown, MoreHorizontal, Edit3, X, Sun, Waves, Leaf } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { getPlantCurrent, getPlantById } from "@/lib/get";
import { createEvent, waterPlant } from "@/lib/post";
import { useStore } from "@/store/useStore";

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
  sheet: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.65) 100%)',
    backdropFilter: 'blur(80px) saturate(200%) brightness(1.08)',
    WebkitBackdropFilter: 'blur(80px) saturate(200%) brightness(1.08)',
    border: '1px solid rgba(255,255,255,0.5)',
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.7),
      0 -10px 60px rgba(0,0,0,0.18)
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
  const myPlants = useStore((state) => state.myPlants) || [];
  const plant = myPlants.find((p: any) => p._id === plantId);
  
  // D-day 계산 (임시: createdAt 기준 또는 1일)
  const daysWithPlant = plant?.createdAt 
    ? Math.max(1, Math.floor((Date.now() - new Date(plant.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 28; // fallback으로 첨부된 이미지와 같은 28일 사용

  const [isMounted, setIsMounted] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  const [sheetState, setSheetState] = useState<"closed" | "half" | "full">("closed");
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [waterAmount, setWaterAmount] = useState(50);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const [recordForm, setRecordForm] = useState({ title: "", type: "기타", desc: "" });
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  const [showSensorPanel, setShowSensorPanel] = useState(false);
  const streamImgRef = useRef<HTMLImageElement>(null);

  const sheetVariants = {
    closed: { y: 850, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
    half: { y: 350, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
    full: { y: 50, transition: { type: "spring" as const, bounce: 0, duration: 0.4 } },
  };

  const closeSheet = () => {
    setSheetState("closed");
  };

  // 모달 드래그(스와이프) 제어 로직
  const onSheetDragEnd = (event: any, info: PanInfo) => {
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

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.title) return;
    
    try {
      const formData = new FormData();
      formData.append("plantId", plantId as string);
      
      const formattedTitle = `[${recordForm.type}] ${recordForm.title}`;
      formData.append("title", formattedTitle);
      formData.append("content", recordForm.desc || "내용 없음");
      formData.append("eventDate", new Date().toISOString());

      // 현재 재생 중인 라이브 스트림 이미지를 캡처하여 첨부
      if (streamImgRef.current && streamingUrl) {
        try {
          const img = streamImgRef.current;
          
          // 목표 해상도 (스마트폰 세로 화면 비율)
          const targetW = 1072;
          const targetH = 1920;
          
          // 원본 해상도
          const nW = img.naturalWidth || 640;
          const nH = img.naturalHeight || 480;

          // 화면에 보이는 것과 동일하게 꽉 차게(object-cover) 잘라내기 위한 비율 계산
          const ratio = Math.max(targetW / nW, targetH / nH);
          
          // 원본에서 실제로 잘라낼 영역의 크기
          const sW = targetW / ratio;
          const sH = targetH / ratio;
          
          // 정중앙을 기준으로 크롭하기 위한 시작점(x, y)
          const sX = (nW - sW) / 2;
          const sY = (nH - sH) / 2;

          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // 상하 반전된 화면을 그대로 캡처하기 위해 캔버스 컨텍스트도 상하 반전
            ctx.save();
            ctx.translate(0, targetH);
            ctx.scale(1, -1);
            // 원본(img)의 (sX, sY) 위치에서 (sW x sH) 만큼을 잘라내어 캔버스 전체에 그림
            ctx.drawImage(img, sX, sY, sW, sH, 0, 0, targetW, targetH);
            ctx.restore();
            
            const blob: Blob | null = await new Promise((resolve) => {
              canvas.toBlob(resolve, "image/jpeg", 0.9);
            });
            if (blob) {
              const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
              formData.append("image", file);
            }
          }
        } catch (captureError) {
          console.warn("이미지 캡처 실패 (CORS 등):", captureError);
        }
      }

      const responseData = await createEvent(formData);

      if (responseData.success) {
        alert("성장 일지가 기록되었습니다!");
        closeSheet();
        setRecordForm({ title: "", type: "기타", desc: "" });
      } else {
        alert("기록에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to submit record:", error);
      alert("기록 중 오류가 발생했습니다.");
    }
  };
  const [sensors, setSensors] = useState({
    degree: 24.6,
    moisture_air: 68,
    moisture_soil: 32,
    rux: 0,
  });

  const fetchCurrentSensor = async () => {
    try {
      const data = await getPlantCurrent(plantId as string);
      if (data.success && data.sensor) {
        const rawSoil = Number(data.sensor.moisture_soil) || 2800;
        const soilPercent = Math.max(0, Math.min(100, ((2800 - rawSoil) / (2800 - 950)) * 100));
        
        const rawRux = Number(data.sensor.rux) || 0;
        const ruxPercent = Math.max(0, Math.min(100, (rawRux / 4095) * 100));

        setSensors({
          degree: Number(data.sensor.degree) || 24.6,
          moisture_air: Number(data.sensor.moisture_air) || 68,
          moisture_soil: soilPercent,
          rux: ruxPercent,
        });
      }
    } catch (error) {
      console.error("Failed to fetch sensor data:", error);
    }
  };

  const fetchPlantDetails = async () => {
    try {
      const data = await getPlantById(plantId as string);
      if (data.success && data.plant?.streamingUrl) {
        setStreamingUrl(data.plant.streamingUrl);
      }
    } catch (error) {
      console.error("Failed to fetch plant details:", error);
    }
  };

  useEffect(() => {
    setIsMounted(true);

    // 2초(2000ms) 뒤 로딩 오버레이 제거
    const loadingTimer = setTimeout(() => {
      setShowLoadingOverlay(false);
    }, 2000);

    // 프로그레스 바 (2초 동안 100% 도달)
    const intervalProgress = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(intervalProgress);
          return 100;
        }
        return prev + 5; // 50ms마다 2.5% 증가 = 2초면 100%
      });
    }, 100);

    if (!plantId) return;
    
    // 초기 1회 호출
    fetchCurrentSensor();
    fetchPlantDetails();

    // 1분마다 폴링
    const interval = setInterval(() => {
      fetchCurrentSensor();
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(intervalProgress);
      clearTimeout(loadingTimer);
    };
  }, [plantId]);

  const handleWater = async () => {
    setIsWatering(true);
    setIsWaterModalOpen(false);
    try {
      const data = await waterPlant(plantId as string, waterAmount);
      if (data.success) {
        // 물주기 성공 시 3초 뒤 상태 복구
        setTimeout(() => setIsWatering(false), 3000);
      } else {
        alert("물 주기에 실패했습니다.");
        setIsWatering(false);
      }
    } catch (error) {
      alert("서버 오류가 발생했습니다.");
      setIsWatering(false);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (!myPlants || myPlants.length <= 1) return;
    
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      // Swipe left -> Next plant
      const idx = myPlants.findIndex((p: any) => p._id === plantId);
      const nextIdx = (idx + 1) % myPlants.length;
      router.replace(`/live/${myPlants[nextIdx]._id}`);
    } else if (info.offset.x > swipeThreshold) {
      // Swipe right -> Previous plant
      const idx = myPlants.findIndex((p: any) => p._id === plantId);
      const prevIdx = (idx - 1 + myPlants.length) % myPlants.length;
      router.replace(`/live/${myPlants[prevIdx]._id}`);
    }
  };

  /* ─── Sensor data config for rendering ─── */
  const sensorItems = [
    { icon: Thermometer, label: "온도", value: `${sensors.degree.toFixed(1)}°`, color: "#FF6B6B", gradient: "linear-gradient(135deg, #FF6B6B, #FF8E53)" },
    { icon: Droplets, label: "습도", value: `${sensors.moisture_air.toFixed(0)}%`, color: "#4ECDC4", gradient: "linear-gradient(135deg, #4ECDC4, #44B3D5)" },
    { icon: Leaf, label: "토양", value: `${sensors.moisture_soil.toFixed(0)}%`, color: "#6BCB77", gradient: "linear-gradient(135deg, #6BCB77, #4CAF50)" },
    { icon: Sun, label: "조도", value: `${sensors.rux.toFixed(0)}%`, color: "#FFD93D", gradient: "linear-gradient(135deg, #FFD93D, #FF9F43)" },
  ];

  return (
    <>
      {/* ═══ Loading Overlay — Liquid Glass ═══ */}
      <AnimatePresence>
        {showLoadingOverlay && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none"
            style={{
              background: 'linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 50%, #0f0f23 100%)',
            }}
          >
            {/* Ambient glow orbs */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(110,164,71,0.4) 0%, transparent 70%)' }}
              />
              <motion.div
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(78,205,196,0.3) 0%, transparent 70%)' }}
              />
            </div>

            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center relative z-10"
            >
              {/* Glass icon container */}
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{
                  ...glass.card,
                  background: 'linear-gradient(135deg, rgba(110,164,71,0.3) 0%, rgba(110,164,71,0.1) 100%)',
                }}
              >
                <Sprout size={40} className="text-[#8CD867]" />
              </motion.div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1.5"
                style={{ textShadow: '0 0 40px rgba(110,164,71,0.3)' }}
              >
                싹키워
              </h1>
              <p className="text-white/50 text-[13px] font-medium tracking-wide">농장과 실시간 연결 중이에요</p>
            </motion.div>

            {/* Progress bar — Liquid Glass */}
            <div className="absolute bottom-20 w-[70%] max-w-[260px]">
              <div 
                className="h-[6px] w-full rounded-full overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  style={{
                    background: 'linear-gradient(90deg, #6BCB77, #4ECDC4, #6BCB77)',
                    boxShadow: '0 0 12px rgba(107,203,119,0.5)',
                  }}
                />
              </div>
              <p className="text-center text-[11px] text-white/30 mt-2.5 font-medium tracking-[0.15em]">
                CONNECTING... {progress}%
              </p>
            </div>
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
          {streamingUrl && !streamError ? (
            <img
              ref={streamImgRef}
              src={`/api/proxy-stream?url=${encodeURIComponent(streamingUrl)}`}
              alt="Live Stream"
              crossOrigin="anonymous"
              onError={() => setStreamError(true)}
              className="w-full h-full object-cover"
              style={{ willChange: 'transform', transform: 'translateZ(0) scaleY(-1)' }}
            />
          ) : (
            <div className="w-full h-full bg-white bg-[url('/plants/lettuce.png')] bg-contain bg-no-repeat bg-center"></div>
          )}
          {/* Top vignette for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40" />
          {/* Subtle ambient color overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-cyan-900/10" />
        </div>

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
                {plant?.name || "방울 토마토"}
              </h2>
            </div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[13px] text-white/80 font-bold mt-2.5 tracking-wide"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
            >
              D+{daysWithPlant}
            </motion.p>
          </motion.div>
        </div>

        {/* ═══ LIVE Badge — Liquid Glass ═══ */}
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
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-40" />
              <div className="relative w-2.5 h-2.5 bg-red-500 rounded-full"
                style={{ boxShadow: '0 0 8px rgba(239,68,68,0.8), 0 0 16px rgba(239,68,68,0.4)' }}
              />
            </div>
            <span className="text-white font-extrabold text-[10px] tracking-[0.18em]"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
              LIVE
            </span>
          </div>
        </motion.div>

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
          className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-6"
        >
          {/* Record Button */}
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setSheetState("half")}
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

          {/* Water Button — Accent Blue Glass */}
          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsWaterModalOpen(true)}
            disabled={isWatering}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className={`relative flex items-center justify-center w-[64px] h-[64px] rounded-[22px] overflow-hidden transition-all ${
                isWatering ? "opacity-60" : ""
              }`}
              style={{
                background: isWatering 
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)'
                  : 'linear-gradient(135deg, rgba(0,122,255,0.55) 0%, rgba(0,180,255,0.35) 100%)',
                backdropFilter: 'blur(60px) saturate(200%)',
                WebkitBackdropFilter: 'blur(60px) saturate(200%)',
                border: '1px solid rgba(255,255,255,0.4)',
                boxShadow: isWatering
                  ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.12)'
                  : `inset 0 1px 0 rgba(255,255,255,0.5),
                     0 8px 32px rgba(0,122,255,0.35),
                     0 0 20px rgba(0,122,255,0.15)`,
              }}
            >
              {/* Specular highlight */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)',
                }}
              />
              {isWatering ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Waves size={24} strokeWidth={2.2} className="text-white/70 relative z-10" />
                </motion.div>
              ) : (
                <Droplets size={24} strokeWidth={2.2} className="text-white relative z-10"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
                />
              )}
            </div>
            <span className="text-white/70 text-[10px] font-bold tracking-wide"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              {isWatering ? "급수 중..." : "물주기"}
            </span>
          </motion.button>
        </motion.div>

        {/* Plant indicator dots — shows which plant is active */}
        {myPlants && myPlants.length > 1 && (
          <div className="absolute bottom-[110px] left-0 right-0 z-20 flex justify-center gap-1.5">
            {myPlants.map((p: any, i: number) => (
              <div
                key={p._id}
                className={`rounded-full transition-all duration-300 ${
                  p._id === plantId 
                    ? "w-5 h-1.5 bg-white/90" 
                    : "w-1.5 h-1.5 bg-white/35"
                }`}
                style={p._id === plantId ? { boxShadow: '0 0 8px rgba(255,255,255,0.4)' } : {}}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* ═══ Water Selection Modal — Liquid Glass Control Center ═══ */}
      <AnimatePresence>
        {isWaterModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsWaterModalOpen(false)}
              className="absolute inset-0 z-10" 
              style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px) saturate(120%)',
                WebkitBackdropFilter: 'blur(8px) saturate(120%)',
              }}
            />
            
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className="z-20 flex flex-col items-center gap-5"
            >
              {/* Volume slider — Liquid Glass Capsule */}
              <div 
                className="relative w-[100px] h-[260px] rounded-[44px] overflow-hidden"
                style={{
                  ...glass.card,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                  boxShadow: `
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    inset 0 -1px 0 rgba(255,255,255,0.1),
                    0 20px 60px rgba(0,0,0,0.3),
                    0 0 0 1px rgba(255,255,255,0.15)
                  `,
                }}
              >
                {/* Water fill */}
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 transition-none"
                  animate={{ height: `${(waterAmount / 200) * 100}%` }}
                  transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
                  style={{ 
                    background: 'linear-gradient(180deg, rgba(0,150,255,0.5) 0%, rgba(0,122,255,0.7) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  {/* Water surface shimmer */}
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
                  />
                </motion.div>
                
                {/* Invisible Range Input */}
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(Number(e.target.value))}
                  className="absolute origin-center opacity-0 cursor-pointer"
                  style={{ width: '256px', height: '100px', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
                />
                
                {/* Icon and value overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-7 pointer-events-none z-10">
                  <Droplets 
                    size={32} 
                    className="transition-colors duration-200"
                    style={{ 
                      color: waterAmount > 80 ? '#007AFF' : 'rgba(255,255,255,0.9)',
                      filter: waterAmount > 80 ? 'drop-shadow(0 0 6px rgba(0,122,255,0.5))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                    }}
                  />
                  <span className={`text-[24px] font-extrabold mt-1.5 tracking-tight transition-colors duration-200 ${
                    waterAmount > 80 ? "text-gray-900" : "text-white"
                  }`}
                    style={{ textShadow: waterAmount > 80 ? 'none' : '0 1px 3px rgba(0,0,0,0.4)' }}
                  >
                    {waterAmount}
                  </span>
                  <span className={`text-[11px] font-bold tracking-wide transition-colors duration-200 ${
                    waterAmount > 80 ? "text-gray-500" : "text-white/60"
                  }`}>
                    ml
                  </span>
                </div>

                {/* Inner specular highlight */}
                <div className="absolute inset-0 pointer-events-none rounded-[44px]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%)',
                  }}
                />
              </div>
              
              {/* Confirm Button — Liquid Glass Accent */}
              <motion.button 
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleWater}
                className="relative overflow-hidden text-white font-extrabold text-[15px] px-8 py-3.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,122,255,0.8) 0%, rgba(0,160,255,0.6) 100%)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  boxShadow: `
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    0 8px 24px rgba(0,122,255,0.4),
                    0 0 16px rgba(0,122,255,0.2)
                  `,
                }}
              >
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)' }}
                />
                <span className="relative z-10">물 주기</span>
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ Record Modal — Liquid Glass Bottom Sheet ═══ */}
      <AnimatePresence>
        {sheetState !== "closed" && (
          <div className="absolute inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeSheet}
              className="absolute inset-0 z-10"
              style={{
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(8px) saturate(120%)',
                WebkitBackdropFilter: 'blur(8px) saturate(120%)',
              }}
            />
            
            <motion.div
              variants={sheetVariants}
              initial="closed"
              animate={sheetState}
              exit="closed"
              drag="y"
              dragConstraints={{ top: 50 }}
              dragElastic={0.2}
              onDragEnd={onSheetDragEnd}
              className="absolute top-0 left-0 right-0 h-[800px] z-20 flex flex-col rounded-t-[28px] overflow-hidden"
              style={glass.sheet}
            >
              {/* 오버스크롤 대비 배경 */}
              <div 
                className="absolute top-full left-0 right-0 h-[500px]"
                style={{
                  background: 'rgba(255,255,255,0.82)',
                  backdropFilter: 'blur(80px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(80px) saturate(200%)',
                }}
              ></div>

              {/* Drag handle — Glass style */}
              <div className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing shrink-0 w-full z-30 rounded-t-[28px]">
                <div className="w-10 h-[5px] rounded-full"
                  style={{
                    background: 'rgba(0,0,0,0.15)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                />
              </div>

              {/* Scroll area */}
              <div className="flex-1 overflow-y-auto px-6 pb-28 pt-1">
                <h3 className="text-[22px] font-extrabold text-gray-900 mb-1 tracking-tight">
                  새로운 이벤트 기록
                </h3>
                <p className="text-[13px] text-gray-400 font-medium mb-6">
                  식물의 성장 기록을 남겨보세요
                </p>
                
                <form onSubmit={handleRecordSubmit} className="flex flex-col gap-4 pb-8">
                  {/* Category select */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-bold text-gray-600 ml-1">분류</label>
                    <div className="relative">
                      <select 
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
                        <option value="물주기">물 주기 💧</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Title input */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-bold text-gray-600 ml-1">제목</label>
                    <input 
                      type="text" 
                      placeholder="어떤 일이 있었나요?" 
                      className="w-full rounded-2xl px-5 py-3.5 text-[15px] font-medium focus:outline-none transition-all text-gray-800 placeholder:text-gray-400"
                      style={glass.input}
                      value={recordForm.title}
                      onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                      required
                    />
                  </div>

                  {/* Description textarea */}
                  <div className="flex flex-col gap-2 mb-2">
                    <label className="text-[13px] font-bold text-gray-600 ml-1">내용</label>
                    <textarea 
                      placeholder="자세한 관찰 내용을 적어보세요." 
                      className="w-full rounded-2xl px-5 py-3.5 text-[15px] font-medium h-28 resize-none focus:outline-none transition-all text-gray-800 placeholder:text-gray-400"
                      style={glass.input}
                      value={recordForm.desc}
                      onChange={(e) => setRecordForm({ ...recordForm, desc: e.target.value })}
                    />
                  </div>

                  {/* Submit button — Liquid Glass accent */}
                  <button 
                    type="submit" 
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
                    <span className="relative z-10">저장하기</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
