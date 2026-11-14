import { expect, test, type Locator, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { formAlert, loginAs, resetMembers, withDb } from "./helpers";

// QA zu WP5–WP7: serverseitige Prüfung (Browser-Validierung umgangen), manipulierte
// Formulare, XSS und Wettläufe. Fallkatalog: docs/TESTCASES.md.

const QA = { memberNo: "QA000011", password: "Qa-Feature-Pass-1" };
const OTHER = { memberNo: "QA000012", password: "Qa-Feature-Pass-2" };
const nextYear = new Date().getUTCFullYear() + 1;
const XSS = `<img src=x onerror="window.__xss=1">`;

type Row = Record<string, unknown>;
const rows = (sql: string, params: unknown[] = []) =>
  withDb(async (c) => (await c.query(sql, params))[0] as Row[]);

async function upsertMember(m: typeof QA) {
  const hash = await bcrypt.hash(m.password, 4);
  await withDb((c) =>
    c.query(
      `INSERT INTO members (member_no, first_name, last_name, password_hash, street, postal_code, city, country)
       VALUES (?, 'Qa', 'Tester', ?, 'Teststraße 1', '10115', 'Berlin', 'DE')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), must_change_password = 0,
         street = 'Teststraße 1', postal_code = '10115', city = 'Berlin', country = 'DE'`,
      [m.memberNo, hash],
    ),
  );
}

const idOf = async (memberNo: string) =>
  (await rows("SELECT id FROM members WHERE member_no = ?", [memberNo]))[0].id as number;

/**
 * Schaltet die Browser-Prüfung ab (auch maxlength, das Eingaben sonst kürzt),
 * damit der Server die Eingaben prüfen muss.
 */
const noValidate = (form: Locator) =>
  form.evaluate((f) => {
    f.setAttribute("novalidate", "");
    f.querySelectorAll("[maxlength],[minlength]").forEach((el) => {
      el.removeAttribute("maxlength");
      el.removeAttribute("minlength");
    });
  });

/** Hängt versteckte Felder an, die ein Angreifer mitschicken könnte. */
const addHidden = (form: Locator, fields: Record<string, string>) =>
  form.evaluate((f, entries) => {
    for (const [name, value] of Object.entries(entries)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      f.appendChild(input);
    }
  }, fields);

/** Setzt den Wert eines Selects auch auf eine Option, die es nicht gibt. */
const forceSelect = (select: Locator, value: string) =>
  select.evaluate((el, v) => {
    const s = el as HTMLSelectElement;
    s.add(new Option(v, v));
    s.value = v;
  }, value);

const noXss = async (page: Page) =>
  expect(
    await page.evaluate(() => (window as unknown as { __xss?: number }).__xss),
  ).toBeUndefined();

test.beforeEach(async ({ page }) => {
  await resetMembers();
  await upsertMember(QA);
  await upsertMember(OTHER);
  const ids = [await idOf(QA.memberNo), await idOf(OTHER.memberNo)];
  await withDb(async (c) => {
    await c.query("DELETE FROM feedback WHERE member_id IN (?)", [ids]);
    await c.query("DELETE FROM vacation_requests WHERE member_id IN (?)", [ids]);
  });
  await loginAs(page, QA.memberNo, QA.password);
});

test.describe("Feedback (WP5)", () => {
  const feedbackOf = (memberNo: string) =>
    rows("SELECT f.* FROM feedback f JOIN members m ON m.id = f.member_id WHERE m.member_no = ?", [
      memberNo,
    ]);

  async function openForm(page: Page, subject: string, message: string) {
    await page.goto("/feedback");
    const form = page.locator("main form");
    await noValidate(form);
    await page.getByLabel("Betreff").fill(subject);
    await page.getByLabel("Ihre Nachricht").fill(message);
    return form;
  }
  const send = (page: Page) => page.getByRole("button", { name: "Feedback senden" }).click();

  test("Server lehnt ungültige Eingaben ab, auch ohne Browser-Prüfung", async ({ page }) => {
    const inactive = (await rows("SELECT id FROM resorts WHERE slug = 'costa-dorada-mar'"))[0].id;
    const cases: [string, (form: Locator) => Promise<unknown>][] = [
      ["Betreff 151 Zeichen", () => page.getByLabel("Betreff").fill("x".repeat(151))],
      ["Nachricht nur Leerzeichen", () => page.getByLabel("Ihre Nachricht").fill(" ".repeat(20))],
      ["unbekannte Kategorie", () => forceSelect(page.getByLabel("Kategorie"), "hack")],
      ["Resort gibt es nicht", () => forceSelect(page.getByLabel("Resort (optional)"), "99999")],
      ["Resort-ID kein Zahl", () => forceSelect(page.getByLabel("Resort (optional)"), "1 OR 1=1")],
    ];
    for (const [name, tamper] of cases) {
      const form = await openForm(page, "Gültiger Betreff", "Eine gültige Nachricht mit Text.");
      await tamper(form);
      await send(page);
      await expect(formAlert(page), name).toBeVisible();
    }
    // Inaktives Resort
    await withDb((c) => c.query("UPDATE resorts SET active = 0 WHERE id = ?", [inactive]));
    try {
      await openForm(page, "Gültiger Betreff", "Eine gültige Nachricht mit Text.");
      await forceSelect(page.getByLabel("Resort (optional)"), String(inactive));
      await send(page);
      await expect(formAlert(page)).toHaveText(/nicht verfügbar/);
    } finally {
      await withDb((c) => c.query("UPDATE resorts SET active = 1 WHERE id = ?", [inactive]));
    }
    expect(await feedbackOf(QA.memberNo)).toHaveLength(0);
  });

  test("HTML im Feedback wird als Text angezeigt (kein XSS)", async ({ page }) => {
    await openForm(page, XSS, `<script>window.__xss=1</script> Nachricht`);
    await send(page);
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.getByText(XSS)).toBeVisible();
    await page.reload();
    await noXss(page);
  });

  test("Untergeschobene Mitglieds-ID landet nicht beim fremden Konto", async ({ page }) => {
    const form = await openForm(page, "Manipuliert", "Soll beim eigenen Konto landen.");
    const other = String(await idOf(OTHER.memberNo));
    await addHidden(form, { memberId: other, member_id: other, memberNo: OTHER.memberNo });
    await send(page);
    await expect(page.getByRole("status")).toBeVisible();
    expect(await feedbackOf(QA.memberNo)).toHaveLength(1);
    expect(await feedbackOf(OTHER.memberNo)).toHaveLength(0);
  });

  test("Mehr als 10 Feedbacks pro Stunde werden gebremst", async ({ page }) => {
    const id = await idOf(QA.memberNo);
    await withDb(async (c) => {
      for (let i = 0; i < 10; i++) {
        await c.query(
          "INSERT INTO feedback (member_id, category, subject, message) VALUES (?, 'general', ?, 'x')",
          [id, `Vorher ${i}`],
        );
      }
    });
    await openForm(page, "Elftes Feedback", "Das sollte gebremst werden.");
    await send(page);
    await expect(formAlert(page)).toHaveText(/letzten Stunde/);
    expect(await feedbackOf(QA.memberNo)).toHaveLength(10);
  });
});

test.describe("Profil (WP6)", () => {
  const addressForm = (page: Page) =>
    page.locator("main form", { has: page.getByRole("button", { name: "Adresse speichern" }) });
  const passwordForm = (page: Page) =>
    page.locator("main form", { has: page.getByRole("button", { name: "Passwort speichern" }) });

  test("Server lehnt ungültige Adressen ab, Adresse bleibt unverändert", async ({ page }) => {
    const cases: [string, () => Promise<unknown>][] = [
      ["Ort leer", () => page.getByLabel("Ort", { exact: true }).fill("")],
      ["Straße zu kurz", () => page.getByLabel("Straße und Hausnummer").fill("a")],
      ["Land nicht erlaubt", () => forceSelect(page.getByLabel("Land"), "XX")],
      ["PLZ mit Sonderzeichen", () => page.getByLabel("PLZ").fill("10115;DROP")],
    ];
    for (const [name, tamper] of cases) {
      await page.goto("/profil");
      await noValidate(addressForm(page));
      await tamper();
      await page.getByRole("button", { name: "Adresse speichern" }).click();
      await expect(addressForm(page).getByRole("alert"), name).toBeVisible();
    }
    const [m] = await rows("SELECT street, city, country FROM members WHERE member_no = ?", [
      QA.memberNo,
    ]);
    expect(m).toEqual({ street: "Teststraße 1", city: "Berlin", country: "DE" });
  });

  test("Adressänderung trifft nur das eigene Konto und wird protokolliert", async ({ page }) => {
    await page.goto("/profil");
    const other = String(await idOf(OTHER.memberNo));
    await addHidden(addressForm(page), { memberId: other, member_id: other, id: other });
    await page.getByLabel("Ort", { exact: true }).fill("Salzburg");
    await page.getByRole("button", { name: "Adresse speichern" }).click();
    await expect(addressForm(page).getByRole("status")).toBeVisible();

    const city = async (no: string) =>
      (await rows("SELECT city FROM members WHERE member_no = ?", [no]))[0].city;
    expect(await city(QA.memberNo)).toBe("Salzburg");
    expect(await city(OTHER.memberNo)).toBe("Berlin");
    const audit = await rows("SELECT action FROM audit_log WHERE member_id = ?", [
      await idOf(QA.memberNo),
    ]);
    expect(audit.map((a) => a.action)).toContain("address_changed");
  });

  test("Ungültige Passwortwechsel ändern nichts", async ({ page }) => {
    const [before] = await rows("SELECT password_hash FROM members WHERE member_no = ?", [
      QA.memberNo,
    ]);
    const attempts: [string, string, string, string][] = [
      ["gleich dem alten", QA.password, QA.password, QA.password],
      ["zu kurz", QA.password, "Kurz-1", "Kurz-1"],
      ["Wiederholung abweichend", QA.password, "Neues-Passwort-77", "Neues-Passwort-78"],
      ["falsches aktuelles", "falsch-falsch-1", "Neues-Passwort-77", "Neues-Passwort-77"],
      ["zu lang", QA.password, "x".repeat(129), "x".repeat(129)],
    ];
    for (const [name, current, next, repeat] of attempts) {
      await page.goto("/profil");
      await noValidate(passwordForm(page));
      await page.getByLabel("Aktuelles Passwort").fill(current);
      await page.getByLabel("Neues Passwort", { exact: true }).fill(next);
      await page.getByLabel("Neues Passwort wiederholen").fill(repeat);
      await page.getByRole("button", { name: "Passwort speichern" }).click();
      await expect(passwordForm(page).getByRole("alert"), name).toBeVisible();
    }
    const [after] = await rows("SELECT password_hash FROM members WHERE member_no = ?", [
      QA.memberNo,
    ]);
    expect(after.password_hash).toBe(before.password_hash);
  });
});

test.describe("Urlaubsanfragen (WP7)", () => {
  const requestsOf = (memberNo: string) =>
    rows(
      `SELECT v.*, s.name AS season_name FROM vacation_requests v
       JOIN members m ON m.id = v.member_id LEFT JOIN seasons s ON s.id = v.season_id
       WHERE m.member_no = ? ORDER BY v.id`,
      [memberNo],
    );

  async function fill(page: Page, start: string, end: string, guests = "2") {
    await page.goto("/urlaub/neu");
    const form = page.locator("main form");
    await noValidate(form);
    await page.getByLabel("Resort", { exact: true }).selectOption({ label: "Alpenhof Tirol" });
    // Als Text, damit auch ungültige Daten beim Server ankommen.
    await form
      .locator('input[type="date"]')
      .evaluateAll((els) => els.forEach((e) => ((e as HTMLInputElement).type = "text")));
    await page.getByLabel("Anreise").fill(start);
    await page.getByLabel("Abreise").fill(end);
    await page.getByLabel("Personen").fill(guests);
    return form;
  }
  const send = (page: Page) => page.getByRole("button", { name: "Anfrage senden" }).click();

  test("Server lehnt ungültige Anfragen ab, auch ohne Browser-Prüfung", async ({ page }) => {
    const inactive = (await rows("SELECT id FROM resorts WHERE slug = 'costa-dorada-mar'"))[0].id;
    const cases: [string, string, string, string, string?][] = [
      ["0 Personen", `${nextYear}-07-10`, `${nextYear}-07-12`, "0"],
      ["11 Personen", `${nextYear}-07-10`, `${nextYear}-07-12`, "11"],
      ["Kommazahl", `${nextYear}-07-10`, `${nextYear}-07-12`, "2.5"],
      ["30. Februar", `${nextYear}-02-30`, `${nextYear}-03-02`, "2"],
      ["kein Datum", "morgen", `${nextYear}-03-02`, "2"],
      ["Resort gibt es nicht", `${nextYear}-07-10`, `${nextYear}-07-12`, "2", "99999"],
      ["Resort inaktiv", `${nextYear}-07-10`, `${nextYear}-07-12`, "2", String(inactive)],
    ];
    await withDb((c) => c.query("UPDATE resorts SET active = 0 WHERE id = ?", [inactive]));
    try {
      for (const [name, start, end, guests, resortId] of cases) {
        await fill(page, start, end, guests);
        if (resortId) await forceSelect(page.getByLabel("Resort", { exact: true }), resortId);
        await send(page);
        await expect(formAlert(page), name).toBeVisible();
      }
    } finally {
      await withDb((c) => c.query("UPDATE resorts SET active = 1 WHERE id = ?", [inactive]));
    }
    expect(await requestsOf(QA.memberNo)).toHaveLength(0);
  });

  test("Saison und Mitglied kommen vom Server, nicht aus dem Formular", async ({ page }) => {
    const [peak] = await rows(
      "SELECT s.id FROM seasons s JOIN resorts r ON r.id = s.resort_id WHERE r.slug = 'seeblick-bodensee' AND s.type = 'peak' LIMIT 1",
    );
    const other = String(await idOf(OTHER.memberNo));
    const form = await fill(page, `${nextYear}-07-10`, `${nextYear}-07-17`);
    await addHidden(form, {
      seasonId: String(peak.id),
      season_id: String(peak.id),
      memberId: other,
      member_id: other,
      status: "approved",
    });
    await send(page);
    await expect(page).toHaveURL(/status=created/);

    const [req] = await requestsOf(QA.memberNo);
    expect(req).toMatchObject({ season_name: "Sommersaison", status: "pending", guests: 2 });
    expect(await requestsOf(OTHER.memberNo)).toHaveLength(0);
  });

  test("Bemerkung mit HTML wird als Text angezeigt (kein XSS)", async ({ page }) => {
    await fill(page, `${nextYear}-08-01`, `${nextYear}-08-04`);
    await page.getByLabel("Bemerkung (optional)").fill(XSS);
    await send(page);
    await expect(page).toHaveURL(/status=created/);
    await expect(page.getByText(XSS)).toBeVisible();
    await noXss(page);
  });

  test("Zwei gleichzeitige überlappende Anfragen ergeben nur eine", async ({ page, browser }) => {
    const second = await browser.newContext();
    const page2 = await second.newPage();
    await loginAs(page2, QA.memberNo, QA.password);
    await fill(page, `${nextYear}-09-01`, `${nextYear}-09-08`);
    await fill(page2, `${nextYear}-09-03`, `${nextYear}-09-10`);
    await Promise.all([send(page), send(page2)]);
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page2.waitForLoadState("networkidle"),
    ]);
    expect(await requestsOf(QA.memberNo)).toHaveLength(1);
    await second.close();
  });

  test("Stornieren ohne Session wird abgewiesen", async ({ page }) => {
    await fill(page, `${nextYear}-10-01`, `${nextYear}-10-04`);
    await send(page);
    await expect(page).toHaveURL(/status=created/);
    // Gleiche Seite, aber die Session wird serverseitig beendet, bevor storniert wird.
    await withDb((c) => c.query("DELETE FROM sessions"));
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Stornieren" }).click();
    await expect(page).toHaveURL(/\/login/);
    const [req] = await requestsOf(QA.memberNo);
    expect(req.status).toBe("pending");
  });
});
