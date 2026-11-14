import "server-only";
import { and, asc, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { findSeasonForDate } from "@/lib/resorts/seasons";
import type { VacationRequestInput } from "@/lib/validation/vacation";
import { checkDateRules, vacationConfig, type DateRuleError } from "./rules";

export type CreateVacationError = DateRuleError | "resort" | "overlap";
export type CreateVacationResult =
  { ok: true; id: number } | { ok: false; error: CreateVacationError };

/**
 * Legt eine Urlaubsanfrage an. Die Saison wird serverseitig aus Resort und
 * Anreisetag ermittelt. Die Zeile des Mitglieds wird gesperrt (SELECT … FOR UPDATE),
 * damit parallele Anfragen die Überschneidungsprüfung nicht umgehen.
 */
export async function createVacationRequest(
  memberId: number,
  input: VacationRequestInput,
  today: string,
): Promise<CreateVacationResult> {
  const dateError = checkDateRules(input.startDate, input.endDate, today);
  if (dateError) return { ok: false, error: dateError };

  return getDb().transaction(async (tx) => {
    await tx
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.id, memberId))
      .for("update");

    const [resort] = await tx
      .select({ id: schema.resorts.id })
      .from(schema.resorts)
      .where(and(eq(schema.resorts.id, input.resortId), eq(schema.resorts.active, true)));
    if (!resort) return { ok: false, error: "resort" } as const;

    const [overlap] = await tx
      .select({ id: schema.vacationRequests.id })
      .from(schema.vacationRequests)
      .where(
        and(
          eq(schema.vacationRequests.memberId, memberId),
          inArray(schema.vacationRequests.status, vacationConfig.blockingStatuses),
          lt(schema.vacationRequests.startDate, input.endDate),
          gt(schema.vacationRequests.endDate, input.startDate),
        ),
      )
      .limit(1);
    if (overlap) return { ok: false, error: "overlap" } as const;

    const seasons = await tx
      .select({
        id: schema.seasons.id,
        name: schema.seasons.name,
        type: schema.seasons.type,
        startDate: schema.seasons.startDate,
        endDate: schema.seasons.endDate,
      })
      .from(schema.seasons)
      .where(eq(schema.seasons.resortId, resort.id));
    const season = findSeasonForDate(seasons, input.startDate);

    const [result] = await tx.insert(schema.vacationRequests).values({
      memberId,
      resortId: resort.id,
      seasonId: season?.id ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      guests: input.guests,
      note: input.note,
    });
    return { ok: true, id: result.insertId } as const;
  });
}

export async function listOwnVacationRequests(memberId: number) {
  return getDb()
    .select({
      id: schema.vacationRequests.id,
      startDate: schema.vacationRequests.startDate,
      endDate: schema.vacationRequests.endDate,
      guests: schema.vacationRequests.guests,
      note: schema.vacationRequests.note,
      status: schema.vacationRequests.status,
      createdAt: schema.vacationRequests.createdAt,
      resortName: schema.resorts.name,
      resortSlug: schema.resorts.slug,
      seasonName: schema.seasons.name,
      seasonType: schema.seasons.type,
    })
    .from(schema.vacationRequests)
    .innerJoin(schema.resorts, eq(schema.resorts.id, schema.vacationRequests.resortId))
    .leftJoin(schema.seasons, eq(schema.seasons.id, schema.vacationRequests.seasonId))
    .where(eq(schema.vacationRequests.memberId, memberId))
    .orderBy(desc(schema.vacationRequests.startDate), desc(schema.vacationRequests.id));
}

export type OwnVacationRequest = Awaited<ReturnType<typeof listOwnVacationRequests>>[number];

/** Kommende offene Anfragen für das Dashboard. */
export async function listUpcomingOpenRequests(memberId: number, today: string, limit = 3) {
  return getDb()
    .select({
      id: schema.vacationRequests.id,
      startDate: schema.vacationRequests.startDate,
      endDate: schema.vacationRequests.endDate,
      status: schema.vacationRequests.status,
      resortName: schema.resorts.name,
    })
    .from(schema.vacationRequests)
    .innerJoin(schema.resorts, eq(schema.resorts.id, schema.vacationRequests.resortId))
    .where(
      and(
        eq(schema.vacationRequests.memberId, memberId),
        inArray(schema.vacationRequests.status, vacationConfig.blockingStatuses),
        gt(schema.vacationRequests.endDate, today),
      ),
    )
    .orderBy(asc(schema.vacationRequests.startDate))
    .limit(limit);
}

/** Storniert eine eigene, noch ausstehende Anfrage. Gibt false zurück, wenn das nicht geht. */
export async function cancelVacationRequest(memberId: number, id: number): Promise<boolean> {
  const [result] = await getDb()
    .update(schema.vacationRequests)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(schema.vacationRequests.id, id),
        eq(schema.vacationRequests.memberId, memberId),
        eq(schema.vacationRequests.status, "pending"),
      ),
    );
  return result.affectedRows === 1;
}
