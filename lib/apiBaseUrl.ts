const developmentApiBaseUrl = "http://localhost:5000";
const productionApiBaseUrl = "https://wave-root-backend.onrender.com";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const configuredLoopbackUrl = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(
  configuredApiBaseUrl ?? "",
);

// NEXT_PUBLIC values are baked into the client bundle at build time. Keep the
// local default for development, but never ship a loopback API URL to users.
export const apiBaseUrl = (
  process.env.NODE_ENV === "production" && (!configuredApiBaseUrl || configuredLoopbackUrl)
    ? productionApiBaseUrl
    : configuredApiBaseUrl || developmentApiBaseUrl
).replace(/\/+$/, "");
