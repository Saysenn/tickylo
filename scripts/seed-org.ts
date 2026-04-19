/**
 * Seed script — run once to bootstrap multi-tenancy:
 * 1. Sets laudzioncascalla01@gmail.com as super_admin in Supabase app_metadata
 * 2. Creates a default Organization for all existing data
 * 3. Backfills org_id on all existing rows
 *
 * Run: npx tsx scripts/seed-org.ts
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PrismaClient } from "../lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const SUPER_ADMIN_EMAIL = "laudzioncascalla01@gmail.com";
const DEFAULT_ORG_NAME  = "PerformAI Default";
const DEFAULT_ORG_SLUG  = "performai-default";

async function main() {
	const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
	const databaseUrl        = process.env.DATABASE_URL!;

	if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
		throw new Error("Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL");
	}

	const supabase = createAdminClient(supabaseUrl, supabaseServiceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const adapter = new PrismaPg({ connectionString: databaseUrl });
	const prisma  = new PrismaClient({ adapter });

	// ── Step 1: Set super_admin role ─────────────────────────────────────────

	console.log(`\n1. Looking up super admin: ${SUPER_ADMIN_EMAIL}`);

	const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
	if (listErr) throw listErr;

	let superAdminUser = users.find((u) => u.email === SUPER_ADMIN_EMAIL);

	if (!superAdminUser) {
		console.log(`  → Not found in auth — creating super admin account...`);
		const tempPassword = Math.random().toString(36).slice(-12) + "A1!";
		const { data: created, error: createErr } = await supabase.auth.admin.createUser({
			email: SUPER_ADMIN_EMAIL,
			password: tempPassword,
			email_confirm: true,
			user_metadata: { full_name: "Super Admin" },
			app_metadata: { role: "super_admin" },
		});
		if (createErr) throw createErr;
		superAdminUser = created.user;
		console.log(`  ✓ Created auth user for ${SUPER_ADMIN_EMAIL}`);
		console.log(`  ⚠  Temporary password: ${tempPassword}`);
		console.log(`     Go to /forgot-password to set a permanent password.`);
	}

	const { error: updateErr } = await supabase.auth.admin.updateUserById(
		superAdminUser.id,
		{ app_metadata: { ...superAdminUser.app_metadata, role: "super_admin" } },
	);
	if (updateErr) throw updateErr;
	console.log(`  ✓ ${SUPER_ADMIN_EMAIL} → role=super_admin`);

	// ── Step 2: Create default org ───────────────────────────────────────────

	console.log("\n2. Creating default organization...");

	let org = await prisma.organization.findFirst({ where: { slug: DEFAULT_ORG_SLUG } });

	if (!org) {
		org = await prisma.organization.create({
			data: { name: DEFAULT_ORG_NAME, slug: DEFAULT_ORG_SLUG },
		});
		console.log(`  ✓ Created org: ${org.name} (${org.id})`);
	} else {
		console.log(`  → Org already exists: ${org.name} (${org.id})`);
	}

	const orgId = org.id;

	// ── Step 3: Backfill org_id on all existing rows ─────────────────────────

	console.log("\n3. Backfilling org_id on existing rows...");

	// Users — skip the super admin (they are org-agnostic)
	const usersUpdated = await prisma.user.updateMany({
		where: { org_id: null, email: { not: SUPER_ADMIN_EMAIL } },
		data:  { org_id: orgId },
	});
	console.log(`  ✓ users: ${usersUpdated.count} rows`);

	// Tasks
	const tasksUpdated = await prisma.task.updateMany({
		where: { org_id: null },
		data:  { org_id: orgId },
	});
	console.log(`  ✓ tasks: ${tasksUpdated.count} rows`);

	// TimeEntries
	const timeUpdated = await prisma.timeEntry.updateMany({
		where: { org_id: null },
		data:  { org_id: orgId },
	});
	console.log(`  ✓ time_entries: ${timeUpdated.count} rows`);

	// Leaves
	const leavesUpdated = await prisma.leave.updateMany({
		where: { org_id: null },
		data:  { org_id: orgId },
	});
	console.log(`  ✓ leaves: ${leavesUpdated.count} rows`);

	// Notifications
	const notifsUpdated = await prisma.notification.updateMany({
		where: { org_id: null },
		data:  { org_id: orgId },
	});
	console.log(`  ✓ notifications: ${notifsUpdated.count} rows`);

	// Departments
	const deptsUpdated = await prisma.department.updateMany({
		where: { org_id: null },
		data:  { org_id: orgId },
	});
	console.log(`  ✓ departments: ${deptsUpdated.count} rows`);

	// TicketTypeConfigs
	const ticketTypesUpdated = await prisma.ticketTypeConfig.updateMany({
		where: { org_id: null },
		data:  { org_id: orgId },
	});
	console.log(`  ✓ ticket_type_configs: ${ticketTypesUpdated.count} rows`);

	// ── Step 4: Update Supabase app_metadata for existing users ──────────────

	console.log("\n4. Updating Supabase app_metadata with org_id for existing users...");

	const existingUsers = await prisma.user.findMany({
		where: { org_id: orgId },
		select: { id: true, email: true, role: true },
	});

	let metaUpdated = 0;
	for (const u of existingUsers) {
		const supaUser = users.find((su) => su.id === u.id);
		if (!supaUser) continue;

		const currentMeta = supaUser.app_metadata ?? {};
		if (currentMeta.org_id === orgId) continue; // already set

		const { error } = await supabase.auth.admin.updateUserById(u.id, {
			app_metadata: {
				...currentMeta,
				org_id: orgId,
				role: currentMeta.role ?? u.role ?? "employee",
			},
		});
		if (error) {
			console.warn(`  ⚠ Failed to update metadata for ${u.email}: ${error.message}`);
		} else {
			metaUpdated++;
		}
	}
	console.log(`  ✓ Supabase metadata updated for ${metaUpdated} users`);

	console.log("\n✅ Seed complete.\n");
	await prisma.$disconnect();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
