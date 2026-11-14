import { describe, expect, it } from "vitest";
import { findSeasonForDate, groupSeasonsByYear, type SeasonLike } from "./seasons";

const seasons: SeasonLike[] = [
  { id: 3, name: "Winter 27", type: "low", startDate: "2027-01-01", endDate: "2027-03-31" },
  { id: 1, name: "Sommer", type: "peak", startDate: "2026-07-01", endDate: "2026-08-31" },
  { id: 2, name: "Herbst", type: "high", startDate: "2026-09-01", endDate: "2026-10-31" },
];

describe("findSeasonForDate", () => {
  it("findet die Saison inklusive Start- und Endtag", () => {
    expect(findSeasonForDate(seasons, "2026-07-01")?.id).toBe(1);
    expect(findSeasonForDate(seasons, "2026-08-31")?.id).toBe(1);
    expect(findSeasonForDate(seasons, "2026-09-01")?.id).toBe(2);
  });
  it("gibt null außerhalb aller Saisons", () => {
    expect(findSeasonForDate(seasons, "2026-12-24")).toBeNull();
  });
});

describe("groupSeasonsByYear", () => {
  it("gruppiert und sortiert nach Jahr und Startdatum", () => {
    const grouped = groupSeasonsByYear(seasons);
    expect(grouped.map(([y, s]) => [y, s.map((x) => x.id)])).toEqual([
      [2026, [1, 2]],
      [2027, [3]],
    ]);
  });
});
