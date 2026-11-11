# Sprint 2 demo and verification

Run `npm ci`, then `npm run dev`. No backend or credentials are needed. Start at My logs to capture GPS/time/photo/note using the existing Sprint 1 flow, save the draft, then choose **Complete final record**. Alternatively, open Sync Queue and choose **Create New Record** for a standalone Sprint 2 record.

## Demo operational boundaries

- Load the application **before** switching Chrome DevTools → Network → Offline. Offline reload/cold-start is not supported; no service worker is installed.
- Records and signatures stay in localStorage (`fragile:v2:records`). Receipts are image blobs in IndexedDB (`fragile-images`). Clearing site data removes both. Storage is not a backup.
- The original Sprint 1 draft is preserved when creating its final record. The final record is a separate, locked snapshot with the same log ID; later edits to the original draft do not change it.
- All upload results are **simulated locally**. Online status reflects the browser's connectivity signal, not proof of server reachability. No record or receipt is sent to a server.
- Use one tab for the demo, as with Sprint 1. Concurrent editing/sync in multiple tabs is not a supported merge workflow.
- A draft can be incomplete. Entered values must be valid; final commit requires reference, positive finite weight in kg, material, contamination and a nonblank signature. Other material requires a description. Reference permits letters, numbers and hyphens. Receipt input accepts JPEG/PNG strictly below 3 MiB. Cleanup photo is optional, with explicit confirmation when absent.

## Chrome Network checklist

1. Load the app online. Complete reference, weight, material, contamination and a signature; select a receipt, review its preview, and choose Use receipt.
2. Switch DevTools → Network → Offline. Confirm the status changes immediately.
3. Edit details or retake the receipt and save a draft while offline. Submit Final Record, confirm locking, and open View Sync Queue. The record shows Pending Upload.
4. Select the log and choose Upload Log while offline. An error explains that sync requires reconnection; the saved record is unchanged.
5. Restore No throttling. The status turns online without reloading; pending records remain.
6. Choose Failure under Simulation outcome, then Upload Log. After 1.5 seconds it becomes Failed with its details preserved.
7. Choose Success, then Try Again. The same record becomes Uploaded (simulated). Counts update without duplication.
8. For interruption, begin another upload, switch to Offline while it shows Syncing, then reconnect and retry. The interrupted record remains recoverable. Reloading online during an upload also recovers it as Failed.
9. Open Fetch Pending Logs: only committed, syncing or failed records appear. Refresh Local Queue reads device storage only. Uploaded records remain available in Sync Queue.
10. Reopen a final record and verify inputs are locked. Create New Record starts a separate draft.

## Automated checks

```sh
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

If using Playwright's downloaded Chromium instead, run `npx playwright install chromium` and omit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Browser tests use native context offline emulation, actual image decoding/IndexedDB persistence, canvas drawing, deterministic failure outcomes, and responsive viewports. They do not depend on a mocked `navigator.onLine` or an application offline toggle. The spreadsheet requirement mapping is in `sprint2-test-matrix.md`.
