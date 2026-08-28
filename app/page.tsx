"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sprout } from "lucide-react";

export default function SplashPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1. 프로그레스 바 애니메이션 시뮬레이션
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    // 2. JWT 검증 및 라우팅 시뮬레이션
    const timeout = setTimeout(() => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        router.push("/home");
      } else {
        router.push("/login");
      }
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-[#f8f9ef] to-white">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <Sprout size={80} className="text-sprout-500 mb-4" />
        <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight mb-2">싹키워</h1>
        <p className="text-gray-500 text-sm">식물과 함께 건강한 일상을 시작해요</p>
      </motion.div>

      <div className="absolute bottom-20 w-[80%] max-w-[280px]">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-sprout-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">LOADING... {progress}%</p>
      </div>
    </div>
  );
}
