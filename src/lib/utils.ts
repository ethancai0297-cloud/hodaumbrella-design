import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a theme color token (e.g. "--highlight") to a literal hsl() color.
 * Use it for SVG that may be serialized into textures or files, where
 * var(--token) would no longer resolve.
 */
export function themeColor(token: string, alpha = 1): string {
  if (typeof document === "undefined") return "currentColor";
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value ? `hsl(${value} / ${alpha})` : "currentColor";
}
