import { expect, test } from "@playwright/test";
import { loginAs, resetMembers } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetMembers();
  await loginAs(page, "M100001", "Urlaub-2026-Test");
});

test("Resortliste zeigt alle aktiven Resorts", async ({ page }) => {
  await page.goto("/resorts");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Alpenhof Tirol",
    "Costa Dorada Mar",
    "Resort Seeblick",
  ]);
});

test("Resortdetail mit Ausstattung, Kontakt und Saisonkalender", async ({ page }) => {
  await page.goto("/resorts");
  await page.getByRole("link", { name: /Alpenhof Tirol/ }).click();
  await expect(page).toHaveURL(/\/resorts\/alpenhof-tirol$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alpenhof Tirol");
  await expect(page.getByText("Seefeld in Tirol, Österreich")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Sauna" })).toBeVisible();
  await expect(page.getByText("16:00 Uhr")).toBeVisible();
  await expect(page.getByRole("link", { name: "alpenhof@example.com" })).toBeVisible();

  const calendar = page.getByRole("region", { name: "Saisonkalender" });
  await expect(calendar.getByRole("table").first()).toBeVisible();
  await expect(calendar.getByText("(aktuell)")).toHaveCount(1);
  await expect(calendar.getByText("Hauptsaison").first()).toBeVisible();
});

test("unbekanntes Resort zeigt eine Hinweisseite", async ({ page }) => {
  const res = await page.goto("/resorts/gibt-es-nicht");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Dieses Resort gibt es nicht")).toBeVisible();
});
