# Sprint 2 acceptance traceability

Source: `sprint2_test_cases.xlsm`, first worksheet. TC001–TC102 are assigned in worksheet order; worksheet row numbers are retained. Repeated spreadsheet cases are grouped into executable scenarios; **102 mapped requirements does not mean 102 separately executed tests**.

The corrected shared-log flow is verified in `tests/log-flow.spec.ts`: offline capture → My logs → Sync Queue → reconnect → Fetch Pending Logs → linked New Record, including repeated continuation and no blank standalone record creation.

Specs: `tests/sprint2.spec.ts` (browser journeys and responsive checks), `src/records.test.ts` (validation, state transitions, persistence and failed writes). Sprint 1 regression coverage remains in `tests/demo.spec.ts` and `src/model.test.ts`.

The revised guide supersedes generic API/backend tasks: all operations use local storage with an asynchronous 1.5-second upload simulation. Native offline mode blocks sync but permits local commit. Material options are bundled, so no remote list request can fail; bundled options fulfill the default-list fallback. Receipt validation is JPEG/PNG and strictly below 3 MiB. References accept letters, numbers and hyphens, matching the design example. Optional cleanup-photo confirmation is separate from receipt evidence.

The 15 design exports are implemented as consolidated responsive record, queue and pending-log views, with their validation, preview, confirmation, saved, failed and retry states. Camera hardware and OS picker permissions require a real device; browser tests use real image files and canvas decoding. Visual hierarchy is checked through screenshots and layout/control assertions, not pixel-perfect screenshot matching.

| Case | Worksheet row | Story | Spreadsheet scenario | Executable coverage (test title prefix) |
|---|---|---|---|---|
| TC001 | 2 | View Sync Queue | View Sync Queue layout renders | S2 layout 375 / 768 / 1440 |
| TC002 | 3 | View Sync Queue | View Sync Queue responsive layout | S2 layout 375 / 768 / 1440 |
| TC003 | 4 | View Sync Queue | View Sync Queue populated view | S2 layout …; S2 Chrome offline…; S2 pending fetch… |
| TC004 | 5 | View Sync Queue | View Sync Queue empty view | S2 layout …; S2 Chrome offline…; S2 pending fetch… |
| TC005 | 6 | View Sync Queue | View Sync Queue populated view | S2 layout …; S2 Chrome offline…; S2 pending fetch… |
| TC006 | 7 | View Sync Queue | View Sync Queue empty view | S2 layout …; S2 Chrome offline…; S2 pending fetch… |
| TC007 | 8 | Commit Log | Commit Log layout renders | S2 layout 375 / 768 / 1440 |
| TC008 | 9 | Commit Log | Commit Log responsive layout | S2 layout 375 / 768 / 1440 |
| TC009 | 10 | Commit Log | Commit Log main behavior | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC010 | 11 | Commit Log | Commit Log edge behavior | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC011 | 12 | Commit Log | Commit Log main behavior | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC012 | 13 | Commit Log | Commit Log edge behavior | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC013 | 14 | Commit Log | Commit Log local data integration | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC014 | 15 | Commit Log | Commit Log reload persistence | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC015 | 16 | Upload Log | Upload Log layout renders | S2 layout 375 / 768 / 1440 |
| TC016 | 17 | Upload Log | Upload Log responsive layout | S2 layout 375 / 768 / 1440 |
| TC017 | 18 | Upload Log | Upload Log accepts valid input | S2 Chrome offline…; S2 interrupt upload…; S2 pending fetch… |
| TC018 | 19 | Upload Log | Upload Log rejects invalid input | S2 Chrome offline…; S2 interrupt upload…; S2 pending fetch… |
| TC019 | 20 | Upload Log | Upload Log accepts valid input | S2 Chrome offline…; S2 interrupt upload…; S2 pending fetch… |
| TC020 | 21 | Upload Log | Upload Log rejects invalid input | S2 Chrome offline…; S2 interrupt upload…; S2 pending fetch… |
| TC021 | 22 | Upload Log | Upload Log local data integration | S2 Chrome offline…; S2 interrupt upload…; S2 pending fetch… |
| TC022 | 23 | Upload Log | Upload Log reload persistence | S2 Chrome offline…; S2 interrupt upload…; S2 pending fetch… |
| TC023 | 24 | Upload Log | Upload Log error feedback | S2 Chrome offline…; S2 interrupt upload…; S2 pending fetch… |
| TC024 | 25 | Upload Log | Upload Log retry or recovery | S2 Chrome offline…; S2 interrupt upload…; S2 pending fetch… |
| TC025 | 26 | Fetch Pending Log | Fetch Pending Log layout renders | S2 layout 375 / 768 / 1440 |
| TC026 | 27 | Fetch Pending Log | Fetch Pending Log responsive layout | S2 layout 375 / 768 / 1440 |
| TC027 | 28 | Fetch Pending Log | Fetch Pending Log populated view | S2 pending fetch…; S2 layout … |
| TC028 | 29 | Fetch Pending Log | Fetch Pending Log empty view | S2 pending fetch…; S2 layout … |
| TC029 | 30 | Fetch Pending Log | Fetch Pending Log populated view | S2 pending fetch…; S2 layout … |
| TC030 | 31 | Fetch Pending Log | Fetch Pending Log empty view | S2 pending fetch…; S2 layout … |
| TC031 | 32 | Fetch Pending Log | Fetch Pending Log local data integration | S2 pending fetch…; S2 layout … |
| TC032 | 33 | Fetch Pending Log | Fetch Pending Log reload persistence | S2 pending fetch…; S2 layout … |
| TC033 | 34 | Upload Receipt | Upload Receipt layout renders | S2 layout 375 / 768 / 1440 |
| TC034 | 35 | Upload Receipt | Upload Receipt responsive layout | S2 layout 375 / 768 / 1440 |
| TC035 | 36 | Upload Receipt | Upload Receipt accepts valid input | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC036 | 37 | Upload Receipt | Upload Receipt rejects invalid input | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC037 | 38 | Upload Receipt | Upload Receipt accepts valid input | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC038 | 39 | Upload Receipt | Upload Receipt rejects invalid input | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC039 | 40 | Upload Receipt | Upload Receipt local data integration | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC040 | 41 | Upload Receipt | Upload Receipt reload persistence | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC041 | 42 | Retake Receipt | Retake Receipt layout renders | S2 layout 375 / 768 / 1440 |
| TC042 | 43 | Retake Receipt | Retake Receipt responsive layout | S2 layout 375 / 768 / 1440 |
| TC043 | 44 | Retake Receipt | Retake Receipt update succeeds | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC044 | 45 | Retake Receipt | Retake Receipt update persists | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC045 | 46 | Retake Receipt | Receipt image captured | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC046 | 47 | Retake Receipt | Image input cancellation handled | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC047 | 48 | Retake Receipt | Receipt image captured | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC048 | 49 | Retake Receipt | Image input cancellation handled | S2 receipt IndexedDB…; S2 offline image…; S2 malformed storage… |
| TC049 | 50 | Input Reference | Input Reference layout renders | S2 layout 375 / 768 / 1440 |
| TC050 | 51 | Input Reference | Input Reference responsive layout | S2 layout 375 / 768 / 1440 |
| TC051 | 52 | Input Reference | Input Reference main behavior | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC052 | 53 | Input Reference | Input Reference edge behavior | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC053 | 54 | Input Reference | Valid Input Reference input accepted | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC054 | 55 | Input Reference | Invalid Input Reference input rejected | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC055 | 56 | Edit Reference | Edit Reference layout renders | S2 layout 375 / 768 / 1440 |
| TC056 | 57 | Edit Reference | Edit Reference responsive layout | S2 layout 375 / 768 / 1440 |
| TC057 | 58 | Edit Reference | Edit Reference update succeeds | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC058 | 59 | Edit Reference | Edit Reference update persists | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC059 | 60 | Edit Reference | Edit Reference update succeeds | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC060 | 61 | Edit Reference | Edit Reference update persists | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC061 | 62 | Capture Signature | Capture Signature layout renders | S2 layout 375 / 768 / 1440 |
| TC062 | 63 | Capture Signature | Capture Signature responsive layout | S2 layout 375 / 768 / 1440 |
| TC063 | 64 | Capture Signature | Signature interaction works | S2 details validation…; S2 offline image… |
| TC064 | 65 | Capture Signature | Signature state consistency | S2 details validation…; S2 offline image… |
| TC065 | 66 | Capture Signature | Signature interaction works | S2 details validation…; S2 offline image… |
| TC066 | 67 | Capture Signature | Signature state consistency | S2 details validation…; S2 offline image… |
| TC067 | 68 | Capture Signature | Signature interaction works | S2 details validation…; S2 offline image… |
| TC068 | 69 | Capture Signature | Signature state consistency | S2 details validation…; S2 offline image… |
| TC069 | 70 | Clear Signature | Signature interaction works | S2 details validation…; S2 offline image… |
| TC070 | 71 | Clear Signature | Signature state consistency | S2 details validation…; S2 offline image… |
| TC071 | 72 | Clear Signature | Signature interaction works | S2 details validation…; S2 offline image… |
| TC072 | 73 | Clear Signature | Signature state consistency | S2 details validation…; S2 offline image… |
| TC073 | 74 | Input Weight | Weight accepts valid number | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC074 | 75 | Input Weight | Weight handles invalid number | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC075 | 76 | Input Weight | Valid Input Weight input accepted | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC076 | 77 | Input Weight | Invalid Input Weight input rejected | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC077 | 78 | Edit Weight | Weight accepts valid number | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC078 | 79 | Edit Weight | Weight handles invalid number | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC079 | 80 | Edit Weight | Weight accepts valid number | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC080 | 81 | Edit Weight | Weight handles invalid number | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC081 | 82 | Select Material Type | Select Material Type layout renders | S2 layout 375 / 768 / 1440 |
| TC082 | 83 | Select Material Type | Select Material Type responsive layout | S2 layout 375 / 768 / 1440 |
| TC083 | 84 | Select Material Type | Select Material Type option selection | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC084 | 85 | Select Material Type | Select Material Type selection persistence | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC085 | 86 | Select Material Type | Select Material Type option selection | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC086 | 87 | Select Material Type | Select Material Type selection persistence | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC087 | 88 | Select Contamination Level | Select Contamination Level layout renders | S2 layout 375 / 768 / 1440 |
| TC088 | 89 | Select Contamination Level | Select Contamination Level responsive layout | S2 layout 375 / 768 / 1440 |
| TC089 | 90 | Select Contamination Level | Select Contamination Level option selection | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC090 | 91 | Select Contamination Level | Select Contamination Level selection persistence | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC091 | 92 | Select Contamination Level | Select Contamination Level option selection | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC092 | 93 | Select Contamination Level | Select Contamination Level selection persistence | S2 details validation…; S2 invalid form updates…; record contract (Vitest) |
| TC093 | 94 | Submit Final Record | Submit Final Record layout renders | S2 layout 375 / 768 / 1440 |
| TC094 | 95 | Submit Final Record | Submit Final Record responsive layout | S2 layout 375 / 768 / 1440 |
| TC095 | 96 | Submit Final Record | Valid Submit Final Record input accepted | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC096 | 97 | Submit Final Record | Invalid Submit Final Record input rejected | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC097 | 98 | Submit Final Record | Submit Final Record submits complete record | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC098 | 99 | Submit Final Record | Submit Final Record prevents incomplete submission | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC099 | 100 | Submit Final Record | Submit Final Record local data integration | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC100 | 101 | Submit Final Record | Submit Final Record reload persistence | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC101 | 102 | Submit Final Record | Submit Final Record error feedback | S2 details validation…; S2 submission failure…; record contract (Vitest) |
| TC102 | 103 | Submit Final Record | Submit Final Record retry or recovery | S2 details validation…; S2 submission failure…; record contract (Vitest) |
