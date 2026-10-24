# frAGILE · Sprint 1 prototype

A responsive ocean-cleanup field log built from the mockups in `frAGILE_frontend/` and the simplified Sprint 1 plan. This implementation uses the plan’s frontend-only option: React, TypeScript, Vite, Tailwind CSS, React state, and browser localStorage. No backend, database service, or credentials are required.

## Run locally

Use Node.js 22.12+ (tested with Node 24) and npm.

```sh
npm ci
npm run dev
```

Vite serves the application on port 5173. For a production build:

```sh
npm run build
npm run preview
```

Deploy `dist/` with a fallback to `index.html` for application routes. Camera capture, geolocation, and password hashing require a secure context: HTTPS or localhost. The camera file input is a hint to mobile browsers; desktop browsers show a file picker. JPG, PNG, and WebP are supported; HEIC must be converted first.

## Demo journey

1. Create an account using test details and a unique demo password; then sign in.
2. Select **Create log**. Request your GPS location or continue without it.
3. Review the automatically captured device date/time.
4. Take or select a photo, review its preview, and select **Use photo**.
5. Add an optional note (maximum 500 characters), review, and **Save draft**.
6. Open **My logs** to edit a draft. Changes only persist when saved.
7. Delete a draft through its confirmation dialog, or cancel to retain it.

A partial draft needs a location, photo, or nonblank note before it can be saved. The automatically captured timestamp alone is not considered meaningful draft content. Photos are resized to a maximum dimension of 1280px and stored as JPEG data URLs to reduce localStorage usage. Saving a draft replaces its existing version rather than adding a duplicate.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

If the default home cache is unavailable in a cloud workspace, use `npm ci --cache /workspace/.npm-cache`. For browser binaries, use the same `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` setting for both installation and E2E execution. Browser tests start Vite automatically. If Chromium is already installed, you can skip the browser download and run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` (the path used in this cloud workspace).

Unit tests cover CRUD, account scoping, failed-write preservation, corrupted storage, invalid data, and note validation. Browser tests cover registration/sign-in, GPS coordinates, real image decoding/preview, persistence across reload, note editing, deletion confirmation, permission denial, storage failure recovery, unsaved changes, mobile overflow, and editing while disconnected.

## Prototype boundaries

- Accounts are mock browser-local accounts, **not production authentication**. Passwords are stored as salted PBKDF2 verifiers rather than plaintext, but anyone with access to browser storage can inspect or modify records or sessions. Do not use real credentials or sensitive records.
- Accounts and drafts use versioned `fragile:v1:*` localStorage keys. Lists are scoped to the signed-in account as a demo convenience, not a security boundary. No data leaves the app for an API, and account creation does not require a network connection.
- Browser storage quotas apply, especially to photos. Failed saves retain the active form and the last saved record. Clearing browser data removes all accounts, sessions, drafts, and photos. There is no backup, synchronization, server timestamp, upload, or final submission workflow.
- Offline editing works **while the application is already loaded**. There is no service worker or offline cold-start/reload support in this simplified scope.
- GPS and camera availability depend on the browser, permissions, device, and HTTPS. The location illustration is decorative; it is not an interactive map. Device timestamps are not verified by a server.
- No photo is attached until **Use photo** is selected. All form changes require **Save draft**. Navigation warns before discarding unsaved edits.
- Concurrent edits in multiple tabs are not merged; the latest successful save wins. Keep a draft open in one tab during the demo.

The original sprint CSV and all original mockup images are preserved unchanged.
