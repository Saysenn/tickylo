# Browser Extension — Plan

A Chrome/Edge/Firefox extension for clocking in/out without opening the app.

---

## Auth — No OAuth Needed

Uses **cookie passthrough**. The browser automatically sends the Supabase session cookie when the extension fetches `https://tickworks.app/api/v1/...` with `credentials: "include"`. User just needs to be logged into the web app once.

- **401 response** → show "Please log in at tickworks.app first" + Open App button
- No token storage, no OAuth flow, no backend changes

---

## Stack

| Layer | Choice |
|---|---|
| UI | React + Vite + CRXJS plugin |
| Styling | Tailwind (same tokens as main app) |
| State | `chrome.storage.local` (persists across popup open/close) |
| Auth | Cookie passthrough (`credentials: "include"`) |
| Manifest | V3 (Chrome Web Store requirement) |

---

## File Structure

```
extension/
├── manifest.json
├── public/icons/          ← 16, 48, 128px PNGs
├── src/
│   ├── popup/App.tsx      ← clock in/out UI
│   ├── background/sw.ts   ← badge tick via Alarm API
│   └── lib/
│       ├── api.ts         ← fetch wrappers (credentials: include)
│       └── storage.ts     ← chrome.storage helpers
```

---

## Screens

**Not logged in** → "Log in at tickworks.app" + Open App button

**Clocked out** → task title input + Clock In button + user name

**Clocked in** → live timer + task name + Clock Out button + green badge on icon

---

## API Calls (no backend changes)

| Action | Endpoint | Method |
|---|---|---|
| Check session / active timer | `GET /api/v1/time/active` | — |
| Clock in | `POST /api/v1/time` | `{ title? }` |
| Clock out | `PATCH /api/v1/time/[id]` | `{ end_time }` |

---

## Badge (service worker)

```ts
chrome.alarms.create("tick", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async () => {
  const { session } = await chrome.storage.local.get("session");
  if (!session) { chrome.action.setBadgeText({ text: "" }); return; }
  const mins = Math.floor((Date.now() - new Date(session.start_time).getTime()) / 60_000);
  const label = mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`;
  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ color: "#80ED99" });
});
```

---

## Build Order

1. Scaffold — Vite + CRXJS + manifest
2. Auth detection — `GET /api/v1/time/active`, handle 401
3. Clock in/out — POST/PATCH + `chrome.storage.local`
4. Live timer — `setInterval` in popup + Alarm API for badge
5. Polish — icons, error states
6. Pack — zip `dist/` for Chrome Web Store

**Estimated effort: ~10h**

---

## Chrome Web Store Checklist

- [ ] 128×128 PNG icon (no alpha background)
- [ ] Screenshots (1280×800)
- [ ] Privacy policy URL
- [ ] Justify `storage` and `host_permissions` in listing
