import { describe, expect, it } from "vitest";
import { runHealthChecks } from "./health";

const fixedNow = () => new Date("2026-01-01T00:00:00Z");

describe("runHealthChecks", () => {
  it("meldet ok, wenn alle Checks bestehen", async () => {
    const result = await runHealthChecks({ db: async () => true }, fixedNow);
    expect(result).toEqual({
      status: "ok",
      time: "2026-01-01T00:00:00.000Z",
      checks: { db: "ok" },
    });
  });

  it("meldet degraded bei Fehlern oder Exceptions", async () => {
    const result = await runHealthChecks(
      {
        db: async () => {
          throw new Error("down");
        },
        other: async () => false,
      },
      fixedNow,
    );
    expect(result.status).toBe("degraded");
    expect(result.checks).toEqual({ db: "error", other: "error" });
  });

  it("überspringt nicht konfigurierte Checks", async () => {
    const result = await runHealthChecks({ db: undefined }, fixedNow);
    expect(result.status).toBe("ok");
    expect(result.checks.db).toBe("skipped");
  });
});
