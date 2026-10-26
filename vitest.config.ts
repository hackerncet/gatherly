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
      reportsDirectory: "coverage/ui",
      include: [
        "src/**/*.tsx",
        "src/lib/use*.ts",
        "src/lib/api.ts",
        "src/lib/navigation.ts",
      ],
      exclude: ["src/main.tsx"],
      reporter: ["text", "json-summary", "html"],
      thresholds: { lines: 85, statements: 85, functions: 80, branches: 80 },
    },
  },
});
