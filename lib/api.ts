import axios from "axios";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});



api.interceptors.request.use(
  (config) => {
    // 클라이언트 환경일 때만 localStorage에 접근
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

