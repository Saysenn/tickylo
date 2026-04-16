import Link from "next/link";
import { BarChart2, BrainCircuit, Star, Clock, Shield, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ReviewsTicker from "@/components/reviews-ticker";

const features = [
  {
    icon: Clock,
    title: "Billable Hours Tracking",
    description: "Log every hour worked per project and client. Generate accurate billable reports your clients will trust.",
  },
  {
    icon: BarChart2,
    title: "Deadline & Output Reports",
    description: "See who delivered what and when. Catch bottlenecks before they blow a deadline.",
  },
  {
    icon: BrainCircuit,
    title: "AI-Powered Insights",
    description: "Surface patterns in your team's output — see who's overloaded, who's underutilised, and where time is being lost.",
  },
];

const stats = [
  { value: "Free", label: "To get started" },
  { value: "5 min", label: "Setup time" },
  { value: "4.9★", label: "Early user rating" },
  { value: "No", label: "Credit card needed" },
];

const trustBadges = [
  { icon: Shield, label: "GDPR Compliant" },
  { icon: Zap, label: "No credit card required" },
  { icon: Clock, label: "Cancel anytime" },
];


export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="relative overflow-hidden flex-1">
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-mint/12 rounded-full blur-3xl" />
          <div className="absolute bottom-[20%] right-[-5%] w-[500px] h-[500px] bg-mint/8 rounded-full blur-3xl" />
        </div>

        {/* Hero */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 pt-24 pb-20 text-center">
          <Badge className="mb-6 bg-mint/15 text-ink-2 hover:bg-mint/15 border-0 rounded-full px-4 py-1.5 text-xs font-medium">
            Agencies · Dev Studios · Freelance Teams
          </Badge>

          <h1 className="text-5xl sm:text-6xl font-bold text-ink tracking-tight leading-tight mb-6">
            Every hour tracked.{" "}
            <span className="text-ink-2">Every deadline met.</span>
          </h1>

          <p className="text-lg text-ink-3 max-w-xl mx-auto mb-10 leading-relaxed">
            PerformAI gives agencies full visibility over billable hours, team output, and project deadlines — in one clean dashboard.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap mb-10">
            {user ? (
              <Button
                asChild
                size="lg"
                className="bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_4px_20px_rgba(128,237,153,0.40)] h-12 px-8"
              >
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  size="lg"
                  className="bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_4px_20px_rgba(128,237,153,0.40)] h-12 px-8"
                >
                  <Link href="/register">Get Started Free</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-ink-2 hover:bg-mint/8 hover:border-mint/40"
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {trustBadges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-ink-3">
                <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Stats bar */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 pb-16">
          <div className="glass rounded-2xl px-8 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center shadow-[0_2px_20px_rgba(128,237,153,0.08)]">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-ink mb-1">{value}</p>
                <p className="text-xs text-ink-3">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator className="max-w-3xl mx-auto" />

        {/* Features */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <p className="text-xs text-ink-3 tracking-widest uppercase mb-3">Built for agencies</p>
            <h2 className="text-3xl font-bold text-ink tracking-tight">Everything your team needs to deliver</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="glass rounded-2xl p-6 space-y-3 shadow-[0_2px_20px_rgba(128,237,153,0.06)]"
              >
                <div className="w-10 h-10 bg-mint/15 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-ink-2" strokeWidth={1.8} />
                </div>
                <h3 className="font-semibold text-ink text-sm">{title}</h3>
                <p className="text-xs text-ink-3 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator className="max-w-3xl mx-auto" />

        {/* Testimonials */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <p className="text-xs text-ink-3 tracking-widest uppercase mb-3">Early feedback</p>
            <h2 className="text-3xl font-bold text-ink tracking-tight mb-3">What agencies are saying</h2>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-sm text-ink-3 ml-2">from our early users</span>
            </div>
          </div>

          <ReviewsTicker />
        </section>

        {/* CTA section */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 pb-24">
          <div className="glass rounded-2xl p-10 text-center shadow-[0_4px_30px_rgba(128,237,153,0.10)]">
            <h2 className="text-3xl font-bold text-ink tracking-tight mb-3">
              Be one of the first agencies on PerformAI
            </h2>
            <p className="text-sm text-ink-3 mb-8 max-w-md mx-auto leading-relaxed">
              We're early stage and building fast. Sign up free — no credit card, no commitment — and help shape the product.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {user ? (
                <Button
                  asChild
                  size="lg"
                  className="bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_4px_20px_rgba(128,237,153,0.40)] h-12 px-8"
                >
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_4px_20px_rgba(128,237,153,0.40)] h-12 px-8"
                  >
                    <Link href="/register">Get Started Free</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-ink-2 hover:bg-mint/8 hover:border-mint/40"
                  >
                    <Link href="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
