import type { NextConfig } from "next";

const apiImageOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000");
const publicImageOrigin = new URL(process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? apiImageOrigin.href);
const imageOrigins = Array.from(new Map([apiImageOrigin, publicImageOrigin].map((url) => [url.origin, url])).values());

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: imageOrigins.map((url) => ({
      protocol: url.protocol.slice(0, -1) as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    })),
  },
};

export default nextConfig;
