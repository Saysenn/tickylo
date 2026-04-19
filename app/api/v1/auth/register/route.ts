import { NextResponse } from "next/server";

// Direct registration is disabled — users must apply via /apply or join via /join
export async function POST() {
	return NextResponse.json(
		{ error: "Direct registration is not available. Please apply at /apply or join via /join." },
		{ status: 410 },
	);
}
