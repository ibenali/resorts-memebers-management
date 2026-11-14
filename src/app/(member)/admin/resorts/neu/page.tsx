import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { getMessages } from "@/lib/i18n";
import { ResortForm } from "../resort-form";

export const metadata = { title: getMessages().admin.resorts.new };

export default async function NewResortPage() {
  await requireAdmin();
  const t = getMessages();
  return (
    <section className="max-w-3xl">
      <Link href="/admin/resorts" className="text-sm text-brand-700 hover:underline">
        ← {t.admin.resorts.back}
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-semibold">{t.admin.resorts.new}</h1>
      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <ResortForm />
      </div>
    </section>
  );
}
