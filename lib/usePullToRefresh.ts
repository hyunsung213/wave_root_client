"use client";

import { useEffect, useRef, useState } from "react";

export type PullToRefreshState = "idle" | "pull" | "armed" | "refreshing";

export function usePullToRefresh(onRefresh: () => void) {
  const callbackRef = useRef(onRefresh);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshingRef = useRef(false);
  const [pullState, setPullState] = useState<PullToRefreshState>("idle");
  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const scrollArea = document.querySelector<HTMLElement>("[data-main-scroll]");
    if (!scrollArea) return;
    let startX = 0;
    let startY = 0;
    let armed = false;
    let horizontalGesture = false;

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current) { armed = false; return; }
      const touch = event.touches[0];
      const target = event.target instanceof Element ? event.target : null;
      const nestedScroller = target?.closest<HTMLElement>("[data-scroll-container], .overflow-y-auto, .overflow-auto");
      const nestedContentIsAtTop = !nestedScroller || nestedScroller === scrollArea || nestedScroller.scrollTop <= 0;
      armed = Boolean(touch && scrollArea.scrollTop <= 0 && nestedContentIsAtTop && !target?.closest('[role="dialog"]'));
      horizontalGesture = false;
      if (touch) {
        startX = touch.clientX;
        startY = touch.clientY;
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!armed || !event.touches[0]) return;
      const deltaX = Math.abs(event.touches[0].clientX - startX);
      const deltaY = event.touches[0].clientY - startY;
      if (deltaX > 8 && deltaX > Math.max(0, deltaY) * 1.2) {
        horizontalGesture = true;
        setPullState("idle");
        return;
      }
      if (deltaY > 8 && deltaY > deltaX * 1.2) setPullState(deltaY >= 80 ? "armed" : "pull");
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (!armed) return;
      armed = false;
      const touch = event.changedTouches[0];
      if (!touch) { setPullState("idle"); return; }
      const deltaX = Math.abs(touch.clientX - startX);
      const deltaY = touch.clientY - startY;
      if (!horizontalGesture && deltaY >= 80 && deltaY > deltaX * 1.5 && scrollArea.scrollTop <= 0) {
        refreshingRef.current = true;
        setPullState("refreshing");
        callbackRef.current();
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          refreshingRef.current = false;
          setPullState("idle");
        }, 1200);
      } else setPullState("idle");
    };

    scrollArea.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollArea.addEventListener("touchmove", onTouchMove, { passive: true });
    scrollArea.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      scrollArea.removeEventListener("touchstart", onTouchStart);
      scrollArea.removeEventListener("touchmove", onTouchMove);
      scrollArea.removeEventListener("touchend", onTouchEnd);
      if (timerRef.current) clearTimeout(timerRef.current);
      refreshingRef.current = false;
    };
  }, []);

  return pullState;
}
