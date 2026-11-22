import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load `.env` (project root) into `process.env` once, on first import.
 *
 * This workspace's Vite config never calls `loadEnv`, so plain `.env` values
 * are otherwise invisible to server code — only `.grok/app-env.json`
 * (VITE_-prefixed only, see with-app-env.mjs) gets merged in. A real
 * `process.env` entry set some other way (shell export, hosting provider)
 * always wins over the file, same precedence as with-app-env.mjs.
 */
function loadDotEnv() {
  try {
    const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
    const text = readFileSync(join(root, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // No .env file — fine, nothing to load.
  }
}
loadDotEnv();

export function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/**
 * Workspace preview vs deployed app. The deployer writes GROK_PROJECT_ID on
 * every publish; the sandbox preview never has it. Single source of truth for
 * the split — gate audience, gate endpoints and connector-token semantics all
 * key off this predicate.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
}
