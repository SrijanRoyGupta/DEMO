import { i as __toESM } from "../_runtime.mjs";
import { n as cn } from "./utils-Ds1vuMy5.mjs";
import { r as calculateRisk } from "./risk-CyJhvRVe.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { t as getLiveNetwork } from "./meteo.functions-Qhl9LZe4.mjs";
import { ot as ArrowRight, st as ArrowLeft } from "../_libs/lucide-react.mjs";
import { A as Raycaster, C as MeshBasicMaterial, D as Points, E as PlaneGeometry, I as Vector2, L as Vector3, M as RingGeometry, N as Scene, O as PointsMaterial, P as SphereGeometry, R as WebGLRenderer, S as Mesh, T as PerspectiveCamera, h as FogExp2, i as BufferGeometry, r as BufferAttribute, t as OrbitControls } from "../_libs/three.mjs";
import { t as SiteHeader } from "./site-header-XYky93k1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/radar-QXPbKnmZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Deterministic wireframe ridge mesh — same shape everywhere it's used. */
function buildTerrainGeometry(size = 26, seg = 48) {
	const geo = new PlaneGeometry(size, size, seg, seg);
	geo.rotateX(-Math.PI / 2);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const z = pos.getZ(i);
		const ridge = Math.sin(x * .35) * Math.cos(z * .28) * 1.6;
		const swell = Math.sin((x + z) * .12) * 1.1;
		pos.setY(i, ridge + swell);
	}
	geo.computeVertexNormals();
	return geo;
}
/** Height of the ridge surface at a given (x, z), matching buildTerrainGeometry's formula. */
function terrainHeightAt(x, z) {
	return Math.sin(x * .35) * Math.cos(z * .28) * 1.6 + Math.sin((x + z) * .12) * 1.1;
}
function riskTone(total) {
	if (total >= 70) return 16478597;
	if (total >= 40) return 16098596;
	return 3462041;
}
/**
* Interactive, drag-to-orbit 3D view of the basin corridor: the wireframe
* ridge from the landing hero, but now populated with real station
* positions and a live rain-particle column over each one, sized and
* colored by that station's actual current reading.
*/
function LiveTerrainScene({ stations, activeId, onSelect, className }) {
	const mountRef = (0, import_react.useRef)(null);
	const stationsRef = (0, import_react.useRef)(stations);
	stationsRef.current = stations;
	const activeIdRef = (0, import_react.useRef)(activeId);
	activeIdRef.current = activeId;
	const onSelectRef = (0, import_react.useRef)(onSelect);
	onSelectRef.current = onSelect;
	(0, import_react.useEffect)(() => {
		const mount = mountRef.current;
		if (!mount) return;
		const scene = new Scene();
		scene.fog = new FogExp2(198418, .024);
		const camera = new PerspectiveCamera(45, 1, .1, 100);
		camera.position.set(0, 9, 15);
		const renderer = new WebGLRenderer({
			antialias: true,
			alpha: true
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		mount.appendChild(renderer.domElement);
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = .08;
		controls.minDistance = 6;
		controls.maxDistance = 26;
		controls.maxPolarAngle = Math.PI * .49;
		controls.target.set(0, 0, 0);
		const geo = buildTerrainGeometry();
		const wireMat = new MeshBasicMaterial({
			color: 3718648,
			wireframe: true,
			transparent: true,
			opacity: .28
		});
		scene.add(new Mesh(geo, wireMat));
		const lats = stationsRef.current.map((s) => s.lat);
		const lons = stationsRef.current.map((s) => s.lon);
		const latMin = Math.min(...lats);
		const latMax = Math.max(...lats);
		const lonMin = Math.min(...lons);
		const lonMax = Math.max(...lons);
		const span = 20;
		const project = (lat, lon) => {
			const x = ((lon - lonMin) / (lonMax - lonMin || 1) - .5) * span;
			const z = -((lat - latMin) / (latMax - latMin || 1) - .5) * span;
			return {
				x,
				z,
				y: terrainHeightAt(x, z)
			};
		};
		const rigs = [];
		for (const st of stationsRef.current) {
			const { x, z, y } = project(st.lat, st.lon);
			const risk = calculateRisk(st).total;
			const tone = riskTone(risk);
			const base = new Vector3(x, y + .05, z);
			const marker = new Mesh(new SphereGeometry(.16, 16, 16), new MeshBasicMaterial({ color: tone }));
			marker.position.copy(base);
			marker.userData.stationId = st.id;
			scene.add(marker);
			const ring = new Mesh(new RingGeometry(.24, .3, 24), new MeshBasicMaterial({
				color: tone,
				transparent: true,
				opacity: .6,
				side: 2
			}));
			ring.rotation.x = -Math.PI / 2;
			ring.position.copy(base).setY(base.y + .02);
			scene.add(ring);
			let rain = null;
			let rainPositions = null;
			const intensity = Math.max(st.rainObserved, st.rain);
			if (intensity > .5) {
				const count = Math.min(80, 16 + Math.round(intensity * 3));
				rainPositions = new Float32Array(count * 3);
				for (let i = 0; i < count; i++) {
					rainPositions[i * 3] = base.x + (Math.random() - .5) * .9;
					rainPositions[i * 3 + 1] = base.y + Math.random() * 3.2;
					rainPositions[i * 3 + 2] = base.z + (Math.random() - .5) * .9;
				}
				const rainGeo = new BufferGeometry();
				rainGeo.setAttribute("position", new BufferAttribute(rainPositions, 3));
				rain = new Points(rainGeo, new PointsMaterial({
					color: 3718648,
					size: .045,
					transparent: true,
					opacity: .75
				}));
				scene.add(rain);
			}
			rigs.push({
				id: st.id,
				marker,
				ring,
				rain,
				rainPositions,
				rainSpeed: .02 + Math.min(intensity, 40) * .0025,
				base
			});
		}
		const raycaster = new Raycaster();
		const pointer = new Vector2();
		function onClick(ev) {
			const rect = renderer.domElement.getBoundingClientRect();
			pointer.x = (ev.clientX - rect.left) / rect.width * 2 - 1;
			pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(pointer, camera);
			const hits = raycaster.intersectObjects(rigs.map((r) => r.marker));
			if (hits[0]) {
				const id = hits[0].object.userData.stationId;
				onSelectRef.current(id);
			}
		}
		renderer.domElement.addEventListener("click", onClick);
		function resize() {
			if (!mount) return;
			const w = mount.clientWidth;
			const h = mount.clientHeight;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
		}
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(mount);
		let raf = 0;
		function animate() {
			raf = requestAnimationFrame(animate);
			for (const r of rigs) {
				const isActive = r.id === activeIdRef.current;
				r.marker.scale.setScalar(isActive ? 1.7 : 1);
				r.ring.material.opacity = isActive ? .95 : .4;
				if (r.rain && r.rainPositions) {
					const posAttr = r.rain.geometry.attributes.position;
					for (let i = 0; i < r.rainPositions.length / 3; i++) {
						let y = r.rainPositions[i * 3 + 1] - r.rainSpeed;
						if (y < r.base.y) y = r.base.y + 3.2;
						r.rainPositions[i * 3 + 1] = y;
					}
					posAttr.needsUpdate = true;
				}
			}
			controls.update();
			renderer.render(scene, camera);
		}
		animate();
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			renderer.domElement.removeEventListener("click", onClick);
			controls.dispose();
			geo.dispose();
			wireMat.dispose();
			for (const r of rigs) {
				r.marker.geometry.dispose();
				r.marker.material.dispose();
				r.ring.geometry.dispose();
				r.ring.material.dispose();
				if (r.rain) {
					r.rain.geometry.dispose();
					r.rain.material.dispose();
				}
			}
			renderer.dispose();
			mount.removeChild(renderer.domElement);
		};
	}, [stationsRef.current.map((s) => s.id).join(",")]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: mountRef,
		className
	});
}
function LiveRadarPage() {
	const [activeId, setActiveId] = (0, import_react.useState)(null);
	const liveQuery = useQuery({
		queryKey: ["live-network"],
		queryFn: () => getLiveNetwork(),
		refetchInterval: 2e4
	});
	const stations = liveQuery.data?.stations ?? [];
	const active = stations.find((s) => s.id === activeId) ?? stations[0];
	const activeRisk = active ? calculateRisk(active) : null;
	const isCritActive = stations.some((s) => calculateRisk(s).total >= 70);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-screen flex-col bg-[#060608] text-white",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {
				currentPath: "/radar",
				isCrit: isCritActive
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-white/[0.08] bg-[#0c0c10]/90 px-4 py-2.5 backdrop-blur md:px-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-7xl items-center justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/",
								className: "flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#14141a] px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:border-white/25 hover:text-white",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Platform Overview" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-px bg-white/10 hidden sm:block" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "hidden sm:block",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "font-heading text-sm font-bold uppercase tracking-wide text-white",
									children: "3D BASIN TERRAIN & DOPPLER RADAR TWIN"
								})
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/command",
							search: { tab: "terrain3d" },
							className: "rounded-lg border border-[#ff3b30]/30 bg-[#ff3b30]/10 px-3 py-1.5 font-mono text-[11px] font-bold text-[#ff3b30] transition hover:bg-[#ff3b30]/20",
							children: "Switch to 10 km Diorama →"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/command",
							className: "rounded-lg bg-white px-3.5 py-1.5 font-sans text-xs font-bold text-black transition hover:bg-neutral-200",
							children: "Full Command Center →"
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid flex-1 gap-0 lg:grid-cols-[1fr_360px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative min-h-[500px] lg:min-h-full bg-[#050507]",
					children: [liveQuery.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-full items-center justify-center font-mono text-xs text-[#8e8e9c]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-[#ff3b30] animate-ping" }), "Streaming live Copernicus DEM & Doppler composite…"]
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveTerrainScene, {
						stations,
						activeId: active?.id ?? null,
						onSelect: setActiveId,
						className: "h-full w-full"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-wider text-[#8e8e9c]/80 bg-[#060608]/80 px-3 py-1.5 rounded-lg border border-white/[0.06] backdrop-blur",
						children: "Orbit: Drag Left-Click · Pan: Right-Click · Zoom: Scroll · Select: Click Marker"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "flex flex-col border-t border-white/[0.08] bg-[#0a0a0e] lg:border-l lg:border-t-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-b border-white/[0.08] p-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[10px] font-bold uppercase tracking-widest text-[#ff3b30]",
									children: "ACTIVE SENSING NODE"
								}), active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-[10px] text-[#34d399] flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 rounded-full bg-[#34d399]" }), "LIVE STREAM"]
								}) : null]
							}), active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "mt-2 font-heading text-2xl font-black uppercase text-white",
									children: active.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "font-mono text-[11px] text-[#8e8e9c]",
									children: [
										active.state,
										" · ",
										active.lat.toFixed(2),
										"°N, ",
										active.lon.toFixed(2),
										"°E"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 grid grid-cols-2 gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
											label: "Precip (1h)",
											value: `${active.rainObserved.toFixed(1)} mm`,
											highlight: active.rainObserved >= 10 ? "#ff453a" : void 0
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
											label: "Soil Saturation",
											value: `${active.moist.toFixed(0)}%`,
											highlight: active.moist >= 75 ? "#f5a524" : void 0
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
											label: "Risk Score",
											value: `${Math.round(activeRisk?.total ?? 0)} / 100`,
											highlight: (activeRisk?.total ?? 0) >= 70 ? "#ff453a" : (activeRisk?.total ?? 0) >= 40 ? "#f5a524" : "#34d399"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
											label: "Ground Tilt",
											value: `${active.tilt.toFixed(2)}°`
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/command",
										search: { station: active.id },
										className: "flex items-center gap-1.5 font-sans text-xs font-bold text-[#ff3b30] hover:text-white transition",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Open in Command Center" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-3" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/command",
										search: {
											tab: "terrain3d",
											station: active.id
										},
										className: "font-mono text-[11px] text-[#8e8e9c] hover:text-white transition",
										children: "10 km Diorama →"
									})]
								})
							] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs text-[#8e8e9c]",
								children: "No station selected."
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-3 border-b border-white/[0.08] bg-[#0c0c12]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[10px] uppercase tracking-wider text-[#8e8e9c]",
								children: "SORTED BY PHYSICAL HAZARD SEVERITY"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex-1 divide-y divide-white/[0.04] overflow-y-auto",
							children: stations.slice().sort((a, b) => calculateRisk(b).total - calculateRisk(a).total).map((s) => {
								const total = Math.round(calculateRisk(s).total);
								const isSelected = s.id === active?.id;
								const tone = total >= 70 ? "crit" : total >= 40 ? "watch" : "safe";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setActiveId(s.id),
									className: cn("flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition", isSelected ? "bg-[#181822]" : "hover:bg-[#111116]"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate font-heading text-sm font-bold text-white",
												children: s.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono text-[10px] text-[#6e6e7c]",
												children: [s.elevationDem, "m"]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-mono text-[10px] text-[#8e8e9c] mt-0.5",
											children: [
												s.state,
												" · Rain: ",
												s.rainObserved.toFixed(1),
												" mm/h · Moist: ",
												s.moist.toFixed(0),
												"%"
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: cn("shrink-0 rounded-lg px-2.5 py-1 font-mono text-xs font-bold", tone === "crit" && "border border-[#ff453a]/40 bg-[#ff453a]/15 text-[#ff453a]", tone === "watch" && "border border-[#f5a524]/40 bg-[#f5a524]/15 text-[#f5a524]", tone === "safe" && "border border-white/10 bg-[#121218] text-[#34d399]"),
										children: total
									})]
								}, s.id);
							})
						})
					]
				})]
			})
		]
	});
}
function MiniStat({ label, value, highlight }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-white/[0.06] bg-[#111116] p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-mono text-base font-bold text-white",
			style: highlight ? { color: highlight } : void 0,
			children: value
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-mono text-[9px] uppercase tracking-wider text-[#8e8e9c] mt-0.5",
			children: label
		})]
	});
}
function RadarRoute() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveRadarPage, {});
}
//#endregion
export { RadarRoute as component };
