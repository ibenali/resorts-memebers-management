import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { ANNA, formAlert, loginAs, resetMembers, withDb } from "./helpers";

// Seed-Passwort und -Adresse von Anna herstellen (auch für nachfolgende Specs).
async function restoreAnna() {
  // Kosten 12 wie im Seed, sonst verfälscht der schnellere Hash den Timing-Test in qa-security.
  const hash = await bcrypt.hash(ANNA.password, 12);
  await withDb((c) =>
    c.query(
      `UPDATE members SET password_hash = ?, street = 'Musterstraße 1', postal_code = '10115',
       city = 'Berlin', country = 'DE' WHERE member_no = ?`,
      [hash, ANNA.memberNo],
    ),
  );
}

test.beforeEach(async ({ page }) => {
  await resetMembers();
  await restoreAnna();
  await loginAs(page, ANNA.memberNo, ANNA.password);
});

test.afterAll(restoreAnna);

test("Adresse ändern", async ({ page }) => {
  await page.goto("/profil");
  await expect(page.getByLabel("Ort", { exact: true })).toHaveValue("Berlin");

  await page.getByLabel("Straße und Hausnummer").fill("Seestraße 12");
  await page.getByLabel("PLZ").fill("6020");
  await page.getByLabel("Ort", { exact: true }).fill("Innsbruck");
  await page.getByLabel("Land").selectOption({ label: "Österreich" });
  await page.getByRole("button", { name: "Adresse speichern" }).click();
  await expect(page.getByRole("status")).toHaveText(/gespeichert/);

  await page.reload();
  await expect(page.getByLabel("Ort", { exact: true })).toHaveValue("Innsbruck");
  await expect(page.getByLabel("Land")).toHaveValue("AT");
});

test("ungültige PLZ wird abgelehnt", async ({ page }) => {
  await page.goto("/profil");
  await page.getByLabel("PLZ").fill("<b>1</b>");
  await page.getByRole("button", { name: "Adresse speichern" }).click();
  await expect(formAlert(page)).toHaveText(/Bitte prüfen Sie die Adresse/);
});

test("Passwort ändern beendet andere Sessions", async ({ page, browser }) => {
  // Zweites Gerät
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await loginAs(otherPage, ANNA.memberNo, ANNA.password);

  await page.goto("/profil");
  await page.getByLabel("Aktuelles Passwort").fill("falsches-passwort");
  await page.getByLabel("Neues Passwort", { exact: true }).fill("Neues-Anna-Passwort-7");
  await page.getByLabel("Neues Passwort wiederholen").fill("Neues-Anna-Passwort-7");
  await page.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(formAlert(page)).toHaveText(/aktuelle Passwort ist nicht korrekt/);

  await page.getByLabel("Aktuelles Passwort").fill(ANNA.password);
  await page.getByLabel("Neues Passwort", { exact: true }).fill("Neues-Anna-Passwort-7");
  await page.getByLabel("Neues Passwort wiederholen").fill("Neues-Anna-Passwort-7");
  await page.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(page.getByRole("status")).toHaveText(/Passwort wurde geändert/);

  // Dieses Gerät bleibt angemeldet, das andere nicht.
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
  await otherPage.goto("/");
  await expect(otherPage).toHaveURL(/\/login/);
  await other.close();
});
