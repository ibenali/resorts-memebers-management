import Link from "next/link";
import { getMessages } from "@/lib/i18n";

export function SiteHeader() {
  const t = getMessages();
  const links = [
    { href: "/", label: t.nav.dashboard },
    { href: "/resorts", label: t.nav.resorts },
    { href: "/urlaub", label: t.nav.vacation },
    { href: "/feedback", label: t.nav.feedback },
    { href: "/profil", label: t.nav.profile },
  ];

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold text-brand-700">
          {t.app.name}
        </Link>
        <nav aria-label="Hauptnavigation">
          <ul className="flex flex-wrap gap-1 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-md px-3 py-2 text-stone-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
