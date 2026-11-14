import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { getMessages } from "@/lib/i18n";
import { LoginForm } from "./login-form";

export const metadata = { title: getMessages().auth.loginTitle };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const t = getMessages();
  const { next } = await searchParams;
  const nextPath = safeRedirectPath(Array.isArray(next) ? next[0] : next, "");

  if (await getCurrentSession()) redirect(nextPath || "/");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <p className="text-sm font-semibold text-brand-700">{t.app.name}</p>
      <h1 className="mt-2 text-2xl font-semibold">{t.auth.loginTitle}</h1>
      <p className="mt-2 text-stone-600">{t.auth.loginIntro}</p>
      <LoginForm next={nextPath || undefined} />
    </main>
  );
}
