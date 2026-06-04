import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
	size?: "sm" | "md" | "lg";
	className?: string;
	invert?: boolean;
}

const sizeMap = {
	sm: { icon: 32, titleCls: "text-[13px]", subCls: "text-[7.5px]" },
	md: { icon: 40, titleCls: "text-[16px]", subCls: "text-[8.5px]" },
	lg: { icon: 48, titleCls: "text-[20px]", subCls: "text-[9.5px]" },
};

export function Logo({ size = "md", className, invert = false }: LogoProps) {
	const { icon, titleCls, subCls } = sizeMap[size];

	return (
		<div className={cn("flex items-center gap-2.5 select-none", className)}>
			<div className="relative shrink-0" style={{ width: icon, height: icon }}>
				<Image
					src="/logo.webp"
					alt="Tickylo"
					fill
					sizes={`${icon}px`}
					className={cn("object-contain", invert && "brightness-0 invert")}
					priority
				/>
			</div>
			<div className="flex flex-col leading-none">
				<span
					className={cn(
						"font-bold tracking-widest font-axope bg-clip-text text-transparent",
						titleCls,
						invert
							? "bg-linear-to-r from-white to-white/70"
							: "bg-linear-to-r from-[#0D1F14] via-[#2d7a4f] to-[#80ED99]",
					)}
				>
					Tickylo
				</span>
				<span
					className={cn(
						"font-medium tracking-[0.18em] uppercase text-center mt-1",
						subCls,
						invert ? "text-white/40" : "text-[#94A3B8]",
					)}
				>
					Perform&nbsp;•&nbsp;Track&nbsp;•&nbsp;Manage
				</span>
			</div>
		</div>
	);
}
