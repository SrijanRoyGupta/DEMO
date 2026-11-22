import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-Ds1vuMy5.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function formatIstTime(ts = Date.now()) {
	return new Date(ts).toLocaleTimeString("en-GB", {
		hour12: false,
		timeZone: "Asia/Kolkata"
	});
}
function formatIstClock(ts = Date.now()) {
	return `${formatIstTime(ts)} IST`;
}
function clamp(n, min, max) {
	return Math.min(max, Math.max(min, n));
}
//#endregion
export { formatIstTime as i, cn as n, formatIstClock as r, clamp as t };
