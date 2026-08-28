import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  _id: string;
  email: string;
  phone?: string;
  isSocial?: boolean;
  createdAt?: string;
  name?: string; // 옵션
  level?: number; // 옵션
}

export interface Plant {
  _id: string;
  userId?: string;
  name: string;
  type: string;
  createdAt?: string;
  growthRate?: number; // 클라이언트 전용 또는 이후 추가될 수 있음
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  myPlants: Plant[];
  setMyPlants: (plants: Plant[]) => void;
  selectedPlantId: string | null;
  setSelectedPlantId: (id: string | null) => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      accessToken: null,
      setAccessToken: (token) => set({ accessToken: token }),
      myPlants: [],
      setMyPlants: (plants) => set({ myPlants: plants }),
      selectedPlantId: null,
      setSelectedPlantId: (id) => set({ selectedPlantId: id }),
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        set({ user: null, accessToken: null, myPlants: [], selectedPlantId: null });
      },
    }),
    {
      name: "sprout-store",
    }
  )
);
