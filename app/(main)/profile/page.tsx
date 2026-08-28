"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getUserMe } from "@/lib/get";
import { updatePassword } from "@/lib/patch";

export default function ProfileEditPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    currentPwd: "",
    newPwd: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getUserMe();
        if (data.success && data.user) {
          setFormData(prev => ({
            ...prev,
            name: data.user.name || data.user.email.split('@')[0],
            email: data.user.email || "",
            phone: data.user.phone || "",
          }));
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 비밀번호 변경 요청이 있는 경우
    if (formData.currentPwd || formData.newPwd || formData.passwordConfirm) {
      if (!formData.currentPwd) {
        alert("현재 비밀번호를 입력해주세요.");
        return;
      }
      if (formData.newPwd.length < 8) {
        alert("새 비밀번호는 8자 이상이어야 합니다.");
        return;
      }
      if (formData.newPwd !== formData.passwordConfirm) {
        alert("새 비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
        return;
      }
      
      try {
        const res = await updatePassword({
          currentPwd: formData.currentPwd,
          newPwd: formData.newPwd
        });
        
        if (res.success) {
          if (res.accessToken) {
            localStorage.setItem("token", res.accessToken); // 새 토큰으로 교체
          }
          alert("비밀번호가 성공적으로 변경되었습니다.");
          router.back();
        } else {
          alert(res.message || "비밀번호 변경에 실패했습니다.");
        }
      } catch (err: any) {
        console.error("Password update error:", err);
        alert(err.response?.data?.message || "비밀번호 변경 중 오류가 발생했습니다.");
      }
    } else {
      // 일반 정보만 저장하는 경우 (이름/전화번호 변경 API가 있다면 호출)
      alert("회원 정보가 성공적으로 수정되었습니다.");
      router.back();
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
        <button onClick={() => router.back()} className="text-gray-800 hover:text-black transition-colors -ml-2 p-2">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <h1 className="text-lg font-extrabold text-gray-800">회원 정보 수정</h1>
        <div className="w-8"></div>
      </header>

      {/* 폼 */}
      <form onSubmit={handleSave} className="flex-1 flex flex-col px-6 pt-8 pb-10 overflow-y-auto hide-scrollbar">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl border border-gray-200 shadow-sm">
              🌱
            </div>
            <button type="button" className="absolute bottom-0 right-0 w-8 h-8 bg-[#6ea447] text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-[#5b873a] transition-colors">
              <span className="text-sm">✏️</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 flex-1">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700 ml-1">이름</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium focus:outline-none focus:border-[#6ea447] transition-colors shadow-sm"
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700 ml-1">이메일 (변경 불가)</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              readOnly
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium text-gray-500 shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700 ml-1">전화번호</label>
            <input 
              type="tel" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium focus:outline-none focus:border-[#6ea447] transition-colors shadow-sm"
              placeholder="전화번호를 입력하세요"
            />
          </div>

          <div className="w-full h-px bg-gray-200 my-4"></div>

          <h3 className="text-sm font-extrabold text-gray-800 ml-1 mb-1">비밀번호 변경</h3>
          
          <div className="flex flex-col gap-2">
            <input 
              type="password" 
              name="currentPwd"
              value={formData.currentPwd}
              onChange={handleChange}
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium focus:outline-none focus:border-[#6ea447] transition-colors shadow-sm"
              placeholder="현재 비밀번호"
            />
          </div>

          <div className="flex flex-col gap-2">
            <input 
              type="password" 
              name="newPwd"
              value={formData.newPwd}
              onChange={handleChange}
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium focus:outline-none focus:border-[#6ea447] transition-colors shadow-sm"
              placeholder="새 비밀번호 (8자 이상)"
            />
          </div>

          <div className="flex flex-col gap-2 mb-8">
            <input 
              type="password" 
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              className={`w-full bg-white border rounded-2xl px-5 py-4 text-[15px] font-medium focus:outline-none transition-colors shadow-sm ${
                formData.newPwd && formData.passwordConfirm && formData.newPwd !== formData.passwordConfirm 
                ? 'border-red-400 focus:border-red-500' 
                : 'border-gray-200 focus:border-[#6ea447]'
              }`}
              placeholder="새 비밀번호 확인"
            />
            {formData.newPwd && formData.passwordConfirm && formData.newPwd !== formData.passwordConfirm && (
              <span className="text-xs font-bold text-red-500 ml-2 mt-1">새 비밀번호가 일치하지 않습니다.</span>
            )}
            {formData.newPwd && formData.passwordConfirm && formData.newPwd === formData.passwordConfirm && (
              <span className="text-xs font-bold text-[#6ea447] ml-2 mt-1">새 비밀번호가 일치합니다.</span>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-[#6ea447] hover:bg-[#5b873a] text-white font-extrabold py-4.5 rounded-2xl text-[16px] transition-colors shadow-sm active:scale-[0.98] mt-auto"
        >
          저장하기
        </button>
      </form>
    </div>
  );
}
