# Storage Plan

## Ownership Model
Tickylo owns the storage — orgs never configure anything.
One Supabase Storage bucket, org files separated by folder path.

```
tickylo-attachments/
  [org_id]/
    [ticket_id]/
      [timestamp]_[filename]
```

No `OrgStorage` model needed. No encryption of credentials. No admin setup UI.

---

## Implementation

**Single env var on the server:**
```
SUPABASE_STORAGE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=tickylo-attachments
```

All upload/delete calls use the same service role key.
Org isolation is purely by folder path — one org can never reference another's path.

---

## What to Remove
The current `OrgStorage` model and the admin "File Storage" settings tab exist only because storage was per-org-configured. Once you own it:

- Drop `OrgStorage` table and model
- Remove the storage settings section from org settings UI
- Remove `STORAGE_ENCRYPTION_KEY` env var
- Remove the storage setup/test-connection API routes
- Update upload/download service to use the single shared credentials

---

## File Limits (unchanged)

| Property | Limit |
|---|---|
| Max file size | 10 MB |
| Max per comment | 10 files |
| Allowed types | images, PDF, Word, Excel, PowerPoint, plain text |

---

## Cost
Supabase free tier: 1 GB storage, 2 GB bandwidth.
Pro tier ($25/mo): 100 GB storage — enough for hundreds of orgs at launch.
Scale by upgrading Supabase plan, not by touching code.
