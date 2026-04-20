import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#0D1F14" }} className="text-white/70">
      <div className="max-w-5xl mx-auto px-6 pt-14 pb-8">

        {/* Top row: logo + tagline */}
        <div className="flex items-start justify-between mb-10">
          <div className="space-y-3">
            <Logo size="md" invert />
            <p className="text-[11px] text-white/30 tracking-[0.14em] uppercase">
              For Agencies, Dev Studios & Freelance Teams
            </p>
          </div>
          <div className="text-right">
            <p className="italic text-white/50 text-sm leading-relaxed">Know your output.</p>
            <p className="italic text-white/50 text-sm leading-relaxed">Bill with confidence.</p>
          </div>
        </div>

        <Separator className="bg-white/10 mb-8" />

        {/* Contact row */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2.5 border border-white/12 rounded px-3 py-2">
            <Mail className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <span className="text-[11px] text-white/50">inquiries@performai.com</span>
          </div>
          <div className="flex items-center gap-2.5 border border-white/12 rounded px-3 py-2">
            <Phone className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <span className="text-[11px] text-white/50">+65 9354 2608</span>
          </div>
          <div className="flex items-center gap-2.5 border border-white/12 rounded px-3 py-2">
            <Phone className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <span className="text-[11px] text-white/50">+971 56 136 8894</span>
          </div>
        </div>

        <Separator className="bg-white/10 mb-8" />

        {/* Company details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
          <div>
            <p className="text-[10px] text-white/28 tracking-[0.15em] uppercase mb-2">Company Name</p>
            <p className="text-[12px] text-white/55">Tickworks</p>
          </div>
          <div>
            <p className="text-[10px] text-white/28 tracking-[0.15em] uppercase mb-2">Company Number</p>
            <p className="text-[12px] text-white/55">—</p>
          </div>
          <div>
            <p className="text-[10px] text-white/28 tracking-[0.15em] uppercase mb-2">VAT Number</p>
            <p className="text-[12px] text-white/55">—</p>
          </div>
          <div>
            <p className="text-[10px] text-white/28 tracking-[0.15em] uppercase mb-2">Registered Address</p>
            <p className="text-[12px] text-white/55">—</p>
          </div>
        </div>

        <Separator className="bg-white/10 mb-6" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-white/25 tracking-[0.14em] uppercase">
            © 2026 Tickworks. All Rights Reserved.
          </p>
          <p className="text-[10px] text-white/25 tracking-[0.14em] uppercase">
            Built for Agencies — Powered by AI
          </p>
        </div>

      </div>
    </footer>
  );
}
