import { build } from "vite";
import { createApp } from "./app.ts";

// Watch ordinary external assets so development can enforce the same CSP as production.
// Reload the page after a rebuild; no inline Vite scripts or style injection are needed.
const watcher = await build({
  mode: "development",
  build: { watch: {}, minify: false },
});
if (!("on" in watcher))
  throw new Error("The frontend build watcher could not start.");
await new Promise<void>((resolve, reject) => {
  watcher.on("event", (event) => {
    if (event.code === "END") resolve();
    if (event.code === "ERROR") reject(new Error(event.error.message));
  });
});
const portIndex = process.argv.indexOf("--port");
const port =
  Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT) ||
  3000;
const server = createApp({
  env: { ...process.env, NODE_ENV: "development" },
}).listen(port, "0.0.0.0", () =>
  console.log(`Gatherly preview ready on ${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void watcher.close().finally(() => server.close());
  });
