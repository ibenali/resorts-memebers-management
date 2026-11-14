import Link from "next/link";
import { requireMember } from "@/lib/auth/guard";
import { todayIso } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { getSeasonsForResort, listActiveResorts } from "@/lib/resorts/queries";
import { VacationForm } from "./vacation-form";

export const metadata = { title: getMessages().vacation.newTitle };

type Props = { searchParams: Promise<{ resort?: string }> };

export default async function NewVacationRequestPage({ searchParams }: Props) {
  await requireMember();
  const t = getMessages();
  const { resort: slug } = await searchParams;
  const today = todayIso();

  const resorts = await listActiveResorts();
  const options = await Promise.all(
    resorts.map(async (r) => ({
      id: r.id,
      name: r.name,
      seasons: (await getSeasonsForResort(r.id)).filter((s) => s.endDate >= today),
    })),
  );
  const initial = resorts.find((r) => r.slug === slug)?.id;

  return (
    <section className="max-w-2xl">
      <Link href="/urlaub" className="text-sm text-brand-700 hover:underline">
        ← {t.vacation.title}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">{t.vacation.newTitle}</h1>
      <p className="mt-2 text-stone-600">{t.vacation.newIntro}</p>
      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <VacationForm resorts={options} initialResortId={initial} today={today} />
      </div>
    </section>
  );
}
