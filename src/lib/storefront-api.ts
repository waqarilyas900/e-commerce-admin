/**
 * Public storefront origin (Next.js site) for admin → store API calls (e.g. newsletter send).
 * Example dev: http://localhost:3000
 * Production: https://your-store.com
 */
export function getStorefrontOrigin(): string {
  const raw = import.meta.env.VITE_STOREFRONT_ORIGIN?.trim();
  if (!raw) {
    throw new Error(
      "Missing VITE_STOREFRONT_ORIGIN. Set it to your storefront base URL (no trailing slash), e.g. http://localhost:3000",
    );
  }
  return raw.replace(/\/$/, "");
}
