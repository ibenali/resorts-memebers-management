"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/auth/login";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { getRequestInfo } from "@/lib/auth/request-info";
import { CHANGE_PASSWORD_PATH } from "@/lib/auth/guard";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = { error?: "invalid" | "ip_blocked"; memberNo?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    memberNo: formData.get("memberNo"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "invalid", memberNo: String(formData.get("memberNo") ?? "").slice(0, 20) };
  }

  const { ip, userAgent } = await getRequestInfo();
  const result = await login({
    memberNo: parsed.data.memberNo,
    password: parsed.data.password,
    ip,
    userAgent,
  });
  if (!result.ok) return { error: result.reason, memberNo: parsed.data.memberNo };

  redirect(result.mustChangePassword ? CHANGE_PASSWORD_PATH : safeRedirectPath(parsed.data.next));
}
