import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
const html = readFileSync("dist/index.html", "utf8");
const entries = [
  {
    label: "Initial JavaScript",
    path: html.match(/<script[^>]*src="([^\"]+\.js)"/)?.[1],
    max: 400000,
    maxGzip: 125000,
  },
  {
    label: "Main stylesheet",
    path: html.match(/<link[^>]*href="([^\"]+\.css)"/)?.[1],
    max: 75000,
    maxGzip: 16000,
  },
];
for (const entry of entries) {
  if (!entry.path) throw new Error(`Missing ${entry.label} production asset.`);
  const bytes = readFileSync(resolve("dist", entry.path.replace(/^\//, "")));
  const gzip = gzipSync(bytes).byteLength;
  console.log(`${entry.label}: ${bytes.byteLength} bytes / ${gzip} bytes gzip`);
  if (bytes.byteLength > entry.max || gzip > entry.maxGzip)
    throw new Error(`${entry.label} exceeds its reviewed size budget.`);
}
