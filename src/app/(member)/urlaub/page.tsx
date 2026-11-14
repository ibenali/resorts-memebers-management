import Link from "next/link";
import { SeasonBadge } from "@/components/season-badge";
import { VacationStatusBadge } from "@/components/vacation-status-badge";
import { requireMember } from "@/lib/auth/guard";
import { formatDate, formatDateTime, nightsBetween } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { canCancel } from "@/lib/vacation/rules";
import { listOwnVacationRequests } from "@/lib/vacation/service";
import { CancelButton } from "./cancel-button";

export const metadata = { title: getMessages().vacation.title };

type Props = { searchParams: Promise<{ status?: string }> };

export default async function VacationPage({ searchParams }: Props) {
  const { member } = await requireMember();
  const t = getMessages();
  const { status } = await searchParams;
  const requests = await listOwnVacationRequests(member.id);

  const notice =
    status === "created"
      ? { role: "status", text: t.vacation.created, cls: "bg-brand-50 text-brand-900" }
      : status === "cancelled"
        ? { role: "status", text: t.vacation.cancelled, cls: "bg-brand-50 text-brand-900" }
        : status === "cancel_failed"
          ? { role: "alert", text: t.vacation.cancelFailed, cls: "bg-red-50 text-red-800" }
          : null;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t.vacation.title}</h1>
          <p className="mt-1 text-stone-600">{t.vacation.intro}</p>
        </div>
        <Link href="/urlaub/neu" className="btn-primary">
          {t.vacation.newRequest}
        </Link>
      </div>

      {notice ? (
        <p role={notice.role} className={`mt-6 rounded-md p-3 text-sm ${notice.cls}`}>
          {notice.text}
        </p>
      ) : null}

      {requests.length === 0 ? (
        <p className="mt-6 text-stone-600">{t.vacation.empty}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-stone-200 bg-white p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/resorts/${r.resortSlug}`} className="font-medium hover:underline">
                    {r.resortName}
                  </Link>
                  <VacationStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-stone-700">
                  {formatDate(r.startDate)} – {formatDate(r.endDate)} ·{" "}
                  {t.vacation.nights(nightsBetween(r.startDate, r.endDate))} ·{" "}
                  {t.vacation.guestsCount(r.guests)}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-stone-600">
                  {r.seasonName && r.seasonType ? (
                    <>
                      {r.seasonName} <SeasonBadge type={r.seasonType} />
                    </>
                  ) : (
                    <span>
                      {t.vacation.season}: {t.vacation.noSeason}
                    </span>
                  )}
                </p>
                {r.note ? (
                  <p className="mt-1 text-sm whitespace-pre-line text-stone-500">{r.note}</p>
                ) : null}
                <p className="mt-1 text-xs text-stone-400">
                  {t.vacation.requestedAt} {formatDateTime(r.createdAt)}
                </p>
              </div>
              {canCancel(r.status) ? <CancelButton id={r.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
