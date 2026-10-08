import { api } from "./api";

// 1. 식물 파양 (성장 기록도 함께 삭제됨)
export async function deletePlant(plantId: string) {
  const res = await api.delete(`/api/web/plants/${plantId}`);
  return res.data;
}
