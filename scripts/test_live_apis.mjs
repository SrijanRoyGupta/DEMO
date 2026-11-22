// @ts-check
import { assembleNetwork } from "../src/lib/meteo.server.ts";

console.log("==================================================");
console.log("🌐 TESTING ALL LIVE APIS IN TERRAALERT PIPELINE");
console.log("==================================================");

const t0 = Date.now();
try {
  const net = await assembleNetwork();
  const elapsed = Date.now() - t0;
  console.log(`\n⏱️ Execution time: ${elapsed}ms`);
  console.log(`📡 Degraded status: ${net.degraded ? "⚠️ DEGRADED (Partial Ingest)" : "✅ HEALTHY (All sources streaming)"}`);
  console.log(`🌦️ Weather source: ${net.sources.weather}`);
  console.log(`🌱 Soil source: ${net.sources.soil}`);
  console.log(`🌊 Flood source: ${net.sources.flood}`);
  console.log(`🛰️ Radar source: ${net.sources.radar}`);
  console.log(`📡 Radar frames count: ${net.radar.frames.length}`);
  console.log(`\n📊 STATIONS TELEMETRY SUMMARY (${net.stations.length} stations):`);
  for (const s of net.stations) {
    const { calculateRisk } = await import("../src/lib/risk.ts");
    const r = calculateRisk(s);
    console.log(
      `  • [${s.id}] ${s.name.padEnd(28)} | Rain: ${s.rainObserved?.toFixed(1) ?? "0.0"} mm | Moist: ${s.moist?.toFixed(0) ?? "0"}% | Risk: ${r.total}/100 [${r.level.padEnd(8)}] | Caine: ${r.caineRatio}x`
    );
  }
} catch (err) {
  console.error("❌ Fatal error calling assembleNetwork:", err);
}
