import { getMessages } from "@/lib/i18n";

export function PlaceholderPage({ title }: { title: string }) {
  const t = getMessages();
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-stone-600">{t.common.comingSoon}</p>
    </section>
  );
}
