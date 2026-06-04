import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { sendEmail } from "@/lib/email/send";
import { rateLimit, getIP } from "@/lib/utils/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
	try {
		const rl = await rateLimit(`verify-email:${getIP(req)}`, 3, 900);
		if (rl) return rl;

		const body = schema.safeParse(await req.json().catch(() => ({})));
		if (!body.success) return errorResponse("Valid email required.", 400);

		const { email } = body.data;

		// Invalidate any existing unused codes for this email
		await prisma.emailVerification.updateMany({
			where: { email, used: false },
			data:  { used: true },
		});

		const code      = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		await prisma.emailVerification.create({
			data: { email, code, expires_at: expiresAt },
		});

		await sendEmail({
			to:      email,
			subject: "Your Tickylo verification code",
			html: `
				<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
					<h2 style="color:#000;margin-bottom:8px;">Verify your email</h2>
					<p style="color:#555;margin-bottom:24px;">Use the code below to verify your work email for Tickylo registration.</p>
					<div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
						<span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#000;">${code}</span>
					</div>
					<p style="color:#888;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
				</div>
			`,
		});

		return ok({ sent: true });
	} catch (err: any) {
		console.error("[verify-email:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
