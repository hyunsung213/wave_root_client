"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { login } from "@/lib/post";
import { useStore } from "@/store/useStore";
import { getErrorMessage } from "@/lib/errors";

export default function LoginPage() {
  const router = useRouter();
  const setAccessToken = useStore((state) => state.setAccessToken);
  const setUser = useStore((state) => state.setUser);
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    pwd: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);
  const [touched, setTouched] = useState({ email: false, pwd: false });
  const emailInvalid = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const passwordInvalid = touched.pwd && !formData.pwd;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg("");
    setSubmitting(true);
    try {
      const responseData = await login({
        email: formData.email,
        pwd: formData.pwd,
      });

      if (responseData.success && responseData.accessToken && responseData.user) {
        const { accessToken, user } = responseData;
        // 로컬스토리지 및 zustand 스토어에 토큰/유저 정보 저장
        if (remember) {
          localStorage.setItem("token", accessToken);
          sessionStorage.removeItem("token");
        } else {
          sessionStorage.setItem("token", accessToken);
          localStorage.removeItem("token");
        }
        setAccessToken(accessToken);
        setUser(user);
        
        router.push("/home");
      } else {
        setErrorMsg(responseData.message || "로그인에 실패했습니다.");
      }
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "로그인하지 못했어요. 연결 상태를 확인하고 다시 시도해주세요."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto bg-white p-8">
      <div className="flex flex-col items-center mt-12 mb-10 w-full relative h-[100px]">
        <Image 
          src="/images/logo_ssakiwoe.png" 
          alt="싹키워 로고" 
          fill
          sizes="(max-width: 400px) 100vw, 400px"
          priority
          className="object-contain"
        />
      </div>

      <div className="w-full flex justify-center mb-6">
        <div className="flex w-[80%] rounded-full bg-gray-100 p-1">
          <button className="flex-1 rounded-full bg-white text-gray-800 font-semibold py-2 text-sm shadow-sm">로그인</button>
          <Link href="/signup" className="flex-1 rounded-full text-gray-500 font-semibold py-2 text-sm text-center">회원가입</Link>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="w-full max-w-sm mb-4 text-xs text-red-600 text-center bg-red-50 py-2 rounded-lg">
          {errorMsg}
        </div>
      )}

      <form className="w-full max-w-sm flex flex-col gap-4" onSubmit={handleLogin}>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <label htmlFor="login-email" className="sr-only">이메일 주소</label>
          <input 
            id="login-email"
            type="email" 
            autoComplete="username"
            inputMode="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => setTouched((value) => ({ ...value, email: true }))}
            aria-invalid={emailInvalid}
            aria-describedby={emailInvalid ? "login-email-error" : undefined}
            placeholder="이메일 주소를 입력해주세요" 
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#f8f9ef] border border-[#e2ecc8] focus:border-[#6ea447] transition-colors text-sm font-medium"
            required
          />
        </div>
        {emailInvalid && <p id="login-email-error" className="text-xs text-red-600">올바른 이메일 주소를 입력해주세요.</p>}
        
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <label htmlFor="login-password" className="sr-only">비밀번호</label>
          <input 
            id="login-password"
            type={showPassword ? "text" : "password"} 
            autoComplete="current-password"
            name="pwd"
            value={formData.pwd}
            onChange={handleChange}
            onBlur={() => setTouched((value) => ({ ...value, pwd: true }))}
            aria-invalid={passwordInvalid}
            aria-describedby={passwordInvalid ? "login-password-error" : undefined}
            placeholder="비밀번호를 입력해주세요" 
          className="w-full pl-12 pr-12 py-4 rounded-2xl bg-[#f8f9ef] border border-[#e2ecc8] focus:border-[#6ea447] transition-colors text-sm font-medium"
            required
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            className="icon-button absolute right-1 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {passwordInvalid && <p id="login-password-error" className="text-xs text-red-600">비밀번호를 입력해주세요.</p>}

        <div className="flex items-center px-2 mt-2">
          <label className="flex min-h-11 items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="rounded w-4 h-4 accent-[#6ea447]" />
            로그인 상태 유지
          </label>
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          className="w-full bg-[#6ea447] text-white font-extrabold py-4 rounded-2xl mt-4 hover:bg-[#5b873a] transition-colors active:scale-[0.98]"
        >
          {submitting ? "로그인 중…" : "로그인"}
        </button>

        <div className="flex items-center my-6">
          <div className="flex-1 h-[1px] bg-gray-200"></div>
          <span className="px-4 text-xs text-gray-400">또는</span>
          <div className="flex-1 h-[1px] bg-gray-200"></div>
        </div>

        <button type="button" disabled aria-label="카카오 로그인 준비 중" className="w-full bg-[#FEE500] text-[#000000] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mb-2 opacity-60 cursor-not-allowed">
          <span className="bg-black text-[#FEE500] w-5 h-5 flex items-center justify-center rounded-full text-xs">K</span>
          카카오 로그인 준비 중
        </button>
      </form>
    </div>
  );
}
