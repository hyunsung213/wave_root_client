"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Clipboard, TicketCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { plantsData } from "@/lib/plantsData";
import { useStore } from "@/store/useStore";
import { getMyCoupons, getMyOrder } from "@/lib/get";
import { cancelAdoptionOrder, createAdoptionOrder, validateAdoptionCoupon, type CheckoutOrder } from "@/lib/post";

const PASS_PRICE = 3900;
type IssuedCoupon = { code: string; discountType: "percent" | "fixed"; discountValue: number; expiresAt?: string | null };

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ plantId: string }>();
  const plant = plantsData.find((item) => item.id === params.plantId);
  const pendingPlantName = useStore((state) => state.pendingPlantName);
  const [coupons, setCoupons] = useState<IssuedCoupon[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [validatedCoupon, setValidatedCoupon] = useState<{ code: string; discountAmount: number; amountDue: number } | null>(null);
  const [depositorName, setDepositorName] = useState("");
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const subtotal = (plant?.price ?? 0) + PASS_PRICE;
  const amountDue = validatedCoupon?.amountDue ?? subtotal;
  const plantName = pendingPlantName?.trim() || (plant ? `우리집 ${plant.name}` : "");

  useEffect(() => {
    let active = true;
    getMyCoupons().then((data) => {
      if (active) setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
    }).catch(() => { if (active) setCoupons([]); });
    const orderId = sessionStorage.getItem(`checkout-order:${params.plantId}`);
    if (orderId) {
      getMyOrder(orderId).then((data) => {
        if (active && data.order?.productId === params.plantId) setOrder(data.order);
      }).catch(() => {
        if (active) sessionStorage.removeItem(`checkout-order:${params.plantId}`);
      });
    }
    return () => { active = false; };
  }, [params.plantId]);

  const selectedCoupon = useMemo(() => coupons.find((coupon) => coupon.code === couponCode), [coupons, couponCode]);

  async function applyCoupon() {
    setError("");
    setValidatedCoupon(null);
    if (!plant) return;
    if (!couponCode.trim()) { setError("쿠폰 코드를 입력해주세요."); return; }
    setBusy(true);
    try {
      const result = await validateAdoptionCoupon(plant.id, couponCode);
      setValidatedCoupon({ code: result.coupon.code, discountAmount: result.discountAmount, amountDue: result.amountDue });
      setCouponCode(result.coupon.code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "쿠폰을 확인하지 못했어요.");
    } finally { setBusy(false); }
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!plant) return;
    if (amountDue > 0 && !depositorName.trim()) { setError("입금자명을 입력해주세요."); return; }
    setBusy(true);
    try {
      const result = await createAdoptionOrder({
        productId: plant.id,
        plantName,
        depositorName: depositorName.trim() || plantName,
        ...(validatedCoupon ? { couponCode: validatedCoupon.code } : {})
      });
      sessionStorage.setItem(`checkout-order:${plant.id}`, result.order._id);
      setOrder(result.order);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "주문을 접수하지 못했어요. 다시 시도해주세요.");
    } finally { setBusy(false); }
  }

  async function copyOrderNumber() {
    if (!order) return;
    try { await navigator.clipboard.writeText(order.orderNumber); } catch { /* manual copy remains possible */ }
  }

  async function cancelOrder() {
    if (!order || !plant || !confirm("이 대기 주문을 취소할까요?")) return;
    setBusy(true);
    setError("");
    try {
      const result = await cancelAdoptionOrder(order._id);
      setOrder(result.order);
      sessionStorage.removeItem(`checkout-order:${plant.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "주문을 취소하지 못했어요.");
    } finally { setBusy(false); }
  }

  if (!plant) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-5 bg-white px-6 text-center">
        <h1 className="text-lg font-bold text-gray-900">선택한 식물을 찾을 수 없어요.</h1>
        <button type="button" onClick={() => router.push("/market")} className="min-h-11 rounded-xl bg-[#6ea447] px-6 font-bold text-white">분양 목록으로 이동</button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white px-6 pb-24">
      <header className="flex items-center gap-2 py-5">
        <button type="button" aria-label="분양 목록으로 돌아가기" onClick={() => router.push("/market")} className="icon-button -ml-2 rounded-full text-gray-800 hover:bg-gray-100">
          <ChevronLeft size={26} />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900">분양 주문</h1>
      </header>

      {order ? (
        <div className="space-y-5">
          <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-xs font-black tracking-[.18em] text-emerald-700">ORDER RECEIVED</p>
            <h2 className="mt-2 text-2xl font-black text-gray-900">{order.status === "cancelled" ? "주문이 취소되었어요" : order.status === "confirmed" ? "분양이 확정되었어요" : "주문이 접수되었어요"}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-700">{order.status === "confirmed" ? "입금 확인이 완료되어 식물이 내 정원에 추가되었어요." : order.status === "cancelled" ? "취소된 주문은 다시 입금하지 마세요." : "입금 확인 후 식물이 내 정원에 추가됩니다. 확인 전에는 식물이 생성되지 않아요."}</p>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
              <div><span className="block text-xs text-gray-500">주문번호</span><strong className="mt-1 block text-lg tracking-wide text-gray-900">{order.orderNumber}</strong></div>
              <button type="button" onClick={copyOrderNumber} aria-label="주문번호 복사" className="grid h-11 w-11 place-items-center rounded-xl bg-gray-100 text-gray-700"><Clipboard size={18} /></button>
            </div>
          </section>
          {order.status !== "cancelled" && order.status !== "confirmed" && order.amountDue > 0 && order.depositDetails ? (
            <section className="rounded-3xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-extrabold text-gray-900">계좌이체 안내</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-gray-500">은행</dt><dd className="font-bold text-gray-900">{order.depositDetails.bankName}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">계좌번호</dt><dd className="font-bold text-gray-900">{order.depositDetails.accountNumber}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">예금주</dt><dd className="font-bold text-gray-900">{order.depositDetails.accountHolder}</dd></div>
                <div className="flex justify-between gap-4 border-t border-gray-100 pt-3"><dt className="font-bold text-gray-800">입금 금액</dt><dd className="text-lg font-black text-[#5b873a]">{order.amountDue.toLocaleString()}원</dd></div>
              </dl>
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">입금자명은 <b>{order.depositorName || depositorName}</b>으로 입력해주세요. 입금 확인 전까지 주문은 대기 상태입니다.</p>
            </section>
          ) : order.status !== "cancelled" && order.status !== "confirmed" ? (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-extrabold text-emerald-900">결제 금액 0원</h2><p className="mt-2 text-sm leading-6 text-emerald-900">쿠폰으로 전액 적용되었어요. 운영자가 주문을 확인한 뒤 식물이 정원에 추가됩니다.</p></section>
          ) : null}
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {order.status === "pending" && <button type="button" disabled={busy} onClick={cancelOrder} className="min-h-11 w-full rounded-xl border border-rose-200 font-bold text-rose-700 disabled:opacity-50">주문 취소</button>}
          {(order.status === "confirmed" || order.status === "cancelled") && <button type="button" onClick={() => { sessionStorage.removeItem(`checkout-order:${plant.id}`); setOrder(null); setError(""); }} className="min-h-11 w-full rounded-xl border border-gray-200 font-bold text-gray-700">새 주문 시작</button>}
          <button type="button" onClick={() => router.push("/home")} className="min-h-12 w-full rounded-2xl bg-[#6ea447] font-extrabold text-white">내 정원으로</button>
        </div>
      ) : <form onSubmit={submitOrder} className="space-y-5">
      <section className="flex items-center gap-4 rounded-3xl border border-gray-100 p-4 shadow-sm">
        <div className="relative h-20 w-20 shrink-0 rounded-2xl bg-gray-50">
          <Image src={plant.imageUrl} alt={plant.name} fill sizes="80px" className="object-contain p-2" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold text-gray-900">{plant.name}</h2>
          <p className="mt-1 truncate text-sm text-gray-600">{pendingPlantName || "우리집 " + plant.name}</p>
          <p className="mt-1 text-sm font-bold text-[#5b873a]">{plant.price.toLocaleString()}원</p>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-extrabold text-gray-900">주문 금액</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-gray-600">작물 분양</dt><dd className="font-semibold text-gray-900">{plant.price.toLocaleString()}원</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-gray-600">싹키워 이용권 1개월</dt><dd className="font-semibold text-gray-900">{PASS_PRICE.toLocaleString()}원</dd></div>
          <div className="flex justify-between gap-3 border-t border-gray-100 pt-3"><dt className="font-bold text-gray-900">소계</dt><dd className="font-bold text-gray-900">{subtotal.toLocaleString()}원</dd></div>
          {validatedCoupon && <div className="flex justify-between gap-3 text-emerald-700"><dt>쿠폰 할인 ({validatedCoupon.code})</dt><dd className="font-bold">−{validatedCoupon.discountAmount.toLocaleString()}원</dd></div>}
          <div className="flex justify-between gap-3 border-t border-gray-100 pt-3"><dt className="font-bold text-gray-900">결제 예정 금액</dt><dd className="text-lg font-extrabold text-[#5b873a]">{amountDue.toLocaleString()}원</dd></div>
        </dl>
      </section>

      <section className="rounded-3xl border border-gray-100 p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-extrabold text-gray-900"><TicketCheck size={18} />쿠폰 적용</h2>
        {coupons.length > 0 && <select aria-label="보유 쿠폰 선택" value={selectedCoupon?.code ?? ""} onChange={(event) => { setCouponCode(event.target.value); setValidatedCoupon(null); setError(""); }} className="mt-4 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800"><option value="">쿠폰 선택</option>{coupons.map((coupon) => <option key={coupon.code} value={coupon.code}>{coupon.code} · {coupon.discountType === "percent" ? `${coupon.discountValue}%` : `${coupon.discountValue.toLocaleString()}원`} 할인</option>)}</select>}
        <div className="mt-3 flex gap-2"><input aria-label="쿠폰 코드" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setValidatedCoupon(null); }} placeholder="쿠폰 코드 입력" maxLength={32} className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 text-sm uppercase text-gray-900" /><button type="button" disabled={busy} onClick={applyCoupon} className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white disabled:opacity-50">적용</button></div>
        {validatedCoupon && <p className="mt-3 text-sm font-semibold text-emerald-700" role="status">쿠폰이 적용되었습니다.</p>}
      </section>

      {amountDue > 0 && <section className="rounded-3xl border border-gray-100 p-5 shadow-sm"><h2 className="font-extrabold text-gray-900">입금 정보</h2><label htmlFor="depositorName" className="mt-4 block text-sm font-semibold text-gray-700">입금자명</label><input id="depositorName" autoComplete="name" required value={depositorName} onChange={(event) => setDepositorName(event.target.value)} maxLength={80} className="mt-2 min-h-12 w-full rounded-xl border border-gray-200 px-3 text-gray-900" placeholder="실제 입금자 이름" /><p className="mt-2 text-xs leading-5 text-gray-500">주문 접수 후 계좌 정보가 표시됩니다. 주문 접수만으로 결제가 확정되거나 식물이 생성되지는 않습니다.</p></section>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm leading-5 text-rose-800">{error}</p>}
      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-2xl bg-[#6ea447] font-extrabold text-white disabled:opacity-50">{busy ? "주문 처리 중…" : "계좌이체 주문 접수"}</button>
      <p className="text-center text-xs leading-5 text-gray-500">주문 접수 후 관리자가 입금을 확인해야 분양이 확정됩니다.</p>
      </form>}
    </div>
  );
}
