# Tickylo Extension — Usage

## Requirements

- Chrome or Edge (Manifest V3)
- Logged into [tickylo.app](https://tickylo.app) in the same browser
- Admin has enabled the extension in **Settings → Organization → Details**

---

## Install (Development)

```bash
cd extension
npm install
npm run build
```

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/dist`

## Local API (optional)

Create `extension/.env.local`:

```
VITE_API_URL=http://localhost:3000
```

Then rebuild: `npm run build`

---

## Tabs

| Tab | What it does |
|---|---|
| **Timer** | Start/stop your time tracker with an optional task title |
| **Tickets** | View your tickets or available ones — claim, start, complete, create |
| **Me** | Your profile, today's hours, open dashboard, sign out |

## Badge

The extension icon shows a live badge while a timer is running:
- `●` — timer just started
- `5m`, `1h`, etc. — elapsed time (updates every minute)

---

## Auth

No login inside the extension. It reads your session from the browser cookie automatically. If you see **"You're not logged in"**, go to tickylo.app and sign in first.
