import { createHash } from "node:crypto";
import { expect, type BrowserContext, type Cookie, type Page } from "@playwright/test";

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

/** SHA-256 (hex), so wie Session-Tokens in der DB stehen. */
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Das Session-Cookie des Kontexts (Name aus authConfig: "session"). */
export async function sessionCookie(context: BrowserContext): Promise<Cookie> {
  const cookie = (await context.cookies()).find((c) => c.name === "session");
  expect(cookie, "Session-Cookie fehlt").toBeDefined();
  return cookie!;
}
