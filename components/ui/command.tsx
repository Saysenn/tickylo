"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Command = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive>) => (
	<CommandPrimitive
		className={cn("flex h-full w-full flex-col overflow-hidden rounded-xl bg-background text-ink", className)}
		{...props}
	/>
);

export const CommandInput = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) => (
	<div className="flex items-center gap-2 border-b px-3">
		<Search className="w-3.5 h-3.5 text-ink-3 shrink-0" />
		<CommandPrimitive.Input
			className={cn(
				"flex h-9 w-full bg-transparent text-sm outline-none placeholder:text-ink-3/50 disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	</div>
);

export const CommandList = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>) => (
	<CommandPrimitive.List
		className={cn("max-h-56 overflow-y-auto overflow-x-hidden", className)}
		{...props}
	/>
);

export const CommandEmpty = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>) => (
	<CommandPrimitive.Empty
		className={cn("py-6 text-center text-xs text-ink-3", className)}
		{...props}
	/>
);

export const CommandGroup = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>) => (
	<CommandPrimitive.Group
		className={cn("overflow-hidden p-1 text-ink", className)}
		{...props}
	/>
);

export const CommandItem = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>) => (
	<CommandPrimitive.Item
		className={cn(
			"relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors data-[disabled=true]:pointer-events-none data-[selected=true]:bg-mint/10 data-[selected=true]:text-ink data-[disabled=true]:opacity-50 hover:bg-accent/60",
			className,
		)}
		{...props}
	/>
);
