"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getUserMe } from "@/lib/get";
import { updatePassword, updateUserProfile } from "@/lib/patch";
import { getErrorMessage } from "@/lib/errors";
import { useStore, type User } from "@/store/useStore";

type ProfileFields = { name: string; email: string; phone: string };

export default function ProfileEditPage() {
  const router = useRouter();
  const setUser = useStore((state) => state.setUser);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [profile, setProfile] = useState<ProfileFields>({ name: "", email: "", phone: "" });
  const [password, setPassword] = useState({ currentPwd: "", newPwd: "", passwordConfirm: "" });

  useEffect(() => {
    let active = true;
    const fetchUser = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const data = await getUserMe();
        if (!data.success || !data.user) throw new Error("사용자 정보를 확인할 수 없습니다.");
        if (!active) return;
        const user: User = data.user;
        setProfile({ name: user.name || user.email.split("@")[0], email: user.email || "", phone: user.phone || "" });
      } catch (error) {
        console.error("Failed to load user info:", error);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchUser();
    return () => { active = false; };
  }, [retryCount]);

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profileSubmitting) return;
    const name = profile.name.trim();
    const phone = profile.phone.trim();
    if (!name) {
      setProfileFeedback("이름을 입력해주세요.");
      document.getElementById("profile-name")?.focus();
      return;
    }
    if (name.length > 80 || phone.length > 30) {
      setProfileFeedback("이름은 80자, 전화번호는 30자 이내로 입력해주세요.");
      return;
    }

    setProfileSubmitting(true);
    setProfileFeedback("");
    try {
      const result = await updateUserProfile({ name, phone: phone || null });
      if (!result.success || !result.user) throw new Error(result.message || "회원 정보를 저장하지 못했어요.");
      const user: User = result.user;
      setUser(user);
      setProfile({ name: user.name || "", email: user.email || "", phone: user.phone || "" });
      setProfileFeedback("회원 정보가 저장되었어요.");
    } catch (error) {
      console.error("Profile update error:", error);
      setProfileFeedback(getErrorMessage(error, "회원 정보를 저장하지 못했어요. 다시 시도해주세요."));
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setPasswordFeedback("");
  };

  const handlePasswordSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordSubmitting) return;
    setPasswordFeedback("");
    if (!password.currentPwd) {
      setPasswordFeedback("현재 비밀번호를 입력해주세요.");
      document.getElementById("profile-current-password")?.focus();
      return;
    }
    if (password.newPwd.length < 8) {
      setPasswordTouched(true);
      setPasswordFeedback("새 비밀번호는 8자 이상이어야 합니다.");
      document.getElementById("profile-new-password")?.focus();
      return;
    }
    if (password.newPwd !== password.passwordConfirm) {
      setPasswordFeedback("새 비밀번호가 일치하지 않습니다.");
      document.getElementById("profile-confirm-password")?.focus();
      return;
    }

    setPasswordSubmitting(true);
    try {
      const result = await updatePassword({ currentPwd: password.currentPwd, newPwd: password.newPwd });
      if (!result.success) throw new Error(result.message || "비밀번호 변경에 실패했습니다.");
      if (result.accessToken) {
        const storage = sessionStorage.getItem("token") ? sessionStorage : localStorage;
        storage.setItem("token", result.accessToken);
      }
      setPassword({ currentPwd: "", newPwd: "", passwordConfirm: "" });
      setPasswordFeedback("비밀번호가 변경되었어요.");
      setPasswordTouched(false);
    } catch (error) {
      console.error("Password update error:", error);
      setPasswordFeedback(getErrorMessage(error, "비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요."));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) return <div role="status" className="space-y-4 p-8"><span className="sr-only">회원 정보를 불러오는 중…</span><div aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-gray-100" /><div aria-hidden="true" className="h-14 animate-pulse rounded-2xl bg-gray-100" /><div aria-hidden="true" className="h-14 animate-pulse rounded-2xl bg-gray-100" /></div>;
  if (loadError) return <div className="p-6"><p role="alert" className="mb-4 text-sm text-red-700">회원 정보를 불러오지 못했어요.</p><button type="button" onClick={() => setRetryCount((value) => value + 1)} className="min-h-11 rounded-xl bg-[#5b873a] px-5 font-bold text-white hover:bg-[#496d2f]">다시 시도</button></div>;

  return (
    <div className="flex min-h-full flex-col bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
        <button type="button" aria-label="뒤로 가기" onClick={() => router.back()} className="icon-button -ml-2 text-gray-800 hover:text-black">
          <ChevronLeft size={28} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <h1 className="text-lg font-extrabold text-gray-800">회원 정보</h1>
        <div aria-hidden="true" className="w-8" />
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-8">
        <div aria-hidden="true" className="mb-8 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gray-200 bg-white text-4xl shadow-sm">🌱</div>
        </div>

        <section aria-labelledby="profile-details-heading">
          <h2 id="profile-details-heading" className="mb-4 text-base font-extrabold text-gray-900">기본 정보</h2>
          <form onSubmit={handleProfileSave} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-name" className="ml-1 text-sm font-bold text-gray-700">이름</label>
              <input id="profile-name" type="text" name="name" value={profile.name} onChange={(event) => { setProfile((previous) => ({ ...previous, name: event.target.value })); setProfileFeedback(""); }} autoComplete="name" maxLength={80} required className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-[15px] font-medium shadow-sm focus:border-[#5b873a]" placeholder="예: 초록 정원사" />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="profile-email" className="ml-1 text-sm font-bold text-gray-700">이메일</label>
              <input id="profile-email" type="email" name="email" value={profile.email} readOnly aria-describedby="profile-email-help" autoComplete="email" className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-5 py-4 text-[15px] font-medium text-gray-600 shadow-sm" />
              <p id="profile-email-help" className="ml-1 text-xs text-gray-500">이메일은 로그인 계정이라 변경할 수 없어요.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="profile-phone" className="ml-1 text-sm font-bold text-gray-700">전화번호</label>
              <input id="profile-phone" type="tel" name="phone" value={profile.phone} onChange={(event) => { setProfile((previous) => ({ ...previous, phone: event.target.value })); setProfileFeedback(""); }} autoComplete="tel" inputMode="tel" maxLength={30} className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-[15px] font-medium shadow-sm focus:border-[#5b873a]" placeholder="예: 010-1234-5678" />
            </div>

            {profileFeedback && <p role="status" aria-live="polite" className="text-sm font-semibold text-gray-700">{profileFeedback}</p>}
            <button type="submit" disabled={profileSubmitting} className="min-h-12 w-full rounded-2xl bg-[#5b873a] py-4 text-base font-extrabold text-white shadow-sm hover:bg-[#496d2f] disabled:cursor-wait disabled:opacity-60">
              {profileSubmitting ? "저장 중…" : "회원 정보 저장"}
            </button>
          </form>
        </section>

        <section aria-labelledby="password-heading" className="mt-8 border-t border-gray-200 pt-7">
          <h2 id="password-heading" className="mb-4 text-base font-extrabold text-gray-900">비밀번호 변경</h2>
          <form onSubmit={handlePasswordSave} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-current-password" className="text-sm font-bold text-gray-700">현재 비밀번호</label>
              <input id="profile-current-password" type="password" autoComplete="current-password" name="currentPwd" value={password.currentPwd} onChange={handlePasswordChange} className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-[15px] font-medium shadow-sm focus:border-[#5b873a]" placeholder="현재 비밀번호를 입력하세요" />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="profile-new-password" className="text-sm font-bold text-gray-700">새 비밀번호</label>
              <input id="profile-new-password" type="password" autoComplete="new-password" name="newPwd" value={password.newPwd} onChange={handlePasswordChange} onBlur={() => setPasswordTouched(true)} minLength={8} aria-invalid={passwordTouched && Boolean(password.newPwd) && password.newPwd.length < 8} aria-describedby={passwordTouched && password.newPwd && password.newPwd.length < 8 ? "profile-password-help" : undefined} className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-[15px] font-medium shadow-sm focus:border-[#5b873a]" placeholder="새 비밀번호 (8자 이상)" />
              {passwordTouched && password.newPwd && password.newPwd.length < 8 && <p id="profile-password-help" className="text-xs text-red-700">새 비밀번호는 8자 이상이어야 합니다.</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="profile-confirm-password" className="text-sm font-bold text-gray-700">새 비밀번호 확인</label>
              <input id="profile-confirm-password" type="password" autoComplete="new-password" name="passwordConfirm" value={password.passwordConfirm} onChange={handlePasswordChange} aria-invalid={Boolean(password.newPwd && password.passwordConfirm && password.newPwd !== password.passwordConfirm)} aria-describedby={password.newPwd && password.passwordConfirm && password.newPwd !== password.passwordConfirm ? "profile-confirm-help" : undefined} className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-[15px] font-medium shadow-sm focus:border-[#5b873a]" placeholder="새 비밀번호를 한 번 더 입력하세요" />
              {password.newPwd && password.passwordConfirm && password.newPwd !== password.passwordConfirm && <p id="profile-confirm-help" className="text-xs font-semibold text-red-700">새 비밀번호가 일치하지 않습니다.</p>}
              {password.newPwd && password.passwordConfirm && password.newPwd === password.passwordConfirm && <p className="text-xs font-semibold text-[#496d2f]">새 비밀번호가 일치합니다.</p>}
            </div>

            {passwordFeedback && <p role="status" aria-live="polite" className="text-sm font-semibold text-gray-700">{passwordFeedback}</p>}
            <button type="submit" disabled={passwordSubmitting} className="min-h-12 w-full rounded-2xl bg-[#5b873a] py-4 text-base font-extrabold text-white shadow-sm hover:bg-[#496d2f] disabled:cursor-wait disabled:opacity-60">
              {passwordSubmitting ? "변경 중…" : "비밀번호 변경하기"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
