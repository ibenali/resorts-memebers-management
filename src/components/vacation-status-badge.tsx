import type { VacationStatus } from "@/lib/db/schema";
import { getMessages } from "@/lib/i18n";

const styles: Record<VacationStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-900",
  cancelled: "bg-stone-200 text-stone-700",
};

export function VacationStatusBadge({ status }: { status: VacationStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {getMessages().vacation.statuses[status]}
    </span>
  );
}
