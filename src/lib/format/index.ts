/** Formatierung für die deutsche Oberfläche. Datumswerte kommen als "YYYY-MM-DD". */

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const countryNames = new Intl.DisplayNames(["de"], { type: "region" });

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(d);
}

/** "15:00:00" → "15:00 Uhr" */
export function formatTime(time: string): string {
  return `${time.slice(0, 5)} Uhr`;
}

export function countryName(code: string): string {
  try {
    return countryNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Heutiges Datum als "YYYY-MM-DD" in der Zeitzone des Portals. */
export function todayIso(now: Date = new Date(), timeZone = "Europe/Berlin"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/** Anzahl Nächte zwischen zwei "YYYY-MM-DD"-Daten. */
export function nightsBetween(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
