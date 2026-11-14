export type HealthStatus = {
  status: "ok" | "degraded";
  time: string;
  checks: Record<string, "ok" | "error" | "skipped">;
};

type Check = () => Promise<boolean>;

/** Führt alle Checks aus; ein fehlgeschlagener Check macht den Status "degraded". */
export async function runHealthChecks(
  checks: Record<string, Check | undefined>,
  now: () => Date = () => new Date(),
): Promise<HealthStatus> {
  const results: HealthStatus["checks"] = {};
  for (const [name, check] of Object.entries(checks)) {
    if (!check) {
      results[name] = "skipped";
      continue;
    }
    try {
      results[name] = (await check()) ? "ok" : "error";
    } catch {
      results[name] = "error";
    }
  }
  const status = Object.values(results).includes("error") ? "degraded" : "ok";
  return { status, time: now().toISOString(), checks: results };
}
