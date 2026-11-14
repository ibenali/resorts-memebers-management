"use client";

import { useActionState } from "react";
import type { Resort } from "@/lib/db/schema";
import { getMessages } from "@/lib/i18n";
import { saveResortAction, type ResortFormState } from "./actions";

type Props = { resort?: Resort };

export function ResortForm({ resort }: Props) {
  const t = getMessages();
  const r = t.admin.resorts;
  const [state, formAction, pending] = useActionState<ResortFormState, FormData>(
    saveResortAction.bind(null, resort?.id ?? null),
    {},
  );

  const field = (
    name: string,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input id={name} name={name} className="input" {...props} />
    </div>
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {r.errors[state.error]}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", r.name, { required: true, maxLength: 150, defaultValue: resort?.name })}
        {field("slug", r.slug, { required: true, maxLength: 100, defaultValue: resort?.slug })}
        {field("location", r.location, {
          required: true,
          maxLength: 150,
          defaultValue: resort?.location,
        })}
        {field("country", r.country, {
          required: true,
          maxLength: 2,
          defaultValue: resort?.country ?? "DE",
        })}
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          {r.description}
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          maxLength={5000}
          defaultValue={resort?.description}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="amenities" className="block text-sm font-medium">
          {r.amenities}
        </label>
        <textarea
          id="amenities"
          name="amenities"
          rows={5}
          defaultValue={resort?.amenities.join("\n")}
          className="input"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("checkInTime", r.checkIn, {
          type: "time",
          required: true,
          defaultValue: resort?.checkInTime.slice(0, 5) ?? "15:00",
        })}
        {field("checkOutTime", r.checkOut, {
          type: "time",
          required: true,
          defaultValue: resort?.checkOutTime.slice(0, 5) ?? "10:00",
        })}
        {field("contactPhone", r.phone, {
          maxLength: 50,
          defaultValue: resort?.contactPhone ?? "",
        })}
        {field("contactEmail", r.email, {
          type: "email",
          maxLength: 255,
          defaultValue: resort?.contactEmail ?? "",
        })}
      </div>
      {field("imageUrl", r.imageUrl, {
        type: "url",
        maxLength: 500,
        defaultValue: resort?.imageUrl ?? "",
      })}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={resort?.active ?? true} />
        {r.active}
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {r.save}
      </button>
    </form>
  );
}
