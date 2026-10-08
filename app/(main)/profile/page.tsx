"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getUserMe } from "@/lib/get";
import { updatePassword } from "@/lib/patch";
import { getErrorMessage } from "@/lib/errors";

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  
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
      setLoading(true);
      setLoadError(false);
      try {
        const data = await getUserMe();
        if (data.success && data.user) {
          setFormData(prev => ({
            ...prev,
            name: data.user.name || data.user.email.split('@')[0],
            email: data.user.email || "",
            phone: data.user.phone || "",
          }));
        } else {
          throw new Error("사용자 정보를 확인할 수 없습니다.");
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [retryCount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFeedback("");

    if (formData.currentPwd || formData.newPwd || formData.passwordConfirm) {
      if (!formData.currentPwd) {
        setFeedback("현재 비밀번호를 입력해주세요.");
        return;
      }
      if (formData.newPwd.length < 8) {
        setFeedback("새 비밀번호는 8자 이상이어야 합니다.");
        return;
      }
      if (formData.newPwd !== formData.passwordConfirm) {
        setFeedback("새 비밀번호가 일치하지 않습니다.");
        return;
      }
      setSubmitting(true);
      try {
        const res = await updatePassword({
          currentPwd: formData.currentPwd,
          newPwd: formData.newPwd
        });
        
        if (res.success) {
          if (res.accessToken) {
            const storage = sessionStorage.getItem("token") ? sessionStorage : localStorage;
            storage.setItem("token", res.accessToken);
          }
          setFormData((value) => ({ ...value, currentPwd: "", newPwd: "", passwordConfirm: "" }));
          setFeedback("비밀번호가 변경되었어요.");
        } else {
          setFeedback(res.message || "비밀번호 변경에 실패했습니다.");
        }
      } catch (err: unknown) {
        console.error("Password update error:", err);
        setFeedback(getErrorMessage(err, "비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요."));
      } finally {
        setSubmitting(false);
      }
    } else {
      setFeedback("변경할 비밀번호를 입력해주세요.");
    }
  };

  if (loading) return <div role="status" className="space-y-4 p-8"><div className="h-24 animate-pulse rounded-2xl bg-gray-100" /><div className="h-14 animate-pulse rounded-2xl bg-gray-100" /><div className="h-14 animate-pulse rounded-2xl bg-gray-100" /><span className="sr-only">회원 정보를 불러오는 중</span></div>;
  if (loadError) return <div className="p-6"><p role="alert" className="mb-4 text-sm text-red-700">회원 정보를 불러오지 못했어요.</p><button type="button" onClick={() => setRetryCount((value) => value + 1)} className="min-h-11 rounded-xl bg-[#6ea447] px-5 font-bold text-white">다시 시도</button></div>;

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
        <button type="button" aria-label="뒤로 가기" onClick={() => router.back()} className="icon-button text-gray-800 hover:text-black transition-colors -ml-2">
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
          </div>
        </div>

        <div className="flex flex-col gap-5 flex-1">
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-name" className="text-sm font-bold text-gray-700 ml-1">이름 (조회 전용)</label>
            <input 
              id="profile-name"
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              readOnly
              autoComplete="name"
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium focus:outline-none focus:border-[#6ea447] transition-colors shadow-sm"
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="profile-email" className="text-sm font-bold text-gray-700 ml-1">이메일 (변경 불가)</label>
            <input 
              id="profile-email"
              type="email" 
              name="email"
              value={formData.email}
              readOnly
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium text-gray-500 shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="profile-phone" className="text-sm font-bold text-gray-700 ml-1">전화번호 (조회 전용)</label>
            <input 
              id="profile-phone"
              type="tel" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              readOnly
              autoComplete="tel"
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium focus:outline-none focus:border-[#6ea447] transition-colors shadow-sm"
              placeholder="전화번호를 입력하세요"
            />
          </div>

          <p className="text-xs text-gray-500">이름과 전화번호 수정은 아직 지원되지 않습니다.</p>

          <div className="w-full h-px bg-gray-200 my-4"></div>

          <h3 className="text-sm font-extrabold text-gray-800 ml-1 mb-1">비밀번호 변경</h3>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-current-password" className="text-sm font-bold text-gray-700">현재 비밀번호</label>
            <input 
              id="profile-current-password"
              type="password" 
              autoComplete="current-password"
              name="currentPwd"
              value={formData.currentPwd}
              onChange={handleChange}
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium focus:outline-none focus:border-[#6ea447] transition-colors shadow-sm"
              placeholder="현재 비밀번호"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="profile-new-password" className="text-sm font-bold text-gray-700">새 비밀번호</label>
            <input 
              id="profile-new-password"
              type="password" 
              autoComplete="new-password"
              name="newPwd"
              value={formData.newPwd}
              onChange={handleChange}
              onBlur={() => setPasswordTouched(true)}
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-[15px] font-medium focus:outline-none focus:border-[#6ea447] transition-colors shadow-sm"
              placeholder="새 비밀번호 (8자 이상)"
            />
          </div>
          {passwordTouched && formData.newPwd && formData.newPwd.length < 8 && <p className="text-xs text-red-600">새 비밀번호는 8자 이상이어야 합니다.</p>}

          <div className="flex flex-col gap-2 mb-8">
            <label htmlFor="profile-confirm-password" className="text-sm font-bold text-gray-700">새 비밀번호 확인</label>
            <input 
              id="profile-confirm-password"
              type="password" 
              autoComplete="new-password"
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

        {feedback && <p role="status" aria-live="polite" className="mb-3 text-sm font-semibold text-gray-700">{feedback}</p>}
        <button 
          type="submit" 
          disabled={submitting}
          className="w-full bg-[#6ea447] hover:bg-[#5b873a] text-white font-extrabold py-4.5 rounded-2xl text-[16px] transition-colors shadow-sm active:scale-[0.98] mt-auto"
        >
          {submitting ? "변경 중…" : "비밀번호 변경하기"}
        </button>
      </form>
    </div>
  );
}
