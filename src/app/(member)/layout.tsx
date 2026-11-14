import { SiteHeader } from "@/components/site-header";
import { getMessages } from "@/lib/i18n";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const t = getMessages();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-stone-200 py-4 text-center text-sm text-stone-500">
        {t.footer.imprint} · {t.footer.privacy}
      </footer>
    </div>
  );
}
