# Tickworks Browser Extension

## Dev
```bash
cp .env.example .env
npm install
npm run dev
```
Load unpacked in Chrome: `chrome://extensions` → Enable Developer mode → Load unpacked → select `dist/`

## Prod build
```bash
VITE_API_URL=https://tickworks.app npm run build
# zip dist/ → upload to Chrome Web Store
```

## Auth
Cookie-based. User must be logged into tickworks.app first. Extension sends cookies automatically via `credentials: "include"`.
