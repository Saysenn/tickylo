import { Suspense } from "react";
import { EmployeesTable } from "@/components/dashboard/employees/employees-table";

export const metadata = { title: "Employees" };

export default function EmployeesPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Employees</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Manage your workforce, roles, and departments.
				</p>
			</div>

			<Suspense>
				<EmployeesTable />
			</Suspense>
		</div>
	);
}
