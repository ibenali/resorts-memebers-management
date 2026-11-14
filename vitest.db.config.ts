import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integrationstests gegen eine echte MySQL-Datenbank (DATABASE_URL), getrennt von
// den Unit-Tests, damit `npm test` ohne Datenbank läuft.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["**/*.db.test.ts"], exclude: ["node_modules/**"] },
});
