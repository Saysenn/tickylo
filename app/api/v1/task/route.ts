import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import z from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ROLES } from "@/configs/rbac.config";
import { createNotification, notifyAdmins, notifyEmployees } from "@/lib/utils/create-notification";

const linkSchema = z.object({
	url: z.string().url().max(2000),
	label: z.string().max(100).optional(),
});

const createTaskSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	priority: z.enum(["low", "medium", "high", "critical"]).optional(),
	due_date: z.coerce.date().optional(),
	assigned_to: z.string().optional(),
	ticket_type: z.enum(["internal_task", "request", "incident", "change"]).optional(),
	client_name: z.string().max(200).optional(),
	estimated_hours: z.number().positive().optional(),
	billable_hours: z.number().nonnegative().optional(),
	implementation_plan: z.string().max(5000).optional(),
	rollback_plan: z.string().max(5000).optional(),
	links: z.array(linkSchema).max(20).optional(),
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
		const statusFilter   = searchParams.get("status");
		const search         = searchParams.get("search")?.trim();
		const typeFilter     = searchParams.get("type");
		const priorityFilter = searchParams.get("priority");
		const assigneeFilter = searchParams.get("assignee"); // admin only
		const dueFilter      = searchParams.get("due");       // "overdue" | "today" | "week"
		// view param is for employees only: "assigned" (default) | "unassigned" | "all"
		const view = searchParams.get("view") ?? "assigned";

		const searchFilter = search
			? {
					OR: [
						{ title:       { contains: search, mode: "insensitive" as const } },
						{ description: { contains: search, mode: "insensitive" as const } },
						{ client_name: { contains: search, mode: "insensitive" as const } },
					],
			  }
			: {};

		const employeeVisibilityFilter =
			view === "unassigned"
				? { user_id: null }
				: view === "all"
				? {}
				: { user_id: user.id };

		// "overdue" is a virtual filter — not a real status enum value
		const overdueFilter =
			statusFilter === "overdue"
				? { due_date: { lt: new Date() }, status: { not: "completed" as const } }
				: {};
		const statusQueryFilter =
			statusFilter && statusFilter !== "overdue" ? { status: statusFilter as any } : {};

		// Due-date quick filters
		const now = new Date();
		const todayEnd  = new Date(now); todayEnd.setHours(23, 59, 59, 999);
		const weekEnd   = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
		const dueFilter_ =
			dueFilter === "overdue" ? { due_date: { lt: now } } :
			dueFilter === "today"   ? { due_date: { lte: todayEnd } } :
			dueFilter === "week"    ? { due_date: { lte: weekEnd } } :
			{};

		const typeFilter_     = typeFilter     ? { ticket_type: typeFilter }             : {};
		const priorityFilter_ = priorityFilter ? { priority: priorityFilter as any }     : {};
		const assigneeFilter_ = isAdmin && assigneeFilter
			? assigneeFilter === "unassigned" ? { user_id: null } : { user_id: assigneeFilter }
			: {};

		const where: any = isAdmin
			? { ...statusQueryFilter, ...overdueFilter, ...dueFilter_, ...searchFilter, ...typeFilter_, ...priorityFilter_, ...assigneeFilter_ }
			: {
					...employeeVisibilityFilter,
					...statusQueryFilter,
					...overdueFilter,
					...dueFilter_,
					...searchFilter,
					...typeFilter_,
					...priorityFilter_,
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
 * POST /api/v1/task — any authenticated user
 * Creates a task. Admins can assign to any employee; employees create unassigned tickets.
 */
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;

		const body = await request.json();
		const validated = createTaskSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const { assigned_to: rawAssignedTo, ...rest } = validated.data;
		// Employees cannot assign to others — their tickets require admin approval first
		const assigned_to = isAdmin ? rawAssignedTo : undefined;
		const status = !isAdmin
			? "needs_approval"
			: assigned_to ? "assigned" : "pending";

		const entry = await prisma.task.create({
			data: {
				...rest,
				created_by: user.id,
				user_id: assigned_to ?? null,
				status,
				assigned_at: assigned_to ? new Date() : null,
			},
			include: {
				assignee: { select: { id: true, name: true, email: true } },
			},
		});

		if (!isAdmin) {
			// Notify all admins that a new ticket needs review
			notifyAdmins({
				type: "ticket_needs_approval",
				title: "Ticket submitted for approval",
				body: `"${entry.title}" was submitted and needs your review.`,
				link: `/dashboard/tickets/${entry.id}`,
			}).catch(() => {});
		} else if (assigned_to) {
			// Notify the specific assignee
			createNotification({
				user_id: assigned_to,
				type: "task_assigned",
				title: "New ticket assigned",
				body: `"${entry.title}" has been assigned to you.`,
				link: `/dashboard/tickets/${entry.id}`,
			}).catch(() => {});
		} else {
			// Notify all employees that a new task is available to claim
			notifyEmployees({
				type: "task_available",
				title: "New ticket available",
				body: `"${entry.title}" is available to claim.`,
				link: `/dashboard/tickets/${entry.id}`,
			}).catch(() => {});
		}

		return ok(entry, 201);
	} catch (err) {
		console.error("[task:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
