import { expect, test } from "@playwright/test";
import { ANNA, formAlert, loginAs, resetMembers, withDb } from "./helpers";

const ADMIN = { memberNo: "A000001", password: "Verwaltung-2026-Test" };

function inDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

test.beforeEach(async () => {
  await resetMembers();
  await withDb(async (c) => {
    await c.query("DELETE FROM vacation_requests");
    await c.query("DELETE FROM feedback");
    await c.query("DELETE FROM resorts WHERE slug LIKE 'e2e-%'");
  });
});

test("Mitglieder sehen den Verwaltungsbereich nicht", async ({ page }) => {
  await loginAs(page, ANNA.memberNo, ANNA.password);
  await expect(page.getByRole("link", { name: "Verwaltung" })).toHaveCount(0);
  const res = await page.goto("/admin/urlaub");
  expect(res?.status()).toBe(404);
});

test("Urlaubsanfrage bestätigen und ablehnen", async ({ page, browser }) => {
  await withDb((c) =>
    c.query(
      `INSERT INTO vacation_requests (member_id, resort_id, start_date, end_date, guests, note)
       SELECT m.id, r.id, ?, ?, 2, 'Erste Anfrage' FROM members m, resorts r
       WHERE m.member_no = 'M100001' AND r.slug = 'seeblick-bodensee'
       UNION ALL
       SELECT m.id, r.id, ?, ?, 4, 'Zweite Anfrage' FROM members m, resorts r
       WHERE m.member_no = 'M100001' AND r.slug = 'alpenhof-tirol'`,
      [inDays(20), inDays(25), inDays(40), inDays(45)],
    ),
  );

  await loginAs(page, ADMIN.memberNo, ADMIN.password);
  await page.getByRole("link", { name: "Verwaltung" }).click();
  await expect(page.getByText("Offene Urlaubsanfragen")).toBeVisible();
  await page.getByRole("link", { name: /Offene Urlaubsanfragen/ }).click();

  const first = page.getByRole("listitem").filter({ hasText: "Erste Anfrage" });
  await expect(first).toContainText("Anna Beispiel (M100001)");
  await first.getByRole("button", { name: "Bestätigen" }).click();
  await expect(page.getByRole("status")).toHaveText(/bestätigt/);

  page.once("dialog", (d) => d.accept());
  const second = page.getByRole("listitem").filter({ hasText: "Zweite Anfrage" });
  await second.getByRole("button", { name: "Ablehnen" }).click();
  await expect(page.getByRole("status")).toHaveText(/abgelehnt/);
  await expect(page.getByText("Keine Anfragen in dieser Ansicht.")).toBeVisible();

  // Das Mitglied sieht die Entscheidungen.
  const ctx = await browser.newContext();
  const member = await ctx.newPage();
  await loginAs(member, ANNA.memberNo, ANNA.password);
  await member.goto("/urlaub");
  await expect(member.getByRole("listitem").filter({ hasText: "Resort Seeblick" })).toContainText(
    "Bestätigt",
  );
  await expect(member.getByRole("listitem").filter({ hasText: "Alpenhof Tirol" })).toContainText(
    "Abgelehnt",
  );
  await ctx.close();
});

test("Feedback lesen und Status setzen", async ({ page }) => {
  await withDb((c) =>
    c.query(
      `INSERT INTO feedback (member_id, category, subject, message)
       SELECT id, 'website', 'Portal ist super', 'Alles funktioniert prima.' FROM members WHERE member_no = 'M100001'`,
    ),
  );
  await loginAs(page, ADMIN.memberNo, ADMIN.password);
  await page.goto("/admin/feedback");
  const item = page.getByRole("listitem").filter({ hasText: "Portal ist super" });
  await expect(item).toContainText("Anna Beispiel (M100001)");
  await expect(item.getByRole("link", { name: "Per E-Mail antworten" })).toHaveAttribute(
    "href",
    /^mailto:anna\.beispiel@example\.com/,
  );
  await item.getByRole("button", { name: "Als beantwortet markieren" }).click();
  await expect(page.getByRole("status")).toHaveText(/aktualisiert/);
  await page.goto("/admin/feedback?status=answered");
  await expect(page.getByText("Portal ist super")).toBeVisible();
});

test("Resort anlegen, Saison pflegen und für Mitglieder sichtbar machen", async ({ page }) => {
  await loginAs(page, ADMIN.memberNo, ADMIN.password);
  await page.goto("/admin/resorts/neu");
  await page.getByLabel("Name", { exact: true }).fill("E2E Testresort");
  await page.getByLabel(/Kurzname/).fill("e2e-testresort");
  await page.getByLabel("Ort", { exact: true }).fill("Bregenz");
  await page.getByLabel(/Land/).fill("AT");
  await page.getByLabel("Beschreibung").fill("Resort nur für automatische Tests.");
  await page.getByLabel(/Ausstattung/).fill("Pool\nSauna");
  await page.getByRole("button", { name: "Resort speichern" }).click();
  await expect(page.getByRole("status")).toHaveText(/gespeichert/);

  // Doppelter Kurzname
  await page.goto("/admin/resorts/neu");
  await page.getByLabel("Name", { exact: true }).fill("Doppelt");
  await page.getByLabel(/Kurzname/).fill("e2e-testresort");
  await page.getByLabel("Ort", { exact: true }).fill("Bregenz");
  await page.getByLabel("Beschreibung").fill("Noch ein Resort mit gleichem Kurznamen.");
  await page.getByRole("button", { name: "Resort speichern" }).click();
  await expect(formAlert(page)).toHaveText(/schon vergeben/);

  await page.goto("/admin/resorts");
  await page.getByRole("link", { name: /E2E Testresort/ }).click();
  const start = inDays(10);
  const end = inDays(60);
  await page.getByLabel("Bezeichnung").fill("Testsaison");
  await page.getByLabel("Kategorie").selectOption({ label: "Hauptsaison" });
  await page.getByLabel("Von").fill(start);
  await page.getByLabel("Bis (inklusive)").fill(end);
  await page.getByRole("button", { name: "Saison hinzufügen" }).click();
  await expect(page.getByRole("status")).toHaveText(/Saison wurde angelegt/);

  // Überschneidung wird abgelehnt
  await page.getByLabel("Bezeichnung").fill("Überlappend");
  await page.getByLabel("Von").fill(inDays(50));
  await page.getByLabel("Bis (inklusive)").fill(inDays(70));
  await page.getByRole("button", { name: "Saison hinzufügen" }).click();
  await expect(formAlert(page)).toHaveText(/überschneidet sich/);

  // Mitglieder sehen das neue Resort mit Saison
  await page.goto("/resorts/e2e-testresort");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Testresort");
  await expect(page.getByText("Testsaison")).toBeVisible();

  // Deaktivieren blendet es aus
  await page.goto("/admin/resorts");
  await page.getByRole("link", { name: /E2E Testresort/ }).click();
  await page.getByLabel(/Aktiv/).uncheck();
  await page.getByRole("button", { name: "Resort speichern" }).click();
  await expect(page.getByRole("status")).toHaveText(/gespeichert/);
  const res = await page.goto("/resorts/e2e-testresort");
  expect(res?.status()).toBe(404);
});
