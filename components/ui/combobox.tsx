"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils/cn";

export interface ComboboxOption {
	value: string;
	label: string;
}

interface ComboboxProps {
	options: ComboboxOption[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	className?: string;
	disabled?: boolean;
}

export function Combobox({
	options,
	value,
	onChange,
	placeholder = "Select…",
	searchPlaceholder = "Search…",
	emptyText = "No results found.",
	className,
	disabled,
}: ComboboxProps) {
	const [open, setOpen] = useState(false);
	const selected = options.find((o) => o.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-50",
						!selected && "text-ink-3/60",
						className,
					)}
				>
					<span className="truncate">{selected ? selected.label : placeholder}</span>
					<ChevronsUpDown className="w-3.5 h-3.5 text-ink-3 shrink-0 ml-2" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.label}
									onSelect={() => {
										onChange(option.value);
										setOpen(false);
									}}
								>
									<Check className={cn("w-3.5 h-3.5 shrink-0", value === option.value ? "opacity-100 text-mint" : "opacity-0")} />
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
