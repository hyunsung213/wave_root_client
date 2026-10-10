"use client";

import { ReactNode, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo, useDragControls, useReducedMotion } from "framer-motion";
import { useHideBottomNav } from "@/lib/sheetState";

const spring = { type: "spring" as const, bounce: 0, duration: 0.4 };
const subscribeToHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** 시트 하단에 고정되는 액션 영역 (스크롤과 무관하게 항상 노출) */
  footer?: ReactNode;
  /** 반쯤 열렸을 때 시트 상단 y좌표(px). 내용이 많은 시트일수록 작게 준다. 기본 400 */
  halfY?: number;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  halfY = 400,
}: BottomSheetProps) {
  const [snap, setSnap] = useState<"half" | "full">("half");
  const titleId = useId();
  const descriptionId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const isHydrated = useSyncExternalStore(subscribeToHydration, getHydrationSnapshot, getServerHydrationSnapshot);
  const portalTarget = isHydrated ? document.body : null;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const motionTransition = reduceMotion ? { duration: 0 } : spring;
  const sheetVariants = {
    closed: { y: "100%", transition: motionTransition },
    half: { y: Math.min(halfY, 240), transition: motionTransition },
    full: { y: 0, transition: motionTransition },
  };

  useHideBottomNav(open);

  useEffect(() => {
    if (!open) return;
    const backgroundElements = Array.from(document.querySelectorAll<HTMLElement>("[data-main-scroll], nav[aria-label='주요 메뉴']"));
    const previousOverflow = document.body.style.overflow;
    const previousStates = backgroundElements.map((element) => ({
      element,
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: element.inert,
    }));
    for (const element of backgroundElements) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";
    return () => {
      for (const { element, ariaHidden, inert } of previousStates) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const closeSheet = () => {
    setSnap("half");
    onCloseRef.current();
  };

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSnap("half");
        onCloseRef.current();
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    const velocityY = info.velocity.y;
    const offsetY = info.offset.y;

    if (snap === "half") {
      if (velocityY < -200 || offsetY < -50) {
        setSnap("full");
      } else if (velocityY > 200 || offsetY > 50) {
        closeSheet();
      }
    } else if (velocityY > 200 || offsetY > 50) {
      setSnap("half");
    }
  };

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="relative h-dvh w-full pointer-events-auto overflow-hidden sm:h-[min(826px,calc(100dvh-56px))] sm:max-w-[376px] sm:rounded-[2rem]">
            {/* 반투명 배경 (클릭 시 닫힘) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              aria-hidden="true"
              className="absolute inset-0 z-10 bg-black/50 backdrop-blur-[2px]"
            />

            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descriptionId : undefined}
              variants={sheetVariants}
              initial="closed"
              animate={snap}
              exit="closed"
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={onDragEnd}
              className="absolute inset-x-0 bottom-0 z-20 flex h-[min(92%,780px)] flex-col rounded-t-[32px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.15)]"
            >
              {/* 드래그 핸들 */}
              <div onPointerDown={(event) => dragControls.start(event)} className="z-30 flex w-full shrink-0 cursor-grab justify-center rounded-t-[32px] bg-white pb-3 pt-5 active:cursor-grabbing" aria-hidden="true">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4">
                <div>
                  <h3 id={titleId} className="text-[20px] font-extrabold text-gray-900 tracking-tight">{title || "상세 내용"}</h3>
                  {description && <p id={descriptionId} className="mt-1 text-[13px] font-medium text-gray-600">{description}</p>}
                </div>
                <button ref={closeRef} type="button" onClick={closeSheet} aria-label="닫기" className="icon-button -mr-2 -mt-2 rounded-full text-gray-700 hover:bg-gray-100">×</button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 overscroll-contain">
                {children}
              </div>
              {footer && <div className="shrink-0 border-t border-gray-100 bg-white px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    portalTarget,
  );
}
