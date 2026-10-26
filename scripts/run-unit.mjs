import { mkdirSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

mkdirSync("coverage/core", { recursive: true });
const tests = readdirSync("tests")
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => `tests/${name}`);
const result = spawnSync(
  process.execPath,
  [
    "--test",
    "--experimental-test-coverage",
    "--test-coverage-include=src/lib/*.ts",
    "--test-coverage-include=server/*.ts",
    "--test-coverage-exclude=src/lib/use*.ts",
    "--test-coverage-exclude=src/lib/api.ts",
    "--test-coverage-exclude=server/index.ts",
    "--test-coverage-exclude=server/dev.ts",
    "--test-coverage-lines=95",
    "--test-coverage-functions=90",
    "--test-coverage-branches=90",
    "--test-reporter=spec",
    "--test-reporter-destination=stdout",
    "--test-reporter=lcov",
    "--test-reporter-destination=coverage/core/core.lcov",
    ...process.argv.slice(2),
    ...tests,
  ],
  { stdio: "inherit" },
);
if (result.error)
  console.error(
    "Core tests could not start. Check the installed dependencies.",
  );
process.exit(result.status ?? 1);
