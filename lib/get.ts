import { api } from "./api";

export type CatalogStatus = "available" | "blocked" | "upcoming";
export interface CatalogProduct {
  id: string;
  name: string;
  price: number | null;
  growthTargetDays: number | null;
  status: CatalogStatus;
}

export type FarmSiteCode = "HYDROPONIC" | "Y_FARM";
export interface FarmSite {
  code: FarmSiteCode;
  name: string;
  streamingGateway: "RDK_X5" | "RASPBERRY_PI";
  capabilities: { streaming: boolean; irrigation: boolean };
}

export async function getSites() {
  const res = await api.get<{ success: boolean; sites: FarmSite[] }>("/api/web/sites");
  return res.data;
}

export async function getCatalog(siteCode: FarmSiteCode = "HYDROPONIC") {
  const res = await api.get<{ success: boolean; products: CatalogProduct[] }>("/api/web/catalog", { params: { siteCode } });
  return res.data;
}

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
export async function getNotifications(page = 1, limit = 30, unreadOnly = false, includeSensor = false) {
  const res = await api.get("/api/web/notifications", { params: { page, limit, unreadOnly, includeSensor } });
  return res.data;
}

export interface AvailableCoupon {
  code: string;
  name?: string | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  expiresAt: string | null;
}

export async function getMyCoupons() {
  const res = await api.get<{ success: boolean; coupons: AvailableCoupon[] }>("/api/web/coupons");
  return res.data;
}

export async function getMyOrder(orderId: string) {
  const res = await api.get(`/api/web/orders/${encodeURIComponent(orderId)}`);
  return res.data;
}

export interface PlantSensor {
  degree: number;
  moisture_air: number;
  moisture_soil: number;
  rux: number | null;
  sampledAt?: string;
  sensorScope?: string;
}
