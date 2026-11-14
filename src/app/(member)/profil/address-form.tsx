"use client";

import { useActionState } from "react";
import { countryName } from "@/lib/format";
import { getMessages } from "@/lib/i18n";
import { addressCountries } from "@/lib/validation/profile";
import { updateAddressAction, type AddressState } from "./actions";

type Address = {
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
};

export function AddressForm({ address }: { address: Address }) {
  const t = getMessages();
  const [state, formAction, pending] = useActionState<AddressState, FormData>(
    updateAddressAction,
    {},
  );
  const countries = [...addressCountries].sort((a, b) =>
    countryName(a).localeCompare(countryName(b), "de"),
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {t.profile.addressInvalid}
        </p>
      ) : null}
      {state.savedAt ? (
        <p role="status" className="rounded-md bg-brand-50 p-3 text-sm text-brand-900">
          {t.profile.addressSaved}
        </p>
      ) : null}
      <div>
        <label htmlFor="street" className="block text-sm font-medium">
          {t.profile.street}
        </label>
        <input
          id="street"
          name="street"
          required
          maxLength={200}
          autoComplete="street-address"
          defaultValue={address.street ?? ""}
          className="input"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium">
            {t.profile.postalCode}
          </label>
          <input
            id="postalCode"
            name="postalCode"
            required
            maxLength={20}
            autoComplete="postal-code"
            defaultValue={address.postalCode ?? ""}
            className="input"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="city" className="block text-sm font-medium">
            {t.profile.city}
          </label>
          <input
            id="city"
            name="city"
            required
            maxLength={100}
            autoComplete="address-level2"
            defaultValue={address.city ?? ""}
            className="input"
          />
        </div>
      </div>
      <div>
        <label htmlFor="country" className="block text-sm font-medium">
          {t.profile.country}
        </label>
        <select
          id="country"
          name="country"
          required
          autoComplete="country"
          defaultValue={address.country ?? ""}
          className="input"
        >
          <option value="" disabled>
            {t.profile.chooseCountry}
          </option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {t.profile.saveAddress}
      </button>
    </form>
  );
}
