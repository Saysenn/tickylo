import Link from "next/link";
import { BarChart2, Users, BrainCircuit } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/header";

const features = [
  {
    icon: BarChart2,
    title: "Performance Tracking",
    description: "Set goals, track KPIs, and conduct structured performance reviews — all in one place.",
  },
  {
    icon: Users,
    title: "Employee Management",
    description: "Centralized employee profiles, departments, roles, and org hierarchy made simple.",
  },
  {
    icon: BrainCircuit,
    title: "AI-Powered Insights",
    description: "Get intelligent recommendations and performance predictions powered by AI.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-mint/12 rounded-full blur-3xl" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[500px] h-[500px] bg-mint/8 rounded-full blur-3xl" />
        </div>

        {/* Hero */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 pt-24 pb-20 text-center">
          <Badge className="mb-6 bg-mint/15 text-ink-2 hover:bg-mint/15 border-0 rounded-full px-4 py-1.5 text-xs font-medium">
            AI-Powered · Employee Management · Performance Tracking
          </Badge>

          <h1 className="text-5xl sm:text-6xl font-bold text-ink tracking-tight leading-tight mb-6">
            Track performance,{" "}
            <span className="text-ink-2">powered by AI</span>
          </h1>

          <p className="text-lg text-ink-3 max-w-xl mx-auto mb-10 leading-relaxed">
            Track time and performance in one platform. PerformAI helps teams
            set goals, measure progress, and unlock AI-driven insights — all in one place.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {user ? (
              <Button asChild size="lg" className="bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_4px_20px_rgba(128,237,153,0.40)] h-12 px-8">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_4px_20px_rgba(128,237,153,0.40)] h-12 px-8">
                  <Link href="/register">Get Started</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-8 text-ink-2 hover:bg-mint/8 hover:border-mint/40">
                  <Link href="/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <Separator className="max-w-3xl mx-auto" />

        {/* Features */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 py-20">
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
      </main>
    </div>
  );
}
