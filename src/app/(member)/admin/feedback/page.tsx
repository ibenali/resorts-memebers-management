import { FilterTabs } from "@/components/filter-tabs";
import { Notice } from "@/components/notice";
import { listFeedbackForAdmin } from "@/lib/admin/service";
import { requireAdmin } from "@/lib/auth/guard";
import { feedbackStatuses, type FeedbackStatus } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { setFeedbackStatusAction } from "./actions";

export const metadata = { title: getMessages().admin.feedback.title };

type Props = { searchParams: Promise<{ status?: string; result?: string }> };

export default async function AdminFeedbackPage({ searchParams }: Props) {
  await requireAdmin();
  const t = getMessages();
  const { status: rawStatus, result } = await searchParams;
  const status = (feedbackStatuses as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as FeedbackStatus)
    : rawStatus === "all"
      ? null
      : "new";
  const active = status ?? "all";
  const items = await listFeedbackForAdmin(status);

  const tabs = [
    ...feedbackStatuses.map((s) => ({ value: s, label: t.feedback.statuses[s] })),
    { value: "all", label: t.admin.filterAll },
  ];

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.admin.feedback.title}</h1>
      <FilterTabs base="/admin/feedback" tabs={tabs} active={active} />
      {result === "updated" ? <Notice kind="success">{t.admin.feedback.updated}</Notice> : null}
      {result === "failed" ? <Notice kind="error">{t.admin.feedback.failed}</Notice> : null}

      {items.length === 0 ? (
        <p className="text-stone-600">{t.admin.feedback.empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-medium">{f.subject}</h2>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                  {t.feedback.statuses[f.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {formatDateTime(f.createdAt)} · {t.feedback.categories[f.category]}
                {f.resortName ? ` · ${f.resortName}` : ""} · {f.memberFirstName} {f.memberName} (
                {f.memberNo})
              </p>
              <p className="mt-2 whitespace-pre-line text-stone-700">{f.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(f.status === "new"
                  ? (["read", "answered"] as const)
                  : f.status === "read"
                    ? (["answered"] as const)
                    : []
                ).map((next) => (
                  <form key={next} action={setFeedbackStatusAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="back" value={active} />
                    <input type="hidden" name="status" value={next} />
                    <button
                      type="submit"
                      className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-100"
                    >
                      {next === "read" ? t.admin.feedback.markRead : t.admin.feedback.markAnswered}
                    </button>
                  </form>
                ))}
                {f.memberEmail ? (
                  <a
                    href={`mailto:${f.memberEmail}?subject=${encodeURIComponent(`Re: ${f.subject}`)}`}
                    className="text-brand-700 hover:underline"
                  >
                    {t.admin.feedback.reply}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
