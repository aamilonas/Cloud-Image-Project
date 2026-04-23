# Frontend Bug Report — Cloud Job Queue Dashboard

You built this React + Vite frontend in a previous session and it looks great visually. However, two related bugs are preventing the dashboard from reflecting new jobs. I need you to diagnose and fix them. **Do not rebuild the UI** — the visual design is correct. This is a state/data-flow issue.

---

## TL;DR

The dashboard is "frozen" at 20 jobs even though the backend database has 428 and is accepting new ones. When I drop a new image, the network tab shows a successful `POST /jobs` (HTTP 200, ~70 byte response), but:

1. The "Jobs Completed" card stays at 20
2. The "Recent Jobs" list stays at 20 total
3. No new row appears in the list, even after waiting 30+ seconds

I have confirmed via the browser DevTools Network tab that:
- `POST /jobs` fires and returns 200 on upload (so the upload handler works)
- `GET /jobs` polls every ~5 seconds and returns 200 (so polling works)
- `GET /metrics` polls and returns 200

I have confirmed via `aws dynamodb scan --table-name cloud-job-queue-dev-jobs --select COUNT` that DynamoDB actually contains **428 job records**. The backend is storing new jobs correctly. The frontend is not seeing them.

---

## The system context

You built a dashboard for an AWS-based image processing pipeline. The backend is AWS API Gateway → Lambda → SQS → Fargate workers. API endpoints:

- `POST /jobs` — submit an image. Request body `{ imageBase64, filename, operations? }`. Returns `{ jobId, status: "pending" }` with HTTP 202.
- `GET /jobs/{jobId}` — single job lookup. Returns the full job record including `outputUrls` (presigned S3 URLs) if completed.
- `GET /jobs` — list jobs. Returns `{ jobs: [...], count: N }`. **IMPORTANT: See "Backend quirk" below.** The list endpoint currently returns at most 20 items and it always returns the same 20 items regardless of how many are in the database. This is a known backend limitation and **you should not wait for a fix — work around it from the frontend instead** (see "Workaround" below).
- `GET /metrics` — returns `{ queueDepth, dlqDepth, activeWorkers, pendingWorkers, desiredWorkers, timestamp }`.

API base URL is in `.env` as `VITE_API_URL=https://y7ufr68fmk.execute-api.us-east-1.amazonaws.com`.

---

## Backend quirk you need to know about

The `/jobs` list endpoint on the backend has a bug: it uses DynamoDB's `Scan` operation with a `Limit` parameter, but DynamoDB's scan does **not** return items in creation order — it returns them in partition hash order. So with 428 items in the table, `Scan(Limit=20)` returns an arbitrary 20 items from different partitions, NOT the 20 most recent.

The result: every call to `GET /jobs` returns the SAME 20 old items (the ones that happen to live in the first partitions scanned). New jobs created today are in other partitions and will never appear in the list response until the backend is fixed.

**Do not try to fix the backend.** That's a separate task. Your job is to work around it from the frontend so the dashboard still reflects new uploads correctly.

---

## Workaround strategy

Instead of (or in addition to) relying on `GET /jobs` to surface new uploads, the frontend should maintain its own local state of "jobs the user submitted in this session" and merge them with whatever `GET /jobs` returns. The merge logic should:

1. **After a successful upload**, immediately add the new job to local state with `status: "pending"` using the `jobId` returned from `POST /jobs`.
2. **After a successful load test**, add all `count` jobIds returned from the load test to local state.
3. **On each poll of `GET /jobs`**, merge the API response with the local session jobs (dedupe by `jobId`, prefer the version with the more recent `status`).
4. **For jobs in local state that aren't in the API list response**, poll `GET /jobs/{jobId}` individually to get their current status. This endpoint works correctly — single-job lookup uses DynamoDB `GetItem` which is direct, not a scan.
5. Sort the merged list by `createdAt` descending before rendering.

This means the user experience is:
- Upload an image → instantly see a pending row → it goes to processing → it goes to completed
- Run a load test → instantly see N pending rows → they process

All of this works even though `GET /jobs` is broken, because the frontend tracks its own submissions and polls each one individually via `GET /jobs/{jobId}`.

---

## Specific bugs to find and fix

### Bug 1: Upload handler doesn't add the new job to local state

The `POST /jobs` fetch is firing successfully (HTTP 200, response body contains `{ jobId, status: "pending" }`). But the jobId is being discarded or not being added to the component state that drives the "Recent Jobs" list.

**Where to look:** your upload handler component (probably something like `UploadZone.tsx` or `UploadForm.tsx`). Find the fetch call to `${VITE_API_URL}/jobs`. After `const { jobId } = await response.json()`, there should be a call to something like `addLocalJob({ jobId, status: 'pending', createdAt: new Date().toISOString(), originalFilename: file.name })`.

If there's no such call, add one. If the state setter exists but it's a local `useState` inside the upload component, lift it to the parent dashboard component or a context/store so the Recent Jobs list can read it.

### Bug 2: Recent Jobs list doesn't merge local state with API response

The Recent Jobs list is almost certainly reading ONLY from the `GET /jobs` API response. Since that response always returns the same 20 items, the list never updates.

**Where to look:** the component that renders the "Recent Jobs" table (maybe `JobList.tsx` or `RecentJobs.tsx`). Find where it maps over an array to render rows. That array should be a merged view of:
- Jobs from `GET /jobs` polling
- Jobs from local session state (uploads + load tests)

Deduplicate by `jobId`. When the same jobId appears in both sources, prefer the version with the more "advanced" status, in this order: `failed` > `completed` > `processing` > `pending`.

### Bug 3: No per-job status polling

Once a job is in local state with status `pending`, the frontend needs to poll `GET /jobs/{jobId}` to see when it transitions. Otherwise it'll stay "pending" forever in the UI even after it's actually completed in the backend.

**Suggested approach:** in the same polling effect that hits `GET /jobs` and `GET /metrics`, also iterate through any local jobs with status `pending` or `processing` and call `GET /jobs/{jobId}` for each. Update local state with the response. Once a job is `completed` or `failed` for more than one poll cycle, stop polling it (cache the result).

To avoid hammering the API, cap concurrent in-flight status polls at ~5 and skip jobs that have been in terminal state (`completed`/`failed`) for more than a few seconds.

### Bug 4 (likely but not confirmed): "Jobs Completed" counter source

The "Jobs Completed" metric card shows 20, which matches the stuck list. If this counter is derived from the same `GET /jobs` response (`jobs.filter(j => j.status === 'completed').length`), it will also be stuck.

Fix: drive this counter from the merged list (API + local state), not raw API response.

Alternative: this counter could be computed from DynamoDB directly via the metrics endpoint, but the metrics endpoint currently doesn't return a job count — it returns queue/worker metrics. Don't add a new backend call; just use the merged list.

---

## What NOT to change

- **Don't touch the visual design.** The UI looks great. Cards, chart, dropzone, load test buttons, filter tabs — all perfect.
- **Don't change the `.env` setup or API URL.** It's correct.
- **Don't add new dependencies** unless absolutely necessary (e.g. a state management lib). Prefer plain React hooks + context. The app is small enough that a `useReducer` or a simple Zustand store is enough if you want one.
- **Don't call the backend more aggressively than every ~3 seconds per endpoint.** We don't want to thrash API Gateway. Aim for:
  - `GET /metrics` every 3 sec
  - `GET /jobs` every 5 sec (still useful for seeing jobs from OTHER clients or catching updates)
  - `GET /jobs/{jobId}` for local pending/processing jobs: every 3 sec, max 5 in flight
- **Don't reset the local session state on re-render or navigation.** If it's in `useState` inside a component that gets unmounted, lift it up.

---

## How to verify the fix

After you apply the fix, I should be able to:

1. **Refresh the page.** The "Recent Jobs" list will initially show the same 20 old items from the API (that's still broken on the backend side — expected). But the "Jobs Completed" count and list should still function for new uploads.

2. **Drop a new image onto the upload zone.** Within 1 second, a new row should appear at the TOP of the Recent Jobs list with status `pending`. Jobs Completed counter stays the same for now.

3. **Wait 3-10 seconds.** The row should transition to `processing`, then `completed`. When it completes:
   - Jobs Completed counter increments (e.g. 20 → 21)
   - Duration field shows the processing time (e.g. "412 ms")
   - Clicking the eye icon on the row should load the presigned URLs from `GET /jobs/{jobId}` and show the 5 processed variants

4. **Click the "25 jobs" load test button.** Within 10 seconds, 25 new rows appear at the top of the list, all starting as `pending`. Over the next 1-3 minutes they all transition to `completed` as the workers chew through them. Jobs Completed counter climbs from 20 → 45.

5. **Filter tabs work.** Clicking "Active" shows only pending/processing jobs. Clicking "Completed" shows only completed. "All" shows everything.

If all 5 work, you're done. The stuck-at-20 from the backend will still be visible as a "baseline" of old jobs in the list, but new activity will be accurately reflected on top of it.

---

## Debug artifacts I can provide if you need them

If you want me to paste raw data to help diagnose:

- **`GET /jobs` response** — I can paste the JSON showing "count: 20"
- **DynamoDB scan count** — `{"Count": 428, "ScannedCount": 428}` confirming the table has 428 rows
- **`POST /jobs` response** — returns `{ jobId, status }` correctly
- **Network tab screenshot** — showing polls firing and all returning 200
- **React component tree** — if you need it, I can share the file structure

Just ask for whatever you need.

---

## One more thing

There's a small chance the bug is simpler than I think: the state setter that adds the new job might just be pointing at the wrong state slice, or there's a stale closure in a `useEffect` dependency array that's preventing re-renders. Check the simple cases first before rearchitecting. Specifically:

- Does the upload component use `setState([...prev, newJob])` or `setState([newJob])`? The second would wipe existing state.
- Is the polling `useEffect` dependency array `[]`? If so, it captures initial state and never sees updates. Should be `[someCallback]` with a `useCallback` wrapper, or use a ref.
- Is there a `key` prop issue on the mapped list that prevents React from re-rendering new rows?

If any of those are the actual bug, the fix is one line and the whole session workaround may still be worth building anyway for a better UX on new uploads.

Good luck. Reply with a summary of what you found and what you changed.