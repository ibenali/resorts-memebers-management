import { z } from "zod";
import { feedbackStatuses, seasonTypes } from "@/lib/db/schema";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => new Date(`${v}T00:00:00Z`).toISOString().startsWith(v));

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  .transform((v) => (v.length === 5 ? `${v}:00` : v));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const resortSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(150),
  location: z.string().trim().min(2).max(150),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  description: z.string().trim().min(10).max(5000),
  /** Eine Ausstattung pro Zeile. */
  amenities: z
    .string()
    .max(3000)
    .transform((v) =>
      v
        .split(/\r?\n/)
        .map((a) => a.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(100)).max(30)),
  checkInTime: time,
  checkOutTime: time,
  contactPhone: optionalText(50),
  contactEmail: optionalText(255).pipe(z.email().nullable()),
  imageUrl: optionalText(500).pipe(z.url({ protocol: /^https$/ }).nullable()),
  active: z
    .union([z.literal("on"), z.literal(""), z.null(), z.undefined()])
    .transform((v) => v === "on"),
});

export type ResortInput = z.infer<typeof resortSchema>;

export const seasonSchema = z
  .object({
    name: z.string().trim().min(2).max(50),
    type: z.enum(seasonTypes),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((s) => s.startDate <= s.endDate, { path: ["endDate"], message: "order" });

export type SeasonInput = z.infer<typeof seasonSchema>;

export const idSchema = z.coerce.number().int().positive();
export const vacationDecisionSchema = z.object({
  id: idSchema,
  decision: z.enum(["approved", "rejected"]),
});
export const feedbackStatusSchema = z.object({
  id: idSchema,
  status: z.enum(feedbackStatuses),
});
