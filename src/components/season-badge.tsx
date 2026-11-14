import type { SeasonType } from "@/lib/db/schema";
import { getMessages } from "@/lib/i18n";

const styles: Record<SeasonType, string> = {
  peak: "bg-amber-100 text-amber-900",
  high: "bg-sky-100 text-sky-900",
  low: "bg-stone-200 text-stone-800",
};

export function SeasonBadge({ type }: { type: SeasonType }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[type]}`}>
      {getMessages().seasonTypes[type]}
    </span>
  );
}
