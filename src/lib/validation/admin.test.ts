import { describe, expect, it } from "vitest";
import { seasonsOverlap } from "@/lib/resorts/seasons";
import { resortSchema, seasonSchema, vacationDecisionSchema } from "./admin";

const resort = {
  slug: "Neues-Resort",
  name: "Neues Resort",
  location: "Bregenz",
  country: "at",
  description: "Ein neues Resort am See.",
  amenities: "Pool\n\n  Sauna \r\nSpa",
  checkInTime: "15:00",
  checkOutTime: "10:30:00",
  contactPhone: "",
  contactEmail: "",
  imageUrl: "",
  active: "on",
};

describe("resortSchema", () => {
  it("normalisiert Formularwerte", () => {
    expect(resortSchema.parse(resort)).toEqual({
      slug: "neues-resort",
      name: "Neues Resort",
      location: "Bregenz",
      country: "AT",
      description: "Ein neues Resort am See.",
      amenities: ["Pool", "Sauna", "Spa"],
      checkInTime: "15:00:00",
      checkOutTime: "10:30:00",
      contactPhone: null,
      contactEmail: null,
      imageUrl: null,
      active: true,
    });
    expect(resortSchema.parse({ ...resort, active: null }).active).toBe(false);
  });

  it("lehnt ungültige Kurznamen, E-Mails, URLs und Zeiten ab", () => {
    expect(resortSchema.safeParse({ ...resort, slug: "mit leerzeichen" }).success).toBe(false);
    expect(resortSchema.safeParse({ ...resort, slug: "-x-" }).success).toBe(false);
    expect(resortSchema.safeParse({ ...resort, contactEmail: "keine-mail" }).success).toBe(false);
    expect(
      resortSchema.safeParse({ ...resort, imageUrl: "http://example.com/a.jpg" }).success,
    ).toBe(false);
    expect(resortSchema.safeParse({ ...resort, imageUrl: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(resortSchema.safeParse({ ...resort, checkInTime: "25:00" }).success).toBe(false);
    expect(resortSchema.safeParse({ ...resort, country: "DEU" }).success).toBe(false);
  });

  it("akzeptiert https-Bild und gültige E-Mail", () => {
    const r = resortSchema.parse({
      ...resort,
      imageUrl: "https://example.com/bild.jpg",
      contactEmail: "info@example.com",
    });
    expect(r.imageUrl).toBe("https://example.com/bild.jpg");
    expect(r.contactEmail).toBe("info@example.com");
  });
});

describe("seasonSchema", () => {
  const s = { name: "Sommer", type: "peak", startDate: "2027-07-01", endDate: "2027-08-31" };
  it("prüft Reihenfolge und Typ", () => {
    expect(seasonSchema.safeParse(s).success).toBe(true);
    expect(
      seasonSchema.safeParse({ ...s, startDate: "2027-07-01", endDate: "2027-07-01" }).success,
    ).toBe(true);
    expect(seasonSchema.safeParse({ ...s, endDate: "2027-06-30" }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...s, type: "mega" }).success).toBe(false);
  });
});

describe("seasonsOverlap", () => {
  const a = { startDate: "2027-07-01", endDate: "2027-07-31" };
  it("Start- und Endtag sind inklusive", () => {
    expect(seasonsOverlap(a, { startDate: "2027-07-31", endDate: "2027-08-10" })).toBe(true);
    expect(seasonsOverlap(a, { startDate: "2027-08-01", endDate: "2027-08-10" })).toBe(false);
    expect(seasonsOverlap(a, { startDate: "2027-06-01", endDate: "2027-06-30" })).toBe(false);
  });
});

describe("vacationDecisionSchema", () => {
  it("erlaubt nur bestätigen oder ablehnen", () => {
    expect(vacationDecisionSchema.safeParse({ id: "1", decision: "approved" }).success).toBe(true);
    expect(vacationDecisionSchema.safeParse({ id: "1", decision: "cancelled" }).success).toBe(
      false,
    );
  });
});
