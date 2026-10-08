"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { getUserMe } from "@/lib/get";
import { useStore } from "@/store/useStore";

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setUser = useStore((state) => state.setUser);
  const setAccessToken = useStore((state) => state.setAccessToken);
  const logout = useStore((state) => state.logout);
  const [status, setStatus] = useState<"checking" | "ready" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      logout();
      router.replace("/login");
      return;
    }

    let active = true;
    getUserMe().then((data) => {
      if (!active) return;
      if (data.success && data.user) {
        setUser(data.user);
        setAccessToken(token);
        setStatus("ready");
      } else {
        logout();
        router.replace("/login");
      }
    }).catch((error: unknown) => {
      if (!active) return;
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
        router.replace("/login");
      } else {
        setStatus("error");
      }
    });

    return () => { active = false; };
  }, [attempt, logout, router, setAccessToken, setUser]);

  if (status === "ready") return <>{children}</>;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      {status === "checking" ? (
        <p role="status" className="text-sm font-medium text-gray-600">계정을 확인하는 중이에요…</p>
      ) : (
        <div role="alert" className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-700">연결 상태를 확인하지 못했어요.</p>
          <button type="button" onClick={() => { setStatus("checking"); setAttempt((value) => value + 1); }} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold text-white">다시 시도</button>
          <button type="button" onClick={() => router.replace("/login")} className="min-h-11 px-5 font-semibold text-gray-700">로그인으로 이동</button>
        </div>
      )}
    </div>
  );
}
