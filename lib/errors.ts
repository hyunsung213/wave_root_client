import axios from "axios";

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  return fallback;
}
