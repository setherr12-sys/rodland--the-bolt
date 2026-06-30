# Rodland Apartments Operations — Technical Handoff & Architecture Audit

**Document version:** 2.0  
**Date:** 2026-06-30  
**Purpose:** Complete technical reference for a fresh AI instance or developer picking up this project with no prior context. Every statement in this document reflects the actual source code as it exists today — not aspirational or planned state.

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
