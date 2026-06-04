import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Tickylo",
  description: "How Tickylo collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-mint font-medium hover:underline">
            ← Back to Tickylo
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-ink mb-2">Privacy Policy</h1>
        <p className="text-sm text-ink-3 mb-12">Last updated: May 2026 — v1.0</p>

        <div className="space-y-10 text-ink leading-7">
          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">1. What We Collect</h2>
            <p className="text-ink-3">
              We collect information you provide directly when you register, including your name, email address,
              and password. We also collect data generated through your use of the service, such as time entries,
              task activity, leave requests, and usage logs. Where applicable, we may collect billing information
              processed through our payment provider.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">2. How We Use It</h2>
            <p className="text-ink-3">
              Your data is used to operate and improve the Tickylo platform, provide customer support, send
              service-related communications, and comply with legal obligations. We do not sell your personal
              data to third parties. We may share data with service providers acting on our behalf, bound by
              appropriate data processing agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">3. Your Rights</h2>
            <p className="text-ink-3">
              Depending on your jurisdiction, you may have rights to access, correct, delete, or export your
              personal data. You may also object to or restrict certain processing activities. To exercise
              any of these rights, please contact us using the details below. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">4. Contact</h2>
            <p className="text-ink-3">
              For privacy-related enquiries or to submit a data subject request, please contact our team at{" "}
              <a href="mailto:privacy@tickylo.app" className="text-mint hover:underline">
                privacy@tickylo.app
              </a>
              . Our legal team will populate the full contact details, registered address, and Data Protection
              Officer information in the final version of this policy.
            </p>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-border flex flex-wrap gap-4 text-xs text-ink-3">
          <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
          <Link href="/cookies" className="hover:text-ink transition-colors">Cookie Policy</Link>
          <Link href="/" className="hover:text-ink transition-colors">Back to App</Link>
        </footer>
      </div>
    </div>
  );
}
