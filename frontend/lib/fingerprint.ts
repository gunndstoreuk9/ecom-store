"use client";

const DEVICE_ID_STORAGE = "tawazon_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(DEVICE_ID_STORAGE, generated);
  return generated;
}

export function getBrowserFingerprint(): string {
  if (typeof window === "undefined") return "";
  const nav = window.navigator;
  const parts = [
    nav.userAgent,
    nav.language,
    nav.platform,
    String(nav.hardwareConcurrency || ""),
    String(nav.maxTouchPoints || ""),
    `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  return fnv1a(parts.join("|"));
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
