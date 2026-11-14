import "server-only";
import type { ChangePasswordState } from "@/components/change-password-form";
import { changePasswordSchema } from "@/lib/validation/auth";
import { changePassword } from "./change-password";
import { getRequestInfo } from "./request-info";
import type { CurrentSession } from "./session";

/** Gemeinsame Formular-Logik für den erzwungenen Wechsel und das Profil (WP6). */
export async function handleChangePassword(
  session: CurrentSession,
  formData: FormData,
): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((i) => i.message === "mismatch");
    return { error: mismatch ? "mismatch" : "invalid" };
  }
  const { ip } = await getRequestInfo();
  const result = await changePassword({
    memberId: session.member.id,
    memberNo: session.member.memberNo,
    sessionId: session.sessionId,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    ip,
  });
  return result.ok ? { success: true } : { error: result.error };
}
