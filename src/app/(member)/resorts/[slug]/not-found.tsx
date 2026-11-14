import Link from "next/link";
import { getMessages } from "@/lib/i18n";

export default function ResortNotFound() {
  const t = getMessages();
  return (
    <section>
      <p className="text-stone-700">{t.resorts.notFound}</p>
      <Link href="/resorts" className="mt-4 inline-block text-brand-700 hover:underline">
        ← {t.resorts.back}
      </Link>
    </section>
  );
}
