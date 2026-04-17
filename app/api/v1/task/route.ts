import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import z from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ROLES } from "@/configs/rbac.config";

const createTaskSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
	due_date: z.coerce.date().optional(),
	assigned_to: z.string().optional(), // optional user_id to assign on creation
});

/**
 * GET /api/v1/task?page=1&limit=10
 * Admin: all tasks with assignee info
 * Employee: tasks assigned to them
 */
export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = new URL(request.url);
		const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
		const limit = Math.min(
			50,
			Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)),
		);
		const skip = (page - 1) * limit;

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		const statusFilter = searchParams.get("status");
		const search = searchParams.get("search")?.trim();
		// view param is for employees only: "assigned" (default) | "unassigned" | "all"
		const view = searchParams.get("view") ?? "assigned";

		const searchFilter = search
			? {
					OR: [
						{ title: { contains: search, mode: "insensitive" as const } },
						{ description: { contains: search, mode: "insensitive" as const } },
					],
			  }
			: {};

		const employeeVisibilityFilter =
			view === "unassigned"
				? { user_id: null }
				: view === "all"
				? { OR: [{ user_id: user.id }, { user_id: null }] }
				: { user_id: user.id }; // default: "assigned"

		const where: any = isAdmin
			? { ...(statusFilter ? { status: statusFilter } : {}), ...searchFilter }
			: {
					...employeeVisibilityFilter,
					...(statusFilter ? { status: statusFilter } : {}),
					...searchFilter,
			  };

		const [entries, total] = await Promise.all([
			prisma.task.findMany({
				where,
				include: {
					assignee: { select: { id: true, name: true, email: true } },
				},
				orderBy: { created_at: "desc" },
				take: limit,
				skip,
			}),
			prisma.task.count({ where }),
		]);

		return ok({
			data: entries,
			page,
			totalPages: Math.ceil(total / limit) || 1,
		});
	} catch (err) {
		console.error("[task:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * POST /api/v1/task — admin only
 * Creates a task; optionally assigns it to a user on creation
 */
export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const body = await request.json();
		const validated = createTaskSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const { assigned_to, ...rest } = validated.data;

		const entry = await prisma.task.create({
			data: {
				...rest,
				created_by: admin.id,
				user_id: assigned_to ?? null,
				status: assigned_to ? "assigned" : "pending",
				assigned_at: assigned_to ? new Date() : null,
			},
			include: {
				assignee: { select: { id: true, name: true, email: true } },
			},
		});

		return ok(entry, 201);
	} catch (err) {
		console.error("[task:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
