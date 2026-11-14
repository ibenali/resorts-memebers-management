import { expect, test } from "@playwright/test";
import { ANNA, loginAs, resetMembers, withDb } from "./helpers";

// QA-Ergänzung zu resorts.spec.ts: inaktive Resorts sind nirgends sichtbar.

const setActive = (slug: string, active: boolean) =>
  withDb((c) => c.query("UPDATE resorts SET active = ? WHERE slug = ?", [active, slug]));

test("Inaktives Resort erscheint weder in der Liste noch per URL", async ({ page }) => {
  await resetMembers();
  await setActive("costa-dorada-mar", false);
  try {
    await loginAs(page, ANNA.memberNo, ANNA.password);
    await page.goto("/resorts");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Alpenhof Tirol",
      "Resort Seeblick",
    ]);
    const res = await page.goto("/resorts/costa-dorada-mar");
    expect(res?.status()).toBe(404);
  } finally {
    await setActive("costa-dorada-mar", true);
  }
});
