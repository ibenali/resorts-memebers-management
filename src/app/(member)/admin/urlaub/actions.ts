"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { decideVacationRequest } from "@/lib/admin/service";
import { audit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { getRequestInfo } from "@/lib/auth/request-info";
import { vacationDecisionSchema } from "@/lib/validation/admin";

export async function decideVacationAction(formData: FormData): Promise<void> {
  const { member } = await requireAdmin();
  const parsed = vacationDecisionSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
  });
  const back = String(formData.get("back") ?? "pending").replace(/[^a-z]/g, "") || "pending";
  if (!parsed.success) redirect(`/admin/urlaub?status=${back}&result=failed`);

  const ok = await decideVacationRequest(parsed.data.id, parsed.data.decision);
  if (ok) {
    const { ip } = await getRequestInfo();
    await audit(
      parsed.data.decision === "approved" ? "admin_vacation_approved" : "admin_vacation_rejected",
      member.id,
      ip,
    );
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/urlaub");
  redirect(`/admin/urlaub?status=${back}&result=${ok ? parsed.data.decision : "failed"}`);
}
