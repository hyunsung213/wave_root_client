"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sprout, Video, FileText, User } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useIsSheetOpen } from "@/lib/sheetState";

export default function BottomNav() {
  const pathname = usePathname();
  const myPlants = useStore((state) => state.myPlants) || [];
  const isSheetOpen = useIsSheetOpen();

  const defaultPlantId = myPlants[0]?._id;

  const navItems = [
    { name: "홈", path: "/home", icon: Home },
    { name: "분양", path: "/market", icon: Sprout },
    { name: "실시간", path: defaultPlantId ? `/live/${defaultPlantId}` : "", icon: Video },
    { name: "일기", path: `/record`, icon: FileText },
    { name: "마이", path: "/mypage", icon: User },
  ];

  if (isSheetOpen) return null;

  return (
    <nav aria-label="주요 메뉴" className="app-bottom-nav absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 flex h-16 items-center justify-around rounded-[22px] border border-[#e2ecc8] bg-white px-2 shadow-[0_10px_30px_rgba(48,68,35,0.14)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        if (!item.path) {
          return (
            <button key={item.name} type="button" disabled aria-label="실시간 영상: 분양받은 식물이 없어 사용할 수 없음" className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-300 disabled:cursor-not-allowed disabled:opacity-60">
              <Icon size={20} aria-hidden="true" />
              <span className="text-xs font-bold">{item.name}</span>
            </button>
          );
        }
        const baseRoute = item.path.split('/')[1];
        const isActive = pathname.startsWith(`/${baseRoute}`);
        
        return (
          <Link
            key={item.path}
            href={item.path}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive ? "text-[#6ea447]" : "text-gray-400 hover:text-gray-500"
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-xs font-bold ${isActive ? "text-[#6ea447]" : "text-gray-400"}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
