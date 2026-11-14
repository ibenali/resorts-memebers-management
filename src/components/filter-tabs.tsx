import Link from "next/link";

type Tab = { value: string; label: string };

/** Status-Filter als Links (?status=…), der aktive Eintrag ist markiert. */
export function FilterTabs({ base, tabs, active }: { base: string; tabs: Tab[]; active: string }) {
  return (
    <nav aria-label="Filter" className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={`${base}?status=${tab.value}`}
          aria-current={tab.value === active ? "page" : undefined}
          className={`rounded-full border px-3 py-1 text-sm ${
            tab.value === active
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-stone-300 text-stone-700 hover:bg-stone-100"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
