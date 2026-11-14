"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/guard";
import { todayIso } from "@/lib/format";
import { cancelVacationRequest, createVacationRequest } from "@/lib/vacation/service";
import { cancelSchema, vacationRequestSchema } from "@/lib/validation/vacation";

export type VacationFormState = {
  error?: "invalid" | "resort" | "start_in_past" | "end_before_start" | "too_long" | "overlap";
};

export async function createVacationRequestAction(
  _prev: VacationFormState,
  formData: FormData,
): Promise<VacationFormState> {
  const { member } = await requireMember();
  const parsed = vacationRequestSchema.safeParse({
    resortId: formData.get("resortId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    guests: formData.get("guests"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const result = await createVacationRequest(member.id, parsed.data, todayIso());
  if (!result.ok) return { error: result.error };

  revalidatePath("/urlaub");
  revalidatePath("/");
  redirect("/urlaub?status=created");
}

export async function cancelVacationRequestAction(formData: FormData): Promise<void> {
  const { member } = await requireMember();
  const parsed = cancelSchema.safeParse({ id: formData.get("id") });
  const ok = parsed.success && (await cancelVacationRequest(member.id, parsed.data.id));
  revalidatePath("/urlaub");
  revalidatePath("/");
  redirect(`/urlaub?status=${ok ? "cancelled" : "cancel_failed"}`);
}
