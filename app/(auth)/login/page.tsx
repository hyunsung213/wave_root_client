"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { login } from "@/lib/post";
import { useStore } from "@/store/useStore";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    try {
      const responseData = await login({
        email: formData.email,
        pwd: formData.pwd,
      });

      if (responseData.success) {
        const { accessToken, user } = responseData;
        // 로컬스토리지 및 zustand 스토어에 토큰/유저 정보 저장
        localStorage.setItem("token", accessToken);
        setAccessToken(accessToken);
        setUser(user);
        
        router.push("/home");
      } else {
        setErrorMsg(responseData.message || "로그인에 실패했습니다.");
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || error.message || "서버 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col items-center p-8 h-full bg-white">
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
        <div className="w-full max-w-sm mb-4 text-xs text-red-500 text-center bg-red-50 py-2 rounded-lg">
          {errorMsg}
        </div>
      )}

      <form className="w-full max-w-sm flex flex-col gap-4" onSubmit={handleLogin}>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="email" 
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="이메일 주소를 입력해주세요" 
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#f8f9ef] border border-[#e2ecc8] focus:outline-none focus:border-[#6ea447] transition-colors text-sm font-medium"
            required
          />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type={showPassword ? "text" : "password"} 
            name="pwd"
            value={formData.pwd}
            onChange={handleChange}
            placeholder="비밀번호를 입력해주세요" 
          className="w-full pl-12 pr-12 py-4 rounded-2xl bg-[#f8f9ef] border border-[#e2ecc8] focus:outline-none focus:border-[#6ea447] transition-colors text-sm font-medium"
            required
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="flex justify-between items-center px-2 mt-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" className="rounded w-4 h-4 accent-[#6ea447]" />
            로그인 상태 유지
          </label>
          <button type="button" className="text-sm font-medium text-gray-400 hover:text-gray-700">비밀번호 찾기 &gt;</button>
        </div>

        <button 
          type="submit" 
          className="w-full bg-[#6ea447] text-white font-extrabold py-4 rounded-2xl mt-4 hover:bg-[#5b873a] transition-colors active:scale-[0.98]"
        >
          로그인
        </button>

        <div className="flex items-center my-6">
          <div className="flex-1 h-[1px] bg-gray-200"></div>
          <span className="px-4 text-xs text-gray-400">또는</span>
          <div className="flex-1 h-[1px] bg-gray-200"></div>
        </div>

        <button type="button" className="w-full bg-[#FEE500] text-[#000000] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mb-2 hover:bg-[#FDD800] transition-colors active:scale-[0.98]">
          <span className="bg-black text-[#FEE500] w-5 h-5 flex items-center justify-center rounded-full text-xs">K</span>
          카카오로 시작하기
        </button>
      </form>
    </div>
  );
}
