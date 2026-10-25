import { createServer } from "vite";
import { createApp } from "./app.ts";
const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "spa",
});
const app = createApp({
  env: { ...process.env, NODE_ENV: "development" },
  devMiddleware: vite.middlewares,
});
const portIndex = process.argv.indexOf("--port");
const port =
  Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT) ||
  3000;
app.listen(port, "0.0.0.0", () =>
  console.log(`Gatherly preview ready on ${port}`),
);
