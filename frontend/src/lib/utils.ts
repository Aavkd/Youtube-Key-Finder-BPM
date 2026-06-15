import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui class-name helper: merge conditional + Tailwind classes. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Decode HTML entities from API-provided labels before rendering them. */
export function decodeHtmlEntities(value: string | null | undefined) {
  if (!value || !value.includes("&") || typeof document === "undefined") {
    return value ?? "";
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}
