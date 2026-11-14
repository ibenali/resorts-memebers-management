import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { SeasonBadge } from "@/components/season-badge";
import { getResortForAdmin } from "@/lib/admin/service";
import { requireAdmin } from "@/lib/auth/guard";
import { formatDate } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { idSchema } from "@/lib/validation/admin";
import { deleteSeasonAction } from "../actions";
import { ResortForm } from "../resort-form";
import { SeasonForm } from "../season-form";

export const metadata = { title: getMessages().admin.resorts.edit };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string }>;
};

export default async function EditResortPage({ params, searchParams }: Props) {
  await requireAdmin();
  const t = getMessages();
  const r = t.admin.resorts;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const resort = await getResortForAdmin(id.data);
  if (!resort) notFound();
  const { result } = await searchParams;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/admin/resorts" className="text-sm text-brand-700 hover:underline">
          ← {r.back}
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold">{resort.name}</h1>
          {resort.active ? (
            <Link
              href={`/resorts/${resort.slug}`}
              className="text-sm text-brand-700 hover:underline"
            >
              {r.view} →
            </Link>
          ) : null}
        </div>
      </div>
      {result === "saved" ? <Notice kind="success">{r.saved}</Notice> : null}
      {result === "season_deleted" ? <Notice kind="success">{r.seasonDeleted}</Notice> : null}

      <section className="rounded-lg border border-stone-200 bg-white p-5" aria-labelledby="edit">
        <h2 id="edit" className="mb-4 font-semibold">
          {r.edit}
        </h2>
        <ResortForm resort={resort} />
      </section>

      <section
        className="rounded-lg border border-stone-200 bg-white p-5"
        aria-labelledby="seasons-admin"
      >
        <h2 id="seasons-admin" className="font-semibold">
          {r.seasonsTitle}
        </h2>
        {resort.seasons.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">{r.seasonsEmpty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {resort.seasons.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <SeasonBadge type={s.type} />
                  <span className="text-stone-600">
                    {formatDate(s.startDate)} – {formatDate(s.endDate)}
                  </span>
                </span>
                <form action={deleteSeasonAction}>
                  <input type="hidden" name="resortId" value={resort.id} />
                  <input type="hidden" name="seasonId" value={s.id} />
                  <ConfirmSubmit
                    label={r.deleteSeason}
                    confirm={r.deleteSeasonConfirm}
                    className="rounded-md border border-stone-300 px-3 py-1 hover:bg-stone-100"
                  />
                </form>
              </li>
            ))}
          </ul>
        )}
        <h3 className="mt-6 mb-3 font-semibold">{r.addSeason}</h3>
        <SeasonForm resortId={resort.id} />
      </section>
    </div>
  );
}
