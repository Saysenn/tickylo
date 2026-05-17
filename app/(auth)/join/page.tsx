import { JoinForm } from "@/components/auth/join-form";
import Link from "next/link";

export const metadata = {
	title: "Join Your Team — Tickworks",
	description: "Join your company workspace on Tickworks",
};

export default async function JoinPage({
	searchParams,
}: {
	searchParams: Promise<{ code?: string }>;
}) {
	const { code } = await searchParams;

	return (
		<main className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4 py-12">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-mint/25 rounded-full blur-3xl" />
				<div className="absolute bottom-[-10%] right-[-8%] w-[420px] h-[420px] bg-mint/18 rounded-full blur-3xl" />
			</div>

			<div className="relative z-10 w-full max-w-md">
				<Link
					href="/register"
					className="inline-flex items-center gap-1.5 mb-8 text-sm text-ink-3 hover:text-ink-2 transition-colors"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back
				</Link>
				<JoinForm initialCode={code} />
			</div>
		</main>
	);
}
