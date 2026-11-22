import { cn } from "@/lib/utils";
import type { TabId } from "@/store/command";

export const TABS: { id: TabId; label: string }[] = [
  { id: "terrain3d", label: "3D Terrain Digital Twin" },
  { id: "incidents", label: "Incident Response Center" },
  { id: "live", label: "Command Center" },
  { id: "search", label: "Location Search & Radar" },
  { id: "evacuation", label: "Emergency Playbook" },
  { id: "backtest", label: "Historical Backtesting" },
  { id: "dispatch", label: "Emergency Dispatch" },
  { id: "parameters", label: "Science Encyclopedia" },
];

export function TabNav({ tab, onChange }: { tab: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.08] bg-[#060608]/90 px-3 py-2 backdrop-blur-2xl md:px-6">
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0e0e13] border border-white/[0.08]">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-xs font-bold tracking-tight transition-all duration-150",
                on
                  ? "bg-white text-black shadow-sm"
                  : "text-[#8e8e9c] hover:text-white hover:bg-white/[0.05]",
              )}
            >
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
