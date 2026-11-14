import type { SeasonType } from "@/lib/db/schema";

export type SeasonLike = {
  id: number;
  name: string;
  type: SeasonType;
  startDate: string;
  endDate: string;
};

/** Saison, in die ein Datum fällt (Start- und Enddatum inklusive). ISO-Strings sind sortierbar. */
export function findSeasonForDate<T extends SeasonLike>(seasons: T[], date: string): T | null {
  return seasons.find((s) => s.startDate <= date && date <= s.endDate) ?? null;
}

/** Saisons nach Jahr des Startdatums gruppiert und sortiert. */
export function groupSeasonsByYear<T extends SeasonLike>(seasons: T[]): [number, T[]][] {
  const byYear = new Map<number, T[]>();
  for (const s of [...seasons].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const year = Number(s.startDate.slice(0, 4));
    byYear.set(year, [...(byYear.get(year) ?? []), s]);
  }
  return [...byYear.entries()].sort(([a], [b]) => a - b);
}

/** Überschneiden sich zwei Saisons? Start- und Enddatum sind inklusive. */
export function seasonsOverlap(
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string },
): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}
