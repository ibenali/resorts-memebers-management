import { describe, expect, it } from "vitest";
import { vacationRequestSchema } from "@/lib/validation/vacation";
import { canCancel, checkDateRules, rangesOverlap } from "./rules";

const today = "2026-11-14";

describe("checkDateRules", () => {
  it("akzeptiert gültige Zeiträume ab heute", () => {
    expect(checkDateRules("2026-11-14", "2026-11-15", today)).toBeNull();
    expect(checkDateRules("2026-12-01", "2026-12-29", today)).toBeNull(); // 28 Nächte
  });
  it("lehnt Vergangenheit, falsche Reihenfolge und zu lange Aufenthalte ab", () => {
    expect(checkDateRules("2026-11-13", "2026-11-20", today)).toBe("start_in_past");
    expect(checkDateRules("2026-12-01", "2026-12-01", today)).toBe("end_before_start");
    expect(checkDateRules("2026-12-05", "2026-12-01", today)).toBe("end_before_start");
    expect(checkDateRules("2026-12-01", "2026-12-30", today)).toBe("too_long");
    expect(checkDateRules("2026-12-01", "2026-12-10", today, 7)).toBe("too_long");
  });
});

describe("rangesOverlap", () => {
  const a = { startDate: "2026-07-01", endDate: "2026-07-08" };
  it("erkennt Überschneidungen", () => {
    expect(rangesOverlap(a, { startDate: "2026-07-07", endDate: "2026-07-10" })).toBe(true);
    expect(rangesOverlap(a, { startDate: "2026-06-25", endDate: "2026-07-20" })).toBe(true);
  });
  it("erlaubt Anreise am Abreisetag", () => {
    expect(rangesOverlap(a, { startDate: "2026-07-08", endDate: "2026-07-10" })).toBe(false);
    expect(rangesOverlap(a, { startDate: "2026-06-25", endDate: "2026-07-01" })).toBe(false);
  });
});

describe("canCancel", () => {
  it("nur ausstehende Anfragen", () => {
    expect(canCancel("pending")).toBe(true);
    expect(canCancel("approved")).toBe(false);
    expect(canCancel("rejected")).toBe(false);
    expect(canCancel("cancelled")).toBe(false);
  });
});

describe("vacationRequestSchema", () => {
  const base = { resortId: "1", startDate: "2026-12-01", endDate: "2026-12-08", guests: "2" };
  it("parst Formularwerte", () => {
    expect(vacationRequestSchema.parse({ ...base, note: "  " })).toEqual({
      resortId: 1,
      startDate: "2026-12-01",
      endDate: "2026-12-08",
      guests: 2,
      note: null,
    });
  });
  it("lehnt ungültige Daten und Personenzahlen ab", () => {
    expect(vacationRequestSchema.safeParse({ ...base, startDate: "2026-02-30" }).success).toBe(
      false,
    );
    expect(vacationRequestSchema.safeParse({ ...base, startDate: "01.12.2026" }).success).toBe(
      false,
    );
    expect(vacationRequestSchema.safeParse({ ...base, guests: "0" }).success).toBe(false);
    expect(vacationRequestSchema.safeParse({ ...base, guests: "11" }).success).toBe(false);
  });
});
