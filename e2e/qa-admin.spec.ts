import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { loginAs, resetMembers, withDb } from "./helpers";

// QA zu WP10: Der Verwaltungsbereich ist nur für Admins. Neben den Seiten wird jede
// Admin-Server-Action direkt aufgerufen: Ein Admin-Request wird abgefangen und mit der
// Session eines normalen Mitglieds bzw. ohne Session erneut gesendet. Als Gegenprobe
// muss derselbe Request mit Admin-Session wirken (sonst wäre der Test wertlos).

const ADMIN = { memberNo: "A000001", password: "Verwaltung-2026-Test" };
const QA = { memberNo: "QA000021", password: "Qa-Admin-Test-1" };
const SLUG = "e2e-qa-admin";
const nextYear = new Date().getUTCFullYear() + 1;

type Row = Record<string, unknown>;
const rows = (sql: string, params: unknown[] = []) =>
  withDb(async (c) => (await c.query(sql, params))[0] as Row[]);
const one = async (sql: string, params: unknown[] = []) => (await rows(sql, params))[0];

type Captured = { url: string; headers: Record<string, string>; body: Buffer };

/** Fängt den nächsten Server-Action-POST der Seite ab, ohne ihn auszuführen. */
async function captureAction(page: Page, trigger: () => Promise<unknown>): Promise<Captured> {
  let done!: (c: Captured) => void;
  const captured = new Promise<Captured>((r) => (done = r));
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) {
      done({
        url: req.url(),
        headers: req.headers(),
        body: req.postDataBuffer() ?? Buffer.alloc(0),
      });
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await trigger();
  const result = await captured;
  await page.unrouteAll({ behavior: "ignoreErrors" });
  return result;
}

async function replay(request: APIRequestContext, cap: Captured) {
  const headers = { ...cap.headers };
  for (const h of ["cookie", "host", "content-length"]) delete headers[h];
  return request.post(cap.url, { headers, data: cap.body, maxRedirects: 0 });
}

/** Spielt den Request als Mitglied und anonym ab und danach als Admin (Gegenprobe). */
async function replayAsEveryone(
  browser: Browser,
  admin: Page,
  cap: Captured,
  unchanged: () => Promise<void>,
  changed: () => Promise<void>,
) {
  const member = await browser.newContext();
  await loginAs(await member.newPage(), QA.memberNo, QA.password);
  const anon = await browser.newContext();

  const asMember = await replay(member.request, cap);
  expect(asMember.status(), "Mitglied darf keine Admin-Action ausführen").not.toBe(200);
  await unchanged();
  const asAnon = await replay(anon.request, cap);
  expect(asAnon.status(), "anonym darf keine Admin-Action ausführen").not.toBe(200);
  await unchanged();

  await replay(admin.context().request, cap);
  await changed();
  await member.close();
  await anon.close();
}

async function upsertQaMember(role: "member" | "admin" = "member", mustChange = false) {
  const hash = await bcrypt.hash(QA.password, 4);
  await withDb((c) =>
    c.query(
      `INSERT INTO members (member_no, first_name, last_name, password_hash, role, must_change_password,
         street, postal_code, city, country)
       VALUES (?, 'Qa', 'Admintest', ?, ?, ?, 'Teststraße 1', '10115', 'Berlin', 'DE')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role),
         must_change_password = VALUES(must_change_password)`,
      [QA.memberNo, hash, role, mustChange],
    ),
  );
}

let resortId: number;

/** Entfernt die QA-Resorts samt Anfragen (vacation_requests.resort_id ist RESTRICT). */
const dropQaResorts = () =>
  withDb(async (c) => {
    await c.query(
      "DELETE v FROM vacation_requests v JOIN resorts r ON r.id = v.resort_id WHERE r.slug LIKE ?",
      [`${SLUG}%`],
    );
    await c.query("DELETE FROM resorts WHERE slug LIKE ?", [`${SLUG}%`]);
  });

test.beforeEach(async () => {
  await resetMembers();
  await upsertQaMember();
  await dropQaResorts();
  await withDb(async (c) => {
    await c.query(
      `INSERT INTO resorts (slug, name, location, country, description, amenities)
       VALUES (?, 'QA Testresort', 'Testort', 'DE', 'Nur für Tests.', JSON_ARRAY('Pool'))`,
      [SLUG],
    );
  });
  resortId = (await one("SELECT id FROM resorts WHERE slug = ?", [SLUG])).id as number;
  await withDb(async (c) => {
    const [m] = (await c.query("SELECT id FROM members WHERE member_no = ?", [QA.memberNo])) as [
      { id: number }[],
      unknown,
    ];
    await c.query("DELETE FROM vacation_requests WHERE member_id = ?", [m[0].id]);
    await c.query("DELETE FROM feedback WHERE member_id = ?", [m[0].id]);
  });
});

test.afterAll(dropQaResorts);

test.describe("Seiten", () => {
  const adminPaths = () => [
    "/admin",
    "/admin/urlaub",
    "/admin/urlaub?status=all",
    "/admin/feedback",
    "/admin/resorts",
    "/admin/resorts/neu",
    `/admin/resorts/${resortId}`,
    "/admin/resorts/abc",
  ];

  test("Mitglieder bekommen auf allen Admin-Seiten 404 und keinen Admin-Link", async ({ page }) => {
    await loginAs(page, QA.memberNo, QA.password);
    await expect(page.getByRole("link", { name: "Verwaltung" })).toHaveCount(0);
    for (const path of adminPaths()) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
      await expect(page.getByText("QA Testresort")).toHaveCount(0);
    }
  });

  test("Ohne Login geht es von Admin-Seiten zur Anmeldung", async ({ page }) => {
    for (const path of adminPaths()) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login/);
    }
  });

  test("Admin mit offenem Passwortwechsel kommt nicht in die Verwaltung", async ({ page }) => {
    await upsertQaMember("admin", true);
    await loginAs(page, QA.memberNo, QA.password).catch(() => undefined);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/passwort-aendern/);
  });

  test("Entzogene Admin-Rolle wirkt sofort, auch in laufender Session", async ({ page }) => {
    await upsertQaMember("admin");
    await loginAs(page, QA.memberNo, QA.password);
    expect((await page.goto("/admin"))?.status()).toBe(200);
    await withDb((c) =>
      c.query("UPDATE members SET role = 'member' WHERE member_no = ?", [QA.memberNo]),
    );
    expect((await page.goto("/admin"))?.status()).toBe(404);
  });

  test("Rolle lässt sich über das Profilformular nicht setzen", async ({ page }) => {
    await loginAs(page, QA.memberNo, QA.password);
    await page.goto("/profil");
    const form = page.locator("main form", {
      has: page.getByRole("button", { name: "Adresse speichern" }),
    });
    await form.evaluate((f) => {
      for (const name of ["role", "is_admin", "isAdmin"]) {
        const i = document.createElement("input");
        i.type = "hidden";
        i.name = name;
        i.value = name === "role" ? "admin" : "1";
        f.appendChild(i);
      }
    });
    await page.getByRole("button", { name: "Adresse speichern" }).click();
    await expect(form.getByRole("status")).toBeVisible();
    expect((await one("SELECT role FROM members WHERE member_no = ?", [QA.memberNo])).role).toBe(
      "member",
    );
  });
});

test.describe("Server-Actions nur für Admins", () => {
  test("Urlaubsanfrage bestätigen", async ({ page, browser }) => {
    await withDb((c) =>
      c.query(
        `INSERT INTO vacation_requests (member_id, resort_id, start_date, end_date, guests, note)
         SELECT m.id, ?, ?, ?, 2, 'QA-Admin-Anfrage' FROM members m WHERE m.member_no = ?`,
        [resortId, `${nextYear}-05-01`, `${nextYear}-05-05`, QA.memberNo],
      ),
    );
    const status = async () =>
      (await one("SELECT status FROM vacation_requests WHERE note = 'QA-Admin-Anfrage'")).status;

    await loginAs(page, ADMIN.memberNo, ADMIN.password);
    await page.goto("/admin/urlaub?status=pending");
    await page.waitForLoadState("networkidle");
    const item = page.getByRole("listitem").filter({ hasText: "QA-Admin-Anfrage" });
    const cap = await captureAction(page, () =>
      item.getByRole("button", { name: "Bestätigen" }).click(),
    );
    await replayAsEveryone(
      browser,
      page,
      cap,
      async () => expect(await status()).toBe("pending"),
      async () => expect(await status()).toBe("approved"),
    );
  });

  test("Feedback-Status setzen", async ({ page, browser }) => {
    await withDb((c) =>
      c.query(
        `INSERT INTO feedback (member_id, category, subject, message)
         SELECT id, 'general', 'QA-Admin-Feedback', 'Text' FROM members WHERE member_no = ?`,
        [QA.memberNo],
      ),
    );
    const status = async () =>
      (await one("SELECT status FROM feedback WHERE subject = 'QA-Admin-Feedback'")).status;

    await loginAs(page, ADMIN.memberNo, ADMIN.password);
    await page.goto("/admin/feedback?status=new");
    await page.waitForLoadState("networkidle");
    const item = page.getByRole("listitem").filter({ hasText: "QA-Admin-Feedback" });
    const cap = await captureAction(page, () =>
      item.getByRole("button", { name: "Als gelesen markieren" }).click(),
    );
    await replayAsEveryone(
      browser,
      page,
      cap,
      async () => expect(await status()).toBe("new"),
      async () => expect(await status()).toBe("read"),
    );
  });

  test("Resort bearbeiten", async ({ page, browser }) => {
    const name = async () => (await one("SELECT name FROM resorts WHERE id = ?", [resortId])).name;
    await loginAs(page, ADMIN.memberNo, ADMIN.password);
    await page.goto(`/admin/resorts/${resortId}`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Name", { exact: true }).fill("QA Umbenannt");
    const cap = await captureAction(page, () =>
      page.getByRole("button", { name: "Resort speichern" }).click(),
    );
    await replayAsEveryone(
      browser,
      page,
      cap,
      async () => expect(await name()).toBe("QA Testresort"),
      async () => expect(await name()).toBe("QA Umbenannt"),
    );
  });

  test("Resort anlegen", async ({ page, browser }) => {
    const slug = `${SLUG}-neu`;
    const count = async () =>
      (await one("SELECT COUNT(*) AS n FROM resorts WHERE slug = ?", [slug])).n;
    await withDb((c) => c.query("DELETE FROM resorts WHERE slug = ?", [slug]));
    await loginAs(page, ADMIN.memberNo, ADMIN.password);
    await page.goto("/admin/resorts/neu");
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/Kurzname/).fill(slug);
    await page.getByLabel("Name", { exact: true }).fill("QA Neu");
    await page.getByLabel("Ort", { exact: true }).fill("Testort");
    await page.getByLabel(/Land/).fill("DE");
    await page.getByLabel("Beschreibung").fill("Neues Testresort.");
    await page.getByLabel(/Ausstattung/).fill("Pool");
    const cap = await captureAction(page, () =>
      page.getByRole("button", { name: "Resort speichern" }).click(),
    );
    try {
      await replayAsEveryone(
        browser,
        page,
        cap,
        async () => expect(await count()).toBe(0),
        async () => expect(await count()).toBe(1),
      );
    } finally {
      await withDb((c) => c.query("DELETE FROM resorts WHERE slug = ?", [slug]));
    }
  });

  test("Saison anlegen", async ({ page, browser }) => {
    const count = async () =>
      (await one("SELECT COUNT(*) AS n FROM seasons WHERE resort_id = ?", [resortId])).n;
    await loginAs(page, ADMIN.memberNo, ADMIN.password);
    await page.goto(`/admin/resorts/${resortId}`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Bezeichnung").fill("QA-Saison");
    await page.getByLabel("Von").fill(`${nextYear}-01-01`);
    await page.getByLabel("Bis (inklusive)").fill(`${nextYear}-01-31`);
    const form = page.locator("main form", { has: page.getByLabel("Bezeichnung") });
    const cap = await captureAction(page, () => form.getByRole("button").click());
    await replayAsEveryone(
      browser,
      page,
      cap,
      async () => expect(await count()).toBe(0),
      async () => expect(await count()).toBe(1),
    );
  });

  test("Saison löschen", async ({ page, browser }) => {
    await withDb((c) =>
      c.query(
        `INSERT INTO seasons (resort_id, name, type, start_date, end_date) VALUES (?, 'QA-Löschsaison', 'low', ?, ?)`,
        [resortId, `${nextYear}-02-01`, `${nextYear}-02-28`],
      ),
    );
    const count = async () =>
      (await one("SELECT COUNT(*) AS n FROM seasons WHERE resort_id = ?", [resortId])).n;
    await loginAs(page, ADMIN.memberNo, ADMIN.password);
    await page.goto(`/admin/resorts/${resortId}`);
    await page.waitForLoadState("networkidle");
    page.on("dialog", (d) => d.accept());
    const item = page.getByRole("listitem").filter({ hasText: "QA-Löschsaison" });
    const cap = await captureAction(page, () =>
      item.getByRole("button", { name: "Löschen" }).click(),
    );
    await replayAsEveryone(
      browser,
      page,
      cap,
      async () => expect(await count()).toBe(1),
      async () => expect(await count()).toBe(0),
    );
  });
});
