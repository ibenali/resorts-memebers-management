"use client";

import { useActionState } from "react";
import { feedbackCategories } from "@/lib/db/schema";
import { getMessages } from "@/lib/i18n";
import { submitFeedbackAction, type FeedbackState } from "./actions";

type Props = { resorts: { id: number; name: string }[] };

export function FeedbackForm({ resorts }: Props) {
  const t = getMessages();
  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(
    submitFeedbackAction,
    {},
  );

  return (
    // key: nach erfolgreichem Senden wird das Formular neu aufgebaut und damit geleert.
    <form key={state.successAt ?? 0} action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {t.feedback.errors[state.error]}
        </p>
      ) : null}
      {state.successAt ? (
        <p role="status" className="rounded-md bg-brand-50 p-3 text-sm text-brand-900">
          {t.feedback.success}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="block text-sm font-medium">
            {t.feedback.category}
          </label>
          <select id="category" name="category" className="input" defaultValue="general">
            {feedbackCategories.map((c) => (
              <option key={c} value={c}>
                {t.feedback.categories[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="resortId" className="block text-sm font-medium">
            {t.feedback.resort}
          </label>
          <select id="resortId" name="resortId" className="input" defaultValue="">
            <option value="">{t.feedback.noResort}</option>
            {resorts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium">
          {t.feedback.subject}
        </label>
        <input
          id="subject"
          name="subject"
          required
          minLength={3}
          maxLength={150}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          {t.feedback.message}
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="input"
        />
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {t.feedback.submit}
      </button>
    </form>
  );
}
