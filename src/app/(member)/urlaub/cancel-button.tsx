"use client";

import { getMessages } from "@/lib/i18n";
import { cancelVacationRequestAction } from "./actions";

export function CancelButton({ id }: { id: number }) {
  const t = getMessages();
  return (
    <form
      action={cancelVacationRequestAction}
      onSubmit={(e) => {
        if (!window.confirm(t.vacation.cancelConfirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
      >
        {t.vacation.cancel}
      </button>
    </form>
  );
}
