import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Tickworks",
  description: "The terms and conditions governing your use of Tickworks.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-mint font-medium hover:underline">
            ← Back to Tickworks
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-ink mb-2">Terms of Service</h1>
        <p className="text-sm text-ink-3 mb-12">Last updated: May 2026 — v1.0</p>

        <div className="space-y-10 text-ink leading-7">
          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">1. Acceptance</h2>
            <p className="text-ink-3">
              By creating an account or using Tickworks, you agree to be bound by these Terms of Service and
              our Privacy Policy. If you do not agree, you must not use the service. These terms apply to all
              users, including organisation administrators and employees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">2. Use of Service</h2>
            <p className="text-ink-3">
              You may use Tickworks solely for lawful purposes and in accordance with these terms. You agree
              not to use the service to transmit harmful, misleading, or unlawful content, to attempt
              unauthorised access to any system, or to interfere with the integrity or performance of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">3. Accounts</h2>
            <p className="text-ink-3">
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activity that occurs under your account. Organisation administrators are responsible for managing
              access for their team members. You must notify us immediately of any unauthorised use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">4. Termination</h2>
            <p className="text-ink-3">
              We reserve the right to suspend or terminate your access to Tickworks at any time if you breach
              these terms or if we determine, in our sole discretion, that continued access would be harmful.
              You may close your account at any time by contacting support. Upon termination, your data will
              be handled in accordance with our data retention policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">5. Limitation of Liability</h2>
            <p className="text-ink-3">
              To the maximum extent permitted by applicable law, Tickworks and its affiliates shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages arising from
              your use of the service. Our total liability shall not exceed the amounts paid by you in the
              twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">6. Governing Law</h2>
            <p className="text-ink-3">
              These terms are governed by the laws of the jurisdiction in which Tickworks is incorporated.
              Our legal team will populate the applicable jurisdiction and dispute resolution procedures in
              the final version of these terms.
            </p>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-border flex flex-wrap gap-4 text-xs text-ink-3">
          <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
          <Link href="/cookies" className="hover:text-ink transition-colors">Cookie Policy</Link>
          <Link href="/" className="hover:text-ink transition-colors">Back to App</Link>
        </footer>
      </div>
    </div>
  );
}
