import { z } from "zod";

/** Länder, die im Adressformular angeboten werden (ISO 3166-1 alpha-2). */
export const addressCountries = [
  "DE",
  "AT",
  "CH",
  "LI",
  "LU",
  "BE",
  "NL",
  "FR",
  "IT",
  "ES",
  "PT",
  "DK",
  "SE",
  "NO",
  "FI",
  "PL",
  "CZ",
  "SK",
  "HU",
  "SI",
  "HR",
  "GR",
  "IE",
  "GB",
  "US",
  "CA",
] as const;

export const addressSchema = z.object({
  street: z.string().trim().min(3).max(200),
  postalCode: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[A-Za-z0-9 -]+$/),
  city: z.string().trim().min(2).max(100),
  country: z.enum(addressCountries),
});

export type AddressInput = z.infer<typeof addressSchema>;
