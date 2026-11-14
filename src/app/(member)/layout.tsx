import { SiteHeader } from "@/components/site-header";
import { requireMember } from "@/lib/auth/guard";
import { getMessages } from "@/lib/i18n";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const t = getMessages();
  const { member } = await requireMember();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        memberName={`${member.firstName} ${member.lastName}`}
        memberNo={member.memberNo}
        isAdmin={member.role === "admin"}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-stone-200 py-4 text-center text-sm text-stone-500">
        {t.footer.imprint} · {t.footer.privacy}
      </footer>
    </div>
  );
}
