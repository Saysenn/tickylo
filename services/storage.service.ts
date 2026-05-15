import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/infra/prisma";

// ── Encryption ────────────────────────────────────────────────────────────────
// Credentials are stored AES-GCM encrypted. Key must be a 32-byte hex string
// in the STORAGE_ENCRYPTION_KEY env var.

const ALGO = "aes-256-gcm";

function getEncKey(): Buffer {
	const raw = process.env.STORAGE_ENCRYPTION_KEY ?? "";
	if (raw.length !== 64) throw new Error("STORAGE_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
	return Buffer.from(raw, "hex");
}

export function encryptConfig(obj: object): string {
	const key = getEncKey();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(ALGO, key, iv);
	const plain = Buffer.from(JSON.stringify(obj));
	const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
	const tag = cipher.getAuthTag();
	// Store as: iv(12) + tag(16) + ciphertext — base64 encoded
	return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptConfig(encoded: string): Record<string, string> {
	const key = getEncKey();
	const buf = Buffer.from(encoded, "base64");
	const iv = buf.subarray(0, 12);
	const tag = buf.subarray(12, 28);
	const ciphertext = buf.subarray(28);
	const decipher = crypto.createDecipheriv(ALGO, key, iv);
	decipher.setAuthTag(tag);
	const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
	return JSON.parse(plain.toString());
}

// ── Config types ──────────────────────────────────────────────────────────────

export interface SupabaseConfig {
	provider: "supabase";
	url: string;
	service_key: string;
	bucket: string;
}

export interface S3Config {
	provider: "s3";
	region: string;
	bucket: string;
	access_key_id: string;
	secret_access_key: string;
}

export type StorageConfig = SupabaseConfig | S3Config;

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function getOrgStorageConfig(orgId: string): Promise<StorageConfig | null> {
	const row = await prisma.orgStorage.findUnique({ where: { org_id: orgId } });
	if (!row) return null;
	const config = decryptConfig(row.config as string);
	return { provider: row.provider, ...config } as StorageConfig;
}

export async function upsertOrgStorage(orgId: string, data: StorageConfig) {
	const { provider, ...rest } = data;
	const encrypted = encryptConfig(rest);
	return prisma.orgStorage.upsert({
		where: { org_id: orgId },
		create: { org_id: orgId, provider, config: encrypted },
		update: { provider, config: encrypted },
	});
}

export async function getOrgStorageSafe(orgId: string) {
	const row = await prisma.orgStorage.findUnique({ where: { org_id: orgId } });
	if (!row) return null;
	// Return provider + non-sensitive fields only (for Settings GET)
	const config = decryptConfig(row.config as string);
	const safe: Record<string, string> = { provider: row.provider };
	if (row.provider === "supabase") safe.bucket = config.bucket ?? "";
	if (row.provider === "s3") { safe.region = config.region ?? ""; safe.bucket = config.bucket ?? ""; }
	return safe;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadResult {
	key: string;
	url: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/plain"];
const ALLOWED_MIME_EXACT = [
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export function validateFile(mimeType: string, sizeBytes: number) {
	if (sizeBytes > MAX_FILE_SIZE) throw Object.assign(new Error("File too large (max 10 MB)"), { status: 400 });
	const allowed =
		ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) ||
		ALLOWED_MIME_EXACT.includes(mimeType);
	if (!allowed) throw Object.assign(new Error("File type not allowed"), { status: 400 });
}

export async function uploadFile(
	orgId: string,
	buffer: Buffer,
	fileName: string,
	mimeType: string,
	storageKey: string,
): Promise<UploadResult> {
	const cfg = await getOrgStorageConfig(orgId);
	if (!cfg) throw Object.assign(new Error("No storage configured for this organization"), { status: 422 });

	if (cfg.provider === "supabase") {
		return uploadSupabase(cfg, buffer, storageKey, mimeType);
	}
	return uploadS3(cfg, buffer, storageKey, mimeType);
}

async function uploadSupabase(
	cfg: SupabaseConfig,
	buffer: Buffer,
	key: string,
	mimeType: string,
): Promise<UploadResult> {
	const supabase = createClient(cfg.url, cfg.service_key);
	const { error } = await supabase.storage
		.from(cfg.bucket)
		.upload(key, buffer, { contentType: mimeType, upsert: false });
	if (error) throw Object.assign(new Error(`Supabase upload failed: ${error.message}`), { status: 500 });
	const { data } = supabase.storage.from(cfg.bucket).getPublicUrl(key);
	return { key, url: data.publicUrl };
}

async function uploadS3(
	cfg: S3Config,
	buffer: Buffer,
	key: string,
	mimeType: string,
): Promise<UploadResult> {
	const client = new S3Client({
		region: cfg.region,
		credentials: { accessKeyId: cfg.access_key_id, secretAccessKey: cfg.secret_access_key },
	});
	const upload = new Upload({
		client,
		params: { Bucket: cfg.bucket, Key: key, Body: buffer, ContentType: mimeType },
	});
	await upload.done();
	// Generate a 7-day signed URL
	const cmd = new GetObjectCommand({ Bucket: cfg.bucket, Key: key });
	const url = await getSignedUrl(client, cmd, { expiresIn: 604800 });
	return { key, url };
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteFile(orgId: string, key: string) {
	const cfg = await getOrgStorageConfig(orgId);
	if (!cfg) return; // No storage — nothing to delete from cloud

	if (cfg.provider === "supabase") {
		const supabase = createClient(cfg.url, cfg.service_key);
		await supabase.storage.from(cfg.bucket).remove([key]);
		return;
	}

	// S3
	const client = new S3Client({
		region: cfg.region,
		credentials: { accessKeyId: cfg.access_key_id, secretAccessKey: cfg.secret_access_key },
	});
	await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

// ── Connection test ───────────────────────────────────────────────────────────

export async function testConnection(config: StorageConfig): Promise<void> {
	const testKey = `__tickworks_test_${Date.now()}.txt`;
	const buf = Buffer.from("tickworks-connection-test");

	if (config.provider === "supabase") {
		const supabase = createClient(config.url, config.service_key);
		const { error: upErr } = await supabase.storage
			.from(config.bucket)
			.upload(testKey, buf, { contentType: "text/plain", upsert: true });
		if (upErr) throw new Error(`Supabase connection failed: ${upErr.message}`);
		await supabase.storage.from(config.bucket).remove([testKey]);
		return;
	}

	// S3
	const client = new S3Client({
		region: config.region,
		credentials: { accessKeyId: config.access_key_id, secretAccessKey: config.secret_access_key },
	});
	const upload = new Upload({
		client,
		params: { Bucket: config.bucket, Key: testKey, Body: buf, ContentType: "text/plain" },
	});
	await upload.done();
	await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: testKey }));
}
