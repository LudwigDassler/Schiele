import { NextResponse } from "next/server";
import type { Photo } from "./types";

// Standard JSON error response. `extra` lets callers keep the empty payload
// fields they return alongside the error (e.g. `{ photos: [] }`).
export function errorResponse(
  message: string,
  status = 500,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json({ ...extra, error: message }, { status });
}

// Deterministic avatar/placeholder image for entities without a real image.
export function avatarUrl(name: string, size?: number) {
  const sizeParam = size ? `&size=${size}` : "";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=c0521a&color=fff${sizeParam}`;
}

// In-place Fisher-Yates shuffle.
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Drop entries without a valid http(s) `src` and de-duplicate by `src`.
export function dedupeBySrc(photos: Photo[]): Photo[] {
  const seen = new Set<string>();
  return photos.filter((p) => {
    if (!p?.src || !p.src.startsWith("http")) return false;
    if (seen.has(p.src)) return false;
    seen.add(p.src);
    return true;
  });
}
