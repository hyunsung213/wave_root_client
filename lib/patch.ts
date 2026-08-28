import { api } from "./api";

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
