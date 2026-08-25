import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\s+#.*$/, "");
  }
  return out;
}

const e = loadEnvFile(resolve(root, "../../w-cartstore-web/e-commerce-website/.env"));
const secret = e.REVALIDATE_SECRET;
if (!secret) {
  console.error("Missing REVALIDATE_SECRET in storefront .env");
  process.exit(1);
}

const res = await fetch("https://www.simplecartstore.com/api/revalidate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-revalidate-secret": secret,
  },
  body: JSON.stringify({ all: true, tag: "products" }),
});

const text = await res.text();
console.log(res.status, text);
