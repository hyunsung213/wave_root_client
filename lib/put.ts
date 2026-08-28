import { api } from "./api";

// 1. 식물 정보 수정 (이름 등)
export async function updatePlant(plantId: string, data: any) {
  const res = await api.put(`/api/web/plants/${plantId}`, data);
  return res.data;
}
