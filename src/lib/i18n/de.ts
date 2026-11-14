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
  auth: {
    loginTitle: "Anmelden",
    loginIntro: "Melden Sie sich mit Ihrer Mitgliedsnummer und Ihrem Passwort an.",
    memberNo: "Mitgliedsnummer",
    password: "Passwort",
    submit: "Anmelden",
    submitting: "Wird geprüft …",
    invalid:
      "Mitgliedsnummer oder Passwort falsch. Nach mehreren Fehlversuchen wird der Zugang für 15 Minuten gesperrt.",
    ipBlocked: "Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.",
    logout: "Abmelden",
    loggedInAs: "Angemeldet als",
  },
  password: {
    changeTitle: "Passwort ändern",
    forcedIntro: "Bitte legen Sie vor dem ersten Zugriff ein eigenes Passwort fest.",
    current: "Aktuelles Passwort",
    new: "Neues Passwort",
    confirm: "Neues Passwort wiederholen",
    hint: "Mindestens 10 Zeichen. Keine gängigen Passwörter und nicht Ihre Mitgliedsnummer.",
    submit: "Passwort speichern",
    success: "Ihr Passwort wurde geändert. Andere Geräte wurden abgemeldet.",
    errors: {
      wrong_current: "Das aktuelle Passwort ist nicht korrekt.",
      same_as_current: "Das neue Passwort muss sich vom aktuellen unterscheiden.",
      too_short: "Das neue Passwort muss mindestens 10 Zeichen lang sein.",
      too_long: "Das neue Passwort darf höchstens 128 Zeichen lang sein.",
      common: "Dieses Passwort ist zu verbreitet. Bitte wählen Sie ein anderes.",
      contains_member_no: "Das Passwort darf Ihre Mitgliedsnummer nicht enthalten.",
      mismatch: "Die beiden neuen Passwörter stimmen nicht überein.",
      invalid: "Bitte füllen Sie alle Felder aus.",
    },
  },
  dashboard: {
    greeting: "Willkommen",
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
