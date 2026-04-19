import { Resend } from "resend";

export async function sendEmail({
	to,
	subject,
	html,
}: {
	to: string;
	subject: string;
	html: string;
}) {
	if (!process.env.RESEND_API_KEY) {
		console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
		return;
	}

	const resend = new Resend(process.env.RESEND_API_KEY);
	const from = process.env.EMAIL_FROM ?? "PerformAI <noreply@performai.app>";

	const { error } = await resend.emails.send({ from, to, subject, html });

	if (error) {
		console.error("[email] Failed to send:", error);
	}
}
