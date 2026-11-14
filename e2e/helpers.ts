import { expect, type Page } from "@playwright/test";

export { resetMembers, withDb } from "./db";

export const ANNA = { memberNo: "M100001", password: "Urlaub-2026-Test" };

/** Meldet über das Formular an und wartet, bis die Startseite geladen ist. */
export async function loginAs(page: Page, memberNo: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Mitgliedsnummer").fill(memberNo);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
}

/** Meldungen im Formular (nicht Next.js' Route-Announcer, der ebenfalls role=alert hat). */
export const formAlert = (page: Page) => page.locator("main form").getByRole("alert");
