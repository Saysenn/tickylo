"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
	leftIcon?: React.ReactNode;
}

function PasswordInput({ className, leftIcon, ...props }: PasswordInputProps) {
	const [show, setShow] = React.useState(false);

	return (
		<div className="relative">
			{leftIcon && (
				<span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
					{leftIcon}
				</span>
			)}
			<input
				type={show ? "text" : "password"}
				data-slot="input"
				className={cn(
					"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					"focus-visible:border-ring/50 focus-visible:ring-ring/25 focus-visible:ring-1",
					"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
					leftIcon ? "pl-9" : "pl-3",
					"pr-9",
					className,
				)}
				{...props}
			/>
			<button
				type="button"
				onClick={() => setShow((v) => !v)}
				className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2 transition-colors"
				tabIndex={-1}
				aria-label={show ? "Hide password" : "Show password"}
			>
				{show ? (
					<EyeOff className="w-4 h-4" strokeWidth={1.8} />
				) : (
					<Eye className="w-4 h-4" strokeWidth={1.8} />
				)}
			</button>
		</div>
	);
}

export { PasswordInput };
