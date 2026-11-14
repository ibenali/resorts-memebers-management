import Link from "next/link";
import { getAdminOverview } from "@/lib/admin/service";
import { requireAdmin } from "@/lib/auth/guard";
import { getMessages } from "@/lib/i18n";

export const metadata = { title: getMessages().admin.title };

export default async function AdminOverviewPage() {
  await requireAdmin();
  const t = getMessages();
  const o = await getAdminOverview();
  const cards = [
    {
      href: "/admin/urlaub?status=pending",
      label: t.admin.pendingRequests,
      value: o.pendingRequests,
    },
    { href: "/admin/feedback?status=new", label: t.admin.newFeedback, value: o.newFeedback },
    { href: "/admin/resorts", label: t.admin.activeResorts, value: o.activeResorts },
  ];
  return (
    <section>
      <h1 className="text-2xl font-semibold">{t.admin.title}</h1>
      <p className="mt-2 text-stone-600">{t.admin.intro}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-lg border border-stone-200 bg-white p-5 hover:border-brand-600"
            >
              <span className="block text-3xl font-semibold text-brand-900">{c.value}</span>
              <span className="text-sm text-stone-600">{c.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
