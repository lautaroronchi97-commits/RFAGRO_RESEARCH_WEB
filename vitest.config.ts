import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node", // las libs testeadas son puras: sin DOM
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "supabase/functions/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
