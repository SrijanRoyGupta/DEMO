import test from "node:test";
import assert from "node:assert/strict";
import { caineThreshold, calculateRisk } from "./risk.js";
import { generateCapAlert, evaluateParametricTrigger } from "./cap-protocol.js";
import { STATIONS, placeholderLive } from "./stations.js";

test("Caine (1980) Intensity-Duration Threshold matches empirical reference curve", () => {
  // 1-hour threshold: 14.82 * (1)^(-0.39) = 14.82 mm/h
  const caine1h = caineThreshold(1);
  assert.ok(Math.abs(caine1h - 14.82) < 0.01, `Expected 14.82, got ${caine1h}`);

  // 6-hour threshold: 14.82 * (6)^(-0.39) = ~7.37 mm/h (44.2 mm cumulative)
  const caine6h = caineThreshold(6);
  assert.ok(Math.abs(caine6h - 7.37) < 0.05, `Expected ~7.37, got ${caine6h}`);

  // 24-hour threshold: 14.82 * (24)^(-0.39) = ~4.31 mm/h (103.4 mm cumulative)
  const caine24h = caineThreshold(24);
  assert.ok(Math.abs(caine24h - 4.31) < 0.05, `Expected ~4.31, got ${caine24h}`);
});

test("USGS Susceptibility x Trigger two-factor hazard score calculation", () => {
  // Extreme storm: 45 mm/h rain, 95% soil saturation, 2.5 deg tilt on 38 deg slope
  const criticalStorm = calculateRisk({
    rain: 45,
    moist: 95,
    tilt: 2.5,
    histScore: 0.9,
    slopeDeg: 38,
    clayFractionPct: 42,
    vegetationCoverPct: 40,
    populationDensity: 1500,
    dopplerDbz: 52,
  });

  assert.equal(criticalStorm.level, "CRITICAL");
  assert.ok(criticalStorm.total >= 70, `Expected total >= 70, got ${criticalStorm.total}`);
  assert.equal(criticalStorm.caineExceeded, true);
  assert.ok(criticalStorm.caineRatio > 1.5);
  assert.ok(criticalStorm.riskToPeople > 60);
});

test("OASIS CAP v1.2 XML generation conforms to standard schema tags", () => {
  const st = placeholderLive(STATIONS[1]); // Cherrapunji
  const risk = calculateRisk(st);
  const cap = generateCapAlert(st, risk);

  assert.ok(cap.identifier.startsWith("urn:terraalert:cap:1.2:"));
  assert.ok(cap.rawXml?.includes("<alert xmlns=\"urn:oasis:names:tc:emergency:cap:1.2\">"));
  assert.ok(cap.rawXml?.includes("<event>"));
  assert.ok(cap.rawXml?.includes("<urgency>"));
  assert.ok(cap.rawXml?.includes("<severity>"));
  assert.ok(cap.rawXml?.includes("<certainty>"));
  assert.ok(cap.rawXml?.includes("<area>"));
  assert.ok(cap.rawXml?.includes("<circle>"));
});

test("Parametric Reinsurance evaluation triggers under extreme storm criteria", () => {
  const st = placeholderLive(STATIONS[1]);
  const critRisk = calculateRisk({
    rain: 50,
    moist: 95,
    tilt: 2.8,
    histScore: 0.9,
    slopeDeg: 38,
  });

  const cert = evaluateParametricTrigger(st, critRisk);
  assert.equal(cert.payoutApproved, true);
  assert.equal(cert.payoutTier, "TIER_2_FULL_DISBURSEMENT");
  assert.equal(cert.disbursementAmountUsd, 500000);
  assert.ok(cert.verifiableHash.startsWith("SHA256:0x"));
});

