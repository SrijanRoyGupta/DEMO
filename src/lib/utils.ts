import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIstTime(ts: number | Date = Date.now()) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

export function formatIstClock(ts: number | Date = Date.now()) {
  return `${formatIstTime(ts)} IST`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
