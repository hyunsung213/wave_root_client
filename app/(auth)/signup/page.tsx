"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout, Mail, Lock, Eye, EyeOff, User, Phone } from "lucide-react";
import { signup } from "@/lib/post";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    pwd: "",
  });
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const responseData = await signup({
        email: formData.email,
        phone: formData.phone,
        pwd: formData.pwd,
        name: formData.name, 
      });

      if (responseData.success) {
        // 회원가입 성공 시 로그인 페이지로
        router.push("/login");
      } else {
        setErrorMsg(responseData.message || "회원가입에 실패했습니다.");
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || error.message || "서버 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col items-center p-8 h-full bg-white overflow-y-auto">
      <div className="flex flex-col items-center mt-8 mb-8">
        <Sprout size={50} className="text-sprout-500 mb-2" />
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">싹키워</h1>
      </div>

      <div className="w-full flex justify-center mb-6">
        <div className="flex w-[80%] rounded-full bg-gray-100 p-1">
          <Link href="/login" className="flex-1 rounded-full text-gray-500 font-semibold py-2 text-sm text-center">로그인</Link>
          <button className="flex-1 rounded-full bg-white text-gray-800 font-semibold py-2 text-sm shadow-sm">회원가입</button>
        </div>
      </div>

      {errorMsg && (
        <div className="w-full max-w-sm mb-4 text-xs text-red-500 text-center bg-red-50 py-2 rounded-lg">
          {errorMsg}
        </div>
      )}

      <form className="w-full max-w-sm flex flex-col gap-4 pb-8" onSubmit={handleSignup}>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="이름을 입력해주세요" 
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#f8f9ef] border border-[#e2ecc8] focus:outline-none focus:border-[#6ea447] transition-colors text-sm font-medium"
            required
          />
        </div>

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
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="tel" 
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="전화번호 (예: 010-1234-5678)" 
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#f8f9ef] border border-[#e2ecc8] focus:outline-none focus:border-[#6ea447] transition-colors text-sm font-medium"
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

        <button 
          type="submit" 
          className="w-full bg-[#6ea447] text-white font-extrabold py-4 rounded-2xl mt-4 hover:bg-[#5b873a] transition-colors active:scale-[0.98]"
        >
          회원가입
        </button>
      </form>
    </div>
  );
}
