import { readFileSync } from "node:fs";

const report = JSON.parse(
  readFileSync(process.argv[2] ?? "results/javascript.sarif", "utf8"),
);
if (!Array.isArray(report.runs) || !report.runs.length)
  throw new Error("CodeQL did not produce an analyzable SARIF report.");
const findings = report.runs
  .flatMap((run) => run.results ?? [])
  .filter(
    (result) =>
      !["pass", "notApplicable", "informational"].includes(result.kind),
  );
for (const finding of findings) {
  const location = finding.locations?.[0]?.physicalLocation;
  console.error(
    `${finding.ruleId ?? "CodeQL finding"}: ${location?.artifactLocation?.uri ?? "unknown file"}:${location?.region?.startLine ?? "?"}`,
  );
}
console.log(`CodeQL security-and-quality findings: ${findings.length}`);
if (findings.length)
  throw new Error("Resolve CodeQL findings before releasing this revision.");
