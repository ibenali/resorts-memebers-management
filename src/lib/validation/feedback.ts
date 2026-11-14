import { z } from "zod";
import { feedbackCategories } from "@/lib/db/schema";

const optionalId = z
  .union([z.literal(""), z.coerce.number().int().positive()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const feedbackSchema = z.object({
  category: z.enum(feedbackCategories),
  resortId: optionalId,
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(5000),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
