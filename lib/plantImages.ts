const PLANT_IMAGES: Record<string, string> = {
  basil: "/plants/basil.png",
  lettuce: "/plants/lettuce.png",
  romaine: "/plants/romaine.png",
  tomato: "/plants/tomato.png",
  pepper: "/plants/chiliPepper.png",
  arugula: "/plants/arugula.png",
  green_oakleaf_lettuce: "/plants/green-oakleaf-lettuce.png",
  marigold: "/plants/marigold.png",
  butterhead: "/plants/butterhead.png",
  nasturtium: "/plants/nasturtium.png",
  tatsoi: "/plants/tatsoi.png",
};

const PLANT_ALIASES: Record<string, keyof typeof PLANT_IMAGES> = {
  "바질": "basil",
  "상추": "lettuce",
  "로메인": "romaine",
  "토마토": "tomato",
  "고추": "pepper",
  "chili_pepper": "pepper",
  "루꼴라": "arugula",
  "청오크": "green_oakleaf_lettuce",
  "청오크상추": "green_oakleaf_lettuce",
  "청오크_상추": "green_oakleaf_lettuce",
  "green_oakleaf": "green_oakleaf_lettuce",
  "메리골드": "marigold",
  "버터헤드": "butterhead",
  "버터헤드상추": "butterhead",
  "버터헤드_상추": "butterhead",
  "한련화": "nasturtium",
  "다채": "tatsoi",
};

const PLANT_ALIAS_ENTRIES = Object.entries(PLANT_ALIASES).sort(
  ([firstAlias], [secondAlias]) => secondAlias.length - firstAlias.length,
);

export function getPlantImage(type = "") {
  const normalized = type.trim().toLocaleLowerCase().replace(/[\s-]+/g, "_");
  if (Object.hasOwn(PLANT_IMAGES, normalized)) return PLANT_IMAGES[normalized];

  if (Object.hasOwn(PLANT_ALIASES, normalized)) {
    return PLANT_IMAGES[PLANT_ALIASES[normalized]];
  }

  const match = Object.entries(PLANT_IMAGES).find(([id]) => normalized.includes(id));
  if (match) return match[1];

  const aliasMatch = PLANT_ALIAS_ENTRIES.find(([alias]) => normalized.includes(alias));
  if (aliasMatch) return PLANT_IMAGES[aliasMatch[1]];

  return PLANT_IMAGES.tomato;
}
