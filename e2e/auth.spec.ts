import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { resetMembers, withDb } from "./db";

const ANNA = { memberNo: "M100001", password: "Urlaub-2026-Test" };
const BEN = { memberNo: "M100002", password: "Erstpasswort-2026" };
const INVALID = /Mitgliedsnummer oder Passwort falsch/;

// Nur Meldungen im Formular, nicht Next.js' unsichtbarer Route-Announcer (auch role=alert).
const formAlert = (page: Page) => page.locator("form").getByRole("alert");

async function login(page: Page, memberNo: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Mitgliedsnummer").fill(memberNo);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

test.beforeEach(async () => {
  await resetMembers();
});

test("geschützte Seiten leiten ohne Session zum Login um", async ({ page }) => {
  await page.goto("/resorts");
  await expect(page).toHaveURL(/\/login\?next=%2Fresorts$/);
});

test("ein gefälschtes Session-Cookie öffnet nichts", async ({ page, context }) => {
  await context.addCookies([
    { name: "session", value: "gefaelscht", domain: "localhost", path: "/" },
  ]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("Login, Rücksprung zum Ziel und Logout", async ({ page }) => {
  await page.goto("/resorts");
  await page.getByLabel("Mitgliedsnummer").fill("m100001");
  await page.getByLabel("Passwort").fill(ANNA.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/resorts$/);
  await expect(page.getByText("Anna Beispiel")).toBeVisible();

  const cookie = (await page.context().cookies()).find((c) => c.name === "session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);

  const actions = await withDb(async (c) => {
    const [rows] = await c.query("SELECT action FROM audit_log ORDER BY id");
    return (rows as { action: string }[]).map((r) => r.action);
  });
  expect(actions).toEqual(["login_success", "logout"]);
});

test("falsches Passwort und unbekannte Nummer geben dieselbe Meldung", async ({ page }) => {
  await login(page, ANNA.memberNo, "falsches-passwort");
  await expect(formAlert(page)).toHaveText(INVALID);
  await login(page, "M999999", "falsches-passwort");
  await expect(formAlert(page)).toHaveText(INVALID);
});

test("nach 5 Fehlversuchen ist das Konto gesperrt, auch für das richtige Passwort", async ({
  page,
}) => {
  for (let i = 0; i < 5; i++) {
    await login(page, ANNA.memberNo, `falsch-${i}-xxxxx`);
    await expect(formAlert(page)).toBeVisible();
  }
  await login(page, ANNA.memberNo, ANNA.password);
  await expect(formAlert(page)).toHaveText(INVALID);
  await expect(page).toHaveURL(/\/login/);

  const locked = await withDb(async (c) => {
    const [rows] = await c.query(
      "SELECT locked_until > NOW() AS locked FROM members WHERE member_no = ?",
      [ANNA.memberNo],
    );
    return (rows as { locked: number }[])[0].locked;
  });
  expect(locked).toBe(1);
});

test("erzwungener Passwortwechsel beim ersten Login", async ({ page }) => {
  // Seed-Zustand für Ben herstellen, damit der Test wiederholbar ist.
  const hash = await bcrypt.hash(BEN.password, 4);
  await withDb((c) =>
    c.query("UPDATE members SET password_hash = ?, must_change_password = 1 WHERE member_no = ?", [
      hash,
      BEN.memberNo,
    ]),
  );

  await login(page, BEN.memberNo, BEN.password);
  await expect(page).toHaveURL(/\/passwort-aendern$/);

  // Andere Seiten bleiben gesperrt, bis das Passwort geändert ist.
  await page.goto("/resorts");
  await expect(page).toHaveURL(/\/passwort-aendern$/);

  await page.getByLabel("Aktuelles Passwort").fill(BEN.password);
  await page.getByLabel("Neues Passwort", { exact: true }).fill("passwort123");
  await page.getByLabel("Neues Passwort wiederholen").fill("passwort123");
  await page.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(formAlert(page)).toHaveText(/zu verbreitet/);

  const newPassword = "Neues-Ben-Passwort-9";
  await page.getByLabel("Aktuelles Passwort").fill(BEN.password);
  await page.getByLabel("Neues Passwort", { exact: true }).fill(newPassword);
  await page.getByLabel("Neues Passwort wiederholen").fill(newPassword);
  await page.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Willkommen, Ben" })).toBeVisible();

  await withDb(async (c) => {
    const [rows] = await c.query(
      "SELECT must_change_password AS m FROM members WHERE member_no = ?",
      [BEN.memberNo],
    );
    expect((rows as { m: number }[])[0].m).toBe(0);
  });
});
