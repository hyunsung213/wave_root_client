import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "싹키워",
    short_name: "싹키워",
    description: "스마트 식물 재배 앱",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6ea447",
    icons: [{ src: "/images/logo_ssakiwoe.png", sizes: "any", type: "image/png" }],
  };
}
