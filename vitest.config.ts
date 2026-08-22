import { defineConfig } from "vitest/config";

// Pure geometry/scoring functions are tested in a plain node environment.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
