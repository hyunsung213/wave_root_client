"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sprout } from "lucide-react";
import { getUserMe } from "@/lib/get";
import { useStore } from "@/store/useStore";

export default function SplashPage() {
  const router = useRouter();
  const setUser = useStore((state) => state.setUser);
  const setAccessToken = useStore((state) => state.setAccessToken);
  const [attempt, setAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  useEffect(() => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    let active = true;
    getUserMe().then((data) => {
      if (!active) return;
      if (data.success && data.user) {
        setUser(data.user);
        setAccessToken(token);
        router.replace("/home");
      } else {
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        router.replace("/login");
      }
    }).catch((error: { response?: { status?: number } }) => {
      if (!active) return;
      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        router.replace("/login");
      } else {
        setErrorMessage("연결 상태를 확인하지 못했어요.");
      }
    });
    return () => { active = false; };
  }, [router, setAccessToken, setUser, attempt]);

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

      {errorMessage ? (
        <div role="alert" className="absolute bottom-16 flex flex-col items-center gap-3 text-sm text-gray-600">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => { setErrorMessage(""); setAttempt((value) => value + 1); }} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold text-white">다시 시도</button>
          <button type="button" onClick={() => router.replace("/login")} className="min-h-11 px-5 font-semibold text-gray-700">로그인으로 이동</button>
        </div>
      ) : <p role="status" className="absolute bottom-20 text-center text-sm text-gray-500">계정을 확인하는 중이에요…</p>}
    </div>
  );
}
