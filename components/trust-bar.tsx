import { ShieldCheck, Lock, FileCheck2, CreditCard } from "lucide-react";

const signals = [
	{
		icon: ShieldCheck,
		label: "GDPR Compliant",
		sub: "Your data stays yours",
	},
	{
		icon: Lock,
		label: "SSL / TLS Encrypted",
		sub: "End-to-end in transit",
	},
	{
		icon: CreditCard,
		label: "Payments by Stripe",
		sub: "PCI DSS Level 1 certified",
	},
	{
		icon: FileCheck2,
		label: "SOC 2 Ready",
		sub: "Audit logs on every action",
	},
];

export default function TrustBar() {
	return (
		<section className="relative z-10 max-w-4xl mx-auto px-4 py-14">
			<p className="text-center text-[11px] font-semibold tracking-widest uppercase text-ink-3/60 mb-8">
				Built with security at every layer
			</p>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{signals.map(({ icon: Icon, label, sub }) => (
					<div
						key={label}
						className="glass rounded-xl px-4 py-5 flex flex-col items-center text-center gap-2.5"
					>
						<div className="w-9 h-9 rounded-lg bg-mint/15 flex items-center justify-center">
							<Icon className="w-4 h-4 text-ink-2" strokeWidth={1.8} />
						</div>
						<div>
							<p className="text-xs font-semibold text-ink">{label}</p>
							<p className="text-[11px] text-ink-3 mt-0.5">{sub}</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
