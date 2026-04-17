import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const schema = z.object({
	emoji: z.string().refine((e) => ALLOWED_EMOJIS.includes(e), {
		message: "Invalid emoji",
	}),
});

/**
 * GET /api/v1/task/[id]/comments/[commentId]/reactions
 * Returns reactions grouped by emoji with counts and user list.
 */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string; commentId: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { commentId } = await params;

		const reactions = await prisma.commentReaction.findMany({
			where: { comment_id: commentId },
			include: { user: { select: { id: true, name: true, email: true } } },
		});

		// Group by emoji
		const grouped = ALLOWED_EMOJIS.map((emoji) => {
			const group = reactions.filter((r) => r.emoji === emoji);
			return {
				emoji,
				count: group.length,
				reacted: group.some((r) => r.user_id === user.id),
				users: group.map((r) => r.user),
			};
		}).filter((g) => g.count > 0);

		return ok(grouped);
	} catch (err) {
		console.error("[reactions:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * POST /api/v1/task/[id]/comments/[commentId]/reactions
 * Toggle an emoji reaction — creates if absent, deletes if present.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; commentId: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { commentId } = await params;

		const body = await request.json();
		const validated = schema.safeParse(body);
		if (!validated.success) {
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		}

		const { emoji } = validated.data;

		const existing = await prisma.commentReaction.findUnique({
			where: { comment_id_user_id_emoji: { comment_id: commentId, user_id: user.id, emoji } },
		});

		if (existing) {
			await prisma.commentReaction.delete({ where: { id: existing.id } });
			return ok({ action: "removed", emoji });
		}

		await prisma.commentReaction.create({
			data: { comment_id: commentId, user_id: user.id, emoji },
		});

		return ok({ action: "added", emoji });
	} catch (err) {
		console.error("[reactions:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
