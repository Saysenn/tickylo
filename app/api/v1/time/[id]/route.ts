import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { notifyAdmins } from "@/lib/utils/create-notification";
import { formatDurationMs } from "@/lib/utils/format";
import { ROLES } from "@/configs/rbac.config";

const stopSchema = z.object({
	title: z.string().max(200).optional(),
	description: z.string().max(1000).optional(),
});

// PATCH /api/v1/time/:id — stop the timer
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// check if id exist
		const { id } = await params;
		if (!id) return errorResponse("Time entry not found", 404);

		// get current user
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// Verify if an entry exists and is active and owned by user
		const entry = await prisma.timeEntry.findFirst({
			where: { id, user_id: user.id, end_time: null },
		});
		if (!entry) return errorResponse("Active entry not found", 404);

		// parse request body
		const body = await request.json().catch(() => ({}));
		const validated = stopSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const endTime = new Date();
		const updated = await prisma.timeEntry.update({
			where: { id },
			data: {
				end_time: endTime,
				title: validated.data.title,
				description: validated.data.description,
			},
		});

		// If this entry was linked to a ticket, revert it from in_progress → assigned
		if (entry.ticket_id) {
			const ticket = await prisma.task.findUnique({
				where: { id: entry.ticket_id },
				select: { id: true, status: true, user_id: true },
			});
			if (ticket && ticket.user_id === user.id && ticket.status === "in_progress") {
				const actorName = (user.user_metadata?.name as string | undefined) ?? user.email ?? "Employee";
				await prisma.$transaction([
					prisma.task.update({ where: { id: entry.ticket_id }, data: { status: "assigned" } }),
					prisma.taskComment.create({
						data: {
							task_id: entry.ticket_id,
							user_id: user.id,
							body: `${actorName} stopped the timer — ticket reverted to assigned.`,
							is_system: true,
						},
					}),
				]);
			}
		}

		const name = user.user_metadata?.name ?? user.email ?? "An employee";
		const durationMs = endTime.getTime() - entry.start_time.getTime();
		const duration = formatDurationMs(durationMs);
		notifyAdmins({
			type: "time_clock_out",
			title: "Employee clocked out",
			body: `${name} clocked out after ${duration}${updated.title ? ` — "${updated.title}"` : ""}.`,
			link: "/dashboard/time-manager",
		}).catch(() => {});

		return ok(updated);
	} catch (err) {
		console.error("[time/:id:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}

const editSchema = z.object({
	title: z.string().max(200).optional(),
	description: z.string().max(1000).optional(),
	start_time: z.string().datetime({ offset: true }).optional(),
	end_time: z.string().datetime({ offset: true }).optional(),
});

// PUT /api/v1/time/:id — edit a completed entry (title, description, start/end times)
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;

		const entry = await prisma.timeEntry.findFirst({
			where: {
				id,
				end_time: { not: null }, // only completed entries
				...(isAdmin ? {} : { user_id: user.id }),
			},
		});
		if (!entry) return errorResponse("Entry not found", 404);

		const body = await request.json().catch(() => ({}));
		const validated = editSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const newStart = validated.data.start_time ? new Date(validated.data.start_time) : entry.start_time;
		const newEnd   = validated.data.end_time   ? new Date(validated.data.end_time)   : entry.end_time!;

		if (newEnd <= newStart) return errorResponse("End time must be after start time", 400);

		const updated = await prisma.timeEntry.update({
			where: { id },
			data: {
				...(validated.data.title !== undefined ? { title: validated.data.title } : {}),
				...(validated.data.description !== undefined ? { description: validated.data.description } : {}),
				start_time: newStart,
				end_time: newEnd,
			},
		});
		return ok(updated);
	} catch (err) {
		console.error("[time/:id:PUT]", err);
		return errorResponse("Internal server error", 500);
	}
}

// DELETE /api/v1/time/:id — delete a time entry (owner or admin)
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;

		const entry = await prisma.timeEntry.findFirst({
			where: { id, ...(isAdmin ? {} : { user_id: user.id }) },
		});
		if (!entry) return errorResponse("Entry not found", 404);
		if (!entry.end_time) return errorResponse("Cannot delete an active timer", 400);

		await prisma.timeEntry.delete({ where: { id } });
		return ok({ deleted: true });
	} catch (err) {
		console.error("[time/:id:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
