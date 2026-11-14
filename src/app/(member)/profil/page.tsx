import { ChangePasswordForm } from "@/components/change-password-form";
import { requireMember } from "@/lib/auth/guard";
import { getMessages } from "@/lib/i18n";
import { getProfile } from "@/lib/profile/service";
import { AddressForm } from "./address-form";
import { changePasswordAction } from "./actions";

export const metadata = { title: getMessages().profile.title };

export default async function ProfilePage() {
  const { member } = await requireMember();
  const t = getMessages();
  const profile = await getProfile(member.id);
  if (!profile) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t.profile.title}</h1>

      <section
        className="rounded-lg border border-stone-200 bg-white p-5"
        aria-labelledby="personal"
      >
        <h2 id="personal" className="font-semibold">
          {t.profile.personal}
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-stone-500">{t.profile.name}</dt>
            <dd>
              {profile.firstName} {profile.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">{t.profile.memberNo}</dt>
            <dd>{profile.memberNo}</dd>
          </div>
          <div>
            <dt className="text-stone-500">{t.profile.email}</dt>
            <dd>{profile.email ?? t.profile.noEmail}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-stone-500">{t.profile.personalHint}</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section
          className="rounded-lg border border-stone-200 bg-white p-5"
          aria-labelledby="address"
        >
          <h2 id="address" className="mb-4 font-semibold">
            {t.profile.address}
          </h2>
          <AddressForm address={profile} />
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-5" aria-labelledby="pw">
          <h2 id="pw" className="font-semibold">
            {t.password.changeTitle}
          </h2>
          <ChangePasswordForm action={changePasswordAction} />
        </section>
      </div>
    </div>
  );
}
