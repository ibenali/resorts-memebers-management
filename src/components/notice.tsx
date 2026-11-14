/** Erfolgs- oder Fehlermeldung oberhalb von Inhalten. */
export function Notice({
  kind,
  children,
}: {
  kind: "success" | "error";
  children: React.ReactNode;
}) {
  return kind === "success" ? (
    <p role="status" className="rounded-md bg-brand-50 p-3 text-sm text-brand-900">
      {children}
    </p>
  ) : (
    <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
      {children}
    </p>
  );
}
