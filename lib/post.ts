import { api } from "./api";
import type { Plant, User } from "@/store/useStore";

interface ApiResult {
  success: boolean;
  message?: string;
}

interface LoginResult extends ApiResult {
  accessToken?: string;
  user?: User;
}

// 1. 인증
export async function signup(data: { email: string; phone: string; pwd: string; name: string }): Promise<ApiResult> {
  const res = await api.post<ApiResult>("/api/web/users/signup", data);
  return res.data;
}

export async function login(data: { email: string; pwd: string }): Promise<LoginResult> {
  const res = await api.post<LoginResult>("/api/web/users/login", data);
  return res.data;
}

// 2. 식물
export async function createPlant(data: { name: string; type: string }): Promise<ApiResult & { plant?: Plant }> {
  const res = await api.post<ApiResult & { plant?: Plant }>("/api/web/plants", data);
  return res.data;
}

export interface CheckoutOrder {
  _id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  plantName: string;
  depositorName: string;
  subtotal: number;
  discountAmount: number;
  amountDue: number;
  couponCode?: string | null;
  couponName?: string | null;
  depositDetails?: { bankName: string | null; accountNumber: string | null; accountHolder: string | null };
  status: "pending" | "confirming" | "confirmed" | "cancelled";
}

export async function createAdoptionOrder(data: {
  productId: string;
  plantName: string;
  depositorName: string;
  couponCode?: string;
}) {
  const res = await api.post<{ success: boolean; order: CheckoutOrder }>("/api/web/orders", data);
  return res.data;
}

export async function validateAdoptionCoupon(productId: string, code: string) {
  const res = await api.post<{
    success: boolean;
    coupon: { code: string; name?: string | null; discountType: "percent" | "fixed"; discountValue: number };
    subtotal: number;
    discountAmount: number;
    amountDue: number;
  }>("/api/web/coupons/validate", { productId, code });
  return res.data;
}

export async function cancelAdoptionOrder(orderId: string) {
  const res = await api.post<{ success: boolean; order: CheckoutOrder }>(`/api/web/orders/${encodeURIComponent(orderId)}/cancel`);
  return res.data;
}

// 3. 성장 이벤트
export async function createEvent(formData: FormData) {
  const res = await api.post("/api/web/events", formData, {
    headers: {
      "Content-Type": "multipart/form-data", // 브라우저 환경에서는 생략 가능하지만 명시
    },
  });
  return res.data;
}

// 4. 수확 카운트
export async function harvestPlant(plantId: string) {
  const res = await api.post("/api/web/activity/harvest", { plantId });
  return res.data;
}

// 6. 알림 생성
export async function createNotification(data: Record<string, unknown>) {
  const res = await api.post("/api/web/notifications", data);
  return res.data;
}
