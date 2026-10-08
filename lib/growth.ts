// 평균 재배기간 2달 기준으로 성장률/수확일을 계산한다.
export const HARVEST_DAYS = 60;

const DAY_MS = 1000 * 60 * 60 * 24;

export function formatDate(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${mm}.${dd}`;
}

export function getGrowth(createdAt?: string) {
  const startDate = createdAt ? new Date(createdAt) : new Date();
  const elapsed = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / DAY_MS));
  const remaining = Math.max(0, HARVEST_DAYS - elapsed);
  const percent = Math.min(100, Math.round((elapsed / HARVEST_DAYS) * 100));
  const harvestDate = new Date(startDate.getTime() + HARVEST_DAYS * DAY_MS);

  return { startDate, harvestDate, elapsed, remaining, percent };
}
