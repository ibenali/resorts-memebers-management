import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { getMessages } from "@/lib/i18n";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const t = getMessages();
  const links = [
    { href: "/admin", label: t.admin.overview },
    { href: "/admin/urlaub", label: t.admin.vacation.title },
    { href: "/admin/feedback", label: t.admin.feedback.title },
    { href: "/admin/resorts", label: t.admin.resorts.title },
  ];
  return (
    <div>
      <nav
        aria-label={t.admin.nav}
        className="mb-6 flex flex-wrap gap-1 border-b border-stone-200 pb-3 text-sm"
      >
        <span className="mr-2 py-1.5 font-semibold text-stone-500">{t.admin.nav}:</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-3 py-1.5 text-stone-700 hover:bg-brand-50 hover:text-brand-700"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
