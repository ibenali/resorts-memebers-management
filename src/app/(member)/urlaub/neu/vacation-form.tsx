"use client";

import { useActionState, useState } from "react";
import { SeasonBadge } from "@/components/season-badge";
import { nightsBetween } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { findSeasonForDate, type SeasonLike } from "@/lib/resorts/seasons";
import { vacationConfig } from "@/lib/vacation/rules";
import { createVacationRequestAction, type VacationFormState } from "../actions";

type ResortOption = { id: number; name: string; seasons: SeasonLike[] };

type Props = { resorts: ResortOption[]; initialResortId?: number; today: string };

export function VacationForm({ resorts, initialResortId, today }: Props) {
  const t = getMessages();
  const [state, formAction, pending] = useActionState<VacationFormState, FormData>(
    createVacationRequestAction,
    {},
  );
  const [resortId, setResortId] = useState(initialResortId ? String(initialResortId) : "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const resort = resorts.find((r) => String(r.id) === resortId);
  // Nur Vorschau: die verbindliche Saison ermittelt der Server.
  const season = resort && startDate ? findSeasonForDate(resort.seasons, startDate) : null;
  const nights = startDate && endDate ? nightsBetween(startDate, endDate) : 0;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {t.vacation.errors[state.error]}
        </p>
      ) : null}

      <div>
        <label htmlFor="resortId" className="block text-sm font-medium">
          {t.vacation.resort}
        </label>
        <select
          id="resortId"
          name="resortId"
          required
          value={resortId}
          onChange={(e) => setResortId(e.target.value)}
          className="input"
        >
          <option value="" disabled>
            {t.vacation.chooseResort}
          </option>
          {resorts.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium">
            {t.vacation.arrival}
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium">
            {t.vacation.departure}
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {resort && startDate ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-stone-700" aria-live="polite">
          <span>{t.vacation.seasonPreview}:</span>
          {season ? (
            <>
              <strong>{season.name}</strong> <SeasonBadge type={season.type} />
            </>
          ) : (
            <span>{t.vacation.noSeason}</span>
          )}
          {nights > 0 ? <span>· {t.vacation.nights(nights)}</span> : null}
        </p>
      ) : null}

      <div className="max-w-40">
        <label htmlFor="guests" className="block text-sm font-medium">
          {t.vacation.guests}
        </label>
        <input
          id="guests"
          name="guests"
          type="number"
          required
          min={1}
          max={vacationConfig.maxGuests}
          defaultValue={2}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium">
          {t.vacation.note}
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={1000}
          placeholder={t.vacation.notePlaceholder}
          className="input"
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary">
        {t.vacation.submit}
      </button>
    </form>
  );
}
