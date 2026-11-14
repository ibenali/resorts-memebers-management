import { expect, test, type Page } from "@playwright/test";
import { ANNA, formAlert, loginAs, resetMembers, withDb } from "./helpers";

/** Datum relativ zu heute als YYYY-MM-DD (UTC reicht für Abstände von Tagen/Monaten). */
function inDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function fillRequest(page: Page, resort: string, start: string, end: string, guests = 2) {
  await page.goto("/urlaub/neu");
  await page.getByLabel("Resort").selectOption({ label: resort });
  await page.getByLabel("Anreise").fill(start);
  await page.getByLabel("Abreise").fill(end);
  await page.getByLabel("Personen").fill(String(guests));
}

test.beforeEach(async ({ page }) => {
  await resetMembers();
  await withDb((c) => c.query("DELETE FROM vacation_requests"));
  await loginAs(page, ANNA.memberNo, ANNA.password);
});

test("Anfrage stellen: Saison wird ermittelt und angezeigt", async ({ page }) => {
  const start = inDays(30);
  const end = inDays(37);
  await fillRequest(page, "Resort Seeblick", start, end, 3);
  await expect(page.getByText("Saison laut Anreisetag")).toBeVisible();
  await expect(page.getByText("7 Nächte")).toBeVisible();
  await page.getByLabel("Bemerkung (optional)").fill("Bitte ruhiges Zimmer");
  await page.getByRole("button", { name: "Anfrage senden" }).click();

  await expect(page).toHaveURL(/\/urlaub\?status=created$/);
  await expect(page.getByRole("status")).toHaveText(/Anfrage wurde übermittelt/);
  const item = page.getByRole("listitem").filter({ hasText: "Resort Seeblick" });
  await expect(item).toContainText("In Prüfung");
  await expect(item).toContainText("7 Nächte · 3 Personen");
  await expect(item).toContainText("Bitte ruhiges Zimmer");

  // Serverseitig ermittelte Saison passt zum Anreisetag.
  const row = await withDb(async (c) => {
    const [rows] = await c.query(
      `SELECT s.start_date <= v.start_date AND v.start_date <= s.end_date AS ok
       FROM vacation_requests v JOIN seasons s ON s.id = v.season_id`,
    );
    return (rows as { ok: number }[])[0];
  });
  expect(row?.ok).toBe(1);

  // Dashboard zeigt die offene Anfrage.
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Ihre nächsten Urlaube" })).toContainText(
    "Resort Seeblick",
  );
});

test("Resort ist vorausgewählt, wenn man von der Resortseite kommt", async ({ page }) => {
  await page.goto("/resorts/alpenhof-tirol");
  await page.getByRole("link", { name: "Urlaub in diesem Resort anfragen" }).click();
  await expect(page.getByLabel("Resort")).toHaveValue(/\d+/);
  await expect(page.getByLabel("Resort").locator("option:checked")).toHaveText("Alpenhof Tirol");
});

test("Regeln: Vergangenheit, Reihenfolge, Dauer und Überschneidung", async ({ page }) => {
  await fillRequest(page, "Resort Seeblick", inDays(-1), inDays(3));
  await page.getByRole("button", { name: "Anfrage senden" }).click();
  await expect(formAlert(page)).toHaveText(/nicht in der Vergangenheit/);

  await fillRequest(page, "Resort Seeblick", inDays(10), inDays(10));
  await page.getByRole("button", { name: "Anfrage senden" }).click();
  await expect(formAlert(page)).toHaveText(/mindestens einen Tag/);

  await fillRequest(page, "Resort Seeblick", inDays(10), inDays(40));
  await page.getByRole("button", { name: "Anfrage senden" }).click();
  await expect(formAlert(page)).toHaveText(/höchstens 28 Nächte/);

  await fillRequest(page, "Resort Seeblick", inDays(50), inDays(55));
  await page.getByRole("button", { name: "Anfrage senden" }).click();
  await expect(page).toHaveURL(/status=created/);

  // Überschneidet sich (auch in einem anderen Resort)
  await fillRequest(page, "Costa Dorada Mar", inDays(54), inDays(60));
  await page.getByRole("button", { name: "Anfrage senden" }).click();
  await expect(formAlert(page)).toHaveText(/bereits eine offene/);

  // Anreise am Abreisetag ist erlaubt
  await fillRequest(page, "Costa Dorada Mar", inDays(55), inDays(60));
  await page.getByRole("button", { name: "Anfrage senden" }).click();
  await expect(page).toHaveURL(/status=created/);
});

test("ausstehende Anfrage stornieren, bestätigte nicht", async ({ page }) => {
  await withDb((c) =>
    c.query(
      `INSERT INTO vacation_requests (member_id, resort_id, start_date, end_date, guests, status)
       SELECT m.id, r.id, ?, ?, 2, 'approved' FROM members m, resorts r
       WHERE m.member_no = 'M100001' AND r.slug = 'alpenhof-tirol'`,
      [inDays(80), inDays(85)],
    ),
  );
  await fillRequest(page, "Resort Seeblick", inDays(20), inDays(24));
  await page.getByRole("button", { name: "Anfrage senden" }).click();
  await expect(page).toHaveURL(/status=created/);

  const approved = page.getByRole("listitem").filter({ hasText: "Alpenhof Tirol" });
  await expect(approved).toContainText("Bestätigt");
  await expect(approved.getByRole("button", { name: "Stornieren" })).toHaveCount(0);

  page.once("dialog", (d) => d.accept());
  const pending = page.getByRole("listitem").filter({ hasText: "Resort Seeblick" });
  await pending.getByRole("button", { name: "Stornieren" }).click();
  await expect(page.getByRole("status")).toHaveText(/storniert/);
  await expect(pending).toContainText("Storniert");
});

test("fremde Anfragen sind weder sichtbar noch stornierbar", async ({ page }) => {
  const id = await withDb(async (c) => {
    const [res] = await c.query(
      `INSERT INTO vacation_requests (member_id, resort_id, start_date, end_date, guests)
       SELECT m.id, r.id, ?, ?, 2 FROM members m, resorts r
       WHERE m.member_no = 'M100002' AND r.slug = 'costa-dorada-mar'`,
      [inDays(15), inDays(20)],
    );
    return (res as { insertId: number }).insertId;
  });
  await page.goto("/urlaub");
  await expect(page.getByText("Costa Dorada Mar")).toHaveCount(0);

  // Manipuliertes Stornieren mit fremder ID: ein eigener Eintrag wird angelegt und
  // im Formular die ID ausgetauscht.
  await fillRequest(page, "Resort Seeblick", inDays(20), inDays(24));
  await page.getByRole("button", { name: "Anfrage senden" }).click();
  await page.locator('input[name="id"]').evaluate((el, v) => {
    (el as HTMLInputElement).value = String(v);
  }, id);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Stornieren" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "nicht mehr storniert" })).toBeVisible();

  const status = await withDb(async (c) => {
    const [rows] = await c.query("SELECT status FROM vacation_requests WHERE id = ?", [id]);
    return (rows as { status: string }[])[0].status;
  });
  expect(status).toBe("pending");
});
