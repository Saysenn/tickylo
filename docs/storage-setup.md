# Storage Setup Guide

Thread attachments require cloud storage to be configured by an admin. Two providers are supported.

## Required Environment Variable

Add this to your `.env.local` (and Vercel environment variables):

```
STORAGE_ENCRYPTION_KEY=your_64_char_hex_string_here
```

Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This key encrypts your storage credentials at rest in the database.

---

## Option 1: Supabase Storage (Recommended)

You likely already have a Supabase project. This is the easiest setup.

### Steps

1. Open your Supabase project → **Storage** → **New bucket**
2. Name it (e.g. `tickylo-attachments`) and set it to **Public**
3. Go to **Project Settings** → **API** → copy the `service_role` key (not the `anon` key)
4. In Tickylo, go to **Settings** → **File Storage** and fill in:
   - **Provider**: Supabase Storage
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Service Role Key**: the key from step 3
   - **Bucket Name**: the bucket you created in step 2
5. Click **Test Connection** — you should see "Connection successful"
6. Click **Save Storage**

### Notes
- Files are stored at path `{org_id}/{timestamp}_{filename}` inside your bucket
- Public bucket = files are accessible via direct URL without auth (fine for org-internal use)
- If you need private files, switch to a private bucket and use signed URLs (S3 route handles this automatically; for Supabase you'd need to customise the storage service)

---

## Option 2: AWS S3

### Steps

1. Create an S3 bucket in your AWS account
2. Set the bucket's **Block Public Access** settings based on your preference:
   - For simplicity: allow public read (set bucket policy to allow `s3:GetObject` for `*`)
   - For signed URLs: keep bucket private (tickylo generates 7-day signed URLs for S3)
3. Create an IAM user with the following policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```
4. Generate **Access Key ID** and **Secret Access Key** for that IAM user
5. In Tickylo, go to **Settings** → **File Storage** and fill in:
   - **Provider**: AWS S3
   - **Region**: e.g. `ap-southeast-1`
   - **Bucket Name**: your bucket name
   - **Access Key ID** and **Secret Access Key**
6. Click **Test Connection**, then **Save Storage**

### Notes
- S3 files use pre-signed URLs valid for 7 days. URLs stored in the DB will expire — if this is an issue, regenerate URLs on fetch (requires a small storage service change)
- CORS must be configured on the bucket if you embed images directly in the browser

---

## File Limits

| Property | Limit |
|---|---|
| Max file size | 10 MB |
| Max attachments per comment | 10 |
| Allowed types | images, PDF, Word, Excel, PowerPoint, plain text |

---

## Permissions

| Action | Who can do it |
|---|---|
| Upload files | Any org member |
| Delete own attachment | The uploader |
| Delete any attachment | Admin only |
| Delete all attachments for a ticket | Admin only |
