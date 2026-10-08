"use client";

import { useEffect } from "react";
import { create } from "zustand";

interface SheetCountState {
  count: number;
  open: () => void;
  close: () => void;
}

const useSheetCount = create<SheetCountState>((set) => ({
  count: 0,
  open: () => set((state) => ({ count: state.count + 1 })),
  close: () => set((state) => ({ count: Math.max(0, state.count - 1) })),
}));

export const useIsSheetOpen = () => useSheetCount((state) => state.count > 0);

export function useHideBottomNav(active: boolean) {
  const open = useSheetCount((state) => state.open);
  const close = useSheetCount((state) => state.close);
  useEffect(() => {
    if (!active) return;
    open();
    return close;
  }, [active, open, close]);
}
