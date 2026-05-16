import { prisma } from "@/lib/infra/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { GDPR } from "@/configs/gdpr.config";

export async function runRetention() {
	const now = new Date();

	const pendingDeletions = await prisma.deletionRequest.findMany({
		where: { status: "pending", scheduled_for: { lte: now } },
	});

	const supabase = createAdminClient();
	let deletedUsers = 0;

	for (const req of pendingDeletions) {
		try {
			await supabase.auth.admin.deleteUser(req.user_id);
			await prisma.deletionRequest.update({
				where: { id: req.id },
				data: { status: "completed", completed_at: now },
			});
			deletedUsers++;
		} catch (err) {
			console.error(`[retention] Failed to delete user ${req.user_id}:`, err);
		}
	}

	const timeEntryCutoff = new Date(
		now.getTime() - GDPR.retention.timeEntriesDays * 24 * 60 * 60 * 1000,
	);
	const { count: deletedTimeEntries } = await prisma.timeEntry.deleteMany({
		where: { created_at: { lt: timeEntryCutoff } },
	});

	const leaveCutoff = new Date(
		now.getTime() - GDPR.retention.leaveRecordsDays * 24 * 60 * 60 * 1000,
	);
	const { count: deletedLeaveRecords } = await prisma.leave.deleteMany({
		where: { created_at: { lt: leaveCutoff } },
	});

	console.log(
		`[retention] deleted users=${deletedUsers}, time_entries=${deletedTimeEntries}, leave_records=${deletedLeaveRecords}`,
	);
}
