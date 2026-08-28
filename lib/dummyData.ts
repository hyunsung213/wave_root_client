// 🔴 백엔드 없이 프론트엔드 개발을 위해 임시로 생성된 더미 데이터 파일입니다.
// 나중에 백엔드 연동 시 이 파일을 통째로 삭제하시면 됩니다.

export const dummyState = {
  users: [
    { id: "u1", email: "test@test.com", pwd: "password", name: "테스터", phone: "010-1234-5678" }
  ],
  plants: [
    { _id: "p1", name: "내 첫 방울이", type: "방울 토마토", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },
    { _id: "p2", name: "향긋한 바질이", type: "바질", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
  ],
  waterHistory: {
    "p1": [
      { duration_ms: 3000, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString() },
      { duration_ms: 2000, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() }
    ],
    "p2": []
  },
  sensors: {
    "p1": { degree: 24.5, moisture_air: 45.2, moisture_soil: 35.0, lux: 800 },
    "p2": { degree: 25.1, moisture_air: 43.1, moisture_soil: 60.5, lux: 750 }
  }
};

export const handleDummyRequest = async (config: any) => {
  const { url, method, data } = config;
  const parsedData = typeof data === "string" ? JSON.parse(data) : (data || {});
  const methodLower = method?.toLowerCase();

  // 1. GET /api/web/plants
  if (methodLower === "get" && url === "/api/web/plants") {
    return { success: true, plants: dummyState.plants };
  }

  // 2. GET /api/web/plants/:plantId/current
  const currentSensorMatch = url?.match(/\/api\/web\/plants\/(.+)\/current/);
  if (methodLower === "get" && currentSensorMatch) {
    const plantId = currentSensorMatch[1];
    return { 
      success: true, 
      sensor: (dummyState.sensors as any)[plantId] || { degree: 22, moisture_air: 40, moisture_soil: 50, lux: 500 } 
    };
  }

  // 3. POST /api/web/plants (Adopt)
  if (methodLower === "post" && url === "/api/web/plants") {
    const newPlant = {
      _id: `p${Date.now()}`,
      name: parsedData.name,
      type: parsedData.type,
      createdAt: new Date().toISOString()
    };
    dummyState.plants.push(newPlant);
    return { success: true, plant: newPlant };
  }

  // 4. POST /api/web/control/water
  if (methodLower === "post" && url === "/api/web/control/water") {
    const { plantId, duration_ms } = parsedData;
    if (!(dummyState.waterHistory as any)[plantId]) {
      (dummyState.waterHistory as any)[plantId] = [];
    }
    (dummyState.waterHistory as any)[plantId].unshift({
      duration_ms,
      timestamp: new Date().toISOString()
    });
    
    // 물을 주면 토양 수분을 올려줍니다. (재미 요소)
    if ((dummyState.sensors as any)[plantId]) {
       (dummyState.sensors as any)[plantId].moisture_soil = Math.min(100, (dummyState.sensors as any)[plantId].moisture_soil + 30);
    }
    
    return { success: true };
  }

  // 5. POST /api/web/users/login
  if (methodLower === "post" && url === "/api/web/users/login") {
    const { email, pwd } = parsedData;
    const user = dummyState.users.find(u => u.email === email && u.pwd === pwd);
    if (user) {
      return { success: true, accessToken: "dummy_token_123", user: { id: user.id, name: user.name, email: user.email } };
    }
    return { success: false, message: "이메일 또는 비밀번호가 틀렸습니다. (테스트 계정: test@test.com / password)" };
  }

  // 6. POST /api/web/users/signup
  if (methodLower === "post" && url === "/api/web/users/signup") {
    const { email, phone, pwd, name } = parsedData;
    if (dummyState.users.find(u => u.email === email)) {
      return { success: false, message: "이미 존재하는 이메일입니다." };
    }
    dummyState.users.push({ id: `u${Date.now()}`, email, phone, pwd, name });
    return { success: true };
  }

  // 7. GET /api/web/water/:plantId
  const waterHistoryMatch = url?.match(/\/api\/web\/water\/(.+)/);
  if (methodLower === "get" && waterHistoryMatch && !url?.includes("/current")) {
    const plantId = waterHistoryMatch[1];
    return { success: true, history: (dummyState.waterHistory as any)[plantId] || [] };
  }

  // 매칭되지 않는 경우 null 반환 (실제 API 호출로 넘김)
  return null;
};
