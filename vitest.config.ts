import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@cor-matrix": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/helpers/test-setup.ts"],
    testTimeout: 60000,
    hookTimeout: 90000,
    retry: 1,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
  esbuild: {
    target: "node18",
  },
});
