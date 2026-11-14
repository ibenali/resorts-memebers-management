import Link from "next/link";
import { requireMember } from "@/lib/auth/guard";
import { countryName } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { listActiveResorts } from "@/lib/resorts/queries";

export const metadata = { title: getMessages().resorts.title };

export default async function ResortsPage() {
  await requireMember();
  const t = getMessages();
  const resorts = await listActiveResorts();

  return (
    <section>
      <h1 className="text-2xl font-semibold">{t.resorts.title}</h1>
      <p className="mt-2 text-stone-600">{t.resorts.intro}</p>
      {resorts.length === 0 ? (
        <p className="mt-6 text-stone-600">{t.resorts.empty}</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resorts.map((r) => (
            <li key={r.id}>
              <Link
                href={`/resorts/${r.slug}`}
                className="block h-full rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-brand-600 hover:shadow"
              >
                <h2 className="text-lg font-semibold text-brand-900">{r.name}</h2>
                <p className="text-sm text-stone-500">
                  {r.location}, {countryName(r.country)}
                </p>
                <p className="mt-3 line-clamp-3 text-sm text-stone-700">{r.description}</p>
                <span className="mt-4 inline-block text-sm font-medium text-brand-700">
                  {t.resorts.details} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
