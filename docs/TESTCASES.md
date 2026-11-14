# Testfälle aus den Anforderungen

Katalog für die Feature-PRs. Spalte „Spec“ zeigt, wo ein Fall automatisiert ist; offene
Fälle gehören in die jeweilige `e2e/<feature>.spec.ts` des Pakets. Sicherheitsfälle
quer über alle Pakete liegen in `e2e/qa-security.spec.ts`, DB-Regeln in
`src/lib/db/schema.db.test.ts` (`npm run test:db`).

## Login (WP3)

| Fall                                                                                  | Spec        |
| ------------------------------------------------------------------------------------- | ----------- |
| Login mit Nummer + Passwort, Rücksprung zum Ziel, Logout                              | auth        |
| Nummer unabhängig von Groß-/Kleinschreibung                                           | auth        |
| Gleiche Meldung bei falschem Passwort und unbekannter Nummer                          | auth        |
| Gleiche Antwortzeit bei bekannter und unbekannter Nummer                              | qa-security |
| Sperre nach 5 Fehlversuchen, auch für das richtige Passwort                           | auth        |
| IP-Limit nach 20 Fehlversuchen / 15 min                                               | qa-security |
| Erzwungener Passwortwechsel, andere Seiten gesperrt                                   | auth        |
| Mitglieds-ID in Header/Query/Cookie ersetzt keinen Login                              | qa-security |
| Cookie-Flags, nur Token-Hash in der DB, Replay, Ablauf (gleitend + absolut), Fixation | qa-security |
| Passwortwechsel beendet andere Sessions                                               | qa-security |
| Kein Open Redirect über `?next=`                                                      | qa-security |

## Resorts & Saisons (WP4)

| Fall                                                                              | Spec        |
| --------------------------------------------------------------------------------- | ----------- |
| Liste aller aktiven Resorts                                                       | resorts     |
| Detail mit Ausstattung, Zeiten, Kontakt, Saisonkalender, aktuelle Saison markiert | resorts     |
| Unbekanntes Resort → 404                                                          | resorts     |
| Inaktives Resort weder in Liste noch per URL erreichbar                           | offen       |
| Resort-Seiten ohne gültige Session → Login (auch mit Fake-Cookie)                 | qa-security |

## Feedback (WP5)

- Absenden mit Kategorie, optionalem Resort, Betreff, Text → Bestätigung, erscheint in eigener Liste, DB-Status `new`.
- Serverseitige Prüfung: leerer/zu langer Betreff (> 150), leerer Text, ungültige Kategorie (Formular mit `novalidate` abschicken).
- HTML/Script im Betreff/Text wird als Text angezeigt (kein XSS).
- Untergeschobenes Feld `memberId` im Formular wird ignoriert; Feedback landet beim angemeldeten Mitglied.
- Feedback anderer Mitglieder ist nicht sichtbar.

## Adresse & Passwort (WP6)

- Adresse vorausgefüllt; Änderung gespeichert, nach Reload sichtbar, `audit_log`-Eintrag.
- Pflichtfelder/Längen serverseitig geprüft, bei Fehler bleibt die alte Adresse.
- Passwort: falsches aktuelles, zu kurz, gleich dem alten, Wiederholung abweichend → Fehler.
- Erfolg: neues Passwort gilt, altes nicht, andere Sessions beendet, eigene bleibt.

## Urlaubsanfragen (WP7)

- Anfrage stellen → Status „Offen“, Saison serverseitig aus Resort + Anreise ermittelt.
- Ungültig: Abreise ≤ Anreise, Anreise in der Vergangenheit, > 28 Nächte, 0 Personen, inaktives Resort.
- Keine zwei überlappenden offenen Anfragen.
- Nur `pending` kann storniert werden; danach kein Storno-Button mehr.
- IDOR: Storno mit manipulierter ID einer fremden Anfrage ändert nichts.
- Fremde Anfragen sind nicht sichtbar.

## Gegen Staging/Produktion

IP-Limit und XFF-Spoofing lassen sich nur hinter dem Proxy prüfen (`TRUST_PROXY=1`),
mit `E2E_BEHIND_PROXY=1` gegen die Staging-URL (Lauf folgt nach dem Deployment).
Lokal und in der CI ist das IP-Limit bewusst aus; dort prüft der Test nur, dass gefälschte
X-Forwarded-For-Werte ignoriert werden.
