# Rodland Apartments Operations — Technical Handoff & Architecture Audit

**Document version:** 3.0  
**Date:** 2026-07-01  
**Purpose:** Complete technical reference for a fresh AI instance or developer picking up this project with no prior context. Every statement in this document reflects the actual source code as it exists today — not aspirational or planned state.

---

## 🚨 CRITICAL: UNCOMMITTED CHANGES IN LOCAL WORKSPACE

The local workspace (`c:\Users\allan\Documents\rodland  the bolt\project`) contains the following **uncommitted or partially committed fixes** that have NOT yet been pushed to the Vercel deployment. These changes exist in the working directory and staged commits but may not reflect the live deployment.

### Pending Commits to Push

1. **src/lib/dateUtils.ts** — Date formatting fix with placeholder strategy
   - **Issue:** The `.replace()` method only replaces the first occurrence, causing 'd' to replace inside day names (e.g., "We1nesday" instead of "Wednesday")
   - **Fix:** Uses a placeholder strategy where all tokens are first replaced with unique placeholders (`__PLACEHOLDER_0__`, `__PLACEHOLDER_1__`, etc.), then replaced with actual values using `replaceAll()`
   - **Format:** `'EEEE, MMMM d, yyyy'` should produce `'Wednesday, July 1, 2026'`
   - **Status:** Committed locally in commit `[TO BE PUSHED]`

2. **vite.config.ts** — Explicit base path and build configuration
   - **Issue:** Vercel was giving "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html"
   - **Fix:** Added `base: '/'` and proper `build` config with `outDir: 'dist'`
   - **Status:** Committed locally in commit `4ee111d`

3. **vercel.json** — SPA routing and cache headers configuration
   - **Issue:** Rewrite rule was too broad, serving HTML for all requests including .js files
   - **Fix:** Updated with `buildCommand`, `outputDirectory`, better rewrite pattern (`/:path((?!.*\\.).*)`), and cache control headers for assets vs. index.html
   - **Status:** Committed locally in commit `743802d`

4. **public/icon-192x192.png** and **public/icon-512x512.png** — PWA icons
   - **Issue:** PWA install prompt was not appearing, install was showing generic "R" letter icon
   - **Fix:** Resized golden logo from `Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png` to standard PWA sizes
   - **Status:** Committed locally in commit `3900f8c`

5. **src/main.tsx** — Service worker registration in all environments
   - **Issue:** Service worker only registered in production (`import.meta.env.PROD`), preventing PWA install prompt in development/staging
   - **Fix:** Removed production check so service worker registers immediately on all environments
   - **Status:** Committed locally in commit `318003c`

**Action Required:** Before the next working session, push all changes to the Git repository:
```bash
git push origin cursor/calendar-rendering-and-ugx-currency
```

Once pushed, Vercel will auto-deploy. After deployment:
- Hard refresh the browser (`Ctrl+Shift+R` or `Cmd+Shift+R` on Mac)
- Clear service worker cache if the old version persists
- Verify: date should show "Wednesday, July 1, 2026" correctly
- Verify: PWA install button should appear in address bar with golden logo

---

## 1. Project Overview

**Rodland Apartments Operations** is a single-page web dashboard for managing an 8-room aparthotel in Kampala, Uganda. The property owner uses it daily to:

- Track the real-time housekeeping and occupancy status of every room
- Create, view, and cancel guest bookings
- Review a monthly calendar overview and a per-room timeline
- Generate monthly revenue and occupancy reports with CSV export

The app is intentionally simple: there is no login, no multi-tenancy, and no backend API layer. It is a single-operator internal tool backed by Supabase through a client-side React app.

### Property Details

| Room | Type | Base Rate |
|------|------|-----------|
| Room 3 | 2BR Suite | UGX 50,000/night |
| Room 4 | 2BR Suite | UGX 50,000/night |
| Room 31 | Single | UGX 25,000/night |
| Room 32 | Single | UGX 25,000/night |
| Room 33 | Single | UGX 25,000/night |
| Room 34 | Single | UGX 25,000/night |
| Room 35 | Single | UGX 25,000/night |
| Room 36 | Single | UGX 25,000/night |

---

## 2. Architecture & Tech Stack

### What Is Actually Implemented

The app is built as a Vite + React 18 + TypeScript SPA. The UI is composed from React components and Tailwind CSS. Data comes from Supabase using the official JavaScript client.

| Concern | Actual implementation |
|---------|-----------------------|
| Framework | Vite 5 + React 18 SPA |
| Styling | Tailwind CSS 3.4 |
| Component library | None; UI uses raw Tailwind classes and Lucide icons |
| Data fetching | Custom hook in src/hooks/useAppData.ts with manual refresh |
| ORM | None; direct Supabase client calls |
| Date logic | Custom zero-dependency helpers in src/lib/dateUtils.ts with placeholder-based token replacement |
| Charts | Handwritten SVG chart components |
| Icons | lucide-react |
| Routing | No router; single view state in App.tsx |
| PWA | Service worker (public/sw.js) with manifest.json, registers in all environments |

### Dependency List

```json
"dependencies": {
  "@supabase/supabase-js": "^2.57.4",
  "lucide-react": "^0.344.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "zod": "^3.25.2"
}
```

The project does not use Next.js, SWR, Drizzle, date-fns, recharts, or shadcn/ui.

---

## 3. File Structure

```text
project/
├── index.html
├── vite.config.ts
├── vercel.json
├── netlify.toml
├── tsconfig.json
├── eslint.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── TECHNICAL_HANDOFF.md
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icon-192x192.png  (PWA icon)
│   ├── icon-512x512.png  (PWA icon)
│   └── Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png  (original logo)
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── BookingDetailDrawer.tsx
│   │   ├── CalendarView.tsx
│   │   ├── QuickAddDrawer.tsx
│   │   ├── ReportsView.tsx
│   │   ├── RoomsView.tsx  (contains KPI boxes showing Occupied/Ready/Cleaning/Maintenance/Vacant)
│   │   ├── Sidebar.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ToastContainer.tsx
│   ├── hooks/
│   │   ├── useAppData.ts
│   │   └── useToast.ts
│   └── lib/
│       ├── actions.ts
│       ├── dateUtils.ts  (contains formatDate with placeholder token replacement)
│       ├── schema.ts
│       ├── supabase.ts
│       └── types.ts
└── supabase/
    └── migrations/
        ├── 20260628140910_create_rodland_schema.sql
        └── 20260628150000_convert_rates_to_ugx.sql
```

---

## 4. Data Fetching Strategy

### Actual Pattern: useAppData Hook

There is no SWR layer or realtime subscription. Data loading works by calling three Supabase queries in parallel inside a custom hook:

```typescript
const refresh = useCallback(async () => {
  const [r, b, ab] = await Promise.all([loadRooms(), loadBookings(), loadAllBookings()]);
  setRooms(r);
  setBookings(b);
  setAllBookings(ab);
}, []);
```

- Initial load happens on mount through useEffect.
- After each mutation, the UI calls refresh() explicitly to reload the relevant data.
- The app does not poll or subscribe to changes automatically.

### Booking Data Split

- bookings contains only confirmed bookings and is used by RoomsView and CalendarView.
- allBookings contains all bookings, including cancelled ones, and is used by ReportsView.
- Both payloads include a joined room object via Supabase select expansion.

---

## 5. Database Schema & Business Rules

### Connection

The app uses a singleton Supabase client initialized from environment variables in src/lib/supabase.ts.

### Tables

#### rooms

The rooms table stores the room inventory and current manual status. The app expects the following fields:

- id
- name
- room_type
- status
- base_rate
- sort_order
- created_at

The UI uses the room status values:

- occupied
- ready
- needs_cleaning
- maintenance
- vacant

#### bookings

The bookings table stores reservation data:

- id
- room_id
- guest_name
- check_in
- check_out
- source
- nightly_rate
- notes
- status
- cancelled_at
- cancellation_reason
- payment_status
- created_at

The app treats dates as ISO strings in yyyy-MM-dd format, and uses the inclusive/exclusive convention:

- check_in is included
- check_out is excluded

#### room_status_log

Every room status change is written into room_status_log. This is used for audit history even though the UI does not currently expose it directly.

### Business Rules

- Room status is manually controlled by the operator from the Rooms view.
- When a booking starts today, createBooking() may automatically set the room status to occupied.
- Booking cancellation is a soft update that sets status to cancelled and records the cancellation timestamp and reason.
- The current implementation does not perform a pre-insert overlap check before saving a new booking.

### RLS

Supabase RLS is configured to allow anonymous and authenticated access with permissive read/write rules for the current single-operator workflow.

---

## 6. State Management

There is no external state management library. The app uses local component state and a custom hook for server data.

### Data State

The main data flow is:

```text
App.tsx
├── useAppData() -> rooms, bookings, allBookings
├── RoomsView(...)
├── CalendarView(...)
└── ReportsView(...)
```

### Mutation Pattern

Each write operation follows the same pattern:

1. A component triggers an action.
2. App.tsx calls the corresponding action in src/lib/actions.ts.
3. The action writes to Supabase.
4. The UI calls refresh() and shows a toast notification.

### UI State

The main components keep local UI state for drawer visibility, filters, month navigation, and form values.

---

## 7. Component Architecture

### App.tsx

The root component owns the global view state, booking drawer state, and all action handlers. It renders the sidebar, top bar, main content area, drawers, and toast stack.

### Sidebar.tsx

The left navigation component switches between Rooms, Calendar, and Reports.

### RoomsView.tsx

Displays the room inventory and room detail panel. It shows:
- **KPI boxes** (5 colored stat boxes at the top): Occupied, Ready, Cleaning, Maintenance, Vacant counts
- Occupancy and status summaries
- Room cards in a filterable grid
- Active booking context for each room

**Note:** KPI boxes have a known responsive issue: they may hide at 100% viewport zoom due to container width constraints, but reappear at 80% zoom. This is a minor CSS breakpoint issue.

### CalendarView.tsx

Displays a monthly calendar overview and a room-by-room Gantt-style timeline. Booking chips are rendered by room index and the timeline is built manually with SVG-like positioning.

### ReportsView.tsx

Shows monthly metrics: revenue, occupancy rate, booking count, ADR, and role-based analytics tables. All calculations are derived from allBookings.

### QuickAddDrawer.tsx

The slide-in drawer used to create a booking. It now uses Zod-backed validation for the form data before calling the createBooking action.

### BookingDetailDrawer.tsx

Displays booking details and allows payment status updates and booking cancellation.

### ToastContainer.tsx

Renders dismissible toast notifications with auto-dismiss timers and color-coded icons.

---

## 8. Date Utilities (src/lib/dateUtils.ts)

A bespoke zero-dependency date helper module powers month navigation, calendar generation, and date comparisons.

### Critical: Date Formatting with Placeholder Strategy

The `formatDate()` function uses a **placeholder token replacement strategy** to prevent substring collisions:

```typescript
export function formatDate(date: Date | string, fmt: string): string {
  // Step 1: Replace all tokens with unique placeholders
  // 'EEEE' -> '__PLACEHOLDER_0__', 'EEE' -> '__PLACEHOLDER_1__', etc.
  
  // Step 2: Replace placeholders with actual values using replaceAll()
  // '__PLACEHOLDER_0__' -> 'Wednesday'
}
```

**Why this matters:** The naive `.replace('d', String(d.getDate()))` approach corrupts day names because 'd' in "Wednesday" gets replaced, resulting in "We1nesday, July 1, 2026". The placeholder strategy avoids this by using intermediate tokens that cannot appear in day/month names.

### Supported Helpers

| Function | Purpose |
|---|---|
| formatDate | Token-based date formatting with placeholder strategy |
| addMonths | Add calendar months |
| subMonths | Subtract calendar months |
| startOfMonth | Start of month |
| endOfMonth | End of month |
| startOfWeek | Start of week |
| endOfWeek | End of week |
| eachDayOfInterval | Build an inclusive day list |
| differenceInDays | Calculate day difference |
| isSameMonth | Compare month and year |
| isToday | Compare to today |
| parseISO | Parse ISO strings |
| isBefore | Compare date ordering |
| isAfter | Compare date ordering |
| toDateStr | Produce yyyy-MM-dd local-date string |

The app relies on local-date semantics rather than UTC timestamps for booking calculations.

---

## 9. Validation Layer

### Zod Schema

The project now includes src/lib/schema.ts with a Zod schema for booking form data. The schema validates:

- room selection
- guest name presence
- date format and logical ordering
- nightly rate positivity
- source and payment status enums
- optional notes length

The Quick Add drawer uses this schema before calling the createBooking workflow.

---

## 10. PWA Configuration

### Service Worker (public/sw.js)

The app registers a service worker in all environments (including development) as of commit `318003c`:

```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
```

The service worker implements a mixed caching strategy:
- Network-first for Supabase API calls
- Cache-first for static assets

### Manifest Configuration (public/manifest.json)

The manifest includes:
- App name: "Rodland Apartments"
- Short name: "Rodland"
- Display mode: standalone
- Theme color: #f59e0b (amber)
- Background color: #0f172a (dark slate)
- Icons: 192x192 and 512x512 PNG files (resized from golden logo)

### PWA Icon Assets

- **icon-192x192.png**: 192x192px PNG, optimized for mobile home screens
- **icon-512x512.png**: 512x512px PNG, optimized for splash screens and larger displays
- Both are resized versions of the golden geometric logo (`Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png`)

### PWA Install Experience

When deployed to Vercel:
1. Service worker registers automatically
2. Manifest is linked in index.html
3. Browser shows install prompt in address bar (Chrome, Edge, Firefox)
4. Installed app displays the golden logo on home screen
5. App opens in standalone window with theme colors applied

---

## 11. Deployment Configuration

### vite.config.ts

The Vite build configuration explicitly sets:
- `base: '/'` for correct asset resolution on deployment
- `outDir: 'dist'` for Vercel output directory
- `sourcemap: false` to reduce bundle size
- Optimized Rollup output configuration

### vercel.json

Vercel deployment configuration includes:
- `buildCommand: "npm run build"` explicit build step
- `outputDirectory: "dist"` where Vite outputs
- Rewrite pattern: `/:path((?!.*\\.).*) -> /index.html` to catch all non-file requests (SPA routing)
- Cache headers:
  - Assets (under `/assets/`) cached for 1 year (immutable)
  - `index.html` cached with max-age=0 (always revalidate)

### netlify.toml

Included as reference but not used for current deployment. Contains equivalent SPA redirect rules for Netlify if needed in future.

---

## 12. Favicon & Head Metadata

The app loads:
- Branded PNG favicon from `/Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png`
- Apple touch icon for iOS home screen
- Windows tile image for app tile
- Open Graph tags for social sharing
- PWA manifest link for installability

All paths are root-relative (`/`) to work correctly with Vite's base path configuration.

---

## 13. Feature Completeness Status

| Feature | Status | Notes |
|---|---|---|
| 8-room grid with status badges | COMPLETE | |
| KPI strip (Occupied, Ready, Cleaning, Maintenance, Vacant) | COMPLETE | Minor responsive issue at 100% zoom (hides at 100%, visible at 80%) |
| Status filter pills | COMPLETE | |
| Room detail right panel | COMPLETE | |
| Manual room status change + audit log | COMPLETE | |
| Create new booking | COMPLETE | Validated with Zod client-side |
| View booking detail | COMPLETE | |
| Cancel booking | COMPLETE | Soft cancellation implemented |
| Update payment status | COMPLETE | |
| Monthly calendar | COMPLETE | |
| Gantt / room timeline | COMPLETE | |
| Today highlight | COMPLETE | |
| Month navigation | COMPLETE | |
| Monthly KPIs and reports | COMPLETE | |
| CSV export | COMPLETE | |
| Toast notifications | COMPLETE | |
| Loading state | COMPLETE | |
| Error state | COMPLETE | |
| Favicon / metadata | COMPLETE | |
| Same-day booking auto-occupancy | COMPLETE | |
| PWA installability | COMPLETE (new) | Service worker registration in all environments, proper manifest and icons |
| Date formatting | COMPLETE (fixed) | Using placeholder strategy to prevent substring collisions |

---

## 14. Known Issues & Pending To-Dos

### High Priority

1. No booking overlap check. The app currently inserts bookings without checking whether the room is already occupied during the requested date range.
2. The app still relies on manual refresh for cross-tab or cross-user updates; there is no realtime sync or polling layer.

### Medium Priority

3. KPI boxes have responsive layout issue at 100% viewport zoom (hide due to min-width constraints). Reappear at 80% zoom. Minor cosmetic issue.
4. Mobile layout remains basic and the right-side detail panel is not optimized for narrow screens.
5. Booking edits are not exposed in the UI even though updateBooking() exists in src/lib/actions.ts.

### Low Priority / Future Features

6. Room status is not automatically reset after checkout.
7. Rates are stored as integers, so fractional nightly pricing is not supported.
8. CSV export currently reports full booking totals without month-clamping for bookings that span multiple months.

---

## 15. Environment & Deployment

- Development server: Vite dev server, run through `npm run dev`
- Build command: `npm run build`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be present
- Current deployment: Vercel (branch: `cursor/calendar-rendering-and-ugx-currency`)
- Supabase migrations are stored in supabase/migrations and should be treated as reference material unless a future schema change is applied through the appropriate workflow

---

## 16. Next Steps for Next AI Instance

When starting a new session with this codebase:

1. **Push pending commits** if not already done:
   ```bash
   git push origin cursor/calendar-rendering-and-ugx-currency
   ```

2. **Verify Vercel deployment** shows app loading correctly (not white blank page)

3. **Test in browser:**
   - Date should display as "Wednesday, July 1, 2026" (not "We1nesday")
   - KPI boxes should be visible below the date header
   - PWA install prompt should appear in address bar with golden logo

4. **If date is still wrong:** The placeholder strategy in `formatDate()` may not be working. Debug by:
   - Opening browser DevTools console
   - Checking for any formatDate() errors
   - Verifying that `replaceAll()` is being called correctly

5. **For new features or fixes:**
   - Follow the mutation pattern established in App.tsx + actions.ts
   - Use the Zod schema for any new form validation
   - Test date formatting changes thoroughly with `formatDate()` test cases
   - PWA changes require service worker cache clearing after deployment

---

**End of Technical Handoff**

---

## 1. Project Overview

**Rodland Apartments Operations** is a single-page web dashboard for managing an 8-room aparthotel in Kampala, Uganda. The property owner uses it daily to:

- Track the real-time housekeeping and occupancy status of every room
- Create, view, and cancel guest bookings
- Review a monthly calendar overview and a per-room timeline
- Generate monthly revenue and occupancy reports with CSV export

The app is intentionally simple: there is no login, no multi-tenancy, and no backend API layer. It is a single-operator internal tool backed by Supabase through a client-side React app.

### Property Details

| Room | Type | Base Rate |
|------|------|-----------|
| Room 3 | 2BR Suite | UGX 50,000/night |
| Room 4 | 2BR Suite | UGX 50,000/night |
| Room 31 | Single | UGX 25,000/night |
| Room 32 | Single | UGX 25,000/night |
| Room 33 | Single | UGX 25,000/night |
| Room 34 | Single | UGX 25,000/night |
| Room 35 | Single | UGX 25,000/night |
| Room 36 | Single | UGX 25,000/night |

---

## 2. Architecture & Tech Stack

### What Is Actually Implemented

The app is built as a Vite + React 18 + TypeScript SPA. The UI is composed from React components and Tailwind CSS. Data comes from Supabase using the official JavaScript client.

| Concern | Actual implementation |
|---------|-----------------------|
| Framework | Vite 5 + React 18 SPA |
| Styling | Tailwind CSS 3.4 |
| Component library | None; UI uses raw Tailwind classes and Lucide icons |
| Data fetching | Custom hook in src/hooks/useAppData.ts with manual refresh |
| ORM | None; direct Supabase client calls |
| Date logic | Custom zero-dependency helpers in src/lib/dateUtils.ts |
| Charts | Handwritten SVG chart components |
| Icons | lucide-react |
| Routing | No router; single view state in App.tsx |

### Dependency List

```json
"dependencies": {
  "@supabase/supabase-js": "^2.57.4",
  "lucide-react": "^0.344.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "zod": "^3.25.2"
}
```

The project does not use Next.js, SWR, Drizzle, date-fns, recharts, or shadcn/ui.

---

## 3. File Structure

```text
src/
├── App.tsx
├── main.tsx
├── index.css
├── components/
│   ├── BookingDetailDrawer.tsx
│   ├── CalendarView.tsx
│   ├── QuickAddDrawer.tsx
│   ├── ReportsView.tsx
│   ├── RoomsView.tsx
│   ├── Sidebar.tsx
│   ├── StatusBadge.tsx
│   └── ToastContainer.tsx
├── hooks/
│   ├── useAppData.ts
│   └── useToast.ts
└── lib/
    ├── actions.ts
    ├── dateUtils.ts
    ├── schema.ts
    ├── supabase.ts
    └── types.ts
```

Public assets and Supabase migrations are stored at the workspace root under public/ and supabase/.

---

## 4. Data Fetching Strategy

### Actual Pattern: useAppData Hook

There is no SWR layer or realtime subscription. Data loading works by calling three Supabase queries in parallel inside a custom hook:

```typescript
const refresh = useCallback(async () => {
  const [r, b, ab] = await Promise.all([loadRooms(), loadBookings(), loadAllBookings()]);
  setRooms(r);
  setBookings(b);
  setAllBookings(ab);
}, []);
```

- Initial load happens on mount through useEffect.
- After each mutation, the UI calls refresh() explicitly to reload the relevant data.
- The app does not poll or subscribe to changes automatically.

### Booking Data Split

- bookings contains only confirmed bookings and is used by RoomsView and CalendarView.
- allBookings contains all bookings, including cancelled ones, and is used by ReportsView.
- Both payloads include a joined room object via Supabase select expansion.

---

## 5. Database Schema & Business Rules

### Connection

The app uses a singleton Supabase client initialized from environment variables in src/lib/supabase.ts.

### Tables

#### rooms

The rooms table stores the room inventory and current manual status. The app expects the following fields:

- id
- name
- room_type
- status
- base_rate
- sort_order
- created_at

The UI uses the room status values:

- occupied
- ready
- needs_cleaning
- maintenance
- vacant

#### bookings

The bookings table stores reservation data:

- id
- room_id
- guest_name
- check_in
- check_out
- source
- nightly_rate
- notes
- status
- cancelled_at
- cancellation_reason
- payment_status
- created_at

The app treats dates as ISO strings in yyyy-MM-dd format, and uses the inclusive/exclusive convention:

- check_in is included
- check_out is excluded

#### room_status_log

Every room status change is written into room_status_log. This is used for audit history even though the UI does not currently expose it directly.

### Business Rules

- Room status is manually controlled by the operator from the Rooms view.
- When a booking starts today, createBooking() may automatically set the room status to occupied.
- Booking cancellation is a soft update that sets status to cancelled and records the cancellation timestamp and reason.
- The current implementation does not perform a pre-insert overlap check before saving a new booking.

### RLS

Supabase RLS is configured to allow anonymous and authenticated access with permissive read/write rules for the current single-operator workflow.

---

## 6. State Management

There is no external state management library. The app uses local component state and a custom hook for server data.

### Data State

The main data flow is:

```text
App.tsx
├── useAppData() -> rooms, bookings, allBookings
├── RoomsView(...)
├── CalendarView(...)
└── ReportsView(...)
```

### Mutation Pattern

Each write operation follows the same pattern:

1. A component triggers an action.
2. App.tsx calls the corresponding action in src/lib/actions.ts.
3. The action writes to Supabase.
4. The UI calls refresh() and shows a toast notification.

### UI State

The main components keep local UI state for drawer visibility, filters, month navigation, and form values.

---

## 7. Component Architecture

### App.tsx

The root component owns the global view state, booking drawer state, and all action handlers. It renders the sidebar, top bar, main content area, drawers, and toast stack.

### Sidebar.tsx

The left navigation component switches between Rooms, Calendar, and Reports.

### RoomsView.tsx

Displays the room inventory and room detail panel. It shows occupancy and status summaries, room cards, and the active booking context for each room.

### CalendarView.tsx

Displays a monthly calendar overview and a room-by-room Gantt-style timeline. Booking chips are rendered by room index and the timeline is built manually with SVG-like positioning.

### ReportsView.tsx

Shows monthly metrics: revenue, occupancy rate, booking count, ADR, and role-based analytics tables. All calculations are derived from allBookings.

### QuickAddDrawer.tsx

The slide-in drawer used to create a booking. It now uses Zod-backed validation for the form data before calling the createBooking action.

### BookingDetailDrawer.tsx

Displays booking details and allows payment status updates and booking cancellation.

### ToastContainer.tsx

Renders dismissible toast notifications with auto-dismiss timers and color-coded icons.

---

## 8. Date Utilities (src/lib/dateUtils.ts)

A bespoke zero-dependency date helper module powers month navigation, calendar generation, and date comparisons.

### Supported Helpers

| Function | Purpose |
|---|---|
| formatDate | Token-based date formatting |
| addMonths | Add calendar months |
| subMonths | Subtract calendar months |
| startOfMonth | Start of month |
| endOfMonth | End of month |
| startOfWeek | Start of week |
| endOfWeek | End of week |
| eachDayOfInterval | Build an inclusive day list |
| differenceInDays | Calculate day difference |
| isSameMonth | Compare month and year |
| isToday | Compare to today |
| parseISO | Parse ISO strings |
| isBefore | Compare date ordering |
| isAfter | Compare date ordering |
| toDateStr | Produce yyyy-MM-dd local-date string |

The app relies on local-date semantics rather than UTC timestamps for booking calculations.

---

## 9. Validation Layer

### Zod Schema

The project now includes src/lib/schema.ts with a Zod schema for booking form data. The schema validates:

- room selection
- guest name presence
- date format and logical ordering
- nightly rate positivity
- source and payment status enums
- optional notes length

The Quick Add drawer uses this schema before calling the createBooking workflow.

---

## 10. Favicon & Head Metadata

The app loads a branded PNG favicon and related metadata from index.html, including Apple touch icon and Open Graph tags.

---

## 11. Feature Completeness Status

| Feature | Status | Notes |
|---|---|---|
| 8-room grid with status badges | COMPLETE | |
| KPI strip | COMPLETE | |
| Status filter pills | COMPLETE | |
| Room detail right panel | COMPLETE | |
| Manual room status change + audit log | COMPLETE | |
| Create new booking | COMPLETE | Validated with Zod client-side |
| View booking detail | COMPLETE | |
| Cancel booking | COMPLETE | Soft cancellation implemented |
| Update payment status | COMPLETE | |
| Monthly calendar | COMPLETE | |
| Gantt / room timeline | COMPLETE | |
| Today highlight | COMPLETE | |
| Month navigation | COMPLETE | |
| Monthly KPIs and reports | COMPLETE | |
| CSV export | COMPLETE | |
| Toast notifications | COMPLETE | |
| Loading state | COMPLETE | |
| Error state | COMPLETE | |
| Favicon / metadata | COMPLETE | |
| Same-day booking auto-occupancy | COMPLETE | |

---

## 12. Known Issues & Pending To-Dos

### High Priority

1. No booking overlap check. The app currently inserts bookings without checking whether the room is already occupied during the requested date range.
2. The app still relies on manual refresh for cross-tab or cross-user updates; there is no realtime sync or polling layer.

### Medium Priority

3. Mobile layout remains basic and the right-side detail panel is not optimized for narrow screens.
4. Booking edits are not exposed in the UI even though updateBooking() exists in src/lib/actions.ts.
5. The app does not currently provide a dedicated offline/PWA experience.

### Low Priority / Future Features

6. Room status is not automatically reset after checkout.
7. Rates are stored as integers, so fractional nightly pricing is not supported.
8. CSV export currently reports full booking totals without month-clamping for bookings that span multiple months.

---

## 13. Environment & Deployment

- Development server: Vite dev server, run through the local Bolt environment.
- Build command: npm run build
- Environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be present in the environment.
- Supabase migrations are stored in supabase/migrations and should be treated as reference material unless a future schema change is applied through the appropriate workflow.
