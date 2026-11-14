/**
 * Deutsche Texte der Oberfläche. Alle sichtbaren Texte laufen über dieses
 * Wörterbuch, damit später weitere Sprachen ergänzt werden können.
 */
export const de = {
  app: {
    name: "Resort-Mitgliederportal",
    tagline: "Ihr Zugang zu Resorts, Saisons und Urlaubsanfragen",
  },
  nav: {
    dashboard: "Übersicht",
    resorts: "Resorts",
    vacation: "Urlaub",
    feedback: "Feedback",
    profile: "Profil",
    login: "Anmelden",
  },
  common: {
    comingSoon: "Diese Seite wird gerade gebaut.",
  },
  footer: {
    imprint: "Impressum",
    privacy: "Datenschutz",
  },
} as const;

export type Messages = typeof de;
