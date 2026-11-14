"use client";

import { useActionState } from "react";
import { seasonTypes } from "@/lib/db/enums";
import { getMessages } from "@/lib/i18n";
import { addSeasonAction, type SeasonFormState } from "./actions";

export function SeasonForm({ resortId }: { resortId: number }) {
  const t = getMessages();
  const r = t.admin.resorts;
  const [state, formAction, pending] = useActionState<SeasonFormState, FormData>(
    addSeasonAction.bind(null, resortId),
    {},
  );

  return (
    <form key={state.addedAt ?? 0} action={formAction} className="space-y-3" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {r.seasonErrors[state.error]}
        </p>
      ) : null}
      {state.addedAt ? (
        <p role="status" className="rounded-md bg-brand-50 p-3 text-sm text-brand-900">
          {r.seasonAdded}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="season-name" className="block text-sm font-medium">
            {r.seasonName}
          </label>
          <input id="season-name" name="name" required maxLength={50} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="season-type" className="block text-sm font-medium">
            {r.seasonType}
          </label>
          <select id="season-type" name="type" className="input" defaultValue="high">
            {seasonTypes.map((s) => (
              <option key={s} value={s}>
                {t.seasonTypes[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="season-start" className="block text-sm font-medium">
            {r.from}
          </label>
          <input id="season-start" name="startDate" type="date" required className="input" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="season-end" className="block text-sm font-medium">
            {r.to}
          </label>
          <input id="season-end" name="endDate" type="date" required className="input" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {r.addSeason}
      </button>
    </form>
  );
}
