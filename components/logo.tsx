import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
	size?: "sm" | "md" | "lg";
	className?: string;
	invert?: boolean;
}

const sizeMap = {
	sm: { icon: 32, titleCls: "text-[17px]", subCls: "text-[7.5px]" },
	md: { icon: 40, titleCls: "text-[21px]", subCls: "text-[8.5px]" },
	lg: { icon: 48, titleCls: "text-[26px]", subCls: "text-[9.5px]" },
};

export function Logo({ size = "md", className, invert = false }: LogoProps) {
	const { icon, titleCls, subCls } = sizeMap[size];

	return (
		<div className={cn("flex items-center gap-2.5 select-none", className)}>
			<div className="relative shrink-0" style={{ width: icon, height: icon }}>
				<Image
					src="/logo.webp"
					alt="Tickworks"
					fill
					sizes={`${icon}px`}
					className={cn("object-contain", invert && "brightness-0 invert")}
					priority
				/>
			</div>
			<div className="flex flex-col leading-none">
				<span
					className={cn(
						"font-bold tracking-tight",
						titleCls,
						invert ? "text-white" : "text-[#1E293B] dark:text-ink",
					)}
				>
					Tickworks
				</span>
				<span
					className={cn(
						"font-medium tracking-[0.18em] uppercase text-center mt-1",
						subCls,
						invert ? "text-white/40" : "text-[#94A3B8]",
					)}
				>
					Track&nbsp;•&nbsp;Manage&nbsp;•&nbsp;Perform
				</span>
			</div>
		</div>
	);
}
