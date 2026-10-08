"use client";

import { useEffect, useRef } from "react";

export function usePullToRefresh(onRefresh: () => void) {
  const callbackRef = useRef(onRefresh);
  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const scrollArea = document.querySelector<HTMLElement>("[data-main-scroll]");
    if (!scrollArea) return;
    let startX = 0;
    let startY = 0;
    let armed = false;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      armed = Boolean(touch && scrollArea.scrollTop <= 0 && !(event.target instanceof Element && event.target.closest('[role="dialog"]')));
      if (touch) {
        startX = touch.clientX;
        startY = touch.clientY;
      }
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (!armed) return;
      armed = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const deltaX = Math.abs(touch.clientX - startX);
      const deltaY = touch.clientY - startY;
      if (deltaY >= 80 && deltaY > deltaX * 1.5 && scrollArea.scrollTop <= 0) callbackRef.current();
    };

    scrollArea.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollArea.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      scrollArea.removeEventListener("touchstart", onTouchStart);
      scrollArea.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}
