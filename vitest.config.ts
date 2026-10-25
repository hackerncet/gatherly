import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/ui/**/*.test.tsx"],
    setupFiles: ["tests/ui/setup.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: [
        "src/components/EventForm.tsx",
        "src/components/DownloadLink.tsx",
        "src/pages/Guide.tsx",
        "src/lib/api.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
});
