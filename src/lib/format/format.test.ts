import { describe, expect, it } from "vitest";
import { countryName, formatDate, formatTime, nightsBetween, todayIso } from "./index";

describe("Formatierung", () => {
  it("formatiert Datum und Uhrzeit deutsch", () => {
    expect(formatDate("2026-07-01")).toBe("01.07.2026");
    expect(formatTime("15:00:00")).toBe("15:00 Uhr");
  });
  it("übersetzt Ländercodes", () => {
    expect(countryName("AT")).toBe("Österreich");
  });
  it("ermittelt 'heute' in Berliner Zeit", () => {
    // 23:30 UTC am 31.12. ist in Berlin schon der 1.1.
    expect(todayIso(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
  it("zählt Nächte, auch über die Zeitumstellung", () => {
    expect(nightsBetween("2026-03-28", "2026-04-02")).toBe(5);
  });
});
