import Link from "next/link";
import { listAllResorts } from "@/lib/admin/service";
import { requireAdmin } from "@/lib/auth/guard";
import { countryName } from "@/lib/format";
import { getMessages } from "@/lib/i18n";

export const metadata = { title: getMessages().admin.resorts.title };

export default async function AdminResortsPage() {
  await requireAdmin();
  const t = getMessages();
  const resorts = await listAllResorts();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t.admin.resorts.title}</h1>
        <Link href="/admin/resorts/neu" className="btn-primary">
          {t.admin.resorts.new}
        </Link>
      </div>
      <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
        {resorts.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/resorts/${r.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-stone-50"
            >
              <span>
                <span className="font-medium">{r.name}</span>{" "}
                <span className="text-sm text-stone-500">
                  {r.location}, {countryName(r.country)}
                </span>
              </span>
              <span className="flex items-center gap-2 text-sm text-stone-600">
                {t.admin.resorts.seasons(r.seasonCount)}
                {!r.active ? (
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs">
                    {t.admin.resorts.inactive}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
