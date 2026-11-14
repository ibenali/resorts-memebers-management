import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { requireSession } from "@/lib/auth/guard";
import { getMessages } from "@/lib/i18n";
import { forcedChangePasswordAction } from "./actions";

export const metadata = { title: getMessages().password.changeTitle };

// Erzwungener Passwortwechsel (must_change_password). Der normale Wechsel liegt im Profil (WP6).
export default async function ForcedChangePasswordPage() {
  const t = getMessages();
  const session = await requireSession();
  if (!session.member.mustChangePassword) redirect("/profil");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">{t.password.changeTitle}</h1>
      <p className="mt-2 text-stone-600">{t.password.forcedIntro}</p>
      <ChangePasswordForm action={forcedChangePasswordAction} />
    </main>
  );
}
