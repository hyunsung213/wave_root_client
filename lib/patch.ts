import { api } from "./api";
import type { Plant } from "@/store/useStore";

// 1. 알림 읽음 처리
export async function readNotification(notificationId: string) {
  const res = await api.patch(`/api/web/notifications/${notificationId}/read`);
  return res.data;
}

// 2. 비밀번호 변경
export async function updatePassword(data: { currentPwd: string; newPwd: string }) {
  const res = await api.patch("/api/web/users/password", data);
  return res.data;
}

// 3. 식물 정보 수정 (이름 등)
export async function updatePlant(plantId: string, data: Partial<Pick<Plant, "name" | "type">>) {
  const res = await api.patch(`/api/web/plants/${plantId}`, data);
  return res.data;
}
