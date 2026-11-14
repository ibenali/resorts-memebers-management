import { z } from "zod";
import { vacationConfig } from "@/lib/vacation/rules";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
  });

export const vacationRequestSchema = z.object({
  resortId: z.coerce.number().int().positive(),
  startDate: isoDate,
  endDate: isoDate,
  guests: z.coerce.number().int().min(1).max(vacationConfig.maxGuests),
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type VacationRequestInput = z.infer<typeof vacationRequestSchema>;

export const cancelSchema = z.object({ id: z.coerce.number().int().positive() });
