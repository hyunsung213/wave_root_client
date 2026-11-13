"use client";

/* eslint-disable @next/next/no-img-element -- MJPEG streams must bypass image optimization. */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Camera, ChevronDown, Droplets, Edit3, RefreshCw, RotateCcw, RotateCw, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet";
import { getPlantById, getPlantCurrent, type PlantSensor } from "@/lib/get";
import { createEvent, getWaterCommand, requestPlantWater, type WaterCommand } from "@/lib/post";
import { useStore, type Plant } from "@/store/useStore";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";
import BrandLogo from "@/components/layout/BrandLogo";
import { CollapseVideoIcon, ExpandVideoIcon } from "@/components/live/StreamViewIcons";

function hasCameraAssignment(
  cameraId: string | null | undefined,
  zone: number | null | undefined,
  streamingStatus?: Plant["streamingStatus"],
) {
  if (streamingStatus) return streamingStatus !== "unassigned";
  return Boolean(cameraId && zone != null);
}

export default function LivePage() {
  const params = useParams();
  const router = useRouter();
  const plantId = params.plantId;
  const activePlantKey = typeof plantId === "string" ? plantId : Array.isArray(plantId) ? plantId.join("/") : "";
  
  // 식물 데이터 가져오기
  const myPlants = useStore((state) => state.myPlants);
  const [fetchedPlant, setFetchedPlant] = useState<Plant | null>(null);
  const [plantRequest, setPlantRequest] = useState<{ id: string; status: "loading" | "error" | "ready" } | null>(null);
  const [plantRetry, setPlantRetry] = useState(0);
  const cachedPlant = myPlants.find((item) => item._id === plantId) || null;
  const plant = fetchedPlant?._id === plantId ? fetchedPlant : cachedPlant;
  const irrigationReady = plant?.capabilities?.irrigation === true;
  const hasCapabilities = Boolean(plant?.capabilities);
  const assignedCamera = hasCameraAssignment(plant?.rdkCameraId, plant?.rdkZone, plant?.streamingStatus);
  const plantLoading = !plant && (plantRequest?.id !== plantId || plantRequest?.status === "loading");
  const plantError = !plant && plantRequest?.id === plantId && plantRequest?.status === "error";

  const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false);
  const [videoState, setVideoState] = useState<{ src: string | null; status: "loading" | "ready" | "error" | "unavailable" }>(() => ({
    src: plant?.streamingUrl ?? null,
    status: plant?.streamingUrl || hasCameraAssignment(plant?.rdkCameraId, plant?.rdkZone, plant?.streamingStatus) ? "loading" : "unavailable",
  }));
  const streamUrl = plant?.streamingUrl ?? null;
  const issuancePending = assignedCamera &&
    (plantRequest?.id !== plantId || plantRequest?.status === "loading");
  const videoStatus = videoState.src === streamUrl
    ? issuancePending ? "loading" : videoState.status
    : streamUrl ? "loading" : assignedCamera ? "loading" : "unavailable";
  const [videoRetry, setVideoRetry] = useState(0);
  const [autoReconnectCount, setAutoReconnectCount] = useState(0);
  const [recordForm, setRecordForm] = useState({ title: "", type: "기타", desc: "" });
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [recordImage, setRecordImage] = useState<{ plantId: string; file: File; previewUrl: string } | null>(null);
  const [waterSheetOpen, setWaterSheetOpen] = useState(false);
  const [waterVolume, setWaterVolume] = useState(20);
  const [waterCommand, setWaterCommand] = useState<WaterCommand | null>(null);
  const [waterSubmitting, setWaterSubmitting] = useState(false);
  const [waterError, setWaterError] = useState("");
  const [waterRetryPlantId, setWaterRetryPlantId] = useState<string | null>(null);
  const [waterStatus, setWaterStatus] = useState("");
  // Keep the same key and volume after an uncertain network response; retrying
  // must query the original command instead of creating a second watering.
  const waterAttemptRef = useRef<{ plantId: string; volume: number; key: string } | null>(null);
  const activeRecordImage = recordImage?.plantId === plantId ? recordImage : null;
  const [imageCaptureLoading, setImageCaptureLoading] = useState(false);
  const [imageCaptureFeedback, setImageCaptureFeedback] = useState("");
  const [videoView, setVideoView] = useState({ plantId: activePlantKey, rotation: 0 });
  const [expandedForPlantKey, setExpandedForPlantKey] = useState<string | null>(null);
  const isVideoExpanded = expandedForPlantKey === activePlantKey;
  const displayStreamUrl = streamUrl
    ? (() => {
        const url = new URL(streamUrl);
        url.searchParams.set("mode", isVideoExpanded ? "full" : "crop");
        return url.toString();
      })()
    : null;
  const videoRotation = videoView.plantId === activePlantKey ? videoView.rotation : 0;

  const updateVideoRotation = (rotation: number) => setVideoView({ plantId: activePlantKey, rotation });

  useEffect(() => {
    if (!isVideoExpanded) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedForPlantKey(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVideoExpanded]);

  // 두 손가락 핀치로 1~4배 확대하고, 확대 상태에서는 한 손가락으로 이동한다.
  const pointersRef = useRef(new Map());
  const gestureRef = useRef({ distance: 0, centerX: 0, centerY: 0, scale: 1, x: 0, y: 0 });
  const [videoZoom, setVideoZoom] = useState({ plantKey: activePlantKey, scale: 1, x: 0, y: 0 });
  const activeZoom = videoZoom.plantKey === activePlantKey ? videoZoom : { plantKey: activePlantKey, scale: 1, x: 0, y: 0 };
  const clampOffset = (value: number, span: number, scale: number) => {
    const limit = Math.max(0, (span * (scale - 1)) / 2);
    return Math.min(limit, Math.max(-limit, value));
  };
  const pinchDistance = () => {
    const points = Array.from(pointersRef.current.values());
    if (points.length !== 2) return null;
    const first = points[0];
    const second = points[1];
    return { distance: Math.hypot(second.x - first.x, second.y - first.y), centerX: (first.x + second.x) / 2, centerY: (first.y + second.y) / 2 };
  };
  const onStagePointerDown = (event: React.PointerEvent) => {
    if (!isVideoExpanded) return;
    if (event.target instanceof Element && event.target.closest("button")) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    const pinch = pinchDistance();
    gestureRef.current = pinch
      ? { distance: Math.max(1, pinch.distance), centerX: pinch.centerX, centerY: pinch.centerY, scale: activeZoom.scale, x: activeZoom.x, y: activeZoom.y }
      : { distance: 0, centerX: event.clientX, centerY: event.clientY, scale: activeZoom.scale, x: activeZoom.x, y: activeZoom.y };
  };
  const onStagePointerMove = (event: React.PointerEvent) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    const width = event.currentTarget.clientWidth;
    const height = event.currentTarget.clientHeight;
    const pinch = pinchDistance();
    if (gesture.distance !== 0 && pinch) {
      const scale = Math.min(4, Math.max(1, (gesture.scale * pinch.distance) / gesture.distance));
      setVideoZoom({ plantKey: activePlantKey, scale, x: clampOffset(gesture.x + (pinch.centerX - gesture.centerX), width, scale), y: clampOffset(gesture.y + (pinch.centerY - gesture.centerY), height, scale) });
      return;
    }
    if (Math.round(gesture.scale * 100) !== 100) {
      setVideoZoom({ plantKey: activePlantKey, scale: gesture.scale, x: clampOffset(gesture.x + (event.clientX - gesture.centerX), width, gesture.scale), y: clampOffset(gesture.y + (event.clientY - gesture.centerY), height, gesture.scale) });
    }
  };
  const onStagePointerUp = (event: React.PointerEvent) => {
    pointersRef.current.delete(event.pointerId);
    const remainingPointer = pointersRef.current.values().next().value as { x: number; y: number } | undefined;
    gestureRef.current = {
      distance: 0,
      centerX: remainingPointer?.x ?? 0,
      centerY: remainingPointer?.y ?? 0,
      scale: activeZoom.scale,
      x: activeZoom.x,
      y: activeZoom.y,
    };
  };
  const [liveSensor, setLiveSensor] = useState({} as { plantId?: string; sensor?: PlantSensor; sampledAt?: string });
  const activeLiveSensor = liveSensor.plantId === plantId ? liveSensor : null;
  const showLiveSensor = plant?.siteCode === "HYDROPONIC";
  useEffect(() => {
    if (typeof plantId !== "string" || plant?.siteCode !== "HYDROPONIC") return;
    let active = true;
    let timer = 0;
    const load = async () => {
      try {
        const data = await getPlantCurrent(plantId);
        if (active) setLiveSensor({ plantId, sensor: data.sensor, sampledAt: data.sampledAt ?? data.sensor?.sampledAt });
      } catch {
        if (active) setLiveSensor({ plantId });
      }
      if (active) timer = window.setTimeout(load, 30000);
    };
    void load();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [plantId, plant?.siteCode]);
  const collapseVideo = () => {
    setVideoZoom({ plantKey: activePlantKey, scale: 1, x: 0, y: 0 });
    setExpandedForPlantKey(null);
  };

  useEffect(() => {
    const previewUrl = recordImage?.previewUrl;
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [recordImage]);

  useEffect(() => {
    if (typeof plantId !== "string") return;
    if (plant?.streamingUrl && hasCapabilities) return;
    let active = true;
    getPlantById(plantId).then((data) => {
      if (!active) return;
      const fetched = data.plant || data.data;
      if (data.success && fetched?._id) {
        setFetchedPlant(fetched);
        setPlantRequest({ id: plantId, status: "ready" });
        if (!fetched.streamingUrl) {
          setVideoState({
            src: null,
            status: hasCameraAssignment(fetched.rdkCameraId, fetched.rdkZone, fetched.streamingStatus) ? "error" : "unavailable",
          });
        }
      } else {
        setPlantRequest({ id: plantId, status: "error" });
        setVideoState({ src: null, status: assignedCamera ? "error" : "unavailable" });
      }
    }).catch(() => {
      if (active) {
        setPlantRequest({ id: plantId, status: "error" });
        setVideoState({ src: null, status: assignedCamera ? "error" : "unavailable" });
      }
    });
    return () => { active = false; };
  }, [assignedCamera, hasCapabilities, plantId, plantRetry, plant?.rdkCameraId, plant?.rdkZone, plant?.streamingUrl]);

  const retryPlantStream = useCallback(async (automatic = false) => {
    if (typeof plantId !== "string") return;
    setVideoState({ src: streamUrl, status: "loading" });
    setPlantRequest({ id: plantId, status: "loading" });
    if (!automatic) {
      setAutoReconnectCount(0);
    }
    setVideoRetry((value) => value + 1);
    try {
      const data = await getPlantById(plantId);
      const refreshed = data.plant || data.data;
      if (!data.success || !refreshed?._id) throw new Error("식물 정보를 갱신할 수 없습니다.");
      setFetchedPlant(refreshed);
      setPlantRequest({ id: plantId, status: "ready" });
      if (!refreshed.streamingUrl) {
        setVideoState({
          src: null,
          status: hasCameraAssignment(refreshed.rdkCameraId, refreshed.rdkZone, refreshed.streamingStatus) ? "error" : "unavailable",
        });
      }
    } catch (error) {
      console.error("Failed to refresh plant stream:", error);
      setPlantRequest({ id: plantId, status: "error" });
      setVideoState({ src: streamUrl, status: "error" });
    }
  }, [plantId, streamUrl]);

  useEffect(() => {
    if (videoStatus !== "error" || !assignedCamera || autoReconnectCount >= 3) return;
    const delayMs = 1000 * 2 ** autoReconnectCount;
    const timeoutId = window.setTimeout(() => {
      setAutoReconnectCount((count) => count + 1);
      void retryPlantStream(true);
    }, delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [assignedCamera, autoReconnectCount, retryPlantStream, videoStatus]);

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

  const activeWaterCommand = waterCommand?.plantId === plantId ? waterCommand : null;
  const waterCommandId = activeWaterCommand?.id || activeWaterCommand?._id || null;
  const waterCommandStatus = activeWaterCommand?.status;
  const waterRetryPending = Boolean(waterError && waterRetryPlantId === plantId);
  useEffect(() => {
    if (waterCommandStatus && ["COMPLETED", "FAILED", "CANCELLED"].includes(waterCommandStatus)) {
      waterAttemptRef.current = null;
    }
    if (!waterSheetOpen || !waterCommandId || !waterCommandStatus ||
      ["COMPLETED", "FAILED", "NEEDS_REVIEW", "CANCELLED"].includes(waterCommandStatus)) return;
    let active = true;
    let timer: number | undefined;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const data = await getWaterCommand(waterCommandId);
        if (!active) return;
        const command = data.command;
        setWaterCommand(command);
        if (command.status === "PENDING") setWaterStatus("Y-Farm 장치가 요청을 확인할 때까지 기다리고 있어요.");
        else if (command.status === "DISPATCHED") setWaterStatus("급수 중이에요. 완료량은 유량 보정 기준의 추정치로 기록됩니다.");
        else if (command.status === "COMPLETED") setWaterStatus(`급수가 완료됐어요. 기록량은 ${command.estimatedVolume ?? command.volume}mL 추정치예요.`);
        else if (command.status === "NEEDS_REVIEW") setWaterStatus("실행 결과를 확인해야 해요. 안전을 위해 자동 재시도하지 않았어요.");
        else if (command.status === "FAILED") setWaterStatus("급수에 실패했어요. 장치 연결을 확인해주세요.");
      } catch {
        if (active) setWaterStatus("상태를 확인하지 못했어요. 잠시 후 다시 열어 확인해주세요.");
      }
      if (active && attempts < 60) timer = window.setTimeout(poll, 3000);
      else if (active) setWaterStatus("상태 조회가 오래 걸리고 있어요. 요청 ID로 다시 확인할 수 있어요.");
    };
    timer = window.setTimeout(poll, 2500);
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [waterSheetOpen, waterCommandId, waterCommandStatus]);

  const closeSheet = () => {
    setIsRecordSheetOpen(false);
  };

  const submitWaterRequest = async () => {
    if (typeof plantId !== "string" || waterSubmitting || !irrigationReady) return;
    setWaterSubmitting(true);
    setWaterError("");
    setWaterStatus("급수 요청을 전송하고 있어요.");
    try {
      const attempt = waterAttemptRef.current?.plantId === plantId
        ? waterAttemptRef.current
        : { plantId, volume: waterVolume, key: globalThis.crypto.randomUUID() };
      waterAttemptRef.current = attempt;
      const data = await requestPlantWater(plantId, attempt.volume, attempt.key);
      setWaterCommand(data.command);
      setWaterRetryPlantId(null);
      setWaterStatus("급수 요청을 접수했어요. 장치 상태를 확인하고 있어요.");
    } catch (error) {
      setWaterError(error instanceof Error ? error.message : "급수 요청의 결과를 확인하지 못했어요.");
      setWaterRetryPlantId(plantId);
      setWaterStatus("결과가 불확실해요. 다시 누르면 같은 요청 ID로 확인하며 새 급수를 만들지 않습니다.");
    } finally {
      setWaterSubmitting(false);
    }
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
        body: JSON.stringify({ url: displayStreamUrl ?? streamUrl }),
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
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-white px-6 text-center text-gray-800">
      <h1 aria-label="싹키워"><BrandLogo /></h1>
      <p role={plantError ? "alert" : "status"}>{plantLoading ? "식물 정보를 불러오는 중이에요…" : "식물 정보를 찾지 못했어요."}</p>
      {(!plantLoading && <button type="button" onClick={() => { if (typeof plantId === "string") setPlantRequest({ id: plantId, status: "loading" }); setPlantRetry((value) => value + 1); }} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold text-white">다시 시도</button>)}
      {!plantLoading && <button type="button" onClick={() => router.push("/home")} className="min-h-11 px-5 font-semibold text-gray-700">홈으로 이동</button>}
    </div>
  );

  return (
    <>
      {/* ═══ Main Live View ═══ */}
      <motion.div
        layout
        drag={isVideoExpanded ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        transition={{ layout: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } }}
        className={isVideoExpanded
          ? "fixed inset-0 z-40 flex h-[100dvh] min-h-0 w-full flex-col gap-0 overflow-hidden bg-[#171b16] p-0"
          : "relative flex h-full min-h-full w-full flex-col gap-2 overflow-hidden bg-white px-4 pb-3 pt-1"}
      >
        <AnimatePresence initial={false}>
          {!isVideoExpanded && (
            <motion.header
              key="live-header"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18, transition: { duration: 0.2 } }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="app-page-header -mx-4 flex shrink-0 items-center justify-between px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))]"
            >
              <h1 aria-label="싹키워"><BrandLogo /></h1>
              <button
                type="button"
                onClick={() => { void retryPlantStream(); }}
                aria-label="카메라 새로고침"
                disabled={videoStatus === "loading"}
                className="icon-button text-gray-500 transition-colors hover:text-gray-800 disabled:cursor-wait disabled:opacity-50"
              >
                <RefreshCw size={20} aria-hidden="true" className={videoStatus === "loading" ? "animate-spin" : undefined} />
              </button>
            </motion.header>
          )}
        </AnimatePresence>

        <section aria-label={`${plant.name} 실시간 카메라`} className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#171b16] ${isVideoExpanded ? "rounded-none border-0 shadow-none" : "rounded-[24px] border border-[#e7eadf] shadow-[0_10px_28px_rgba(51,69,39,0.12)]"}`}>
          <div
            onPointerDown={onStagePointerDown} onPointerMove={onStagePointerMove} onPointerUp={onStagePointerUp} onPointerCancel={onStagePointerUp} className={`relative min-h-0 flex-1 overflow-hidden bg-[#171b16] ${isVideoExpanded ? "touch-none" : ""}`}
            style={{ willChange: "transform", isolation: "isolate" }}
          >
            {plant.streamingUrl && (
              <img
                key={`${plant._id}:${videoRetry}:${displayStreamUrl}`}
                src={displayStreamUrl ?? plant.streamingUrl}
                alt={`${plant.name} 실시간 카메라 영상`}
                onLoad={() => { setAutoReconnectCount(0); setVideoState({ src: plant.streamingUrl ?? null, status: "ready" }); }}
                onError={() => setVideoState({ src: plant.streamingUrl ?? null, status: "error" })}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ willChange: "transform", transform: `translate3d(${activeZoom.x}px, ${activeZoom.y}px, 0) scale(${activeZoom.scale}) rotate(${videoRotation}deg)`, transition: "transform 180ms ease-out" }}
              />
            )}
            {videoStatus !== "ready" && (
              <p aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-xs font-semibold text-white/70">
                {videoStatus === "error"
                  ? isVideoExpanded ? "원본 전체 화면을 불러오지 못했어요. 카메라 보정 설정과 연결을 확인해주세요." : "카메라 연결을 확인하고 있어요. 잠시 후 다시 시도해주세요."
                  : videoStatus === "loading" ? "카메라에 연결하고 있어요…" : "연결된 카메라가 없어요."}
              </p>
            )}
            <span role="status" className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-gray-800 shadow-sm backdrop-blur-sm">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${videoStatus === "ready" ? "animate-pulse bg-red-500" : "bg-gray-400"}`} />
              {videoStatus === "ready" ? "LIVE" : videoStatus === "error" ? "연결 확인" : videoStatus === "loading" ? "연결 중" : "카메라 없음"}
            </span>
            <AnimatePresence initial={false} mode="wait">
              {isVideoExpanded ? (
                <motion.div
                  key="expanded-controls"
                  role="group"
                  aria-label="영상 화면 조작"
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 flex items-center gap-1 rounded-2xl border border-white/15 bg-[#11180f]/75 p-1 text-white shadow-lg backdrop-blur-md sm:left-1/2 sm:right-auto sm:w-[min(28rem,calc(100%-1.5rem))] sm:-translate-x-1/2"
                >
                  <button type="button" aria-label="영상 90도 왼쪽 회전" onClick={() => updateVideoRotation((videoRotation + 270) % 360)} className="icon-button shrink-0 rounded-xl hover:bg-white/15"><RotateCcw size={18} aria-hidden="true" /></button>
                  <button type="button" aria-label="영상 90도 오른쪽 회전" onClick={() => updateVideoRotation((videoRotation + 90) % 360)} className="icon-button shrink-0 rounded-xl hover:bg-white/15"><RotateCw size={18} aria-hidden="true" /></button>
                  <span className="flex-1" aria-hidden="true" />
                  <button type="button" aria-label="영상 확장 모드 닫기" onClick={collapseVideo} className="icon-button shrink-0 rounded-xl bg-white/10 hover:bg-white/20"><CollapseVideoIcon className="h-[18px] w-[18px]" /></button>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed-controls"
                  role="group"
                  aria-label="영상 화면 조작"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute bottom-3 right-3 flex items-center rounded-2xl border border-white/15 bg-[#11180f]/75 p-1 text-white shadow-lg backdrop-blur-md"
                >
                  <button type="button" aria-label="영상 확장 모드" onClick={() => setExpandedForPlantKey(activePlantKey)} className="icon-button rounded-xl hover:bg-white/15"><ExpandVideoIcon className="h-[18px] w-[18px]" /></button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {showLiveSensor && !isVideoExpanded && activeLiveSensor?.sensor && (
          <div className={`relative z-20 order-0 flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl bg-[#f5f7f2] px-3 py-2 text-[11px] font-semibold text-[#416a34]`}>
            <>
              <span>온도 {activeLiveSensor.sensor.degree.toFixed(1)}℃</span>
              <span>습도 {Math.round(activeLiveSensor.sensor.moisture_air)}%</span>
              <span>토양 {Math.round(activeLiveSensor.sensor.moisture_soil)} ADC</span>
              <span>조도 {activeLiveSensor.sensor.rux === null ? `-` : Math.round(activeLiveSensor.sensor.rux)} lx</span>
              <span className="basis-full text-center text-[10px] font-medium text-[#73836a]">RDK 측정 · {activeLiveSensor.sampledAt ? new Date(activeLiveSensor.sampledAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "측정 시각 확인 불가"}</span>
            </>
          </div>
        )}
        {/* ═══ Bottom Action Button ═══ */}
        {!isVideoExpanded && <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className={`relative z-20 order-last grid w-full shrink-0 gap-3 ${plant.siteCode === "Y_FARM" ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {/* Record Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            aria-label={`${plant.name} 성장 기록 남기기`}
            onClick={() => { setRecordError(""); setImageCaptureFeedback(""); setIsRecordSheetOpen(true); }}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#5b873a] px-3 text-[15px] font-extrabold text-white shadow-[0_8px_18px_rgba(77,116,49,0.2)]"
          >
            <Edit3 size={18} strokeWidth={2.3} aria-hidden="true" />
            <span>메모 남기기</span>
          </motion.button>
          {plant.siteCode === "Y_FARM" && <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => { setWaterError(""); setWaterSheetOpen(true); }}
            aria-label={irrigationReady ? `${plant.name} 급수하기` : `${plant.name} 급수 준비 중`}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#dce8d1] bg-[#f3f8ee] px-3 text-[15px] font-extrabold text-[#527d36]"
          >
            <Droplets size={19} aria-hidden="true" />
            <span>{irrigationReady ? "급수" : "급수 준비 중"}</span>
          </motion.button>}
        </motion.div>}

        {/* 현재 식물 주변 최대 3개까지 가운데 정렬해 표시합니다. */}
        {!isVideoExpanded && myPlants && myPlants.length > 1 && (
          <div className="relative z-20 order-1 flex w-full shrink-0 justify-center gap-2">
            {visiblePlants.map((p: Plant) => (
              <button type="button"
                key={p._id}
                onClick={() => router.replace(`/live/${p._id}`)}
                aria-label={`${p.name} 화면으로 이동`}
                aria-current={p._id === plantId ? "true" : undefined}
                className={`min-h-10 min-w-0 max-w-[calc((100vw-3.5rem)/3)] truncate rounded-full px-4 text-xs font-bold ${p._id === plantId ? "bg-[#eaf3e3] text-[#496d2f]" : "bg-[#f5f6f3] text-[#888f82]"}`}
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
      {plant.siteCode === "Y_FARM" && <BottomSheet
        open={waterSheetOpen}
        onClose={() => setWaterSheetOpen(false)}
        title={`${plant.name} 급수`}
        description="식물에 연결된 Y-Farm 노즐로 급수를 요청합니다."
        halfY={310}
        footer={<button
          type="button"
          onClick={() => { void submitWaterRequest(); }}
          disabled={!irrigationReady || waterSubmitting || Boolean(activeWaterCommand && ["PENDING", "DISPATCHED", "NEEDS_REVIEW"].includes(activeWaterCommand.status))}
          className="min-h-12 w-full rounded-xl bg-[#5b873a] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >{waterSubmitting ? "요청 중…" : activeWaterCommand && ["PENDING", "DISPATCHED", "NEEDS_REVIEW"].includes(activeWaterCommand.status) ? "기존 요청 상태 확인 중" : waterRetryPending ? "같은 요청 재확인" : "급수 요청"}</button>}
      >
        <div className="flex flex-col gap-4 pb-4">
          {!irrigationReady && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">{plant.irrigationEnabled ? "Y-Farm 급수 장치가 아직 준비 중이에요." : "관리자가 Pi 노즐과 식물 연결을 완료해야 급수할 수 있어요."}</p>}
          <fieldset disabled={!irrigationReady || waterSubmitting || waterRetryPending || Boolean(activeWaterCommand && ["PENDING", "DISPATCHED", "NEEDS_REVIEW"].includes(activeWaterCommand.status))} className="min-w-0 border-0 p-0">
            <legend className="mb-2 text-sm font-extrabold text-gray-800">급수량 선택</legend>
            <div className="grid grid-cols-5 gap-2" role="group" aria-label="급수량">
              {[10, 20, 30, 50, 100].map((volume) => <button
                key={volume}
                type="button"
                aria-pressed={waterVolume === volume}
                onClick={() => setWaterVolume(volume)}
                className={`min-h-11 rounded-xl border text-sm font-bold ${waterVolume === volume ? "border-[#5b873a] bg-[#edf5e8] text-[#416a34]" : "border-gray-200 bg-white text-gray-700"}`}
              >{volume}mL</button>)}
            </div>
          </fieldset>
          <p className="rounded-xl bg-[#f5f7f2] p-3 text-xs leading-5 text-gray-600">현재 실제 유량 센서가 없으므로 완료 이력은 펌프 보정값 기준의 추정량으로 표시됩니다. 결과가 불확실하면 자동 재급수하지 않습니다.</p>
          {waterStatus && <p role="status" aria-live="polite" className="text-sm font-semibold text-[#416a34]">{waterStatus}</p>}
          {waterError && <p role="alert" className="text-sm font-semibold text-rose-700">{waterError}</p>}
          {activeWaterCommand && <p className="break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">요청 ID: {activeWaterCommand.id || activeWaterCommand._id} · 상태: {activeWaterCommand.status}</p>}
        </div>
      </BottomSheet>}
    </>
  );
}
