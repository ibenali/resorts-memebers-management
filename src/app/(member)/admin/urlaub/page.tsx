import { ConfirmSubmit } from "@/components/confirm-submit";
import { FilterTabs } from "@/components/filter-tabs";
import { Notice } from "@/components/notice";
import { SeasonBadge } from "@/components/season-badge";
import { VacationStatusBadge } from "@/components/vacation-status-badge";
import { listVacationRequestsForAdmin } from "@/lib/admin/service";
import { requireAdmin } from "@/lib/auth/guard";
import { vacationStatuses, type VacationStatus } from "@/lib/db/schema";
import { formatDate, formatDateTime, nightsBetween } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { decideVacationAction } from "./actions";

export const metadata = { title: getMessages().admin.vacation.title };

type Props = { searchParams: Promise<{ status?: string; result?: string }> };

export default async function AdminVacationPage({ searchParams }: Props) {
  await requireAdmin();
  const t = getMessages();
  const { status: rawStatus, result } = await searchParams;
  const status = (vacationStatuses as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as VacationStatus)
    : rawStatus === "all"
      ? null
      : "pending";
  const active = status ?? "all";
  const requests = await listVacationRequestsForAdmin(status);

  const tabs = [
    ...vacationStatuses.map((s) => ({ value: s, label: t.vacation.statuses[s] })),
    { value: "all", label: t.admin.filterAll },
  ];

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.admin.vacation.title}</h1>
      <FilterTabs base="/admin/urlaub" tabs={tabs} active={active} />
      {result === "approved" ? <Notice kind="success">{t.admin.vacation.approved}</Notice> : null}
      {result === "rejected" ? <Notice kind="success">{t.admin.vacation.rejected}</Notice> : null}
      {result === "failed" ? <Notice kind="error">{t.admin.vacation.failed}</Notice> : null}

      {requests.length === 0 ? (
        <p className="text-stone-600">{t.admin.vacation.empty}</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-stone-200 bg-white p-4"
            >
              <div className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-medium">{r.resortName}</span>
                  <VacationStatusBadge status={r.status} />
                </div>
                <p className="mt-1">
                  {formatDate(r.startDate)} – {formatDate(r.endDate)} ·{" "}
                  {t.vacation.nights(nightsBetween(r.startDate, r.endDate))} ·{" "}
                  {t.vacation.guestsCount(r.guests)}
                </p>
                <p className="mt-1 flex items-center gap-2 text-stone-600">
                  {r.seasonName && r.seasonType ? (
                    <>
                      {r.seasonName} <SeasonBadge type={r.seasonType} />
                    </>
                  ) : (
                    `${t.vacation.season}: ${t.vacation.noSeason}`
                  )}
                </p>
                <p className="mt-1 text-stone-600">
                  {t.admin.member}: {r.memberFirstName} {r.memberName} ({r.memberNo})
                </p>
                {r.note ? (
                  <p className="mt-1 whitespace-pre-line text-stone-500">{r.note}</p>
                ) : null}
                <p className="mt-1 text-xs text-stone-400">
                  {t.vacation.requestedAt} {formatDateTime(r.createdAt)}
                </p>
              </div>
              {r.status === "pending" ? (
                <div className="flex gap-2">
                  <form action={decideVacationAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="back" value={active} />
                    <input type="hidden" name="decision" value="approved" />
                    <button type="submit" className="btn-primary">
                      {t.admin.vacation.approve}
                    </button>
                  </form>
                  <form action={decideVacationAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="back" value={active} />
                    <input type="hidden" name="decision" value="rejected" />
                    <ConfirmSubmit
                      label={t.admin.vacation.reject}
                      confirm={t.admin.vacation.rejectConfirm}
                      className="rounded-md border border-red-300 px-4 py-2 text-red-800 hover:bg-red-50"
                    />
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
