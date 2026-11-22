import { createFileRoute } from "@tanstack/react-router";
import { SituationCommand } from "@/components/landing/situation-command";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <SituationCommand />;
}
