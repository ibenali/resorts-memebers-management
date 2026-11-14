import { describe, expect, it } from "vitest";
import { expandSeasons, seedMembers, seedResorts } from "./seed-data";

const dayOfYear = (mmdd: string) => {
  const [m, d] = mmdd.split("-").map(Number);
  return Date.UTC(2025, m - 1, d); // kein Schaltjahr, nur zum Vergleichen
};

describe("Seed-Daten", () => {
  it("hat 3 Resorts, 2 Test-Mitglieder und 1 Admin mit eindeutigen Schlüsseln", () => {
    expect(seedResorts).toHaveLength(3);
    expect(new Set(seedResorts.map((r) => r.slug)).size).toBe(3);
    expect(seedMembers).toHaveLength(3);
    expect(new Set(seedMembers.map((m) => m.memberNo)).size).toBe(3);
    expect(seedMembers.filter((m) => m.role === "admin")).toHaveLength(1);
  });

  it.each(seedResorts.map((r) => [r.slug, r] as const))(
    "Saisons von %s decken das Jahr lückenlos und ohne Überlappung ab",
    (_slug, resort) => {
      const sorted = [...resort.seasons].sort((a, b) => dayOfYear(a.start) - dayOfYear(b.start));
      expect(sorted[0].start).toBe("01-01");
      expect(sorted.at(-1)!.end).toBe("12-31");
      for (let i = 1; i < sorted.length; i++) {
        const prevEnd = dayOfYear(sorted[i - 1].end);
        expect(dayOfYear(sorted[i].start) - prevEnd).toBe(24 * 60 * 60 * 1000);
      }
    },
  );

  it("Test-Passwörter erfüllen die Mindestlänge von 10 Zeichen", () => {
    for (const m of seedMembers) expect(m.password.length).toBeGreaterThanOrEqual(10);
  });

  it("expandSeasons rollt Saisons für jedes Jahr aus", () => {
    const result = expandSeasons(
      [{ name: "S", type: "peak", start: "07-01", end: "08-31" }],
      [2026, 2027],
    );
    expect(result).toEqual([
      { name: "S", type: "peak", startDate: "2026-07-01", endDate: "2026-08-31" },
      { name: "S", type: "peak", startDate: "2027-07-01", endDate: "2027-08-31" },
    ]);
  });
});
