# SMS & Email Inbound Tickets

## The Trick
Each org gets a secret token in their webhook URL — no routing logic needed.
```
POST /api/v1/inbound/sms/[token]
POST /api/v1/inbound/email/[token]
```
Token stored as `Organization.inbound_webhook_token`. Admin pastes URL into Twilio / Postmark once.

---

## Schema
```prisma
inbound_webhook_token  String  @unique @default(cuid())
```

---

## Routes

**SMS** (`/inbound/sms/[token]`) — Twilio posts form-encoded `From` + `Body`
1. Find org by token
2. Verify `X-Twilio-Signature` header
3. Create ticket — `source: "sms"`, title = first line of Body, match Client by phone
4. Return empty `<Response/>` TwiML

**Email** (`/inbound/email/[token]`) — Postmark posts JSON `From` + `Subject` + `TextBody`
1. Find org by token
2. Verify shared secret header
3. Create ticket — `source: "email"`, title = Subject, match Client by email
4. Return `200 OK`

---

## Ownership Model
Tickylo owns the single Twilio account and the `mail.tickylo.app` email domain.
- When an org enables SMS → programmatically buy a Twilio number via Twilio API, store on `Organization.sms_number`
- Each org gets `[slug]@mail.tickylo.app` for email inbound
- Admins never touch Twilio or Postmark — they just enable the feature in settings
- Cost: ~$1/month per org per active SMS number (passed into pricing)

## Settings UI
Admin enables SMS/Email inbound in org settings. Shows their assigned phone number and inbound email address. No token, no external setup needed.

## Env Vars
```
TWILIO_AUTH_TOKEN=
INBOUND_EMAIL_SECRET=
```
