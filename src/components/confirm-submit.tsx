"use client";

/** Absende-Button mit Rückfrage (z. B. für Ablehnen oder Löschen). */
export function ConfirmSubmit({
  label,
  confirm,
  className,
}: {
  label: string;
  confirm: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
