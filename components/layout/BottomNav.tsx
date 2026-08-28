"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sprout, Video, FileText, User } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function BottomNav() {
  const pathname = usePathname();
  const myPlants = useStore((state) => state.myPlants) || [];
  
  const defaultPlantId = myPlants.length > 0 ? myPlants[0]._id : "1";

  const navItems = [
    { name: "홈", path: "/home", icon: Home },
    { name: "분양", path: "/market", icon: Sprout },
    { name: "실시간", path: `/live/${defaultPlantId}`, icon: Video },
    { name: "기록", path: `/record`, icon: FileText },
    { name: "마이", path: "/mypage", icon: User },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-[#e2ecc8] flex items-center justify-around px-2 z-50">
      {navItems.map((item) => {
        const baseRoute = item.path.split('/')[1];
        const isActive = pathname.startsWith(`/${baseRoute}`);
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive ? "text-[#6ea447]" : "text-gray-400 hover:text-gray-500"
            }`}
          >
            {isActive ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute w-8 h-8 bg-[#f1f7e3] rounded-full -z-10" />
                <Icon size={20} strokeWidth={2.5} />
              </div>
            ) : (
              <Icon size={20} strokeWidth={2} />
            )}
            <span className={`text-[10px] font-bold ${isActive ? "text-[#6ea447]" : "text-gray-400"}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
