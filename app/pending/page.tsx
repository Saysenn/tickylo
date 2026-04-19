"use client";

import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PendingPage() {
	const router = useRouter();

	const handleSignOut = async () => {
		const supabase = createClient();
		await supabase.auth.signOut();
		router.push("/login");
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="max-w-md w-full text-center space-y-6">
				<div className="mx-auto w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
					<Clock className="w-8 h-8 text-amber-600" strokeWidth={1.5} />
				</div>

				<div className="space-y-2">
					<h1 className="text-2xl font-bold text-ink">Account Pending Approval</h1>
					<p className="text-ink-3 leading-relaxed">
						Your account is awaiting approval. You will receive an email once your
						access has been granted.
					</p>
				</div>

				<div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 text-left space-y-1">
					<p className="font-medium">What happens next?</p>
					<ul className="list-disc list-inside space-y-0.5 text-amber-700">
						<li>Your organization registration is under review</li>
						<li>Our team will review your application within 24 hours</li>
						<li>You&apos;ll receive an email with a link to set your password</li>
					</ul>
				</div>

				<button
					onClick={handleSignOut}
					className="text-sm text-ink-3 hover:text-ink-2 transition-colors underline underline-offset-2"
				>
					Sign out and go to login
				</button>
			</div>
		</div>
	);
}
