"use server";

import { redirect } from "next/navigation";
import type { ChangePasswordState } from "@/components/change-password-form";
import { handleChangePassword } from "@/lib/auth/change-password-action";
import { requireSession } from "@/lib/auth/guard";

export async function forcedChangePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await requireSession();
  const result = await handleChangePassword(session, formData);
  if (result.success) redirect("/");
  return result;
}
