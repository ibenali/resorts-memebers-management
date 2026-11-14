import { describe, expect, it } from "vitest";
import { addressSchema } from "./profile";

const valid = { street: "Seestraße 12", postalCode: "88131", city: "Lindau", country: "DE" };

describe("addressSchema", () => {
  it("akzeptiert gültige Adressen und trimmt", () => {
    expect(addressSchema.parse({ ...valid, city: "  Lindau " }).city).toBe("Lindau");
    expect(
      addressSchema.parse({ ...valid, postalCode: "SW1A 1AA", country: "GB" }).postalCode,
    ).toBe("SW1A 1AA");
  });
  it("lehnt fehlende Felder, ungültige PLZ und unbekannte Länder ab", () => {
    expect(addressSchema.safeParse({ ...valid, street: "" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, postalCode: "<script>" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, country: "XX" }).success).toBe(false);
  });
});
