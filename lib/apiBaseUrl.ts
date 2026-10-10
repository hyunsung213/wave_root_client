const developmentApiBaseUrl = "http://localhost:5000";
const productionApiBaseUrl = "https://wave-root-backend.onrender.com";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

// Production always targets the verified Render service so an unset or stale
// Vercel env value cannot send browsers to localhost or an obsolete backend.
// Local development may still point at a developer-provided API origin.
export const apiBaseUrl = (
  process.env.NODE_ENV === "production"
    ? productionApiBaseUrl
    : configuredApiBaseUrl || developmentApiBaseUrl
).replace(/\/+$/, "");
