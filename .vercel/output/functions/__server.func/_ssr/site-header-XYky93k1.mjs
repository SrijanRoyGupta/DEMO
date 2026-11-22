import { i as __toESM } from "../_runtime.mjs";
import { r as formatIstClock } from "./utils-Ds1vuMy5.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { N as Map, a as VolumeX, h as Shield, o as Volume2, ot as ArrowRight } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/site-header-XYky93k1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SiteHeader({ currentPath = "/", audioEnabled = false, onToggleAudio, statusText = "12 STATIONS STREAMING", isCrit = false }) {
	const [clock, setClock] = (0, import_react.useState)("");
	const [sovereignRegion, setSovereignRegion] = (0, import_react.useState)("India Central (MeitY / DPDP)");
	(0, import_react.useEffect)(() => {
		const tick = () => setClock(formatIstClock());
		tick();
		const id = setInterval(tick, 1e3);
		return () => clearInterval(id);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "sticky top-0 z-50 border-b border-white/[0.08] bg-[#060608]/90 px-4 py-3 backdrop-blur-2xl md:px-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-7xl items-center justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "group flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex size-9 items-center justify-center rounded-lg border border-white/15 bg-[#121216] text-white shadow-md transition group-hover:border-white/30 group-hover:bg-[#1a1a22]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							width: "18",
							height: "18",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2.2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", { points: "12 2 2 22 22 22" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 11v5" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx: "12",
									cy: "18",
									r: "0.5",
									fill: "currentColor"
								})
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-heading text-lg font-black tracking-tight text-white uppercase group-hover:text-white/90",
							children: ["TERRA", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#ff3b30]",
								children: "ALERT"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[9px] uppercase tracking-[0.2em] text-[#8e8e9c]",
							children: "Sovereign Terrain Defense"
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "hidden items-center gap-1 md:flex",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/",
							className: `rounded-md px-3 py-1.5 font-sans text-xs font-semibold transition ${currentPath === "/" ? "bg-white/[0.10] text-white shadow-sm" : "text-[#8e8e9c] hover:bg-white/[0.04] hover:text-white"}`,
							children: "Overview"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/command",
							className: `rounded-md px-3 py-1.5 font-sans text-xs font-semibold transition ${currentPath === "/command" ? "bg-white/[0.10] text-white shadow-sm" : "text-[#8e8e9c] hover:bg-white/[0.04] hover:text-white"}`,
							children: "Command Center"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/radar",
							className: `rounded-md px-3 py-1.5 font-sans text-xs font-semibold transition ${currentPath === "/radar" ? "bg-white/[0.10] text-white shadow-sm" : "text-[#8e8e9c] hover:bg-white/[0.04] hover:text-white"}`,
							children: "3D Basin Twin"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/command",
							search: { tab: "terrain3d" },
							className: "rounded-md px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:bg-white/[0.04] hover:text-white",
							children: "3D Diorama"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/command",
							search: { tab: "incidents" },
							className: "rounded-md px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:bg-white/[0.04] hover:text-white",
							children: "Incident Intelligence"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/command",
							search: { tab: "backtest" },
							className: "rounded-md px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:bg-white/[0.04] hover:text-white",
							children: "Backtest"
						})
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							setSovereignRegion((prev) => prev.startsWith("India") ? "EU West (Frankfurt / GDPR & CEMS)" : prev.startsWith("EU") ? "US GovCloud (FedRAMP / USGS)" : "India Central (MeitY / DPDP)");
						},
						className: "hidden items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0d0d11] px-2.5 py-1.5 font-mono text-[10px] text-[#8e8e9c] transition hover:border-white/20 hover:text-white lg:inline-flex",
						title: "Multi-Region Sovereign Data Enclave",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-3 text-[#ff3b30]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate max-w-[140px]",
							children: sovereignRegion
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden sm:flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0d0d11] px-2.5 py-1.5 font-mono text-[11px] text-[#c4c4cf]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `size-1.5 rounded-full ${isCrit ? "bg-[#ff453a] animate-pulse" : "bg-[#34d399]"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] tracking-wide uppercase",
							children: statusText
						})]
					}),
					clock ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "hidden md:block rounded-lg border border-white/[0.08] bg-[#0d0d11] px-2.5 py-1.5 font-mono text-xs font-semibold text-[#8e8e9c]",
						children: clock
					}) : null,
					onToggleAudio ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onToggleAudio,
						className: "flex size-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0d0d11] text-[#8e8e9c] transition hover:border-white/20 hover:text-white",
						title: "Toggle Alert Audio",
						children: audioEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-3.5 text-[#34d399]" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-3.5" })
					}) : null,
					currentPath !== "/command" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/command",
						className: "flex items-center gap-2 rounded-lg bg-white px-3.5 py-1.5 font-sans text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-95",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Launch Operations" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-3.5" })]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/radar",
						className: "flex items-center gap-2 rounded-lg border border-white/20 bg-[#121216] px-3.5 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-[#1a1a22] active:scale-95",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Map, { className: "size-3.5 text-[#ff3b30]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "3D Basin Map" })]
					})
				]
			})]
		})
	});
}
//#endregion
export { SiteHeader as t };
