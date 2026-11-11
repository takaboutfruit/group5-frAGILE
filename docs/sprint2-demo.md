# Sprint 2 flow and Chrome verification

Run `npm ci`, then `npm run dev`. The workflow is:

**Offline → Create log → complete details → Save draft in My logs → Commit Logs in My logs → select saved logs → Confirm Commit → Sync Queue → reconnect → Upload Log → empty queue after successful uploads → Records page → Fetch Logs → New Record from an uploaded log → Submit Final Record.**

## Distinct stages

- Saving a log does not enqueue it. Unselected logs remain editable drafts in My logs.
- **Commit Logs is on My logs.** Its dialog lets you select one or more saved logs. Confirm commits the selection as snapshots, locks those field logs, and navigates to Sync Queue. Cancel leaves all logs unchanged.
- Sync Queue contains only committed, uploading or failed logs. Uploaded logs disappear from the queue; failures stay available for retry. Upload Log processes the committed queue in one action. Failures remain for retry.
- **Records is a separate page.** On the first visit, press **Fetch Logs** while online to show successfully uploaded logs. The app remembers this choice across navigation and reload, automatically showing current local uploaded logs and final-record progress thereafter. It does not show saved-only, committed-only or failed logs.
- New Record carries over the uploaded log's ID, GPS, timestamp, photo and note. Record drafts resume with Continue Record. Final submission saves and locks the completed record without adding anything back to Sync Queue.
- Log transfer state (`fragile:v2:log-transfers`) is separate from final record state (`fragile:v2:records`). Receipts are blobs in IndexedDB (`fragile-images`); object URLs are temporary display resources.

## Chrome Network demo checklist

1. Load the app, then switch DevTools → Network → **Offline**. Create and save two logs with GPS, captured date/time and a cleanup photo. Notes are optional. Incomplete drafts can be saved but cannot be selected for commit; the commit dialog explains missing fields. Check both appear in My logs and neither appears in Sync Queue.
2. Return to My logs. Press **Commit Logs**, select just one log and press **Cancel**. Verify the queue is unchanged.
3. Press Commit Logs again, select one log, then **Confirm Commit**. Verify navigation to Sync Queue, one Pending Upload entry, and the unselected log still editable in My logs.
4. Press **Upload Log** while offline. Verify a reconnect error and no data loss.
5. Restore **No throttling**. Choose Failure under Simulation outcome, then Upload Log. Verify Failed remains in the queue. Choose Success and **Try Again**. Verify the log leaves the queue and the empty state appears.
6. Open **Records**. On your first visit, press **Fetch Logs** to load uploaded logs. Navigate away and back, then reload: the logs remain available without another fetch. Verify subsequent uploads appear automatically and final-record status updates after saving.
7. Choose **New Record** on an uploaded log. Verify the original details carry over. Add reference, receipt, weight, material, contamination and signature. Save a draft and verify Continue Record restores it.
8. Press **Submit Final Record**, confirm, and verify the final record is locked. Return to Sync Queue and verify final submission did not enqueue the record.
9. For interruption recovery, start uploading another committed log and switch Offline during Syncing. Verify Failed remains and retry works after reconnecting. Reloading online during an upload also recovers it as Failed.
10. The initial fetch while offline must show a reconnect error. Previously fetched local logs remain readable offline. Uncommitted/failed logs cannot be used to create new records, including by navigating directly to a record URL.

## Demo operational boundaries

- Load before turning the network off. Offline reload/cold-start is not supported; no service worker is installed.
- Upload and fetch are **local simulations**, not server transfers. Browser online status is a connectivity signal, not proof of server reachability. No log, record or receipt leaves the device.
- Clearing site data deletes local logs, transfers, records and receipts. There is no backup.
- Use one tab for the demo; concurrent editing is not a merge workflow.
- A record requires reference, positive finite weight in kg, material, contamination and a nonblank signature. Other material requires a description. Reference allows letters, numbers and hyphens. Receipt input accepts JPEG/PNG strictly below 3 MiB. Cleanup photo is optional, with confirmation when absent.
- Existing final records from earlier versions remain readable. Old `/pending` and `/records/new` links redirect to Uploaded Logs; neither creates a blank record.

## Automated checks

```sh
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Browser tests use native offline emulation, real image decoding and IndexedDB persistence, canvas drawing, deterministic upload failures, and responsive viewports. See `sprint2-test-matrix.md` for the 102 spreadsheet requirements mapped to grouped executable tests.

## Interface checks

- One sticky header provides My logs → Sync queue → Records. Per-page navigation strips and the manual queue refresh button are removed. New page navigation starts at the top; unsaved-change confirmations remain in place.
- My logs is the editable field-log gallery. Sync queue is a compact transfer-status list, with automatic updates and recovery. Records shows uploaded logs and record progress.
- Primary buttons use white text on dark teal. Success/error notifications appear in a fixed notification stack; errors inside dialogs stay beside the confirmation actions.
