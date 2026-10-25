import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// Render inherits NODE_ENV=production. React's test-only act API must be
// selected before loading Vitest or React; the deployed runtime stays production.
const result = spawnSync(
  process.execPath,
  [
    resolve(import.meta.dirname, "../node_modules/vitest/vitest.mjs"),
    "run",
    "--coverage",
    ...process.argv.slice(2),
  ],
  { env: { ...process.env, NODE_ENV: "test" }, stdio: "inherit" },
);
if (result.error)
  console.error(
    "Component tests could not start. Check the installed dependencies.",
  );
process.exit(result.status ?? 1);
