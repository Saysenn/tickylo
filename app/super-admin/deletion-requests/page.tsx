import { prisma } from "@/lib/infra/prisma";
import { DeletionRequestsTable } from "@/components/super-admin/deletion-requests-table";

export const metadata = { title: "Super Admin · Deletion Requests" };

export default async function DeletionRequestsPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const { tab = "pending" } = await searchParams;

	const requests = await prisma.orgDeletionRequest.findMany({
		where:   { status: tab },
		include: {
			org: {
				select: { name: true, plan: true, seat_count: true, created_at: true },
			},
		},
		orderBy: { created_at: "desc" },
	});

	const pendingCount = await prisma.orgDeletionRequest.count({ where: { status: "pending" } });

	return (
		<div className="space-y-6">
			<div>
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold text-ink">Deletion Requests</h1>
					{pendingCount > 0 && (
						<span className="text-xs font-bold bg-red-500/15 text-red-600 px-2 py-0.5 rounded-full">
							{pendingCount} pending
						</span>
					)}
				</div>
				<p className="text-ink-3 mt-1 text-sm">
					Organizations that have requested to be deleted. Review before approving — approvals are irreversible.
				</p>
			</div>

			<DeletionRequestsTable requests={requests as any} activeTab={tab} />
		</div>
	);
}
