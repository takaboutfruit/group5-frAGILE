# frAGILE · Sprint 2 prototype

A responsive ocean-cleanup field log built from the mockups in `frAGILE_frontend/` and the simplified Sprint 1 plan. This implementation uses React, TypeScript, Vite, Tailwind CSS, React state, localStorage for records, and IndexedDB for receipt images. No backend, database service, or credentials are required.

## Sprint 2

Save logs offline in **My logs**. They do not enter Sync Queue until you press **Commit Logs** on My logs, select the logs, and confirm. Once online, upload committed logs from **Sync Queue**; successful uploads leave the queue. Open the separate **Records** page and press **Fetch Logs** to see uploaded logs, then choose **New Record** to complete and submit a final record using the original log details. Final submission does not queue the record again.

Receipt upload/retake, reference and weight editing, signature capture/clear, material/contamination selection, and locally locked final records are implemented. Commit requires GPS, captured date/time and a cleanup photo; notes are optional and incomplete drafts remain editable. A single sticky My logs → Sync queue → Records header follows the workflow. Records remembers its initial fetch across navigation and reload. Upload/fetch are frontend simulations with no server transfer. Offline work is supported after initial load.

See [the demo and Chrome Network checklist](docs/sprint2-demo.md) and [all 102 mapped acceptance cases](docs/sprint2-test-matrix.md).

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

## Deploy to Vercel

Import `takaboutfruit/group5-frAGILE` from GitHub in Vercel, using the repository root as the project root. The checked-in `vercel.json` selects Vite, runs `npm ci` and `npm run build`, publishes `dist/`, and rewrites application routes to `index.html` so `/logs`, `/logs/new`, and `/register` work on direct navigation and reload. No environment variables or backend services are required.

With an authenticated Vercel CLI, run `npx vercel --prod` from this directory. Vercel account authentication is required to publish; GitHub repository access alone does not authorize a Vercel deployment.

## Demo journey

1. Open the home page and select **Create log**—no account or sign-in is required.
2. Request your GPS location or continue without it.
3. Review the automatically captured device date/time.
4. Take or select a photo, review its preview, and select **Use photo**.
5. Add an optional note (maximum 500 characters), review, and **Save draft**.
6. Open **My logs** to edit a draft. Changes only persist when saved.
7. Delete a draft through its confirmation dialog, or cancel to retain it.

**Create account** is a separate, optional demo at `/register`. Registration neither signs you in nor changes access to drafts. The `/login` page has been removed. All draft creation, listing (`/logs`), editing, and deletion are available immediately.

A partial draft needs a location, photo, or nonblank note before it can be saved. The automatically captured timestamp alone is not considered meaningful draft content. Photos are resized to a maximum dimension of 1280px and stored as JPEG data URLs to reduce localStorage usage. Saving a draft replaces its existing version rather than adding a duplicate.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

If the default home cache is unavailable in a cloud workspace, use `npm ci --cache /workspace/.npm-cache`. For browser binaries, use the same `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` setting for both installation and E2E execution. Browser tests start Vite automatically. If Chromium is already installed, you can skip the browser download and run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` (the path used in this cloud workspace).

Unit tests cover CRUD, compatibility with legacy account-associated drafts, failed-write preservation, corrupted storage, invalid data, and note validation. Browser tests cover optional registration independent of log creation, account-free GPS coordinates, real image decoding/preview, persistence across reload, note editing, deletion confirmation, permission denial, storage failure recovery, unsaved changes, mobile overflow, and editing while disconnected.

## Prototype boundaries

- Registration is a standalone browser-local demo; **there is no authentication in this phase**. Passwords are stored as salted PBKDF2 verifiers rather than plaintext, but anyone with access to browser storage can inspect or modify records. Do not use real credentials or sensitive records.
- Accounts and drafts use versioned `fragile:v1:*` localStorage keys. Drafts are shared within this browser, independently of accounts. Existing drafts from the earlier account-scoped version remain available without signing in; their original metadata is preserved. Old session data is ignored. No data leaves the app for an API, and account creation does not require a network connection.
- Browser storage quotas apply, especially to photos. Failed saves retain the active form and the last saved record. Clearing browser data removes all accounts, drafts, and photos. There is no backup, real server synchronization, server timestamp, or network upload. Sprint 2 commits field logs for simulated upload, then creates and locks final records from uploaded logs.
- Offline editing works **while the application is already loaded**. There is no service worker or offline cold-start/reload support in this simplified scope.
- GPS and camera availability depend on the browser, permissions, device, and HTTPS. The location illustration is decorative; it is not an interactive map. Device timestamps are not verified by a server.
- No photo is attached until **Use photo** is selected. All form changes require **Save draft**. Navigation warns before discarding unsaved edits.
- Concurrent edits in multiple tabs are not merged; the latest successful save wins. Keep a draft open in one tab during the demo.

The original sprint CSV and all original mockup images are preserved unchanged.
