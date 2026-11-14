import "server-only";
import { aliasedTable, and, asc, count, desc, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { FeedbackStatus, VacationStatus } from "@/lib/db/schema";
import { seasonsOverlap } from "@/lib/resorts/seasons";
import type { ResortInput, SeasonInput } from "@/lib/validation/admin";

const { members, resorts, seasons, feedback, vacationRequests } = schema;

export async function getAdminOverview() {
  const db = getDb();
  const [[pending], [newFeedback], [activeResorts]] = await Promise.all([
    db.select({ n: count() }).from(vacationRequests).where(eq(vacationRequests.status, "pending")),
    db.select({ n: count() }).from(feedback).where(eq(feedback.status, "new")),
    db.select({ n: count() }).from(resorts).where(eq(resorts.active, true)),
  ]);
  return {
    pendingRequests: pending?.n ?? 0,
    newFeedback: newFeedback?.n ?? 0,
    activeResorts: activeResorts?.n ?? 0,
  };
}

// ---- Urlaubsanfragen ---------------------------------------------------------

export async function listVacationRequestsForAdmin(status: VacationStatus | null) {
  return getDb()
    .select({
      id: vacationRequests.id,
      startDate: vacationRequests.startDate,
      endDate: vacationRequests.endDate,
      guests: vacationRequests.guests,
      note: vacationRequests.note,
      status: vacationRequests.status,
      createdAt: vacationRequests.createdAt,
      memberNo: members.memberNo,
      memberName: members.lastName,
      memberFirstName: members.firstName,
      resortName: resorts.name,
      seasonName: seasons.name,
      seasonType: seasons.type,
    })
    .from(vacationRequests)
    .innerJoin(members, eq(members.id, vacationRequests.memberId))
    .innerJoin(resorts, eq(resorts.id, vacationRequests.resortId))
    .leftJoin(seasons, eq(seasons.id, vacationRequests.seasonId))
    .where(status ? eq(vacationRequests.status, status) : undefined)
    .orderBy(asc(vacationRequests.startDate), asc(vacationRequests.id))
    .limit(200);
}

/** Entscheidet über eine ausstehende Anfrage. false, wenn sie nicht (mehr) ausstehend ist. */
export async function decideVacationRequest(
  id: number,
  decision: "approved" | "rejected",
): Promise<boolean> {
  const [result] = await getDb()
    .update(vacationRequests)
    .set({ status: decision })
    .where(and(eq(vacationRequests.id, id), eq(vacationRequests.status, "pending")));
  return result.affectedRows === 1;
}

// ---- Feedback ----------------------------------------------------------------

export async function listFeedbackForAdmin(status: FeedbackStatus | null) {
  return getDb()
    .select({
      id: feedback.id,
      category: feedback.category,
      subject: feedback.subject,
      message: feedback.message,
      status: feedback.status,
      createdAt: feedback.createdAt,
      memberNo: members.memberNo,
      memberFirstName: members.firstName,
      memberName: members.lastName,
      memberEmail: members.email,
      resortName: resorts.name,
    })
    .from(feedback)
    .innerJoin(members, eq(members.id, feedback.memberId))
    .leftJoin(resorts, eq(resorts.id, feedback.resortId))
    .where(status ? eq(feedback.status, status) : undefined)
    .orderBy(desc(feedback.createdAt), desc(feedback.id))
    .limit(200);
}

export async function setFeedbackStatus(id: number, status: FeedbackStatus): Promise<boolean> {
  const [result] = await getDb().update(feedback).set({ status }).where(eq(feedback.id, id));
  return result.affectedRows === 1;
}

// ---- Resorts & Saisons -------------------------------------------------------

export async function listAllResorts() {
  const s = aliasedTable(seasons, "s");
  return getDb()
    .select({
      id: resorts.id,
      slug: resorts.slug,
      name: resorts.name,
      location: resorts.location,
      country: resorts.country,
      active: resorts.active,
      seasonCount: count(s.id),
    })
    .from(resorts)
    .leftJoin(s, eq(s.resortId, resorts.id))
    .groupBy(resorts.id)
    .orderBy(asc(resorts.name));
}

export async function getResortForAdmin(id: number) {
  const db = getDb();
  const [resort] = await db.select().from(resorts).where(eq(resorts.id, id));
  if (!resort) return null;
  const list = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      type: seasons.type,
      startDate: seasons.startDate,
      endDate: seasons.endDate,
    })
    .from(seasons)
    .where(eq(seasons.resortId, id))
    .orderBy(asc(seasons.startDate));
  return { ...resort, seasons: list };
}

export type SaveResortResult = { ok: true; id: number } | { ok: false; error: "slug_taken" };

export async function saveResort(input: ResortInput, id: number | null): Promise<SaveResortResult> {
  const db = getDb();
  const [clash] = await db
    .select({ id: resorts.id })
    .from(resorts)
    .where(
      id ? and(eq(resorts.slug, input.slug), ne(resorts.id, id)) : eq(resorts.slug, input.slug),
    );
  if (clash) return { ok: false, error: "slug_taken" };

  if (id) {
    await db.update(resorts).set(input).where(eq(resorts.id, id));
    return { ok: true, id };
  }
  const [result] = await db.insert(resorts).values(input);
  return { ok: true, id: result.insertId };
}

export type AddSeasonResult = { ok: true } | { ok: false; error: "overlap" | "resort" };

/** Legt eine Saison an; sie darf sich mit keiner anderen Saison des Resorts überschneiden. */
export async function addSeason(resortId: number, input: SeasonInput): Promise<AddSeasonResult> {
  return getDb().transaction(async (tx) => {
    const [resort] = await tx
      .select({ id: resorts.id })
      .from(resorts)
      .where(eq(resorts.id, resortId))
      .for("update");
    if (!resort) return { ok: false, error: "resort" } as const;
    const existing = await tx
      .select({ startDate: seasons.startDate, endDate: seasons.endDate })
      .from(seasons)
      .where(eq(seasons.resortId, resortId));
    if (existing.some((s) => seasonsOverlap(s, input)))
      return { ok: false, error: "overlap" } as const;
    await tx.insert(seasons).values({ ...input, resortId });
    return { ok: true } as const;
  });
}

/** Löscht eine Saison. Bestehende Urlaubsanfragen behalten ihre Daten (season_id → NULL). */
export async function deleteSeason(resortId: number, seasonId: number): Promise<boolean> {
  const [result] = await getDb()
    .delete(seasons)
    .where(and(eq(seasons.id, seasonId), eq(seasons.resortId, resortId)));
  return result.affectedRows === 1;
}
