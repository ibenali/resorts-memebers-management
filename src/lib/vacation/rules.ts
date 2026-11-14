import { nightsBetween } from "@/lib/format";
import type { VacationStatus } from "@/lib/db/schema";

export const vacationConfig = {
  minNights: 1,
  // Hier anpassen; bewusst keine Umgebungsvariable, weil der Wert auch im Browser angezeigt wird.
  maxNights: 28,
  maxGuests: 10,
  /** Status, die einen Zeitraum blockieren (keine zweite überlappende Anfrage). */
  blockingStatuses: ["pending", "approved"] as VacationStatus[],
};

export type DateRuleError = "start_in_past" | "end_before_start" | "too_long";

/** Prüft Zeitraum-Regeln. Datumswerte als "YYYY-MM-DD", today in Portal-Zeitzone. */
export function checkDateRules(
  start: string,
  end: string,
  today: string,
  maxNights = vacationConfig.maxNights,
): DateRuleError | null {
  if (start < today) return "start_in_past";
  const nights = nightsBetween(start, end);
  if (nights < vacationConfig.minNights) return "end_before_start";
  if (nights > maxNights) return "too_long";
  return null;
}

/**
 * Überlappen zwei Aufenthalte? Abreisetag = Anreisetag des nächsten ist erlaubt
 * (Zeiträume sind halboffen [start, end)).
 */
export function rangesOverlap(
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string },
): boolean {
  return a.startDate < b.endDate && b.startDate < a.endDate;
}

export function canCancel(status: VacationStatus): boolean {
  return status === "pending";
}
