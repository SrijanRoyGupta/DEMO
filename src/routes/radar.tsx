import { createFileRoute } from "@tanstack/react-router";
import { LiveRadarPage } from "@/components/radar/live-radar-page";

export const Route = createFileRoute("/radar")({ component: RadarRoute });

function RadarRoute() {
  return <LiveRadarPage />;
}
