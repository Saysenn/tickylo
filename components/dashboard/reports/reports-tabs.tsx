"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PerformanceTable } from "@/components/dashboard/performance/performance-table";
import { InvoiceSection } from "@/components/dashboard/reports/invoice-section";

interface Props {
	orgName: string;
	orgSlug: string | null | undefined;
	orgLogoUrl?: string;
}

export function ReportsTabs({ orgName, orgSlug, orgLogoUrl }: Props) {
	return (
		<Tabs defaultValue="performance">
			<TabsList>
				<TabsTrigger value="performance">Performance</TabsTrigger>
				<TabsTrigger value="invoices">Invoices</TabsTrigger>
			</TabsList>

			<TabsContent value="performance" className="mt-6">
				<PerformanceTable />
			</TabsContent>

			<TabsContent value="invoices" className="mt-6">
				<InvoiceSection
					orgName={orgName}
					orgSlug={orgSlug ?? ""}
					orgLogoUrl={orgLogoUrl}
				/>
			</TabsContent>
		</Tabs>
	);
}
