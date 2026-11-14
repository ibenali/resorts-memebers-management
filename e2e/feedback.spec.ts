import { expect, test } from "@playwright/test";
import { ANNA, formAlert, loginAs, resetMembers, withDb } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetMembers();
  await withDb((c) => c.query("DELETE FROM feedback"));
  await loginAs(page, ANNA.memberNo, ANNA.password);
});

test("Feedback senden und in der eigenen Liste sehen", async ({ page }) => {
  await page.goto("/feedback");
  await expect(page.getByText("Sie haben noch kein Feedback gesendet.")).toBeVisible();

  await page.getByLabel("Kategorie").selectOption({ label: "Resort / Aufenthalt" });
  await page.getByLabel("Resort (optional)").selectOption({ label: "Resort Seeblick" });
  await page.getByLabel("Betreff").fill("Sehr schöner Badesteg");
  await page.getByLabel("Ihre Nachricht").fill("Der Steg war sauber und das Personal freundlich.");
  await page.getByRole("button", { name: "Feedback senden" }).click();

  await expect(page.getByRole("status")).toHaveText(/Vielen Dank/);
  await expect(page.getByLabel("Betreff")).toHaveValue("");
  const item = page.getByRole("listitem").filter({ hasText: "Sehr schöner Badesteg" });
  await expect(item).toContainText("Resort Seeblick");
  await expect(item).toContainText("Eingegangen");
});

test("zu kurze Eingaben werden abgelehnt", async ({ page }) => {
  await page.goto("/feedback");
  await page.getByLabel("Betreff").fill("ab");
  await page.getByLabel("Ihre Nachricht").fill("kurz");
  await page.getByRole("button", { name: "Feedback senden" }).click();
  await expect(formAlert(page)).toHaveText(/Bitte prüfen Sie Ihre Eingaben/);
});

test("fremdes Feedback ist nicht sichtbar", async ({ page }) => {
  await withDb((c) =>
    c.query(
      `INSERT INTO feedback (member_id, category, subject, message)
       SELECT id, 'general', 'Geheimes Feedback von Ben', 'Nur für Ben sichtbar.' FROM members WHERE member_no = 'M100002'`,
    ),
  );
  await page.goto("/feedback");
  await expect(page.getByText("Geheimes Feedback von Ben")).toHaveCount(0);
});
