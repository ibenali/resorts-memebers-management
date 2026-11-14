import { getMessages } from "@/lib/i18n";

export default function DashboardPage() {
  const t = getMessages();
  return (
    <section>
      <h1 className="text-2xl font-semibold">{t.nav.dashboard}</h1>
      <p className="mt-2 text-stone-600">{t.app.tagline}</p>
    </section>
  );
}
