import { Badge } from "@/components/ui/badge";

const HELPLINES = [
  {
    label: "National disaster response",
    title: "NDRF control room",
    number: "1078",
    note: "24×7 emergency rescue",
    tone: "crit" as const,
  },
  {
    label: "State & district control",
    title: "SDMA / DDMA helpline",
    number: "1070 / 1077",
    note: "District -disaster control rooms",
    tone: "accent" as const,
  },
  {
    label: "Himalayan & hill ops",
    title: "Mountain rescue line",
    number: "0364-2225289",
    note: "High-altitude relief force",
    tone: "watch" as const,
  },
  {
    label: "Medical emergency",
    title: "Ambulance service",
    number: "108",
    note: "Rapid medical relief",
    tone: "safe" as const,
  },
];

const STAGES = [
  {
    n: "01",
    title: "Pre-impact (T-minus 4 hours)",
    tone: "accent" as const,
    items: [
      "Alert ward volunteers and panchayat secretaries to activate public sirens.",
      "Verify generator reserves at designated community relief centers.",
      "Inspect primary storm drains to prevent debris blockage backflow.",
    ],
  },
  {
    n: "02",
    title: "Evacuation (T-minus 2 hours)",
    tone: "watch" as const,
    items: [
      "Order structured evacuation of households in high-slope shear zones (slopes > 25°).",
      "Guide elderly and vulnerable residents to designated high-ground shelters.",
      "Shut down low-lying transformers to prevent waterborne electrocution.",
    ],
  },
  {
    n: "03",
    title: "Active impact (T-minus 0)",
    tone: "crit" as const,
    items: [
      "Hold NDRF squads at low-lying river-bank catchments.",
      "Enforce perimeter blockades along active landslide highway passes.",
      "Run real-time casualty and head-count checks across local relief shelters.",
    ],
  },
];

export function PlaybookView() {
  return (
    <div className="tab-enter mx-auto w-full max-w-6xl p-4 md:p-8">
      <Badge>Disaster response playbook</Badge>
      <h2 className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-fg md:text-3xl">
        Emergency operations & civil protection
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
        Standard operating procedures and helplines for District Disaster Management Authorities,
        NDRF squads and ward response teams.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {HELPLINES.map((h) => (
          <div
            key={h.number}
            className="rounded-2xl border border-border border-l-4 bg-panel p-4"
            style={{
              borderLeftColor:
                h.tone === "crit"
                  ? "var(--color-crit)"
                  : h.tone === "watch"
                    ? "var(--color-watch)"
                    : h.tone === "safe"
                      ? "var(--color-safe)"
                      : "var(--color-accent)",
            }}
          >
            <div className="font-mono text-[10px] font-bold uppercase text-muted">{h.label}</div>
            <div className="mt-1 font-sans text-lg font-extrabold text-fg">{h.title}</div>
            <div
              className="mt-1 font-mono text-xl font-black tabular-nums"
              style={{
                color:
                  h.tone === "crit"
                    ? "var(--color-crit)"
                    : h.tone === "watch"
                      ? "var(--color-watch)"
                      : h.tone === "safe"
                        ? "var(--color-safe)"
                        : "var(--color-accent)",
              }}
            >
              {h.number}
            </div>
            <p className="mt-1 text-[11px] text-muted">{h.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {STAGES.map((s) => (
          <div key={s.n} className="rounded-2xl border border-border bg-panel p-6">
            <div
              className="mb-4 flex size-10 items-center justify-center rounded-xl border font-mono text-lg font-bold"
              style={{
                color:
                  s.tone === "crit"
                    ? "var(--color-crit)"
                    : s.tone === "watch"
                      ? "var(--color-watch)"
                      : "var(--color-accent)",
                borderColor: "currentColor",
                background: "color-mix(in oklab, currentColor 16%, transparent)",
              }}
            >
              {s.n}
            </div>
            <h3 className="mb-2 font-sans text-lg font-bold text-fg">{s.title}</h3>
            <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
