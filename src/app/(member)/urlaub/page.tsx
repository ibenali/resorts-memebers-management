import { PlaceholderPage } from "@/components/placeholder-page";
import { getMessages } from "@/lib/i18n";

export const metadata = { title: getMessages().nav.vacation };

export default function Page() {
  return <PlaceholderPage title={getMessages().nav.vacation} />;
}
