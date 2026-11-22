import { createFileRoute } from "@tanstack/react-router";
import { CommandCenter } from "@/components/command/command-center";

export const Route = createFileRoute("/command")({ component: Command });

function Command() {
  return <CommandCenter />;
}
