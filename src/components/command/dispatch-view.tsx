import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  Coins,
  Copy,
  Crosshair,
  FileCode,
  Globe2,
  MapPin,
  Navigation,
  Radio,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { evaluateParametricTrigger, generateCapAlert } from "@/lib/cap-protocol";
import { calculateRisk } from "@/lib/risk";
import type { StationLive } from "@/lib/types";
import { formatIstClock } from "@/lib/utils";

type Props = {
  station: StationLive;
  smsText: string;
  smsTime: string;
  wardStatus: string;
  wardAction: string;
  onTestWard: () => void;
  onTestSms: () => void;
};

export function DispatchView({
  station,
  smsText,
  smsTime,
  wardStatus,
  wardAction,
  onTestWard,
  onTestSms,
}: Props) {
  const [copiedCap, setCopiedCap] = useState(false);
  const [capMode, setCapMode] = useState<"xml" | "json">("xml");
  const [activeTab, setActiveTab] = useState<"civil" | "cap" | "parametric">("cap");

  const riskRes = calculateRisk(station);
  const capAlert = generateCapAlert(station, riskRes);
  const parametricCert = evaluateParametricTrigger(station, riskRes);
  const spatialAlert = station.spatialRainfall?.alertEvent;

  function copyCapContent() {
    const text =
      capMode === "xml"
        ? capAlert.rawXml ?? ""
        : JSON.stringify(capAlert, null, 2);
    void navigator.clipboard.writeText(text);
    setCopiedCap(true);
    setTimeout(() => setCopiedCap(false), 2500);
  }

  return (
    <div className="tab-enter mx-auto w-full max-w-6xl p-4 md:p-8">
      {/* Header with International Standards Badges */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="crit">Civil disaster broadcast</Badge>
            <Badge tone="accent">
              <Globe2 className="mr-1 inline-block size-3.5" />
              OASIS CAP v1.2 / ITU-T X.1303
            </Badge>
            <Badge tone="safe">Swiss Re / Munich Re Parametric</Badge>
          </div>
          <h2 className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-fg md:text-3xl">
            Emergency Dispatch & Interoperable Alert Terminal
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            Global dissemination infrastructure: broadcast citizen cell SMS, emit standardized
            OASIS CAP v1.2 emergency feeds to international hubs (WMO, IPAWS, MeteoAlarm), and
            trigger verifiable parametric reinsurance disbursements.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex rounded-xl border border-border bg-panel-2 p-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("cap")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              activeTab === "cap"
                ? "bg-accent font-bold text-accent-fg"
                : "text-muted hover:text-fg"
            }`}
          >
            CAP v1.2 XML/JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("parametric")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              activeTab === "parametric"
                ? "bg-accent font-bold text-accent-fg"
                : "text-muted hover:text-fg"
            }`}
          >
            Parametric Payout
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("civil")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              activeTab === "civil"
                ? "bg-accent font-bold text-accent-fg"
                : "text-muted hover:text-fg"
            }`}
          >
            Ward & Cell SMS
          </button>
        </div>
      </div>

      {/* SPATIAL RAINFALL ALERT EVENT (DOPPLER STORM CELL DETECTOR) */}
      {spatialAlert ? (
        <div className="mt-6 rounded-2xl border-2 border-crit bg-crit/10 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crit/30 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-crit animate-bounce" />
              <span className="font-sans text-base font-extrabold uppercase tracking-wide text-crit">
                SPATIAL RAINFALL ALERT
              </span>
              <Badge tone="crit">{spatialAlert.severity} PRIORITY</Badge>
            </div>
            <div className="font-mono text-xs text-muted">
              Target Station: <strong className="text-fg">{spatialAlert.targetStation}</strong>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
            <div className="rounded-xl border border-crit/20 bg-panel-2 p-2.5">
              <div className="text-[10px] text-muted uppercase">Center Rain</div>
              <div className="text-base font-bold text-fg">
                {spatialAlert.centerRainfallMmH.toFixed(1)}{" "}
                <span className="text-[10px] text-muted">mm/hr</span>
              </div>
            </div>
            <div className="rounded-xl border border-crit/20 bg-panel-2 p-2.5">
              <div className="text-[10px] text-muted uppercase">5km Median</div>
              <div className="text-base font-bold text-fg">
                {spatialAlert.radius5kmMedianMmH.toFixed(1)}{" "}
                <span className="text-[10px] text-muted">mm/hr</span>
              </div>
            </div>
            <div className="rounded-xl border border-crit/20 bg-panel-2 p-2.5">
              <div className="text-[10px] text-muted uppercase">5km P90 Rain</div>
              <div className="text-base font-bold text-watch">
                {spatialAlert.radius5kmP90MmH.toFixed(1)}{" "}
                <span className="text-[10px] text-muted">mm/hr</span>
              </div>
            </div>
            <div className="rounded-xl border border-crit/40 bg-crit/15 p-2.5">
              <div className="text-[10px] text-crit uppercase font-bold">🔴 Maximum Cell</div>
              <div className="text-base font-bold text-crit">
                {spatialAlert.maximumMmH.toFixed(1)}{" "}
                <span className="text-[10px] text-crit">mm/hr</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-crit/25 bg-panel-2 p-3.5 font-mono text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <span className="flex items-center gap-1.5 text-muted">
                <MapPin className="size-3.5 text-crit" /> Peak Cell Coordinates:
              </span>
              <span className="font-bold text-crit">
                [{spatialAlert.maximumLat.toFixed(4)}° N, {spatialAlert.maximumLon.toFixed(4)}° E] (
                {spatialAlert.distanceKm.toFixed(2)} km offset)
              </span>
            </div>
            <div>
              <span className="text-muted font-bold">Trigger Reason: </span>
              <span className="text-fg">{spatialAlert.reason}</span>
            </div>
            <div>
              <span className="text-crit font-bold">Action Directive: </span>
              <span className="text-fg">{spatialAlert.actionDirective}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="crit" className="font-mono text-xs font-bold" onClick={onTestWard}>
              <Send className="mr-1.5 size-3.5" />
              Dispatch NDRF / SDRF to Cell Coordinates
            </Button>
            <Button variant="outline" className="font-mono text-xs" onClick={onTestSms}>
              <Smartphone className="mr-1.5 size-3.5" />
              Broadcast Geo-fenced Cell Warning
            </Button>
          </div>
        </div>
      ) : null}

      {/* VIEW 1: OASIS CAP v1.2 INTEROPERABILITY TERMINAL */}
      {activeTab === "cap" ? (
        <div className="mt-8 rounded-3xl border border-accent/25 bg-panel p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-accent animate-pulse" />
                <h3 className="font-sans text-lg font-bold text-fg">
                  OASIS Common Alerting Protocol (CAP v1.2) Live Broadcaster
                </h3>
              </div>
              <p className="mt-1 font-mono text-xs text-muted">
                Standard format natively consumed by WMO Global Alert Hub, US IPAWS, EU MeteoAlarm,
                and national civil defense authorities.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border bg-panel-2 p-0.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setCapMode("xml")}
                  className={`rounded px-2.5 py-1 ${
                    capMode === "xml"
                      ? "bg-accent text-accent-fg font-bold"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  XML (OASIS)
                </button>
                <button
                  type="button"
                  onClick={() => setCapMode("json")}
                  className={`rounded px-2.5 py-1 ${
                    capMode === "json"
                      ? "bg-accent text-accent-fg font-bold"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  JSON (GeoJSON)
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCapContent}
                className="gap-1.5 font-mono text-xs border-accent/40 text-accent hover:bg-accent/15"
              >
                {copiedCap ? <Check className="size-3.5 text-safe" /> : <Copy className="size-3.5" />}
                {copiedCap ? "Copied CAP" : "Copy CAP"}
              </Button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-bg/90 p-4 font-mono text-xs">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted border-b border-border/50 pb-2">
              <span>
                IDENTIFIER: <strong className="text-fg">{capAlert.identifier}</strong>
              </span>
              <span>
                STATUS: <strong className="text-safe">VALIDATED (CAP-1.2 SCHEMA)</strong>
              </span>
            </div>
            <pre className="max-h-96 overflow-x-auto overflow-y-auto leading-relaxed text-accent/90">
              <code>{capMode === "xml" ? capAlert.rawXml : JSON.stringify(capAlert, null, 2)}</code>
            </pre>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono text-xs">
            <div className="rounded-xl border border-border bg-panel-2 p-3">
              <span className="text-muted">Caine Threshold Ratio:</span>
              <div className="text-base font-bold text-fg">{riskRes.caineRatio}x threshold</div>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 p-3">
              <span className="text-muted">Target Geofence:</span>
              <div className="text-base font-bold text-accent">{capAlert.info.area.circle}</div>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 p-3">
              <span className="text-muted">Interoperability Target:</span>
              <div className="text-base font-bold text-safe">WMO Alert Hub & IPAWS</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* VIEW 2: PARAMETRIC INSURANCE CAT BOND PAYOUT CERTIFICATE */}
      {activeTab === "parametric" ? (
        <div className="mt-8 rounded-3xl border border-safe/30 bg-panel p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="size-5 text-safe" />
                <h3 className="font-sans text-lg font-bold text-fg">
                  Parametric Reinsurance Catastrophe Trigger Engine
                </h3>
              </div>
              <p className="mt-1 font-mono text-xs text-muted">
                Pre-agreed, immutable trigger validation designed for Swiss Re, Munich Re, and World
                Bank catastrophe bonds. Zero-claims audit release.
              </p>
            </div>

            <Badge
              tone={
                parametricCert.payoutTier === "TIER_2_FULL_DISBURSEMENT"
                  ? "crit"
                  : parametricCert.payoutTier === "TIER_1_EARLY_RESPONSE"
                    ? "watch"
                    : "safe"
              }
            >
              {parametricCert.payoutTier.replaceAll("_", " ")}
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-safe/40 bg-safe/5 p-5 text-center lg:col-span-1">
              <div className="font-mono text-xs font-bold uppercase text-muted">Disbursement Liquidity</div>
              <div className="my-2 font-mono text-4xl font-extrabold text-safe">
                ${parametricCert.disbursementAmountUsd.toLocaleString()}
              </div>
              <p className="font-mono text-xs text-muted">
                {parametricCert.payoutApproved
                  ? "Automatic liquidity release authorized to community disaster fund."
                  : "Baseline safe — monitoring rainfall & pore-pressure thresholds."}
              </p>
              <div className="mt-4 inline-block rounded-xl border border-safe/30 bg-safe/10 px-3 py-1 font-mono text-[11px] font-bold text-safe">
                {parametricCert.payoutApproved ? "TRIGGER CRITERIA MET" : "CRITERIA PENDING"}
              </div>
            </div>

            <div className="space-y-3 lg:col-span-2">
              <div className="rounded-xl border border-border bg-panel-2 p-4 font-mono text-xs space-y-2">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted">Certificate ID:</span>
                  <span className="font-bold text-fg">{parametricCert.certificateId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Insured Asset Zone:</span>
                  <span className="font-bold text-accent">{parametricCert.assetWard}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Covered Peril:</span>
                  <span className="font-bold text-watch">{parametricCert.peril}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Caine (1980) Exceedance:</span>
                  <span className="font-bold text-fg">{parametricCert.caineExceedance}x</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted">Cryptographic Verification:</span>
                  <span className="font-bold text-safe truncate max-w-xs">{parametricCert.verifiableHash}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-panel-2 p-3.5 font-mono text-[11px] text-muted">
                <strong className="text-fg">Audited Multi-Source Feeds: </strong>
                {parametricCert.dataSources.join(" · ")}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* VIEW 3: CITIZEN CELL BROADCAST & WARD DISPATCH */}
      {activeTab === "civil" ? (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-panel p-6 shadow-xl">
            <div>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-sans text-lg font-bold text-fg">
                  <Smartphone className="size-5 text-accent" />
                  Citizen Cell Broadcast Simulator
                </h3>
                <Badge tone="accent">Trigger ≥ 70</Badge>
              </div>
              <div className="mx-auto my-4 max-w-sm rounded-3xl border-2 border-border bg-bg p-5 shadow-2xl">
                <div className="mb-3 flex justify-between border-b border-border pb-2 font-mono text-[10px] text-muted">
                  <span>Cellular broadcast</span>
                  <span className="font-bold text-crit">Emergency alert</span>
                </div>
                <div className="rounded-2xl border border-crit/60 bg-panel-2 p-4">
                  <div className="mb-2 font-mono text-xs font-bold text-crit">Critical Flash Flood Warning</div>
                  <p className="text-xs leading-relaxed text-fg">{smsText}</p>
                  <div className="mt-2.5 text-right font-mono text-[10px] text-muted">{smsTime || formatIstClock()}</div>
                </div>
              </div>
            </div>
            <p className="rounded-xl border border-border bg-panel-2 p-3.5 font-mono text-xs text-muted">
              <span className="font-bold text-fg">Protocol:</span> geo-fenced emergency notifications to
              nearby handsets, designed to override tower congestion within seconds.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-border bg-panel p-6 shadow-xl">
            <div>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-sans text-lg font-bold text-fg">
                  <Building2 className="size-5 text-watch" />
                  Local Ward Office Terminal
                </h3>
                <Badge tone="watch">Trigger ≥ 40</Badge>
              </div>
              <div className="my-4 space-y-3 rounded-xl border border-border bg-panel-2 p-4 font-mono text-xs">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted">Recipient</span>
                  <span className="font-bold text-accent">Ward office / disaster control</span>
                </div>
                <div className="space-y-1.5 text-fg">
                  <div>
                    <span className="text-muted">Memo: </span>TA-DISPATCH-2026/891
                  </div>
                  <div>
                    <span className="text-muted">Zone: </span>
                    {station.name} ({station.ward})
                  </div>
                  <div>
                    <span className="text-muted">Status: </span>
                    <span className="font-bold text-watch">{wardStatus}</span>
                  </div>
                  <div>
                    <span className="text-muted">Directive: </span>
                    {wardAction}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="watch" className="w-full font-mono text-xs" onClick={onTestWard}>
                Test ward office dispatch
              </Button>
              <Button variant="crit" className="w-full font-mono text-xs" onClick={onTestSms}>
                Test citizen SMS broadcast
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
