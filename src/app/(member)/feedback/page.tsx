import { requireMember } from "@/lib/auth/guard";
import { listOwnFeedback } from "@/lib/feedback/service";
import { formatDateTime } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { listActiveResorts } from "@/lib/resorts/queries";
import { FeedbackForm } from "./feedback-form";

export const metadata = { title: getMessages().feedback.title };

export default async function FeedbackPage() {
  const { member } = await requireMember();
  const t = getMessages();
  const [resorts, items] = await Promise.all([listActiveResorts(), listOwnFeedback(member.id)]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold">{t.feedback.title}</h1>
        <p className="mt-2 text-stone-600">{t.feedback.intro}</p>
        <div className="mt-6 max-w-2xl rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">{t.feedback.formTitle}</h2>
          <FeedbackForm resorts={resorts.map((r) => ({ id: r.id, name: r.name }))} />
        </div>
      </section>

      <section aria-labelledby="feedback-list">
        <h2 id="feedback-list" className="text-xl font-semibold">
          {t.feedback.listTitle}
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 text-stone-600">{t.feedback.empty}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((f) => (
              <li key={f.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">{f.subject}</h3>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                    {t.feedback.statuses[f.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {formatDateTime(f.createdAt)} · {t.feedback.categories[f.category]}
                  {f.resortName ? ` · ${f.resortName}` : ""}
                </p>
                <p className="mt-2 text-sm whitespace-pre-line text-stone-700">{f.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
