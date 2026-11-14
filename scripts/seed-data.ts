import type { SeasonType } from "../src/lib/db/schema";

type SeedSeason = { name: string; type: SeasonType; start: string; end: string };

export type SeedResort = {
  slug: string;
  name: string;
  location: string;
  country: string;
  description: string;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  contactPhone: string;
  contactEmail: string;
  /** Saisons als MM-DD, werden für jedes Seed-Jahr ausgerollt. */
  seasons: SeedSeason[];
};

// Fiktive Beispieldaten für Entwicklung und Staging.
export const seedResorts: SeedResort[] = [
  {
    slug: "seeblick-bodensee",
    name: "Resort Seeblick",
    location: "Lindau, Bodensee",
    country: "DE",
    description:
      "Familienfreundliches Resort direkt am Ufer mit eigenem Badesteg und Blick auf die Alpen.",
    amenities: ["Badesteg", "Hallenbad", "Kinderclub", "Fahrradverleih", "Restaurant"],
    checkInTime: "15:00:00",
    checkOutTime: "10:00:00",
    contactPhone: "+49 8382 000000",
    contactEmail: "seeblick@example.com",
    seasons: [
      { name: "Nebensaison Winter", type: "low", start: "01-01", end: "03-31" },
      { name: "Zwischensaison Frühling", type: "high", start: "04-01", end: "06-30" },
      { name: "Hauptsaison Sommer", type: "peak", start: "07-01", end: "08-31" },
      { name: "Zwischensaison Herbst", type: "high", start: "09-01", end: "10-31" },
      { name: "Nebensaison Spätherbst", type: "low", start: "11-01", end: "12-19" },
      { name: "Weihnachten & Silvester", type: "peak", start: "12-20", end: "12-31" },
    ],
  },
  {
    slug: "alpenhof-tirol",
    name: "Alpenhof Tirol",
    location: "Seefeld in Tirol",
    country: "AT",
    description: "Berg-Resort mit Wellnessbereich, im Winter direkt an der Loipe und den Liften.",
    amenities: ["Spa", "Sauna", "Skiraum", "Loipeneinstieg", "Halbpension"],
    checkInTime: "16:00:00",
    checkOutTime: "10:00:00",
    contactPhone: "+43 5212 000000",
    contactEmail: "alpenhof@example.com",
    seasons: [
      { name: "Hauptsaison Winter", type: "peak", start: "01-01", end: "03-15" },
      { name: "Nebensaison Frühling", type: "low", start: "03-16", end: "05-31" },
      { name: "Sommersaison", type: "high", start: "06-01", end: "09-30" },
      { name: "Nebensaison Herbst", type: "low", start: "10-01", end: "12-14" },
      { name: "Wintersaison Dezember", type: "peak", start: "12-15", end: "12-31" },
    ],
  },
  {
    slug: "costa-dorada-mar",
    name: "Costa Dorada Mar",
    location: "Salou, Katalonien",
    country: "ES",
    description: "Strand-Resort mit Apartments, Pools und kurzem Weg in die Altstadt.",
    amenities: ["Außenpool", "Strandzugang", "Fitnessraum", "Kinderpool", "Tiefgarage"],
    checkInTime: "15:00:00",
    checkOutTime: "11:00:00",
    contactPhone: "+34 977 000000",
    contactEmail: "costadorada@example.com",
    seasons: [
      { name: "Nebensaison Winter", type: "low", start: "01-01", end: "03-31" },
      { name: "Frühsommer", type: "high", start: "04-01", end: "06-14" },
      { name: "Hauptsaison Sommer", type: "peak", start: "06-15", end: "09-15" },
      { name: "Spätsommer", type: "high", start: "09-16", end: "10-31" },
      { name: "Nebensaison Winter", type: "low", start: "11-01", end: "12-31" },
    ],
  },
];

export type SeedMember = {
  memberNo: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mustChangePassword: boolean;
  street: string;
  postalCode: string;
  city: string;
  country: string;
};

// Test-Zugänge NUR für Entwicklung/Staging. Passwörter stehen bewusst hier,
// damit Entwickler sich anmelden können; in Produktion wird nicht geseedet.
export const seedMembers: SeedMember[] = [
  {
    memberNo: "M100001",
    firstName: "Anna",
    lastName: "Beispiel",
    email: "anna.beispiel@example.com",
    password: "Urlaub-2026-Test",
    mustChangePassword: false,
    street: "Musterstraße 1",
    postalCode: "10115",
    city: "Berlin",
    country: "DE",
  },
  {
    memberNo: "M100002",
    firstName: "Ben",
    lastName: "Probe",
    email: "ben.probe@example.com",
    password: "Erstpasswort-2026",
    mustChangePassword: true,
    street: "Testweg 5",
    postalCode: "80331",
    city: "München",
    country: "DE",
  },
];

/** Rollt Saisons (MM-DD) für die angegebenen Jahre zu konkreten Datumsbereichen aus. */
export function expandSeasons(seasons: SeedSeason[], years: number[]) {
  return years.flatMap((year) =>
    seasons.map((s) => ({
      name: s.name,
      type: s.type,
      startDate: `${year}-${s.start}`,
      endDate: `${year}-${s.end}`,
    })),
  );
}
