import { de, type Messages } from "./de";

export type Locale = "de";

const dictionaries: Record<Locale, Messages> = { de };

export const defaultLocale: Locale = "de";

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale];
}
