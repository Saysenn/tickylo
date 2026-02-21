import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/response";
import { prisma } from "@/lib/prisma";

async function requireUser() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	return user ?? null;
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// get id from params
		const { id } = params;
		// check is task exist
		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		// Only assigned worker can start
		if (task.user_id !== user.id) return errorResponse("Not allowed", 403);

		// start the task
		const updated = await prisma.task.update({
			where: { id },
			data: { status: "in_progress", started_at: new Date() },
		});

		return ok(updated);
	} catch (error) {
		return errorResponse("Failed to Start the Task", 500);
	}
}
