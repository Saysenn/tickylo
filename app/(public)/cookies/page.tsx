import Link from "next/link";

export const metadata = {
  title: "Cookie Policy — Tickworks",
  description: "Information about the cookies Tickworks uses and why.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-mint font-medium hover:underline">
            ← Back to Tickworks
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-ink mb-2">Cookie Policy</h1>
        <p className="text-sm text-ink-3 mb-12">Last updated: May 2026 — v1.0</p>

        <div className="space-y-10 text-ink leading-7">
          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">Cookies We Use</h2>
            <p className="text-ink-3 mb-6">
              Tickworks uses a minimal set of strictly necessary cookies required to operate the service.
              These cookies cannot be disabled without breaking core functionality.
            </p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="text-left px-4 py-3 font-medium text-ink">Cookie</th>
                    <th className="text-left px-4 py-3 font-medium text-ink">Purpose</th>
                    <th className="text-left px-4 py-3 font-medium text-ink">Duration</th>
                    <th className="text-left px-4 py-3 font-medium text-ink">Category</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs text-ink">sb-access-token</td>
                    <td className="px-4 py-3 text-ink-3">Authentication JWT</td>
                    <td className="px-4 py-3 text-ink-3">Session</td>
                    <td className="px-4 py-3 text-ink-3">Strictly necessary</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-ink">sb-refresh-token</td>
                    <td className="px-4 py-3 text-ink-3">Session refresh</td>
                    <td className="px-4 py-3 text-ink-3">1 year</td>
                    <td className="px-4 py-3 text-ink-3">Strictly necessary</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">What We Do Not Use</h2>
            <p className="text-ink-3">
              We do not use analytics, advertising, or tracking cookies. No third-party cookies are set by
              Tickworks. We do not share cookie data with any advertising networks or data brokers.
            </p>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-border flex flex-wrap gap-4 text-xs text-ink-3">
          <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-ink transition-colors">Back to App</Link>
        </footer>
      </div>
    </div>
  );
}
