import Link from "next/link";
import { notFound } from "next/navigation";
import { SeasonBadge } from "@/components/season-badge";
import { requireMember } from "@/lib/auth/guard";
import { countryName, formatDate, formatTime, todayIso } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { getActiveResortBySlug } from "@/lib/resorts/queries";
import { findSeasonForDate, groupSeasonsByYear } from "@/lib/resorts/seasons";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const resort = await getActiveResortBySlug(slug, todayIso());
  return { title: resort?.name ?? getMessages().resorts.title };
}

export default async function ResortDetailPage({ params }: Props) {
  await requireMember();
  const t = getMessages();
  const { slug } = await params;
  const today = todayIso();
  const resort = await getActiveResortBySlug(slug, today);
  if (!resort) notFound();

  const current = findSeasonForDate(resort.seasons, today);
  const years = groupSeasonsByYear(resort.seasons);

  return (
    <article>
      <Link href="/resorts" className="text-sm text-brand-700 hover:underline">
        ← {t.resorts.back}
      </Link>
      <header className="mt-3">
        <h1 className="text-2xl font-semibold">{resort.name}</h1>
        <p className="text-stone-500">
          {resort.location}, {countryName(resort.country)}
        </p>
      </header>
      <p className="mt-4 max-w-3xl text-stone-700">{resort.description}</p>

      <div className="mt-6">
        <Link href={`/urlaub/neu?resort=${resort.slug}`} className="btn-primary inline-block">
          {t.resorts.requestVacation}
        </Link>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">{t.resorts.amenities}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-stone-700">
            {resort.amenities.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">{t.resorts.arrival}</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-stone-500">{t.resorts.checkIn}</dt>
              <dd>{formatTime(resort.checkInTime)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-stone-500">{t.resorts.checkOut}</dt>
              <dd>{formatTime(resort.checkOutTime)}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">{t.resorts.contact}</h2>
          <dl className="mt-3 space-y-1 text-sm">
            {resort.contactPhone ? (
              <div>
                <dt className="sr-only">{t.resorts.phone}</dt>
                <dd>
                  <a
                    href={`tel:${resort.contactPhone.replace(/\s/g, "")}`}
                    className="text-brand-700 hover:underline"
                  >
                    {resort.contactPhone}
                  </a>
                </dd>
              </div>
            ) : null}
            {resort.contactEmail ? (
              <div>
                <dt className="sr-only">{t.resorts.email}</dt>
                <dd>
                  <a
                    href={`mailto:${resort.contactEmail}`}
                    className="text-brand-700 hover:underline"
                  >
                    {resort.contactEmail}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      <section className="mt-10" aria-labelledby="seasons-heading">
        <h2 id="seasons-heading" className="text-xl font-semibold">
          {t.resorts.seasons}
        </h2>
        <p className="mt-1 text-sm text-stone-600">{t.resorts.seasonsIntro}</p>
        {years.length === 0 ? (
          <p className="mt-4 text-stone-600">{t.resorts.noSeasons}</p>
        ) : (
          years.map(([year, seasons]) => (
            <div key={year} className="mt-6">
              <h3 className="font-semibold text-stone-700">{year}</h3>
              <div className="mt-2 overflow-x-auto rounded-lg border border-stone-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-100 text-stone-600">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t.resorts.season}
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t.resorts.type}
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t.resorts.period}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasons.map((s) => (
                      <tr
                        key={s.id}
                        className={`border-t border-stone-100 ${s.id === current?.id ? "bg-brand-50" : ""}`}
                      >
                        <td className="px-4 py-2">
                          {s.name}
                          {s.id === current?.id ? (
                            <span className="ml-2 text-xs font-semibold text-brand-700">
                              ({t.resorts.current})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">
                          <SeasonBadge type={s.type} />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatDate(s.startDate)} – {formatDate(s.endDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </article>
  );
}
