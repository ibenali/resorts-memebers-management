import Link from "next/link";
import { VacationStatusBadge } from "@/components/vacation-status-badge";
import { requireMember } from "@/lib/auth/guard";
import { formatDate, todayIso } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { listUpcomingOpenRequests } from "@/lib/vacation/service";

export default async function DashboardPage() {
  const t = getMessages();
  const { member } = await requireMember();
  const upcoming = await listUpcomingOpenRequests(member.id, todayIso());

  const quickLinks = [
    { href: "/urlaub/neu", label: t.vacation.newTitle },
    { href: "/resorts", label: t.nav.resorts },
    { href: "/feedback", label: t.feedback.formTitle },
    { href: "/profil", label: t.nav.profile },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">
          {t.dashboard.greeting}, {member.firstName}
        </h1>
        <p className="mt-2 text-stone-600">{t.app.tagline}</p>
      </section>

      <section
        aria-labelledby="upcoming"
        className="rounded-lg border border-stone-200 bg-white p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="upcoming" className="font-semibold">
            {t.vacation.upcomingTitle}
          </h2>
          <Link href="/urlaub" className="text-sm text-brand-700 hover:underline">
            {t.vacation.allRequests} →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">{t.vacation.upcomingEmpty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span>
                  <strong>{r.resortName}</strong> · {formatDate(r.startDate)} –{" "}
                  {formatDate(r.endDate)}
                </span>
                <VacationStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav aria-label="Schnellzugriff">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block rounded-lg border border-stone-200 bg-white p-4 font-medium text-brand-900 hover:border-brand-600"
              >
                {l.label} →
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
