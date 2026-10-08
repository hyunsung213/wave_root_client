export function soilMoisturePercent(value: unknown): number | null {
  if ((typeof value !== "number" && typeof value !== "string") || value === "") return null;
  const reading = Number(value);
  if (!Number.isFinite(reading) || reading < 0) return null;
  if (reading <= 100) return reading;
  return Math.max(0, Math.min(100, ((2800 - reading) / (2800 - 950)) * 100));
}
