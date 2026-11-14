import { PlaceholderPage } from "@/components/placeholder-page";
import { getMessages } from "@/lib/i18n";

export const metadata = { title: getMessages().nav.login };

// Das Login-Formular folgt in WP3.
export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <PlaceholderPage title={getMessages().nav.login} />
    </main>
  );
}
