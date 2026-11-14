import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { ANNA, formAlert, loginAs, resetMembers, sessionCookie, sha256, withDb } from "./helpers";

// QA: Sicherheitsprüfungen zu Login und Sessions (PLAN.md Kap. 7).
// Der alte Prototyp hat einer Mitglieds-ID im Header vertraut; das darf nie wieder gehen.

const QA = { memberNo: "QA000001", password: "Qa-Test-Passwort-1", firstName: "Quentin" };
const QA2 = { memberNo: "QA000002", password: "Qa-Test-Passwort-2", firstName: "Querida" };
const MEMBER_PAGES = [
  "/",
  "/resorts",
  "/resorts/alpenhof-tirol",
  "/feedback",
  "/profil",
  "/urlaub",
];

async function upsertMember(m: typeof QA, mustChange = false) {
  const hash = await bcrypt.hash(m.password, 4);
  await withDb((c) =>
    c.query(
      `INSERT INTO members (member_no, first_name, last_name, password_hash, must_change_password)
       VALUES (?, ?, 'QA', ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash),
         must_change_password = VALUES(must_change_password), failed_logins = 0, locked_until = NULL`,
      [m.memberNo, m.firstName, hash, mustChange],
    ),
  );
}

async function memberId(memberNo: string): Promise<number> {
  return withDb(async (c) => {
    const [rows] = await c.query("SELECT id FROM members WHERE member_no = ?", [memberNo]);
    return (rows as { id: number }[])[0].id;
  });
}

async function sessionIds(memberNo: string): Promise<string[]> {
  return withDb(async (c) => {
    const [rows] = await c.query(
      "SELECT s.id FROM sessions s JOIN members m ON m.id = s.member_id WHERE m.member_no = ?",
      [memberNo],
    );
    return (rows as { id: string }[]).map((r) => r.id);
  });
}

async function submitLogin(page: Page, memberNo: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Mitgliedsnummer").fill(memberNo);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

const loginAsQa = (page: Page, m = QA) => loginAs(page, m.memberNo, m.password);

test.beforeEach(async () => {
  await resetMembers();
  await upsertMember(QA);
  await upsertMember(QA2);
});

test.describe("Auth-Bypass", () => {
  test("Mitglieds-ID in Header, Query oder Cookie ersetzt keinen Login", async ({ browser }) => {
    const id = String(await memberId(QA.memberNo));
    const context = await browser.newContext({
      extraHTTPHeaders: {
        "x-member-id": id,
        "x-user-id": id,
        "member-id": id,
        "x-forwarded-user": QA.memberNo,
        authorization: `Bearer ${id}`,
      },
    });
    await context.addCookies(
      ["memberId", "member_id", "userId"].map((name) => ({
        name,
        value: id,
        domain: "localhost",
        path: "/",
      })),
    );
    const page = await context.newPage();
    for (const path of ["/", `/profil?memberId=${id}`, `/urlaub?member_id=${id}`]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login/);
    }
    await context.close();
  });

  test("Ein Session-Cookie mit Mitglieds-ID oder Müll öffnet keine Mitgliederseite", async ({
    page,
    context,
  }) => {
    // Die Middleware prüft nur, ob ein Cookie da ist; jede Seite muss selbst gegen die DB prüfen.
    const id = String(await memberId(QA.memberNo));
    for (const value of [id, QA.memberNo, "x".repeat(43), "x".repeat(500)]) {
      await context.clearCookies();
      await context.addCookies([{ name: "session", value, domain: "localhost", path: "/" }]);
      for (const path of MEMBER_PAGES) {
        await page.goto(path);
        await expect(page, `${path} mit Cookie ${value.slice(0, 10)}`).toHaveURL(/\/login/);
      }
    }
  });

  test("Rücksprung nach Login bleibt auf der eigenen Seite (kein Open Redirect)", async ({
    page,
  }) => {
    for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "/login"]) {
      await page.context().clearCookies();
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await page.getByLabel("Mitgliedsnummer").fill(QA.memberNo);
      await page.getByLabel("Passwort").fill(QA.password);
      await page.getByRole("button", { name: "Anmelden" }).click();
      await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
      expect(new URL(page.url()).host, next).toMatch(/^localhost(:\d+)?$/);
    }
  });
});

test.describe("Sessions", () => {
  test("Cookie ist httpOnly, Secure (Produktions-Build), SameSite=Lax, ≤ 30 Tage, 32 Byte", async ({
    page,
    context,
  }) => {
    await loginAsQa(page);
    const c = await sessionCookie(context);
    expect(c.httpOnly).toBe(true);
    expect(c.sameSite).toBe("Lax");
    expect(c.path).toBe("/");
    if (process.env.COOKIE_SECURE !== "false") expect(c.secure).toBe(true);
    expect(c.expires).toBeLessThanOrEqual(Date.now() / 1000 + 30 * 24 * 3600 + 60);
    expect(c.value.length).toBeGreaterThanOrEqual(43);
  });

  test("In der DB steht nur der SHA-256-Hash des Tokens", async ({ page, context }) => {
    await loginAsQa(page);
    const c = await sessionCookie(context);
    const ids = await sessionIds(QA.memberNo);
    expect(ids).toEqual([sha256(c.value)]);
  });

  test("Cookie einer abgemeldeten Session ist wertlos (kein Replay)", async ({
    page,
    context,
    browser,
  }) => {
    await loginAsQa(page);
    const stolen = await sessionCookie(context);
    await page.getByRole("button", { name: "Abmelden" }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(await sessionIds(QA.memberNo)).toHaveLength(0);

    const attacker = await browser.newContext();
    await attacker.addCookies([stolen]);
    const p = await attacker.newPage();
    await p.goto("/");
    await expect(p).toHaveURL(/\/login/);
    await attacker.close();
  });

  test("Abgelaufene Session (gleitend) wird abgelehnt und gelöscht", async ({ page, context }) => {
    await loginAsQa(page);
    const c = await sessionCookie(context);
    await withDb((db) =>
      db.query(
        "UPDATE sessions SET expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE id = ?",
        [sha256(c.value)],
      ),
    );
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    expect(await sessionIds(QA.memberNo)).toHaveLength(0);
  });

  test("Absolute Obergrenze von 30 Tagen gilt auch bei gültigem expires_at", async ({
    page,
    context,
  }) => {
    await loginAsQa(page);
    const c = await sessionCookie(context);
    await withDb((db) =>
      db.query(
        `UPDATE sessions SET created_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 31 DAY),
           expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE id = ?`,
        [sha256(c.value)],
      ),
    );
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Session-Fixation: ein vorher gesetztes Cookie wird beim Login ersetzt", async ({
    page,
    context,
  }) => {
    const planted = "f".repeat(43);
    await context.addCookies([{ name: "session", value: planted, domain: "localhost", path: "/" }]);
    await loginAsQa(page);
    const c = await sessionCookie(context);
    expect(c.value).not.toBe(planted);
    expect(await sessionIds(QA.memberNo)).not.toContain(sha256(planted));
  });

  test("Zwei Mitglieder sehen jeweils nur sich selbst", async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pa = await a.newPage();
    const pb = await b.newPage();
    await loginAsQa(pa, QA);
    await loginAsQa(pb, QA2);
    await pa.goto("/");
    await pb.goto("/");
    await expect(pa.getByText(QA.firstName).first()).toBeVisible();
    await expect(pa.getByText(QA2.firstName)).toHaveCount(0);
    await expect(pb.getByText(QA2.firstName).first()).toBeVisible();
    await expect(pb.getByText(QA.firstName)).toHaveCount(0);
    await a.close();
    await b.close();
  });

  test("Passwortwechsel beendet die anderen Sessions, die eigene bleibt", async ({
    page,
    browser,
  }) => {
    await upsertMember(QA, true);
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await submitLogin(otherPage, QA.memberNo, QA.password);
    await expect(otherPage).toHaveURL(/\/passwort-aendern$/);
    await submitLogin(page, QA.memberNo, QA.password);
    await expect(page).toHaveURL(/\/passwort-aendern$/);
    expect(await sessionIds(QA.memberNo)).toHaveLength(2);

    const next = "Qa-Neues-Passwort-77";
    await page.getByLabel("Aktuelles Passwort").fill(QA.password);
    await page.getByLabel("Neues Passwort", { exact: true }).fill(next);
    await page.getByLabel("Neues Passwort wiederholen").fill(next);
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page).toHaveURL(/\/$/);

    expect(await sessionIds(QA.memberNo)).toHaveLength(1);
    await otherPage.goto("/");
    await expect(otherPage).toHaveURL(/\/login/);
    await other.close();

    const hash = await withDb(async (c) => {
      const [rows] = await c.query("SELECT password_hash AS h FROM members WHERE member_no = ?", [
        QA.memberNo,
      ]);
      return (rows as { h: string }[])[0].h;
    });
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });
});

test.describe("Brute-Force", () => {
  test("Nach 20 Fehlversuchen pro IP wird auch ein korrektes Login abgewiesen", async ({
    page,
  }) => {
    for (let i = 0; i < 20; i++) {
      await submitLogin(page, `M9${String(i).padStart(5, "0")}`, "falsch-falsch");
      await expect(formAlert(page)).toBeVisible();
    }
    await submitLogin(page, ANNA.memberNo, ANNA.password);
    await expect(formAlert(page)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("Gefälschtes X-Forwarded-For umgeht das IP-Limit nicht", async ({ page }) => {
    // Bekannte Lücke: Ohne Reverse Proxy nimmt clientIpFrom() den letzten XFF-Eintrag,
    // den dann der Client selbst setzt. Hinter Caddy (überschreibt XFF) ist es sicher.
    // Gegen Staging/Produktion mit E2E_BEHIND_PROXY=1 muss der Test grün sein.
    test.fail(!process.env.E2E_BEHIND_PROXY, "App vertraut X-Forwarded-For ohne Proxy");
    for (let i = 0; i < 20; i++) {
      await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${i + 1}` });
      await submitLogin(page, `M8${String(i).padStart(5, "0")}`, "falsch-falsch");
      await expect(formAlert(page)).toBeVisible();
    }
    await page.setExtraHTTPHeaders({ "x-forwarded-for": "203.0.113.250" });
    await submitLogin(page, ANNA.memberNo, ANNA.password);
    await expect(formAlert(page)).toBeVisible({ timeout: 5000 });
  });

  test("Antwortzeit verrät nicht, ob eine Mitgliedsnummer existiert", async ({ page }) => {
    const median = async (memberNo: string) => {
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        await resetMembers();
        await page.goto("/login");
        await page.getByLabel("Mitgliedsnummer").fill(memberNo);
        await page.getByLabel("Passwort").fill("falsches-passwort");
        const start = Date.now();
        await page.getByRole("button", { name: "Anmelden" }).click();
        await formAlert(page).waitFor();
        times.push(Date.now() - start);
      }
      return times.sort((x, y) => x - y)[2];
    };
    const known = await median(ANNA.memberNo);
    const unknown = await median("M999999");
    // bcrypt (Kosten 12) braucht ~200 ms; ohne Dummy-Hash wäre "unbekannt" deutlich schneller.
    expect(Math.abs(known - unknown)).toBeLessThan(150);
  });
});
