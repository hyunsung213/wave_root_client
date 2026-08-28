export interface PlantInfo {
  id: string;
  name: string;
  imageUrl: string;
  growthPeriod: string;
  timeToHarvest: number; // D-day 계산을 위한 파종 후 수확까지 예상 일수
  optimalTemperature: string;
  wateringCycle: string;
  characteristics: string;
  price: number;
}

export const plantsData: PlantInfo[] = [
  {
    id: "basil",
    name: "바질",
    imageUrl: "/plants/basil.png",
    growthPeriod: "1년생",
    timeToHarvest: 75,
    optimalTemperature: "20~25°C",
    wateringCycle: "겉흙이 1~2cm 깊이까지 말랐을 때 듬뿍 관수 (보통 주 2~3회)",
    characteristics: "햇빛을 매우 좋아하며 추위에 약해 서리를 맞으면 금방 시듭니다. 특유의 향이 강해 잎을 뜯어 이탈리아 요리나 페스토 등에 주로 사용합니다.",
    price: 5000,
  },
  {
    id: "lettuce",
    name: "상추",
    imageUrl: "/plants/lettuce.png",
    growthPeriod: "1~2년생 (보통 당해 재배 후 마무리)",
    timeToHarvest: 45,
    optimalTemperature: "15~20°C",
    wateringCycle: "수분 요구량이 많으므로 겉흙이 마르기 전에 충분히 관수 (보통 주 3~4회)",
    characteristics: "서늘한 기후에서 잘 자라며, 기온이 높아지면 잎이 억세지고 꽃대가 빨리 올라옵니다. 생명력이 강해 초보자가 베란다에서 키우기 아주 좋습니다.",
    price: 3000,
  },
  {
    id: "romaine",
    name: "로메인",
    imageUrl: "/plants/romaine.png",
    growthPeriod: "1~2년생 (보통 당해 재배 후 마무리)",
    timeToHarvest: 68,
    optimalTemperature: "15~20°C",
    wateringCycle: "겉흙이 완전히 마르면 화분 밑으로 물이 빠져나올 만큼 충분히 관수",
    characteristics: "상추의 한 종류지만 잎이 더 두껍고 위로 길게 자랍니다. 일반 상추보다 쓴맛이 덜하고 아삭한 식감과 단맛이 있어 시저 샐러드 등에 널리 쓰입니다.",
    price: 4000,
  },
  {
    id: "tomato",
    name: "토마토",
    imageUrl: "/plants/tomato.png",
    growthPeriod: "1년생 (원래 다년생이나 기후 특성상 1년생으로 재배)",
    timeToHarvest: 80,
    optimalTemperature: "주간 25~30°C, 야간 15~17°C",
    wateringCycle: "겉흙이 깊게 말랐을 때 듬뿍 관수 (물이 부족하면 열매가 갈라질 수 있으므로 개화기 이후엔 수분을 일정하게 유지)",
    characteristics: "햇빛을 매우 많이 필요로 하는 작물입니다. 키가 크고 열매가 무거워지므로 지주대를 세워 묶어주어야 하며, 원줄기가 잘 자라도록 곁순을 꼼꼼히 제거해 주어야 합니다.",
    price: 6000,
  },
  {
    id: "pepper",
    name: "고추",
    imageUrl: "/plants/chiliPepper.png",
    growthPeriod: "1년생 (열대 기후에서는 다년생이나 국내 기후 특성상 1년생으로 재배)",
    timeToHarvest: 80,
    optimalTemperature: "주간 25~30°C, 야간 18~20°C",
    wateringCycle: "겉흙이 깊게 말랐을 때 듬뿍 관수 (과습에 매우 취약하므로 배수가 잘 되는 환경을 만들어주는 것이 가장 중요)",
    characteristics: "햇빛을 아주 좋아하는 고온성 작물입니다. 비바람이나 열매의 무게에 줄기가 꺾이지 않도록 지주대를 튼튼하게 세워주어야 합니다. 또한, 영양분이 분산되지 않도록 줄기가 처음 갈라지는 곳(방아다리)에 맺힌 첫 꽃과 그 아래의 곁순들을 모두 제거해 주는 것이 좋습니다.",
    price: 5000,
  }
];
