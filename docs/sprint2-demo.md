# Sprint 2 demo and verification

Run `npm ci`, then `npm run dev`. No backend or credentials are needed. Start at My logs to capture GPS/time/photo/note, including while offline. Save the log, open **Sync Queue**, reconnect, and choose **Fetch Pending Logs**. Choose **New Record** beside the existing log to carry its saved details into the record form. If already started, choose **Continue Record**. New records always start from an existing log; `/records/new` redirects to pending logs.

## Demo operational boundaries

- Load the application **before** switching Chrome DevTools → Network → Offline. Offline reload/cold-start is not supported; no service worker is installed.
- Records and signatures stay in localStorage (`fragile:v2:records`). Receipts are image blobs in IndexedDB (`fragile-images`). Clearing site data removes both. Storage is not a backup.
- My logs and Sync Queue share log identity. Queue entries are projected from saved field logs without copying them. Record edits are stored under the same ID; source edits are reflected in unfinished records while receipt/reference/weight/signature fields are preserved. Final records retain their locked snapshot. Existing standalone records from the earlier version remain readable.
- All upload results are **simulated locally**. Online status reflects the browser's connectivity signal, not proof of server reachability. No record or receipt is sent to a server.
- Use one tab for the demo, as with Sprint 1. Concurrent editing/sync in multiple tabs is not a supported merge workflow.
- A draft can be incomplete. Entered values must be valid; final commit requires reference, positive finite weight in kg, material, contamination and a nonblank signature. Other material requires a description. Reference permits letters, numbers and hyphens. Receipt input accepts JPEG/PNG strictly below 3 MiB. Cleanup photo is optional, with explicit confirmation when absent.

## Chrome Network checklist

1. Load the app, switch DevTools → Network → Offline, and create a field log. Add a note and/or GPS/photo; save it to **My logs**.
2. Open **Sync Queue**. The same log appears automatically as Pending Record, with its saved details and no duplicate entry.
3. Try **Fetch Pending Logs** offline: a reconnect message appears and New Record is unavailable. Restore No throttling; the pending log becomes available without reloading.
4. Choose **New Record** for that log. Confirm that its GPS/time/photo/note carry over. Complete reference, weight, material, contamination and signature; optionally attach a receipt. Save and reopen with **Continue Record** to verify the same record resumes.
5. You may edit/save an already-open record offline. Submit Final Record and confirm locking, then open Sync Queue. Upload Log while offline shows an error and preserves the saved record. Restore No throttling before proceeding.
6. Choose Failure under Simulation outcome, then Upload Log. After 1.5 seconds it becomes Failed with its details preserved.
7. Choose Success, then Try Again. The same record becomes Uploaded (simulated). Counts update without duplication.
8. For interruption, begin another upload, switch to Offline while it shows Syncing, then reconnect and retry. The interrupted record remains recoverable. Reloading online during an upload also recovers it as Failed.
9. Open Fetch Pending Logs: source logs awaiting a record, unfinished records, and committed/syncing/failed records appear when online. Refresh Local Queue reads device storage only. Uploaded records remain available in Sync Queue.
10. Reopen a final record and verify inputs are locked. Create log starts the field-log capture flow; new records are created only from existing pending logs.

## Automated checks

```sh
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

If using Playwright's downloaded Chromium instead, run `npx playwright install chromium` and omit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Browser tests use native context offline emulation, actual image decoding/IndexedDB persistence, canvas drawing, deterministic failure outcomes, and responsive viewports. They do not depend on a mocked `navigator.onLine` or an application offline toggle. The spreadsheet requirement mapping is in `sprint2-test-matrix.md`.
