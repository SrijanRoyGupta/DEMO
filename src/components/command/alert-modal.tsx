import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

export type ModalPayload = {
  level: Exclude<RiskLevel, "SAFE">;
  location: string;
  score: number;
  eta: string;
  directive: string;
};

export function AlertModal({
  payload,
  onClose,
}: {
  payload: ModalPayload | null;
  onClose: () => void;
}) {
  if (!payload) return null;
  const crit = payload.level === "CRITICAL";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-md">
      <div
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-3xl border-2 bg-panel p-6 shadow-2xl md:p-8",
          crit ? "border-crit" : "border-watch",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:text-fg"
          aria-label="Close alert"
        >
          <X className="size-5" />
        </button>
        <div className="mb-4 flex items-start gap-3 border-b border-border pb-4">
          <span
            className={cn(
              "rounded-2xl border p-2.5",
              crit ? "border-crit/50 bg-crit/20 text-crit" : "border-watch/50 bg-watch/20 text-watch",
            )}
          >
            <ShieldAlert className="size-6" />
          </span>
          <div>
            <Badge tone={crit ? "crit" : "watch"}>{crit ? "Emergency alert" : "Watch condition"}</Badge>
            <h3 className={cn("mt-1 font-sans text-xl font-extrabold md:text-2xl", crit ? "text-crit" : "text-watch")}>
              {crit ? "Critical disaster warning" : "Elevated watch condition"}
            </h3>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-panel-2 p-4 font-mono text-xs">
          <Row label="Affected location" value={payload.location} />
          <Row
            label="Composite risk index"
            value={`${payload.score} / 100`}
            valueClass={crit ? "text-crit" : "text-watch"}
          />
          <Row label="Estimated lead time" value={payload.eta} valueClass="text-accent" />
        </div>
        <div className="mt-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
            Recommended safety action
          </p>
          <p className="mt-1 rounded-xl border border-border bg-panel-2/80 p-3 text-sm leading-relaxed text-fg">
            {payload.directive}
          </p>
        </div>
        <Button variant={crit ? "solidCrit" : "watch"} className="mt-6 w-full" onClick={onClose}>
          Acknowledge alert & dispatch protocols
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={cn("font-bold text-fg", valueClass)}>{value}</span>
    </div>
  );
}
