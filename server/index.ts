import { createApp } from "./app.ts";
const server = createApp().listen(
  Number(process.env.PORT) || 3000,
  "0.0.0.0",
  () => console.log("Gatherly is ready."),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
