import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema } from "./auth";

describe("loginSchema", () => {
  it("normalisiert die Mitgliedsnummer", () => {
    const r = loginSchema.parse({ memberNo: "  m100001 ", password: "x" });
    expect(r.memberNo).toBe("M100001");
  });
  it("lehnt leere oder zu lange Eingaben ab", () => {
    expect(loginSchema.safeParse({ memberNo: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ memberNo: "M1", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ memberNo: "M".repeat(21), password: "x" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("meldet abweichende Wiederholung", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "alt",
      newPassword: "Neues-Passwort-1",
      confirmPassword: "Neues-Passwort-2",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("mismatch");
  });
});
