import {
  AlertOctagon,
  BookOpen,
  Calendar,
  Compass,
  FileText,
  Globe2,
  HardHat,
  History,
  Layers,
  MapPin,
  Mountain,
  Navigation,
  Radio,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TabId } from "@/store/command";

export interface NavItem {
  id: TabId;
  label: string;
  category: "OPERATIONS" | "CIVIL DEFENSE & READINESS";
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeTone?: "crit" | "watch" | "safe";
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "terrain3d",
    label: "3D Terrain Digital Twin",
    category: "OPERATIONS",
    icon: Mountain,
    badgeTone: "safe",
    description: "Photorealistic 3D mountain relief & convective cloudburst model",
  },
  {
    id: "saferoute",
    label: "SafeRoute & Tourist GPS",
    category: "OPERATIONS",
    icon: Navigation,
    badge: "GPS LIVE",
    badgeTone: "safe",
    description: "Tourist hazard radar, affected zones & Google Maps GPS navigation",
  },
  {
    id: "incidents",
    label: "Incident Response Center",
    category: "OPERATIONS",
    icon: AlertOctagon,
    badge: "12 LIVE",
    badgeTone: "crit",
    description: "Central alert watchdog & human-in-the-loop dispatch",
  },
  {
    id: "live",
    label: "Command Operations",
    category: "OPERATIONS",
    icon: Radio,
    description: "Real-time geotechnical sensor mesh & GloFAS river hydrology",
  },
  {
    id: "search",
    label: "Location Search & Radar",
    category: "OPERATIONS",
    icon: Search,
    description: "High-resolution Doppler C-Band radar fusion & geocoding",
  },
  {
    id: "evacuation",
    label: "Emergency Playbook",
    category: "CIVIL DEFENSE & READINESS",
    icon: Shield,
    description: "NDMA SOP action matrix & relief shelter routing",
  },
  {
    id: "backtest",
    label: "Historical Backtesting",
    category: "CIVIL DEFENSE & READINESS",
    icon: History,
    description: "Zero-lookahead validation across catastrophic disasters",
  },
  {
    id: "dispatch",
    label: "Emergency Dispatch",
    category: "CIVIL DEFENSE & READINESS",
    icon: Send,
    description: "Automated cell broadcast alerts & ward siren triggers",
  },
  {
    id: "parameters",
    label: "Science Encyclopedia",
    category: "CIVIL DEFENSE & READINESS",
    icon: BookOpen,
    description: "USGS, Copernicus DEM & Caine 1980 threshold physics",
  },
];

interface CommandSidebarProps {
  tab: TabId;
  onChange: (id: TabId) => void;
  criticalCount?: number;
}

export function CommandSidebar({ tab, onChange, criticalCount = 12 }: CommandSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const operationsItems = NAV_ITEMS.filter((i) => i.category === "OPERATIONS");
  const readinessItems = NAV_ITEMS.filter((i) => i.category === "CIVIL DEFENSE & READINESS");

  return (
    <aside
      className={cn(
        "relative z-30 flex flex-col border-r border-white/10 bg-[#09090e]/95 backdrop-blur-2xl transition-all duration-300 select-none",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Sidebar Header / Brand Identifier */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-3.5">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c5cff] to-[#22b8f0] text-white shadow-md">
              <Mountain className="size-4" />
            </span>
            <div className="leading-none">
              <div className="font-heading text-xs font-black tracking-wider text-white">TERRAALERT</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-[#8e8e9c]">DEFENSE OPS</div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
          className="flex size-8 items-center justify-center rounded-lg text-[#8e8e9c] hover:bg-white/10 hover:text-white transition-colors"
        >
          <Layers className="size-4" />
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* Group 1: Operations */}
        <div>
          {!collapsed && (
            <div className="px-2.5 pb-2 font-mono text-xs font-bold uppercase tracking-wider text-[#8e8e9c]">
              OPERATIONS
            </div>
          )}
          <nav className="space-y-1">
            {operationsItems.map((item) => {
              const active = tab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left font-sans text-sm font-semibold transition-all duration-150",
                    active
                      ? "bg-gradient-to-r from-[#7c5cff]/20 to-[#22b8f0]/10 text-white border border-[#7c5cff]/40 shadow-[0_0_15px_rgba(124,92,255,0.25)]"
                      : "text-[#9a9aab] hover:bg-white/5 hover:text-white border border-transparent",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      active ? "text-[#22d3ee]" : "text-[#8e8e9c] group-hover:text-white",
                    )}
                  />

                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate">{item.label}</span>
                        {item.id === "incidents" ? (
                          <span className="flex items-center gap-1 rounded bg-[#ff453a]/20 px-2 py-0.5 font-mono text-xs font-black text-[#ff453a] border border-[#ff453a]/30 animate-pulse">
                            {criticalCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Active Indicator Bar */}
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Group 2: Civil Defense & Readiness */}
        <div>
          {!collapsed && (
            <div className="px-2.5 pb-2 font-mono text-xs font-bold uppercase tracking-wider text-[#8e8e9c]">
              CIVIL DEFENSE & READINESS
            </div>
          )}
          <nav className="space-y-1">
            {readinessItems.map((item) => {
              const active = tab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left font-sans text-sm font-semibold transition-all duration-150",
                    active
                      ? "bg-gradient-to-r from-[#7c5cff]/20 to-[#22b8f0]/10 text-white border border-[#7c5cff]/40 shadow-[0_0_15px_rgba(124,92,255,0.25)]"
                      : "text-[#9a9aab] hover:bg-white/5 hover:text-white border border-transparent",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      active ? "text-[#22d3ee]" : "text-[#8e8e9c] group-hover:text-white",
                    )}
                  />

                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <span className="truncate">{item.label}</span>
                    </div>
                  )}

                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer: System Status */}
      <div className="border-t border-white/10 p-2.5 font-mono text-[10px]">
        {!collapsed ? (
          <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#8e8e9c]">INGEST FEED</span>
              <span className="flex items-center gap-1 font-bold text-[#34d399]">
                <span className="size-1.5 rounded-full bg-[#34d399] animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between text-[#8e8e9c]">
              <span>NODES SYNCED</span>
              <span className="text-white font-bold">12 STATIONS</span>
            </div>
            <div className="flex items-center justify-between text-[#8e8e9c]">
              <span>SOVEREIGNTY</span>
              <span className="text-[#22d3ee]">DPDP / MeitY</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="size-2 rounded-full bg-[#34d399] animate-pulse" title="Feed Online" />
          </div>
        )}
      </div>
    </aside>
  );
}

