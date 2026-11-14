import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { getMessages } from "@/lib/i18n";

type Props = { memberName: string; memberNo: string; isAdmin?: boolean };

export function SiteHeader({ memberName, memberNo, isAdmin = false }: Props) {
  const t = getMessages();
  const links = [
    { href: "/", label: t.nav.dashboard },
    { href: "/resorts", label: t.nav.resorts },
    { href: "/urlaub", label: t.nav.vacation },
    { href: "/feedback", label: t.nav.feedback },
    { href: "/profil", label: t.nav.profile },
    ...(isAdmin ? [{ href: "/admin", label: t.admin.nav }] : []),
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
        <div className="flex items-center gap-3 text-sm">
          <span className="text-stone-600">
            <span className="sr-only">{t.auth.loggedInAs} </span>
            {memberName} <span className="text-stone-400">({memberNo})</span>
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-100"
            >
              {t.auth.logout}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
