import { supabase } from "@/integrations/supabase/client";

const MAX_DIMENSION = 1200;
const MAX_BYTES = 200 * 1024;
const QUALITY_STEPS = [0.8, 0.75, 0.7, 0.65, 0.55];

export type OptimizedImage = {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load the image"));
    img.src = src;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to convert to WebP"))),
      "image/webp",
      quality,
    );
  });
}

/**
 * Optimizes the image in the browser:
 *  - Resizes to max 1200px width/height while keeping the aspect ratio.
 *  - Converts to WebP format.
 *  - Iteratively reduces quality until the size is ≤ 200 KB (or the 0.55 threshold is reached).
 */
export async function optimizeImage(source: Blob | File): Promise<OptimizedImage> {
  const objectUrl = URL.createObjectURL(source);
  try {
    const img = await loadImage(objectUrl);
    let targetW = img.naturalWidth;
    let targetH = img.naturalHeight;
    if (targetW <= 0 || targetH <= 0) {
      throw new Error("Invalid image");
    }
    const largest = Math.max(targetW, targetH);
    if (largest > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / largest;
      targetW = Math.round(targetW * scale);
      targetH = Math.round(targetH * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas kontekstas nepasiekiamas");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetW, targetH);

    let best: Blob | null = null;
    for (const q of QUALITY_STEPS) {
      const blob = await canvasToWebp(canvas, q);
      best = blob;
      if (blob.size <= MAX_BYTES) break;
    }
    if (!best) throw new Error("WebP konvertavimas nepavyko");
    return { blob: best, width: targetW, height: targetH, bytes: best.size };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Uploads an optimized WebP to the `car-images` bucket and returns the public URL. */
export async function uploadOptimizedToStorage(
  source: Blob | File,
  folder: string,
): Promise<{ url: string; path: string; width: number; height: number; bytes: number }> {
  const optimized = await optimizeImage(source);
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";
  const path = `${safeFolder}/${uuid}.webp`;

  const { error } = await supabase.storage.from("property-images").upload(path, optimized.blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("property-images").getPublicUrl(path);
  return {
    url: data.publicUrl,
    path,
    width: optimized.width,
    height: optimized.height,
    bytes: optimized.bytes,
  };
}

/** Attempts to extract the storage path from a public URL. If not from this bucket — returns null. */
export function extractCarImagesPath(url: string): string | null {
  const marker = "/storage/v1/object/public/car-images/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function removeFromStorage(url: string): Promise<void> {
  const path = extractCarImagesPath(url);
  if (!path) return;
  await supabase.storage.from("property-images").remove([path]);
}
