"use client";

import { Link2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface TicketLink {
	url: string;
	label?: string;
}

interface LinksEditorProps {
	links: TicketLink[];
	onChange: (links: TicketLink[]) => void;
	disabled?: boolean;
}

const inputCls =
	"w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-mint placeholder:text-ink-3/40";

export function LinksEditor({ links, onChange, disabled }: LinksEditorProps) {
	const add = () => onChange([...links, { url: "", label: "" }]);

	const update = (i: number, field: keyof TicketLink, value: string) => {
		const next = links.map((l, idx) => (idx === i ? { ...l, [field]: value } : l));
		onChange(next);
	};

	const remove = (i: number) => onChange(links.filter((_, idx) => idx !== i));

	return (
		<div className="space-y-2">
			{links.map((link, i) => (
				<div key={i} className="flex items-center gap-2">
					<Link2 className="w-3.5 h-3.5 text-ink-3/50 shrink-0" />
					<input
						type="url"
						value={link.url}
						onChange={(e) => update(i, "url", e.target.value)}
						placeholder="https://example.com/docs"
						disabled={disabled}
						className={cn(inputCls, "flex-1 min-w-0")}
					/>
					<input
						type="text"
						value={link.label}
						onChange={(e) => update(i, "label", e.target.value)}
						placeholder="Label (optional)"
						maxLength={100}
						disabled={disabled}
						className={cn(inputCls, "w-32 shrink-0")}
					/>
					<button
						type="button"
						onClick={() => remove(i)}
						disabled={disabled}
						className="p-1 rounded text-ink-3/50 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
						aria-label="Remove link"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			))}

			<button
				type="button"
				onClick={add}
				disabled={disabled || links.length >= 20}
				className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-mint transition-colors disabled:opacity-40"
			>
				<Plus className="w-3.5 h-3.5" />
				Add link
			</button>
		</div>
	);
}
