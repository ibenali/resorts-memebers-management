import "server-only";
import { and, asc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export async function listActiveResorts() {
  return getDb()
    .select({
      id: schema.resorts.id,
      slug: schema.resorts.slug,
      name: schema.resorts.name,
      location: schema.resorts.location,
      country: schema.resorts.country,
      description: schema.resorts.description,
      imageUrl: schema.resorts.imageUrl,
    })
    .from(schema.resorts)
    .where(eq(schema.resorts.active, true))
    .orderBy(asc(schema.resorts.name));
}

export type ResortListItem = Awaited<ReturnType<typeof listActiveResorts>>[number];

/** Aktives Resort mit allen Saisons, die heute oder später enden. */
export async function getActiveResortBySlug(slug: string, today: string) {
  const db = getDb();
  const [resort] = await db
    .select()
    .from(schema.resorts)
    .where(and(eq(schema.resorts.slug, slug), eq(schema.resorts.active, true)))
    .limit(1);
  if (!resort) return null;

  const seasons = await db
    .select({
      id: schema.seasons.id,
      name: schema.seasons.name,
      type: schema.seasons.type,
      startDate: schema.seasons.startDate,
      endDate: schema.seasons.endDate,
    })
    .from(schema.seasons)
    .where(and(eq(schema.seasons.resortId, resort.id), gte(schema.seasons.endDate, today)))
    .orderBy(asc(schema.seasons.startDate));

  return { ...resort, seasons };
}

/** Alle Saisons eines Resorts (für die serverseitige Saisonermittlung in WP7). */
export async function getSeasonsForResort(resortId: number) {
  return getDb()
    .select({
      id: schema.seasons.id,
      name: schema.seasons.name,
      type: schema.seasons.type,
      startDate: schema.seasons.startDate,
      endDate: schema.seasons.endDate,
    })
    .from(schema.seasons)
    .where(eq(schema.seasons.resortId, resortId))
    .orderBy(asc(schema.seasons.startDate));
}
