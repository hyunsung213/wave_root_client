"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { plantsData } from "@/lib/plantsData";
import { useStore } from "@/store/useStore";

const PASS_PRICE = 3900;

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const plant = plantsData.find((item) => item.id === params.plantId);
  const pendingPlantName = useStore((state) => state.pendingPlantName);

  if (!plant) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-5 bg-white px-6 text-center">
        <h1 className="text-lg font-bold text-gray-900">선택한 식물을 찾을 수 없어요.</h1>
        <button type="button" onClick={() => router.push("/market")} className="min-h-11 rounded-xl bg-[#6ea447] px-6 font-bold text-white">분양 목록으로 이동</button>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-white px-6 pb-24">
      <header className="flex items-center gap-2 py-5">
        <button type="button" aria-label="분양 목록으로 돌아가기" onClick={() => router.push("/market")} className="icon-button -ml-2 rounded-full text-gray-800 hover:bg-gray-100">
          <ChevronLeft size={26} />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900">상품 확인</h1>
      </header>

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
        <h2 className="font-extrabold text-gray-900">표시 금액</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-gray-600">작물</dt><dd className="font-semibold text-gray-900">{plant.price.toLocaleString()}원</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-gray-600">싹키워 이용권 1개월</dt><dd className="font-semibold text-gray-900">{PASS_PRICE.toLocaleString()}원</dd></div>
          <div className="flex justify-between gap-3 border-t border-gray-100 pt-3"><dt className="font-bold text-gray-900">안내 금액</dt><dd className="font-extrabold text-[#5b873a]">{(plant.price + PASS_PRICE).toLocaleString()}원</dd></div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">표시된 금액은 상품 안내용이며 결제 요청이 접수되지 않습니다.</p>
      </section>

      <section role="status" className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-extrabold text-amber-900">현재 결제를 진행할 수 없어요</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">주문과 입금 확인 기능을 준비하고 있습니다. 이 화면에서 입금하거나 주문해도 분양이 접수되지 않으니 결제하지 마세요.</p>
      </section>

      <button type="button" onClick={() => router.push("/market")} className="mt-6 min-h-12 w-full rounded-2xl bg-[#6ea447] font-extrabold text-white">다른 식물 둘러보기</button>
    </main>
  );
}
