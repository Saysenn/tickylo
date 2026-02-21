import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ok, errorResponse } from "@/lib/response";
import { ROLES, type Role } from "@/configs/rbac.config";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateTaskSchema = z.object({
	user_id: z.string().uuid(), // the worker id
});

async function requireAdmin() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;
	if ((user.app_metadata?.role as Role) !== ROLES.ADMIN) return null;
	return user;
}

// PATCH /api/v1/tasks/:id/assign
export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		// only admin is allowed to assign
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		// get task id from parms
		const { id } = params;

		// validate body datas
		const body = await request.json();
		const validated = updateTaskSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		// get user_id from body response
		const { user_id } = validated.data;

		// check if the task reall y exist
		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		// Only assign if task is pending
		if (task.status !== "pending") {
			return errorResponse("Task is already assigned or in progress", 400);
		}

		// assign the task to the user
		const updated = await prisma.task.update({
			where: { id },
			data: {
				user_id: user_id,
				status: "assigned",
				started_at: null,
				assigned_at: new Date(),
			},
		});

		return ok(updated);
	} catch (error) {
		console.error("[tasks:PATCH]", error);
		return errorResponse("Failed to assign the task", 500);
	}
}
