"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth/guard";
import { submitFeedback } from "@/lib/feedback/service";
import { feedbackSchema } from "@/lib/validation/feedback";

export type FeedbackState = {
  error?: "invalid" | "rate_limited" | "resort";
  /** Wechselt bei jedem Erfolg, damit das Formular geleert wird. */
  successAt?: number;
};

export async function submitFeedbackAction(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const { member } = await requireMember();
  const parsed = feedbackSchema.safeParse({
    category: formData.get("category"),
    resortId: formData.get("resortId") ?? "",
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: "invalid" };

  const result = await submitFeedback(member.id, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/feedback");
  return { successAt: Date.now() };
}
