"use client";

import { useActionState } from "react";
import { getMessages } from "@/lib/i18n";

export type ChangePasswordState = {
  error?: keyof ReturnType<typeof getMessages>["password"]["errors"];
  success?: boolean;
};

type Props = {
  action: (prev: ChangePasswordState, formData: FormData) => Promise<ChangePasswordState>;
};

export function ChangePasswordForm({ action }: Props) {
  const t = getMessages();
  const [state, formAction, pending] = useActionState(action, {});

  const fields = [
    { name: "currentPassword", label: t.password.current, autoComplete: "current-password" },
    { name: "newPassword", label: t.password.new, autoComplete: "new-password" },
    { name: "confirmPassword", label: t.password.confirm, autoComplete: "new-password" },
  ] as const;

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {t.password.errors[state.error]}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-md bg-brand-50 p-3 text-sm text-brand-900">
          {t.password.success}
        </p>
      ) : null}
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="block text-sm font-medium">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type="password"
            required
            maxLength={128}
            autoComplete={f.autoComplete}
            className="input"
          />
        </div>
      ))}
      <p className="text-sm text-stone-600">{t.password.hint}</p>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {t.password.submit}
      </button>
    </form>
  );
}
