import { api } from "./api";

// 1. 인증
export async function signup(data: any) {
  const res = await api.post("/api/web/users/signup", data);
  return res.data;
}

export async function login(data: any) {
  const res = await api.post("/api/web/users/login", data);
  return res.data;
}

// 2. 식물
export async function createPlant(data: any) {
  const res = await api.post("/api/web/plants", data);
  return res.data;
}

// 3. 성장 이벤트
export async function createEvent(formData: FormData) {
  const res = await api.post("/api/web/events", formData, {
    headers: {
      "Content-Type": "multipart/form-data", // 브라우저 환경에서는 생략 가능하지만 명시
    },
  });
  console.log(formData)
  return res.data;
}

// 4. 제어 (급수)
export async function waterPlant(plantId: string, volume: number) {
  const res = await api.post("/api/web/control/water", { plantId, volume });
  return res.data;
}

// 5. 수확 카운트
export async function harvestPlant(plantId: string) {
  const res = await api.post("/api/web/activity/harvest", { plantId });
  return res.data;
}

// 6. 알림 생성
export async function createNotification(data: any) {
  const res = await api.post("/api/web/notifications", data);
  return res.data;
}
