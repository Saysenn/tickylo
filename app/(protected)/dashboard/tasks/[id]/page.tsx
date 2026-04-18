import { redirect } from "next/navigation";

export default function TaskDetailRedirect({
	params,
}: {
	params: { id: string };
}) {
	redirect(`/dashboard/tickets/${params.id}`);
}
