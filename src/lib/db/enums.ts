// Wertelisten ohne Abhängigkeiten, damit Client-Komponenten sie importieren können,
// ohne Drizzle mitzuladen. schema.ts exportiert sie weiter.
export const memberRoles = ["member", "admin"] as const;
export type MemberRole = (typeof memberRoles)[number];
export const seasonTypes = ["peak", "high", "low"] as const;
export type SeasonType = (typeof seasonTypes)[number];
export const feedbackCategories = ["general", "resort", "booking", "website", "other"] as const;
export const feedbackStatuses = ["new", "read", "answered"] as const;
export type FeedbackStatus = (typeof feedbackStatuses)[number];
export const vacationStatuses = ["pending", "approved", "rejected", "cancelled"] as const;
export type VacationStatus = (typeof vacationStatuses)[number];
