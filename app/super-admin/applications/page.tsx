import { ApplicationsTable } from "@/components/super-admin/applications-table";
import { prisma } from "@/lib/infra/prisma";

export default async function ApplicationsPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const { tab = "pending" } = await searchParams;

	const applications = await prisma.organizationApplication.findMany({
		where: { status: tab },
		orderBy: { created_at: "desc" },
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Company Applications</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Review company registration requests and approve or reject them.
				</p>
			</div>

			<ApplicationsTable applications={applications} activeTab={tab} />
		</div>
	);
}
