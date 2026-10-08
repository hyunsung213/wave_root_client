import { api } from "./api";

// 1. 공통 & 사용자
export async function checkHealth() {
  const res = await api.get("/health");
  return res.data;
}

export async function getUserMe() {
  const res = await api.get("/api/web/users/me");
  return res.data;
}

// 2. 식물
export async function getPlants() {
  const res = await api.get("/api/web/plants");
  return res.data;
}

export async function getPlantsWithRecords() {
  const res = await api.get("/api/web/plants/with-records");
  return res.data;
}

export async function getPlantById(plantId: string) {
  const res = await api.get(`/api/web/plants/${plantId}`);
  return res.data;
}

// 3. 센서
export async function getPlantCurrent(plantId: string) {
  const res = await api.get(`/api/web/plants/${plantId}/current`);
  return res.data;
}

export async function getSensorLogs(plantId: string, page = 1, limit = 30) {
  const res = await api.get(`/api/web/logs/${plantId}`, { params: { page, limit } });
  return res.data;
}

// 4. 성장 타임라인
export async function getEvents(plantId: string, page = 1, limit = 30, order = 'desc') {
  const res = await api.get(`/api/web/events/${plantId}`, { params: { page, limit, order } });
  return res.data;
}

// 5. 활동 카운터
export async function getActivity() {
  const res = await api.get("/api/web/activity");
  return res.data;
}

// 7. 알림
export async function getNotifications(page = 1, limit = 30, unreadOnly = false) {
  const res = await api.get("/api/web/notifications", { params: { page, limit, unreadOnly } });
  return res.data;
}
