# Cloud Job Queue — Frontend Build Spec

**For:** Claude Code **Project:** FAU Cloud Computing final project — Intelligent Job Queue with Auto-Scaling Workers **Goal:** Build a premium, production-grade React dashboard that serves as the live demo UI for a classroom presentation. This is the face of the project. It must look and feel like a real SaaS product — think Stripe Dashboard, Retool, Linear. Not a student project.

---

## 1. Context you need

This frontend is the presentation layer for a serverless image-processing pipeline already deployed on AWS. The backend is done and working. You are only building the React app.

**Pipeline (already built):**

1. User uploads an image → API Gateway → Lambda → S3 (source bucket) + SQS (job queue)
2. SQS queue depth triggers CloudWatch alarm → ECS Application Auto Scaling scales Fargate workers from 0 → up to 4
3. Fargate workers poll SQS, pull image from S3, run 5 Pillow transformations (thumbnail, medium, grayscale, blur, edges), write results back to S3, update job status in DynamoDB
4. User polls `GET /jobs/{id}` or `GET /jobs` for status, gets back presigned URLs for all 5 processed variants
5. Auto-scaling drops back to 0 workers after 5 minutes of empty queue

**The star of the demo is auto-scaling.** The dashboard needs to make the 0 → 4 → 0 worker arc _viscerally obvious_ when a load test runs. That's the moment the audience needs to feel.

---

## 2. API — exact endpoints to hit

**Base URL (hardcode as env var `VITE_API_URL`, default to this):**

```
https://y7ufr68fmk.execute-api.us-east-1.amazonaws.com
```

### `POST /jobs`

Submits a new job. Request body:

```json
{
  "filename": "cat.png",
  "contentType": "image/png",
  "imageBase64": "<base64-encoded image bytes, no data: prefix>"
}
```

Response:

```json
{
  "jobId": "uuid-here",
  "status": "queued",
  "createdAt": "2026-04-14T14:04:40Z"
}
```

### `GET /jobs/{jobId}`

Returns a single job. Response shape:

```json
{
  "jobId": "uuid",
  "status": "queued" | "processing" | "completed" | "failed",
  "filename": "cat.png",
  "createdAt": "ISO timestamp",
  "startedAt": "ISO timestamp or null",
  "completedAt": "ISO timestamp or null",
  "durationMs": 1280,
  "variants": {
    "thumbnail": "https://presigned-url...",
    "medium": "https://presigned-url...",
    "grayscale": "https://presigned-url...",
    "blur": "https://presigned-url...",
    "edges": "https://presigned-url..."
  },
  "originalUrl": "https://presigned-url..."
}
```

### `GET /jobs`

Returns recent jobs (array of the above shape, newest first, ~50 items). Use this for the job list / history.

### `GET /metrics`

Returns live system metrics:

```json
{
  "queueDepth": 42,
  "messagesInFlight": 8,
  "runningWorkers": 4,
  "desiredWorkers": 4,
  "jobsCompleted": 127,
  "jobsFailed": 0,
  "avgDurationMs": 1342,
  "timestamp": "ISO"
}
```

**CORS is already configured.** No auth. No API keys. Just fetch.

**⚠️ Important:** The exact response shapes above are the _expected_ shapes based on the backend spec — if any field is missing or named differently in practice, handle gracefully (optional chaining, fallbacks) rather than crashing. The first thing to do after scaffolding is hit each endpoint once and verify the shapes match.

---

## 3. Visual direction — non-negotiable

**Aesthetic:** Stripe Dashboard meets Retool meets Linear. Light theme, data-dense, impeccably typed, quietly premium. No gradients-on-everything, no emoji, no playful illustrations. This should look like something that costs $99/month per seat.

### Design tokens

**Color palette (light theme, Stripe-inspired):**

- Background: `#FAFBFC` (app bg), `#FFFFFF` (cards)
- Borders: `#E5E7EB` (subtle), `#D1D5DB` (stronger)
- Text: `#0A2540` (primary — deep navy, Stripe's signature), `#425466` (secondary), `#8792A2` (tertiary/muted)
- Accent: `#635BFF` (Stripe purple — use sparingly, for primary actions and active states)
- Semantic:
    - Success: `#00875A` bg `#E3FCEF`
    - Warning: `#974F0C` bg `#FFF7E6`
    - Danger: `#DE350B` bg `#FFEBE6`
    - Info: `#0055CC` bg `#DEEBFF`
- Status chip colors (for job status):
    - `queued`: slate — `#64748B` on `#F1F5F9`
    - `processing`: blue — `#0055CC` on `#DEEBFF` (with subtle pulse animation)
    - `completed`: green — `#00875A` on `#E3FCEF`
    - `failed`: red — `#DE350B` on `#FFEBE6`

**Typography:**

- Font: **Inter** (via Google Fonts or `@fontsource/inter`). Fallback: system UI stack.
- Monospace: **JetBrains Mono** for IDs, timestamps, numeric metrics. Fallback: `ui-monospace`.
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48
- Weights: 400 (body), 500 (labels), 600 (headings), 700 (hero numbers)
- Tracking: tight on large numbers (`-0.02em`), normal on body
- Tabular numbers (`font-variant-numeric: tabular-nums`) on ALL metric displays so they don't jitter on update

**Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Be generous. White space is premium.

**Radii:** 6px (inputs/chips), 8px (buttons), 12px (cards), 16px (modals)

**Shadows:** Subtle only. No drop shadows on everything.

- `sm`: `0 1px 2px rgba(16, 24, 40, 0.04)`
- `md`: `0 4px 12px rgba(16, 24, 40, 0.06)`
- `lg`: `0 12px 32px rgba(16, 24, 40, 0.08)` (modals only)

**Borders over shadows.** Cards get a 1px border AND a tiny shadow. That's the Stripe trick.

**Motion:**

- Transitions: 150ms for hover/focus, 300ms for layout changes, 500ms for metric number animations
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) — snappy and premium
- Number changes animate (tween from old → new value, don't just flip)
- Status chip transitions: fade + tiny scale pop (0.95 → 1)
- Live data points slide in from right on charts, never re-render the whole chart

### Anti-patterns — DO NOT do any of these

- ❌ Dark mode (not for this build — light only, one less thing to get wrong)
- ❌ Glassmorphism, neon, gradients on cards
- ❌ Emoji in UI (use lucide-react icons)
- ❌ Round avatar-style everything
- ❌ Bouncy / rubber-band animations
- ❌ Large hero illustrations
- ❌ Toast spam (one toast per action, max)
- ❌ Generic Bootstrap-y spacing
- ❌ `console.log` left in shipped code

---

## 4. Tech stack — use exactly this

- **Vite** + **React 18** + **TypeScript** (strict mode)
- **Tailwind CSS** v3 (configured with the color tokens above)
- **shadcn/ui** — install: `button`, `card`, `badge`, `dialog`, `dropdown-menu`, `tabs`, `table`, `tooltip`, `progress`, `skeleton`, `separator`, `sonner` (toasts), `scroll-area`
- **lucide-react** for icons
- **Recharts** for the metrics charts (area chart + bar chart)
- **@tanstack/react-query** for all API data fetching, polling, and cache management. Non-negotiable — hand-rolling `useEffect` polling will get messy fast.
- **react-dropzone** for the upload dropzone
- **clsx** + **tailwind-merge** (via shadcn's `cn` util)
- **date-fns** for relative timestamps ("2s ago")
- **Inter** + **JetBrains Mono** via `@fontsource/inter` and `@fontsource/jetbrains-mono`

**No state management library.** React Query handles server state; `useState` / `useReducer` for UI state. Don't add Zustand or Redux.

**No React Router** unless the layout genuinely needs multiple pages. Default: single-page dashboard.

---

## 5. Layout — the single-page dashboard

One page. No routing. A persistent topbar and a main content area with four primary zones. Think Stripe's dashboard home.

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Cloud Job Queue        [status: ● Live]     [Settings]  │  ← topbar, 64px
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─── KPI row (4 stat cards) ──────────────────────────────┐   │
│  │  Queue    │  Workers    │  Completed  │  Avg Duration │   │
│  │   42      │   4 / 5     │    127      │   1,342 ms    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Live metrics chart ──────────────────────────────────┐   │
│  │  [Queue Depth ▼]  [1m] [5m] [15m]                       │   │
│  │                                                         │   │
│  │           area chart — queue depth vs running workers   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Upload zone ─────────┐  ┌─── Load test panel ───────┐   │
│  │                         │  │                           │   │
│  │   Drop images here      │  │  Simulate production load │   │
│  │   or click to browse    │  │                           │   │
│  │                         │  │   [ 25 ] [ 50 ] [ 200 ]   │   │
│  │   (batch supported)     │  │                           │   │
│  └─────────────────────────┘  └───────────────────────────┘   │
│                                                                 │
│  ┌─── Jobs table ──────────────────────────────────────────┐   │
│  │  Filename    Status        Duration    Created   [view] │   │
│  │  cat.png     ● processing  —           2s ago    [ → ]  │   │
│  │  dog.png     ● completed   1.28s       5s ago    [ → ]  │   │
│  │  ...                                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Max width: `1400px`, centered. Generous 48px top/bottom, 32px side padding. On screens < 1024px, collapse to a single column but this is a demo — optimize for 1920×1080 projection first.

---

## 6. Component spec — build these

### 6.1 `<TopBar />`

- 64px tall, white bg, 1px bottom border
- Left: logo lockup — a simple lucide icon (`Boxes` or `Layers`) in Stripe purple `#635BFF` inside a 32px rounded-lg tile, next to the wordmark "Cloud Job Queue" (Inter 600, 16px)
- Right: a pulsing live indicator (green dot, "Live" label, last-update-timestamp in mono), plus a `Settings` dropdown (endpoints, clear local state)
- Live indicator logic: if `/metrics` last fetched < 10s ago → green "Live", 10-30s → amber "Delayed", > 30s → red "Disconnected"

### 6.2 `<KpiCard />`

Four stat cards in a responsive grid (`grid-cols-4` on desktop, `grid-cols-2` on tablet). Each card:

- 1px border, 12px radius, white bg, 24px padding, subtle `sm` shadow
- Label row: small uppercase (11px, 500 weight, tracking-wide, `#8792A2`) + a tiny lucide icon on the right in the same muted color
- Big number: 32px, 700 weight, tabular-nums, `#0A2540`, tightly tracked
- Delta row: small text (12px) with an up/down arrow and color — green for good deltas, red for bad. Example: "↑ 12 from 1m ago"
- **Animate number changes**: tween over 500ms using `requestAnimationFrame`. Do NOT just snap. Write a small `useCountUp` hook.
- Hover: border darkens to `#D1D5DB`, cursor stays default

The four cards:

1. **Queue Depth** — `queueDepth` (+ `messagesInFlight` as secondary line). Icon: `Inbox`
2. **Workers** — `runningWorkers` / `desiredWorkers` (format: "4 / 5"). Below: tiny colored dots showing each running worker. Icon: `Server`
3. **Jobs Completed** — `jobsCompleted` cumulative. Delta vs 1min ago. Icon: `CheckCircle2`
4. **Avg Duration** — `avgDurationMs` formatted as "1,342 ms". Icon: `Timer`

### 6.3 `<LiveMetricsChart />`

- Card with header: title + time range tabs (1m / 5m / 15m, 15m is default for demos) + a dropdown to pick metric
- Recharts **ComposedChart**: area for queue depth (Stripe purple `#635BFF` with 0.15 opacity fill), line for running workers (green `#00875A`, 2px stroke, no fill, right Y axis)
- **Dual Y axis** — queue depth (left), worker count (right, 0-5 range). This makes the correlation visible and it's the single most important visual in the demo.
- X axis: time, hide tick labels but show gridlines every 30s
- Smooth curve (`type="monotone"`)
- No chart legend — label inline via the header
- 280px tall
- Keep a local rolling buffer of the last 15 minutes of `/metrics` responses in a ref; append on each poll; slice based on selected range
- Empty state (first few seconds): skeleton with "Collecting data..."
- On worker scale events (runningWorkers changes), drop a subtle vertical reference line at that timestamp with a tiny label ("0 → 4")

### 6.4 `<UploadZone />`

- react-dropzone, accept `image/png, image/jpeg, image/webp`, multi-file
- Visual: dashed 2px border `#D1D5DB`, 12px radius, 180px tall, centered content
- Icon: `UploadCloud` (32px, muted)
- Copy: "Drop images to process" / smaller: "PNG, JPG, WEBP — up to 10MB each — batch supported"
- Drag-active state: border → Stripe purple solid, bg → `#635BFF08` (very faint purple tint), icon → purple, copy changes to "Release to upload"
- On drop: immediately show each file as a small chip with filename + spinner while uploading
- Upload flow: convert to base64 → POST /jobs → on success, optimistically insert into jobs table with `queued` status → invalidate React Query jobs cache
- Toast on failure only (success is visible in the table)
- Disabled state while any upload in flight? No — allow queuing, just show a small counter ("uploading 3...")

### 6.5 `<LoadTestPanel />`

- Card, same dimensions as upload zone, side by side
- Title: "Load test" — subtitle: "Simulate a burst of jobs to demonstrate auto-scaling"
- Three big buttons: **25**, **50**, **200**. Each is a shadcn Button, `variant="outline"`, `h-20`, large number on top, "jobs" label below
- Highlight **200** with a subtle "Recommended for demo" tag (tiny chip above the button)
- Requires a "template image" — either use a bundled sample image in `public/sample.jpg` OR use the most recently uploaded image. Check for the sample first, fall back gracefully with a tooltip if neither is available.
- On click:
    - Show a confirmation dialog: "Submit N jobs? This will trigger auto-scaling." with [Cancel] [Submit]
    - Submit jobs in parallel with a 100ms stagger (critical — the backend has documented Lambda cold-start issues without this)
    - Show an inline progress bar on the panel: "Submitted 47 / 200"
    - When complete, toast: "200 jobs submitted — watch the workers scale up"
- After submission, the chart is the show — make sure the panel doesn't steal focus

### 6.6 `<JobsTable />`

- shadcn Table inside a Card
- Header: "Recent Jobs" + a muted count on the right ("127 total") + a small filter dropdown (All / Active / Completed / Failed)
- Columns: Thumbnail (32px square of the thumbnail variant if available, else a skeleton), Filename (truncate, mono-ish), Status (chip), Duration (mono, "—" if not done), Created (relative "2s ago" via date-fns, tooltip with absolute time), Action ("View" button → opens detail dialog)
- Row hover: bg `#F7FAFC`
- Virtualize if >100 rows (use `@tanstack/react-virtual`) — optional, only add if scroll perf is bad
- Polls `GET /jobs` every 3 seconds via React Query `refetchInterval` — but pause polling when the detail dialog is open on a specific job (use `GET /jobs/{id}` there instead, every 1 second)
- Status chip pulse: `processing` chip has a subtle animated pulse dot (keyframe: opacity 0.4 → 1, 1.5s infinite)
- Empty state: illustration-free — just centered muted text "No jobs yet. Upload an image or run a load test to get started."

### 6.7 `<JobDetailDialog />`

- shadcn Dialog, large (max-w-4xl)
- Header: filename (mono) + status chip + a copy-id button (lucide `Copy`, copies the jobId to clipboard, toast "Copied")
- Metadata grid (2 cols, mono values): Job ID, Created, Started, Completed, Duration
- Variants gallery: 6-column grid (original + 5 variants). Each tile:
    - Square aspect (`aspect-square`), rounded-lg, border, `object-cover`
    - Label below: "Original" / "Thumbnail" / "Medium" / "Grayscale" / "Blur" / "Edges"
    - Hover: show a "Download" and "Open" button overlay (lucide `Download` and `ExternalLink`)
- If status is `processing`, show a skeleton grid with a "Processing..." overlay and auto-refresh every 1s
- If status is `failed`, show an error card with any error message and a "Retry" button (re-submit the original)

### 6.8 `<StatusChip />`

Shared component. Props: `status`, `size?`. Maps status → color + icon + label per the design tokens. Processing variant has the pulse animation.

---

## 7. Data layer — React Query setup

Wire up a `QueryClient` at the root with:

- `staleTime: 0` for metrics (always refetch on interval)
- `refetchInterval: 2000` for the `/metrics` query
- `refetchInterval: 3000` for the `/jobs` list query
- `refetchInterval: 1000` for the single-job detail query (only when dialog is open)
- `refetchIntervalInBackground: true` so polling continues even if the tab loses focus briefly
- Pause polling if the browser tab is hidden for > 30s (use `document.visibilityState`)

Create a tiny `src/lib/api.ts` module exporting typed functions: `submitJob`, `getJob`, `listJobs`, `getMetrics`. All return typed responses (define types in `src/types/api.ts`).

Handle errors quietly:

- Network errors → show a small banner at the top: "Connection lost — retrying..." (use the live indicator in the topbar)
- 4xx errors on submit → toast with the error message
- Do not show error toasts for background polling — that's what the live indicator is for

---

## 8. The demo moment — auto-scaling visualization

Re-emphasizing because this is the point of the whole project:

When the user clicks the "200 jobs" button, the audience should be able to watch:

1. Queue depth shoots up from 0 → ~200 (instant)
2. After ~60 seconds, workers scale from 0 → 4 (the chart shows the line jumping up)
3. Queue depth drains rapidly over ~30-60 seconds
4. Workers hold at 4 for a bit
5. ~5 minutes later, workers drop back to 0

The chart needs to make steps 2 and 5 _unmissable_. Implementation specifics:

- When `runningWorkers` changes, flash a brief highlight on the Workers KPI card (border pulses Stripe purple for 1s)
- When `runningWorkers` changes, drop a vertical reference line on the chart at that x-coordinate with a small label
- Consider a small toast: "Workers scaled: 0 → 4" — but only if it doesn't feel noisy

These little touches are what separate "student project" from "premium SaaS."

---

## 9. Project structure

```
frontend/
├── public/
│   └── sample.jpg              # bundled test image for load test
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── TopBar.tsx
│   │   ├── KpiCard.tsx
│   │   ├── KpiRow.tsx
│   │   ├── LiveMetricsChart.tsx
│   │   ├── UploadZone.tsx
│   │   ├── LoadTestPanel.tsx
│   │   ├── JobsTable.tsx
│   │   ├── JobDetailDialog.tsx
│   │   └── StatusChip.tsx
│   ├── hooks/
│   │   ├── useMetrics.ts       # React Query wrapper for /metrics
│   │   ├── useJobs.ts          # React Query wrapper for /jobs
│   │   ├── useJob.ts           # single-job polling
│   │   ├── useCountUp.ts       # animated number transitions
│   │   └── useMetricsBuffer.ts # rolling in-memory history for the chart
│   ├── lib/
│   │   ├── api.ts              # typed fetch wrappers
│   │   ├── format.ts           # number/duration/time formatters
│   │   └── utils.ts            # shadcn `cn` util
│   ├── types/
│   │   └── api.ts              # all API response types
│   ├── App.tsx                 # single-page layout
│   ├── main.tsx
│   └── index.css               # Tailwind + font imports + CSS vars
├── .env.example                # VITE_API_URL=...
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 10. Formatting helpers (put in `lib/format.ts`)

- `formatNumber(n)` → "1,342" (Intl.NumberFormat, en-US)
- `formatDuration(ms)` → "1,342 ms" under 10s, "12.4 s" under 60s, "2m 14s" beyond
- `formatRelativeTime(iso)` → "2s ago", "4m ago" via date-fns `formatDistanceToNowStrict`
- `formatBytes(n)` → "1.2 MB"
- `truncateMiddle(str, n)` → for job IDs: "abc123…def789"

All metric displays use `tabular-nums`. All displayed numbers go through a formatter — never raw `.toString()`.

---

## 11. Sanity checks before declaring done

- [ ] `npm run dev` starts without warnings
- [ ] TypeScript strict mode, zero errors
- [ ] Uploading an image from `public/sample.jpg` actually submits and appears in the table
- [ ] Metrics poll visibly ticks every 2 seconds — the "Live" indicator updates
- [ ] Numbers in KPI cards animate smoothly on change, don't jitter
- [ ] Chart updates without flickering or re-drawing the whole thing
- [ ] Load test dialog → submits 25 jobs → queue depth rises in the KPI and chart within 2-3 seconds
- [ ] Jobs table filter works for all four statuses
- [ ] Job detail dialog renders all 6 variants (original + 5) when a job completes
- [ ] Looks good at 1920×1080 (primary demo resolution) AND 1440×900
- [ ] Page passes a visual sniff test: would you believe this was a Stripe product? If not, tune spacing, borders, typography until yes.

---

## 12. Deployment — keep it simple

After the build works locally:

- `npm run build` → static assets in `dist/`
- Upload `dist/` to a new S3 bucket with static website hosting
- The backend Terraform already provisions an images bucket; create a _separate_ bucket for the frontend (don't reuse)
- No CloudFront, no custom domain. A raw S3 website URL is fine for the demo.
- Document the deploy as a single `scripts/deploy.sh` (or `.ps1` since Angelo is on Windows) that builds + syncs to S3

Do NOT add the deploy step to Terraform — it's out of scope. Just a script.

---

## 13. Out of scope — do not build any of this

- Authentication / login
- User accounts
- Any backend / serverless changes
- Dark mode
- Mobile-optimized layout (responsive down to tablet is fine; phone is not a target)
- i18n / translations
- Tests (unit or e2e) — this is a demo, not production
- Storybook
- CI/CD
- Analytics

---

## 14. One-shot build instructions for Claude Code

1. Scaffold with `npm create vite@latest frontend -- --template react-ts`
2. Install all dependencies listed in section 4 in a single command
3. Initialize Tailwind + shadcn (`npx shadcn@latest init` with defaults, then add the listed components)
4. Set up the color tokens in `tailwind.config.ts` and the CSS variables in `index.css`
5. Write `lib/api.ts` and `types/api.ts` first — the type system is the contract
6. Smoke test each API endpoint from a throwaway script or the browser console before wiring up components — confirm response shapes match section 2
7. Build components in this order: `TopBar` → `KpiCard` + `KpiRow` → `JobsTable` → `UploadZone` → `LoadTestPanel` → `LiveMetricsChart` → `JobDetailDialog`. The chart last because it's the most complex and depends on the metrics hook being solid.
8. Assemble `App.tsx` with the layout from section 5
9. Run the sanity checklist in section 11
10. Commit in logical chunks, not one giant commit

**If anything in this spec conflicts with reality once you hit the API, reality wins — adapt and note the deviation in a comment. Do not silently paper over it.**

---

**End of spec. Build something Angelo can put in front of a classroom and have them assume it's a real product.**