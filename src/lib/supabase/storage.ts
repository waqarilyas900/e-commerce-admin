import { supabase } from "@/lib/supabase/client";

/** Store media bucket used by the storefront (see storefront storage setup). */
export const ECOMMERCE_STORAGE_BUCKET = "e-commerce-store";

const COLLECTION_HERO_PREFIX = "collections/hero";
const PRODUCT_MEDIA_PREFIX = "products/media";
const COLOR_SWATCH_PREFIX = "colors/swatches";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 80 * 1024 * 1024;

const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}

function extFromFileName(name: string): string | null {
  const p = name.split(".").pop();
  if (p && /^[a-z0-9]+$/i.test(p)) return p.toLowerCase().slice(0, 8);
  return null;
}

/**
 * Upload a collection hero image; returns the public URL for `collections.hero_image`.
 */
export async function uploadCollectionHeroImage(
  file: File,
): Promise<{ publicUrl: string } | { error: string }> {
  if (!supabase) {
    return { error: "Database connection is not configured." };
  }
  if (!ALLOWED_IMAGE.has(file.type)) {
    return { error: "Use a JPEG, PNG, WebP, GIF, or SVG image." };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { error: "Image must be 5 MB or smaller." };
  }

  const ext = extFromFileName(file.name) ?? extFromMime(file.type);
  const path = `${COLLECTION_HERO_PREFIX}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(ECOMMERCE_STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (upErr) {
    return { error: upErr.message };
  }

  const { data } = supabase.storage.from(ECOMMERCE_STORAGE_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}

/**
 * Upload a product gallery image or video; returns public URL and kind.
 */
export async function uploadProductMedia(
  file: File,
): Promise<{ publicUrl: string; kind: "image" | "video" } | { error: string }> {
  if (!supabase) {
    return { error: "Database connection is not configured." };
  }
  const isVideo = file.type.startsWith("video/");
  const isImage = ALLOWED_IMAGE.has(file.type);
  if (!isVideo && !isImage) {
    return { error: "Use an image (JPEG, PNG, WebP, GIF, SVG) or video (MP4, WebM, MOV)." };
  }
  const max = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > max) {
    return {
      error: isVideo ? "Video must be 80 MB or smaller." : "Image must be 5 MB or smaller.",
    };
  }
  const kind: "image" | "video" = isVideo ? "video" : "image";
  const ext = extFromFileName(file.name) ?? extFromMime(file.type);
  const path = `${PRODUCT_MEDIA_PREFIX}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(ECOMMERCE_STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
    });

  if (upErr) {
    return { error: upErr.message };
  }

  const { data } = supabase.storage.from(ECOMMERCE_STORAGE_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, kind };
}

const SWATCH_MAX_BYTES = 2 * 1024 * 1024;

/** Small square image for color swatches (patterns / textures). */
export async function uploadColorSwatch(
  file: File,
): Promise<{ publicUrl: string } | { error: string }> {
  if (!supabase) {
    return { error: "Database connection is not configured." };
  }
  if (!ALLOWED_IMAGE.has(file.type)) {
    return { error: "Use a JPEG, PNG, WebP, GIF, or SVG for the swatch image." };
  }
  if (file.size > SWATCH_MAX_BYTES) {
    return { error: "Swatch image must be 2 MB or smaller." };
  }
  const ext = extFromFileName(file.name) ?? extFromMime(file.type);
  const path = `${COLOR_SWATCH_PREFIX}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(ECOMMERCE_STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (upErr) {
    return { error: upErr.message };
  }
  const { data } = supabase.storage.from(ECOMMERCE_STORAGE_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}
