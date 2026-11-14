"use client";

import { useActionState } from "react";
import { getMessages } from "@/lib/i18n";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const t = getMessages();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {state.error === "ip_blocked" ? t.auth.ipBlocked : t.auth.invalid}
        </p>
      ) : null}
      <div>
        <label htmlFor="memberNo" className="block text-sm font-medium">
          {t.auth.memberNo}
        </label>
        <input
          id="memberNo"
          name="memberNo"
          required
          maxLength={20}
          autoComplete="username"
          autoCapitalize="characters"
          defaultValue={state.memberNo}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          {t.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          maxLength={128}
          autoComplete="current-password"
          className="input"
        />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t.auth.submitting : t.auth.submit}
      </button>
    </form>
  );
}
