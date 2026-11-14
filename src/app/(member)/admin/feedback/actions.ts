"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setFeedbackStatus } from "@/lib/admin/service";
import { audit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { getRequestInfo } from "@/lib/auth/request-info";
import { feedbackStatusSchema } from "@/lib/validation/admin";

export async function setFeedbackStatusAction(formData: FormData): Promise<void> {
  const { member } = await requireAdmin();
  const parsed = feedbackStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  const back = String(formData.get("back") ?? "new").replace(/[^a-z]/g, "") || "new";
  const ok = parsed.success && (await setFeedbackStatus(parsed.data.id, parsed.data.status));
  if (ok) {
    const { ip } = await getRequestInfo();
    await audit("admin_feedback_status", member.id, ip);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/feedback");
  redirect(`/admin/feedback?status=${back}&result=${ok ? "updated" : "failed"}`);
}
