import { describe, expect, it } from "vitest";
import { feedbackSchema } from "./feedback";

const base = { category: "resort", subject: "Toller Pool", message: "Der Pool war sehr sauber." };

describe("feedbackSchema", () => {
  it("akzeptiert gültiges Feedback und leeres Resort als null", () => {
    expect(feedbackSchema.parse({ ...base, resortId: "" }).resortId).toBeNull();
    expect(feedbackSchema.parse({ ...base, resortId: "3" }).resortId).toBe(3);
  });
  it("lehnt unbekannte Kategorie, zu kurze Texte und ungültige IDs ab", () => {
    expect(feedbackSchema.safeParse({ ...base, category: "spam" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...base, subject: " a " }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...base, message: "kurz" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...base, resortId: "-1" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...base, message: "x".repeat(5001) }).success).toBe(false);
  });
});
