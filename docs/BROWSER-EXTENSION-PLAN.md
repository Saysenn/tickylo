# Browser Extension Time Tracker — Plan

A lightweight Chrome/Edge/Firefox extension that lets employees clock in/out and log time directly from their browser, syncing with the Tickworks backend.

---

## 1. What It Does

- Clock in / clock out with one click from any tab
- Shows current session duration (live timer)
- Lets the employee select or type a task title
- Syncs to the same `/api/v1/time` endpoints used by the web app
- Works across tabs — persistent state via `chrome.storage.local`
- Shows a badge on the extension icon when clocked in (green dot or elapsed time)

---

## 2. Architecture

```
Extension (popup UI)
  └─ chrome.storage.local   ← persists session state (entry_id, start_time, title)
  └─ Background Service Worker
       └─ Alarm API          ← ticks every 60s to update badge
       └─ fetch()            ← calls Tickworks API with stored auth token
```

The extension talks directly to `https://yourapp.vercel.app/api/v1/time` — no separate server needed.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| UI framework | React + Vite (CRXJS plugin) | Same stack as main app; hot reload during dev |
| Styling | Tailwind CSS | Matches the main app design tokens |
| State | `chrome.storage.local` | Persists across popup open/close |
| Auth | Cookie-based (same Supabase session) | No extra auth needed if same domain |
| Build target | Manifest V3 | Required for Chrome Web Store |

---

## 4. Auth Strategy

**Option A — Cookie passthrough (simplest)**
Extension runs on the same domain as the app. Supabase sets a cookie on `yourapp.com`. Extension makes fetch calls to `https://yourapp.com/api/v1/...` — browser automatically sends the cookie. No token storage needed.

**Option B — API token (for Firefox / cross-domain)**
User copies a personal API token from their Tickworks settings page. Extension stores it in `chrome.storage.local` and sends it as `Authorization: Bearer <token>` on each request.

**Recommended: Option A** for the initial version — zero extra infrastructure.

---

## 5. File Structure

```
extension/
├── manifest.json          ← MV3 manifest
├── public/
│   └── icons/             ← 16, 32, 48, 128px PNGs
├── src/
│   ├── popup/
│   │   ├── App.tsx        ← main popup UI (clock in/out, timer, task selector)
│   │   ├── main.tsx
│   │   └── popup.html
│   ├── background/
│   │   └── service-worker.ts  ← badge update alarm, keeps session alive
│   └── lib/
│       ├── api.ts         ← fetch wrappers for /api/v1/time endpoints
│       └── storage.ts     ← chrome.storage.local helpers
├── package.json
└── vite.config.ts         ← CRXJS plugin config
```

---

## 6. Popup UI — Screens

### Screen 1: Clocked Out
```
┌─────────────────────────┐
│  Tickworks              │
│                         │
│  [Task title input    ] │
│                         │
│  [ Clock In  ▶ ]        │
│                         │
│  Hi, John · admin       │
└─────────────────────────┘
```

### Screen 2: Clocked In
```
┌─────────────────────────┐
│  Tickworks              │
│                         │
│  ● Recording            │
│  "Build login page"     │
│                         │
│  02:14:38               │
│                         │
│  [ Clock Out  ■ ]       │
└─────────────────────────┘
```

### Screen 3: Not logged in
```
┌─────────────────────────┐
│  Tickworks              │
│                         │
│  Please log in at       │
│  performai.app first.   │
│                         │
│  [ Open App → ]         │
└─────────────────────────┘
```

---

## 7. API Calls

| Action | Endpoint | Method | Body |
|---|---|---|---|
| Clock in | `/api/v1/time` | POST | `{ title?: string }` |
| Clock out | `/api/v1/time/[id]` | PATCH | `{ end_time: ISO string }` |
| Check active | `/api/v1/time?active=true` | GET | — |
| List tasks | `/api/v1/task?status=in_progress` | GET | — |

These are the same endpoints used by the web app — no backend changes required.

---

## 8. Badge Behavior

- **Clocked out**: no badge
- **Clocked in**: green badge `"●"` or elapsed time `"2h"` (updates every minute via Alarm API)

```typescript
// background/service-worker.ts
chrome.alarms.create("badge-tick", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "badge-tick") return;
  const { session } = await chrome.storage.local.get("session");
  if (!session) return;
  const elapsed = Date.now() - new Date(session.start_time).getTime();
  const hours = Math.floor(elapsed / 3_600_000);
  const mins = Math.floor((elapsed % 3_600_000) / 60_000);
  const label = hours > 0 ? `${hours}h` : `${mins}m`;
  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ color: "#80ed99" });
});
```

---

## 9. Build & Packaging

```bash
cd extension
npm install
npm run build        # outputs to dist/
# Zip dist/ → upload to Chrome Web Store or load unpacked for dev
```

**Dev (hot reload):**
```bash
npm run dev
# Chrome → Extensions → Load unpacked → select dist/
```

---

## 10. Implementation Order

1. **Scaffold** — `npm create vite` + CRXJS plugin, basic manifest
2. **Auth detection** — check for Supabase session cookie or stored token
3. **Clock in/out** — POST/PATCH to `/api/v1/time`, store result in `chrome.storage.local`
4. **Live timer** — `setInterval` in popup while open, Alarm API for badge updates
5. **Task selector** — dropdown from `/api/v1/task?status=in_progress`
6. **Badge** — background service worker with Alarm API
7. **Polish** — icons, dark mode, error states
8. **Pack** — zip `dist/` for Chrome Web Store submission

---

## 11. Estimated Effort

| Phase | Effort |
|---|---|
| Scaffold + auth | 2–3h |
| Clock in/out + storage | 3–4h |
| Timer + badge | 2h |
| Task selector | 1–2h |
| Polish + packaging | 2–3h |
| **Total** | **~10–12h** |

---

## 12. Chrome Web Store Checklist

- [ ] 128×128 icon (PNG, no alpha background)
- [ ] Screenshots (1280×800 or 640×400)
- [ ] Privacy policy URL (required for any extension using storage)
- [ ] Description (132 char summary + full description)
- [ ] Justify `storage` permission in listing
- [ ] Single-purpose declaration (time tracking only)
