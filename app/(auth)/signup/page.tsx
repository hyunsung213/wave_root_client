"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout, Mail, Lock, Eye, EyeOff, User, Phone } from "lucide-react";
import { signup } from "@/lib/post";
import { getErrorMessage } from "@/lib/errors";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    pwd: "",
    confirmPwd: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = {
    name: !formData.name.trim() ? "이름을 입력해주세요." : "",
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) ? "올바른 이메일 주소를 입력해주세요." : "",
    phone: formData.phone && !/^01[016789]-?\d{3,4}-?\d{4}$/.test(formData.phone) ? "전화번호 형식을 확인해주세요." : "",
    pwd: formData.pwd.length < 8 ? "비밀번호는 8자 이상 입력해주세요." : "",
    confirmPwd: formData.confirmPwd !== formData.pwd ? "비밀번호가 일치하지 않습니다." : "",
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((value) => ({ ...value, [e.target.name]: e.target.value }));
    setErrorMsg("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setTouched({ name: true, email: true, phone: true, pwd: true, confirmPwd: true });
    if (Object.values(errors).some(Boolean)) return;
    setErrorMsg("");
    setSubmitting(true);
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
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "회원가입하지 못했어요. 연결 상태를 확인하고 다시 시도해주세요."));
    } finally {
      setSubmitting(false);
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
        <div role="alert" className="w-full max-w-sm mb-4 text-xs text-red-600 text-center bg-red-50 py-2 rounded-lg">
          {errorMsg}
        </div>
      )}

      <form className="w-full max-w-sm flex flex-col gap-4 pb-8" onSubmit={handleSignup}>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <label htmlFor="signup-name" className="sr-only">이름</label>
          <input 
            id="signup-name"
            type="text" 
            autoComplete="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={() => setTouched((value) => ({ ...value, name: true }))}
            aria-invalid={touched.name && Boolean(errors.name)}
            aria-describedby={touched.name && errors.name ? "signup-name-error" : undefined}
            placeholder="이름을 입력해주세요" 
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#f8f9ef] border border-[#e2ecc8] focus:border-[#6ea447] transition-colors text-sm font-medium"
            required
          />
        </div>
        {touched.name && errors.name && <p id="signup-name-error" className="text-xs text-red-600">{errors.name}</p>}

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <label htmlFor="signup-email" className="sr-only">이메일 주소</label>
          <input 
            id="signup-email"
            type="email" 
            autoComplete="email"
            inputMode="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => setTouched((value) => ({ ...value, email: true }))}
            aria-invalid={touched.email && Boolean(errors.email)}
            aria-describedby={touched.email && errors.email ? "signup-email-error" : undefined}
            placeholder="이메일 주소를 입력해주세요" 
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#f8f9ef] border border-[#e2ecc8] focus:border-[#6ea447] transition-colors text-sm font-medium"
            required
          />
        </div>
        {touched.email && errors.email && <p id="signup-email-error" className="text-xs text-red-600">{errors.email}</p>}

        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <label htmlFor="signup-phone" className="sr-only">전화번호</label>
          <input 
            id="signup-phone"
            type="tel" 
            autoComplete="tel"
            inputMode="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            onBlur={() => setTouched((value) => ({ ...value, phone: true }))}
            aria-invalid={touched.phone && Boolean(errors.phone)}
            aria-describedby={touched.phone && errors.phone ? "signup-phone-error" : undefined}
            placeholder="전화번호 (예: 010-1234-5678)" 
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#f8f9ef] border border-[#e2ecc8] focus:border-[#6ea447] transition-colors text-sm font-medium"
          />
        </div>
        {touched.phone && errors.phone && <p id="signup-phone-error" className="text-xs text-red-600">{errors.phone}</p>}
        
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <label htmlFor="signup-password" className="sr-only">비밀번호</label>
          <input 
            id="signup-password"
            type={showPassword ? "text" : "password"} 
            autoComplete="new-password"
            name="pwd"
            value={formData.pwd}
            onChange={handleChange}
            onBlur={() => setTouched((value) => ({ ...value, pwd: true }))}
            aria-invalid={touched.pwd && Boolean(errors.pwd)}
            aria-describedby={touched.pwd && errors.pwd ? "signup-password-error" : undefined}
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
        {touched.pwd && errors.pwd && <p id="signup-password-error" className="text-xs text-red-600">{errors.pwd}</p>}

        <div>
          <label htmlFor="signup-confirm" className="sr-only">비밀번호 확인</label>
        <input id="signup-confirm" type="password" name="confirmPwd" autoComplete="new-password" value={formData.confirmPwd} onChange={handleChange} onBlur={() => setTouched((value) => ({ ...value, confirmPwd: true }))} aria-invalid={touched.confirmPwd && Boolean(errors.confirmPwd)} aria-describedby={touched.confirmPwd && errors.confirmPwd ? "signup-confirm-error" : undefined} placeholder="비밀번호를 다시 입력해주세요" className="w-full rounded-2xl border border-[#e2ecc8] bg-[#f8f9ef] px-4 py-4 text-sm font-medium focus:border-[#6ea447]" required />
          {touched.confirmPwd && errors.confirmPwd && <p id="signup-confirm-error" className="mt-2 text-xs text-red-600">{errors.confirmPwd}</p>}
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          className="w-full bg-[#6ea447] text-white font-extrabold py-4 rounded-2xl mt-4 hover:bg-[#5b873a] transition-colors active:scale-[0.98]"
        >
          {submitting ? "가입 처리 중…" : "회원가입"}
        </button>
      </form>
    </div>
  );
}
