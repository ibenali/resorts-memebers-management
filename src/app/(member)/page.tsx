import { requireMember } from "@/lib/auth/guard";
import { getMessages } from "@/lib/i18n";

export default async function DashboardPage() {
  const t = getMessages();
  const { member } = await requireMember();
  return (
    <section>
      <h1 className="text-2xl font-semibold">
        {t.dashboard.greeting}, {member.firstName}
      </h1>
      <p className="mt-2 text-stone-600">{t.app.tagline}</p>
    </section>
  );
}
