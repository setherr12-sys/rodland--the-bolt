# Rodland Apartments Operations — Technical Handoff & Architecture Audit

**Document version:** 1.0  
**Date:** 2026-06-28  
**Purpose:** Complete technical reference for a fresh AI instance or developer picking up this project with no prior context. Every statement in this document reflects the actual source code as it exists today — not aspirational or planned state.

---

## 1. Project Overview

**Rodland Apartments Operations** is a single-page web dashboard for managing an 8-room aparthotel located in Kampala, Uganda. The property owner uses it daily to:

- Track the real-time housekeeping/occupancy status of every room
- Create, view, and cancel guest bookings
- See a monthly calendar overview and a per-room Gantt timeline
- Generate monthly revenue and occupancy reports with CSV export

The app is deliberately simple — no user authentication, no multi-tenancy. It is a single-operator internal tool. All data is stored in Supabase (PostgreSQL). The frontend is a Vite + React 18 + TypeScript SPA deployed in a Bolt environment.

### Property Details

| Room | Type | Base Rate |
|------|------|-----------|
| Room 3 | 2BR Suite | $50/night |
| Room 4 | 2BR Suite | $50/night |
| Room 31 | Single | $25/night |
| Room 32 | Single | $25/night |
| Room 33 | Single | $25/night |
| Room 34 | Single | $25/night |
| Room 35 | Single | $25/night |
| Room 36 | Single | $25/night |

---

## 2. Architecture & Tech Stack

### IMPORTANT: What Was Originally Planned vs. What Was Actually Built

The prompt for this handoff references Next.js 15, Drizzle ORM, SWR, shadcn/ui, and Tailwind v4. **None of those are in the actual codebase.** The app was built in the Bolt environment, which uses a Vite + React template. Here is what is actually used:

| Concern | Planned (per prompt) | Actual (in code) |
|---------|---------------------|-----------------|
| Framework | Next.js 15 App Router | **Vite 5 + React 18 SPA** |
| Styling | Tailwind v4 | **Tailwind v3.4** |
| Component library | shadcn/ui | **None — raw Tailwind + Lucide React** |
| Data fetching | SWR with 8s polling | **Custom `useAppData` hook (useState + useEffect + manual refresh)** |
| ORM | Drizzle ORM | **None — direct `@supabase/supabase-js` client calls** |
| Database | Supabase (via Drizzle) | **Supabase directly (anon key, no ORM)** |
| Date library | (not specified) | **Zero-dependency custom `dateUtils.ts`** |
| Charts | (not specified) | **Zero-dependency inline SVG components** |
| Icons | (not specified) | **lucide-react ^0.344.0** |
| Router | Next.js App Router | **No router — single view state in `useState`** |

### Why These Differences Matter

The Bolt environment does not support Next.js or server-side rendering. The project runs entirely client-side. There is no server, no RSC, no API routes — every database operation happens in the browser via the Supabase anon key over HTTPS.

`date-fns` v4 and `recharts` were both attempted but failed to resolve in Vite's dev server in this environment (ESM/CJS interop issue with `optimizeDeps.exclude`). They were replaced with handwritten equivalents that have zero external dependencies.

### Dependency List (exact, from `package.json`)

```json
"dependencies": {
  "@supabase/supabase-js": "^2.57.4",
  "lucide-react": "^0.344.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

**No `date-fns`. No `recharts`. No `swr`. No `drizzle-orm`. No `shadcn`.**

---

## 3. File Structure

```
src/
├── App.tsx                        # Root component: layout, view switching, all action handlers
├── main.tsx                       # React DOM entry point
├── index.css                      # Tailwind directives + @keyframes fadeIn
├── lib/
│   ├── supabase.ts                # Supabase singleton client (uses VITE_ env vars)
│   ├── types.ts                   # All TypeScript interfaces + display constants
│   ├── actions.ts                 # All Supabase read/write functions
│   └── dateUtils.ts               # Custom date utilities (no external deps)
├── hooks/
│   ├── useAppData.ts              # Primary data hook: loads rooms + bookings
│   └── useToast.ts                # Toast notification state manager
└── components/
    ├── Sidebar.tsx                # Left nav (Rooms / Calendar / Reports)
    ├── StatusBadge.tsx            # Colored pill for room status
    ├── ToastContainer.tsx         # Fixed-position toast stack (bottom-right)
    ├── RoomsView.tsx              # Rooms grid + right detail panel
    ├── CalendarView.tsx           # Monthly calendar + Gantt timeline
    ├── ReportsView.tsx            # KPIs + bar chart + pie chart + tables
    ├── QuickAddDrawer.tsx         # Slide-in drawer: create new booking
    └── BookingDetailDrawer.tsx    # Slide-in drawer: view/cancel/update booking

public/
├── Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png   # App logo / favicon
└── image.png                                       # (unused placeholder)

supabase/
└── migrations/
    └── 20260628140910_create_rodland_schema.sql    # Reference only (not auto-applied)

index.html                         # HTML entry — favicon, Apple touch icon, OG tags
vite.config.ts                     # Minimal: just @vitejs/plugin-react, no exclusions
tailwind.config.js                 # Default content paths, no custom theme
.env                               # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## 4. Data Fetching Strategy

### Actual Pattern: `useAppData` Hook

There is no SWR, no RSC, no server-side rendering. Data loading works as follows:

```typescript
// src/hooks/useAppData.ts
export function useAppData() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [r, b, ab] = await Promise.all([loadRooms(), loadBookings(), loadAllBookings()]);
    setRooms(r); setBookings(b); setAllBookings(ab);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { rooms, bookings, allBookings, loading, error, refresh };
}
```

- **Initial load:** `useEffect` fires once on mount. Three Supabase queries run in parallel via `Promise.all`. A full-screen loading spinner with the app logo is shown until all three resolve.
- **After mutations:** Every action handler in `App.tsx` calls `await refresh()` explicitly after a successful write. This is the only mechanism for keeping the UI fresh — there is no polling, no Supabase Realtime subscription.
- **`bookings` vs `allBookings`:** `bookings` contains only confirmed bookings (`.eq('status', 'confirmed')`). It is used by RoomsView and CalendarView to show active/upcoming reservations. `allBookings` contains every booking including cancelled ones and is used only by ReportsView.
- **Both `bookings` and `allBookings` include a joined `room` object** via `.select('*, room:rooms(*)')` so components can display `booking.room.name` without a second query.

### No SWR Polling — Implication for New Development

If you want to add SWR polling (e.g., 8s refresh so multiple operators see live data), the upgrade path is:

1. `npm install swr`
2. Replace `useAppData` with three `useSWR` hooks keyed to `'rooms'`, `'bookings'`, `'allBookings'`
3. Set `refreshInterval: 8000`
4. Replace `await refresh()` calls with `mutate()` from each hook

---

## 5. Database Schema & Business Rules

### Connection

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient<Database>(url, key);
```

The Supabase project is provisioned. Credentials are in `.env` and the Bolt hosted environment. Do not attempt to re-provision or re-create the client.

---

### Table: `rooms`

```sql
CREATE TABLE rooms (
  id         serial PRIMARY KEY,
  name       text NOT NULL,                        -- "Room 3", "Room 31", etc.
  room_type  text NOT NULL,                        -- "2BR Suite" or "Single"
  status     text NOT NULL DEFAULT 'vacant',       -- see RoomStatus below
  base_rate  integer NOT NULL,                     -- USD per night (50 or 25)
  sort_order integer NOT NULL,                     -- display order 1–8
  created_at timestamptz DEFAULT now()
);
```

**`status` enum** (enforced in TypeScript, not a DB enum):
```
'occupied' | 'ready' | 'needs_cleaning' | 'maintenance' | 'vacant'
```

**Business rules:**
- Status is managed manually by the operator via the right panel in RoomsView.
- `createBooking()` contains a side-effect: if the new booking's `check_in <= today < check_out`, the room status is automatically set to `'occupied'` and a log entry is written.
- Status changes do NOT cascade — cancelling a booking does not automatically reset room status. The operator sets it manually (intentional, to support "room needs cleaning" workflow after checkout).

**RLS:** `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` on all 4 verbs — intentionally public since there is no authentication.

---

### Table: `bookings`

```sql
CREATE TABLE bookings (
  id                  serial PRIMARY KEY,
  room_id             integer NOT NULL REFERENCES rooms(id),
  guest_name          text NOT NULL,
  check_in            date NOT NULL,               -- ISO 8601 string in TypeScript: "2026-06-15"
  check_out           date NOT NULL,               -- exclusive end date (guest leaves this day)
  source              text NOT NULL DEFAULT 'Direct',  -- see BookingSource below
  nightly_rate        integer NOT NULL,            -- USD, copied at booking time
  notes               text,                        -- nullable free text
  status              text NOT NULL DEFAULT 'confirmed',  -- 'confirmed' | 'cancelled'
  cancelled_at        timestamptz,                 -- null until cancelled
  cancellation_reason text,                        -- null until cancelled
  payment_status      text NOT NULL DEFAULT 'unpaid',  -- see PaymentStatus below
  created_at          timestamptz DEFAULT now()
);
```

**`source` enum** (TypeScript only):
```
'Airbnb' | 'Booking.com' | 'Direct' | 'Walk-in' | 'Other'
```

**`payment_status` enum** (TypeScript only):
```
'airbnb' | 'paid' | 'partial' | 'unpaid'
```
- `'airbnb'` means Airbnb collected payment directly — operator receives a payout separately
- `'paid'` means full cash/mobile money received by operator
- `'partial'` means deposit taken, balance outstanding
- `'unpaid'` means nothing collected yet

**Date convention:** `check_in` is inclusive; `check_out` is exclusive. A guest checking in June 15 and out June 18 occupies the room on the 15th, 16th, and 17th. The overlap query is:
```
booking.check_in <= query_date AND booking.check_out > query_date
```
This is the pattern used consistently across all components for "is a room occupied on day X".

**Soft-delete / cancellation pattern:**

Bookings are NEVER hard-deleted. Cancellation sets three fields:
```typescript
await supabase.from('bookings').update({
  status: 'cancelled',
  cancelled_at: new Date().toISOString(),
  cancellation_reason: reason ?? null,
}).eq('id', id);
```
After cancellation the row remains in the database. `loadBookings()` (used by RoomsView and CalendarView) filters `.eq('status', 'confirmed')` so cancelled bookings never appear in the operational views. `loadAllBookings()` (used by ReportsView) loads all statuses to allow historical analysis.

**Overlap check — CURRENT STATE (NOT YET IMPLEMENTED):**

The current `createBooking()` function does **NOT** check for date overlaps before inserting. It inserts directly and relies on the operator to avoid double-booking. A proper overlap check has been identified as a pending to-do (see Section 9). The correct SQL predicate to add would be:

```sql
SELECT 1 FROM bookings
WHERE room_id = $roomId
  AND status = 'confirmed'
  AND check_in < $checkOut
  AND check_out > $checkIn
LIMIT 1;
```
In TypeScript (client-side, pre-insert check):
```typescript
const { data: conflicts } = await supabase
  .from('bookings')
  .select('id')
  .eq('room_id', input.room_id)
  .eq('status', 'confirmed')
  .lt('check_in', input.check_out)
  .gt('check_out', input.check_in)
  .limit(1);
if (conflicts && conflicts.length > 0) throw new Error('Room already booked for these dates');
```

**RLS:** Same as `rooms` — `TO anon, authenticated USING (true)`.

---

### Table: `room_status_log`

```sql
CREATE TABLE room_status_log (
  id         serial PRIMARY KEY,
  room_id    integer NOT NULL REFERENCES rooms(id),
  old_status text NOT NULL,
  new_status text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  note       text                                  -- nullable, e.g. "Auto-set on booking"
);
```

An entry is written every time `updateRoomStatus()` is called. This function is invoked both by the operator manually changing status in the RoomsView right panel, and automatically by `createBooking()` when a same-day booking is created.

The log is currently write-only from the UI — it is stored in Supabase but not displayed anywhere. A future "Room History" panel could query this table.

---

### Seed Data

The migration seeds 8 rooms (if the table is empty) and 4 sample bookings for the current calendar month (if the bookings table is empty). The sample guests are: James Otieno (Room 31, Airbnb), Sarah Nakato (Room 3, Direct), Priya Sharma (Room 32, Booking.com), David Kimani (Room 4, Walk-in).

---

## 6. State Management

There is no external state management library (no Redux, no Zustand, no Jotai, no SWR cache).

### Data State

`useAppData` in `App.tsx` owns all server data state: `rooms`, `bookings`, `allBookings`. These are passed down as props to every view component. Views are pure display — they receive props and call callback functions. They do not call Supabase directly.

```
App.tsx
├── useAppData() → rooms, bookings, allBookings
├── RoomsView(rooms, bookings, onStatusChange, onNewBooking, onViewBooking)
├── CalendarView(rooms, bookings, onViewBooking, onNewBooking)
└── ReportsView(rooms, allBookings)
```

### Mutation Pattern

Every mutation follows this exact sequence:
1. User triggers action in a component (e.g., clicks "Cancel Booking" in `BookingDetailDrawer`)
2. Component calls a callback prop (e.g., `onCancel(id, reason)`)
3. `App.tsx` handler (`handleCancelBooking`) calls the action function (`cancelBooking(id, reason)`)
4. Action function writes to Supabase
5. On success: `addToast(...)` shows a notification, `await refresh()` re-fetches all data
6. On error: `addToast(message, 'error')` shows an error toast

### UI-Only State

Components own their own local display state using `useState`. This includes:
- `RoomsView`: `selected` (which room card is highlighted), `filterStatus`, `changingStatus`
- `CalendarView`: `monthDate` (which month is displayed)
- `ReportsView`: `monthDate`, all `useMemo` derived calculations
- `QuickAddDrawer`: entire form state, `saving`, `err`
- `BookingDetailDrawer`: `cancelMode`, `reason`, `working`
- `App.tsx`: `view` (active tab), `quickAddOpen`, `quickAddRoomId`, `selectedBooking`

---

## 7. Component Architecture

### `App.tsx`

The root component. Owns global state, all action handlers, and renders the shell layout. The layout is a full-height flex row: `<Sidebar>` (fixed 240px) + a flex column containing `<header>` (top bar) and `<main>` (scrollable content area).

The top bar displays:
- Current view title ("Room Overview" / "Calendar" / "Reports & Analytics")
- Today's date (`formatDate(today, 'EEEE, MMMM d, yyyy')`)
- Live stats: `{occupiedCount}/{rooms.length} occupied`, today's check-ins, today's check-outs (hidden on `< lg` screens)
- Refresh button (calls `refresh()`)
- Global "New Booking" button (opens `QuickAddDrawer` with no pre-selected room)

### `Sidebar.tsx`

Fixed left nav with the app logo (the PNG from `/public/`) and three navigation items. Active item is highlighted in `bg-amber-500`. No routing — `setView` updates `useState` in `App.tsx`.

### `RoomsView.tsx`

Two-column layout: left is the main scrollable area, right is a fixed 320px detail panel.

**Left side:**
1. KPI strip — 5 colored count cards (Occupied / Ready / Cleaning / Maintenance / Vacant), updated live from `rooms` prop
2. Filter pills — "All" + one pill per status that has at least one room. Clicking filters the room grid.
3. Room grid — `grid-cols-2 xl:grid-cols-3`. Each `<RoomCard>` shows room name, type, base rate, status badge, and either the active booking (blue box with guest name + dates) or "No active booking" placeholder.

**Right panel (appears when a room card is clicked):**
- Dark slate header with room name and status badge
- Status change list — 5 buttons, one per status. Clicking calls `handleStatusChange` → `updateRoomStatus()` → logs to `room_status_log`. Button is disabled during the async operation.
- Active booking section (if a booking exists for today's date range)
- Upcoming booking section (if no active booking but a future one exists)
- "All Bookings" scrollable list — all confirmed bookings for that room
- "New Booking" button — opens `QuickAddDrawer` pre-selected to this room

**Active booking detection logic:**
```typescript
function getActiveBooking(roomId: number) {
  return bookings.find(b =>
    b.room_id === roomId &&
    b.check_in <= today &&   // today is 'yyyy-MM-dd' string
    b.check_out > today
  );
}
```
Date comparisons use ISO 8601 string lexicographic ordering, which is equivalent to chronological ordering for `yyyy-MM-dd` format.

### `CalendarView.tsx`

Two sections: a monthly mini-calendar and a Gantt timeline.

**Monthly calendar:**
- Week starts Monday (`startOfWeek(monthStart, 1)`)
- Calendar grid extends to full weeks, so days from previous/next months appear dimmed
- Today's date gets an amber filled circle
- Each cell shows up to 3 booking chips (color-coded by room index) + "+N more" overflow
- Clicking a chip calls `onViewBooking(booking)` → opens `BookingDetailDrawer`

**Booking chip color assignment:**
```typescript
const ROOM_COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-rose-500',
                     'bg-amber-500','bg-cyan-500','bg-pink-500','bg-teal-500'];
function getRoomColor(roomId: number) {
  const idx = rooms.findIndex(r => r.id === roomId);
  return ROOM_COLORS[idx % ROOM_COLORS.length];
}
```
Color is assigned by room array index, not room ID, so it is stable as long as `rooms` is sorted by `sort_order` (guaranteed by `loadRooms()`).

**A booking appears on day D if:** `booking.check_in <= D && booking.check_out > D`
This means a guest checking out on day D does NOT appear on day D's cell (correct hotel convention).

**Gantt timeline:**
- Shows only the current calendar month (day 1 through last day)
- One row per room, showing confirmed bookings as colored bars
- Bars use percentage-based positioning: `left = (startIdx / totalDays) * 100%`, `width = (spanDays / totalDays) * 100%`
- Bookings that start before or end after the current month are clamped:
  ```typescript
  const clampedStart = isBefore(start, monthStart) ? monthStart : start;
  const clampedEnd = isAfter(end, monthEnd) ? monthEnd : end;
  ```
- Row height is fixed at `ROW_H + 8 = 36px`. All bars are positioned `top: 4px` with height `ROW_H = 28px`. There is NO multi-row layout for overlapping bookings within the same room — since a room can only have one booking at a time (by business logic), overlapping bars within a row should never occur. If the overlap check is added, this assumption holds; without it, two overlapping bookings would render on top of each other.
- Today's column is highlighted in amber
- The timeline container has `overflow-x: auto` and `minWidth: Math.max(700, totalDays * 30 + 120)`

**IMPORTANT — no row-position locking:** The bars are all positioned at `top: 1` within a single-height row. There is no algorithm to stack overlapping bookings into sub-rows. This is intentional given the single-booking-per-room business constraint. If that constraint is ever relaxed (e.g., allowing segmented stays), a lane-assignment algorithm would need to be added.

**IMPORTANT — no check-in/check-out midpoint visual:** The bars start and end at day boundaries (whole day columns). There is no half-day visual convention. The check-in day is included in the bar; the check-out day is excluded (bar ends at the left edge of the check-out column). This matches the `check_in <= D < check_out` occupancy logic.

### `ReportsView.tsx`

Month-navigable analytics page. All calculations are `useMemo`-derived from the `allBookings` prop.

**Revenue calculation:** Only counts nights that fall within the selected month, clamping bookings that span month boundaries:
```typescript
function clampedNights(b: Booking): number {
  const start = b.check_in > monthStartStr ? b.check_in : monthStartStr;
  const end = b.check_out < monthEndStr ? b.check_out : monthEndStr;
  return Math.max(0, differenceInDays(start, end) * -1);
}
```
Note: `differenceInDays(a, b)` returns `a - b` in days. Since `end > start`, the result is negative, hence the `* -1`.

**Occupancy rate:** `occupiedNights / (rooms.length × daysInMonth) × 100`

**ADR (Average Daily Rate):** `totalRevenue / occupiedNights`

**Bar chart:** Hand-written SVG. Daily revenue bars use `viewBox="0 0 {days*12} {height}"` with `preserveAspectRatio="none"`. Bar height = `(value / max) * (height - 20)`. Bars are `10px` wide with `1px` gaps.

**Pie/donut chart:** Hand-written SVG. Builds arc paths from cumulative angles. An inner circle (`r=28`) creates the donut hole. Uses the same 5-color palette as the booking chips.

**CSV export:** Builds a 2D array of strings, joins with commas and newlines, creates a Blob URL, programmatically clicks an `<a>` tag, then revokes the URL. Filename: `rodland-report-{yyyy-MM}.csv`.

### `QuickAddDrawer.tsx`

Right-side slide-in panel (`translate-x-full → translate-x-0` transition). Form fields:
- Room selector (pre-populates nightly rate from `room.base_rate` on change)
- Guest name (required)
- Check-in / Check-out date pickers
- Nightly rate (number input, pre-filled from room)
- Source (select: Airbnb / Booking.com / Direct / Walk-in / Other)
- Payment status (2x2 button grid)
- Notes (textarea, optional)
- Live total preview: `nights × rate` shown in amber box when dates are valid

**Client-side validation (only):** Guest name required, check_out > check_in, nightly_rate > 0. No server-side or Zod validation.

Backdrop: semi-transparent black overlay that closes the drawer on click. Z-index: overlay = 30, drawer = 40.

### `BookingDetailDrawer.tsx`

Same slide-in pattern. Displays booking details read-only, then offers:
- Payment status switcher (4 buttons, calls `updatePaymentStatus()` immediately on click)
- Cancellation flow: "Cancel Booking" reveals a confirmation form with optional reason, then calls `cancelBooking(id, reason)`

### `ToastContainer.tsx`

Fixed `bottom-6 right-6` stack. Toasts auto-dismiss after 3500ms via `setTimeout`. Each toast has an icon (CheckCircle / XCircle / Info), a message, and a manual close button. Fade-in via `@keyframes fadeIn` in `index.css`.

---

## 8. Date Utilities (`src/lib/dateUtils.ts`)

A bespoke zero-dependency date library. All functions accept `Date` objects unless noted. The full API:

| Function | Signature | Description |
|---|---|---|
| `formatDate` | `(date: Date \| string, fmt: string) => string` | Token-based formatter. Tokens: `EEEE`, `EEE`, `MMMM`, `MMM`, `MM`, `yyyy`, `yy`, `dd`, `d`, `HH`, `mm` |
| `addMonths` | `(date: Date, n: number) => Date` | Adds N calendar months |
| `subMonths` | `(date: Date, n: number) => Date` | Subtracts N calendar months |
| `startOfMonth` | `(date: Date) => Date` | First day of month, midnight |
| `endOfMonth` | `(date: Date) => Date` | Last day of month, 23:59:59.999 |
| `startOfWeek` | `(date: Date, weekStartsOn = 1) => Date` | Start of week; default Monday |
| `endOfWeek` | `(date: Date, weekStartsOn = 1) => Date` | End of week; default Sunday |
| `eachDayOfInterval` | `(start: Date, end: Date) => Date[]` | Array of Date objects from start to end inclusive |
| `differenceInDays` | `(a: Date \| string, b: Date \| string) => number` | `(a - b)` in whole days |
| `isSameMonth` | `(a: Date, b: Date) => boolean` | Same year + month |
| `isToday` | `(date: Date) => boolean` | Compares to `new Date()` by y/m/d |
| `parseISO` | `(s: string) => Date` | `new Date(s)` |
| `isBefore` | `(a: Date, b: Date) => boolean` | `a.getTime() < b.getTime()` |
| `isAfter` | `(a: Date, b: Date) => boolean` | `a.getTime() > b.getTime()` |
| `toDateStr` | `(d: Date) => string` | Returns `"yyyy-MM-dd"` local-time string |

**Known quirk in `formatDate`:** The token replacements are applied sequentially using `String.replace()`, which operates on the first match only. The replacement order in the function matters — `'MMMM'` must be replaced before `'MMM'`, `'EEEE'` before `'EEE'`, `'yyyy'` before `'yy'`, and `'dd'` before `'d'`. The current implementation is correctly ordered. Do not reorder the `.replace()` calls.

**Timezone note:** All date operations use the browser's local timezone. `toDateStr()` builds the string from `getFullYear()`, `getMonth()`, `getDate()` (local time), NOT `toISOString()` (which is UTC). This is intentional — dates stored in Supabase as `date` columns are timezone-agnostic, and the app should treat them as local dates.

---

## 9. Display Constants (`src/lib/types.ts`)

The following color maps drive all status/payment/source styling. They are Tailwind class strings:

```typescript
STATUS_COLORS: Record<RoomStatus, { bg: string; text: string; dot: string }>
// occupied → blue, ready → green, needs_cleaning → amber, maintenance → red, vacant → slate

PAYMENT_COLORS: Record<PaymentStatus, { bg: string; text: string }>
// airbnb → rose, paid → green, partial → amber, unpaid → slate

SOURCE_COLORS: Record<string, string>  // text color only
// Airbnb → rose, Booking.com → blue, Direct → emerald, Walk-in → violet, Other → slate
```

---

## 10. Favicon & Head Metadata

`index.html` includes:

```html
<link rel="icon" type="image/png" href="/Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png" sizes="any" />
<link rel="shortcut icon" href="/Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png" />
<link rel="apple-touch-icon" href="/Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png" />
<meta name="msapplication-TileImage" content="/Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png" />
<meta name="msapplication-TileColor" content="#f59e0b" />
<meta name="theme-color" content="#0f172a" />
```

Plus Open Graph (`og:title`, `og:description`, `og:image`) and Twitter card meta tags. Google Fonts loads Inter (400/500/600/700) via `<link>` in the head.

---

## 11. Feature Completeness Status

| Feature | Status | Notes |
|---|---|---|
| 8-room grid with status badges | COMPLETE | |
| KPI strip (occupied/ready/cleaning/maintenance/vacant counts) | COMPLETE | |
| Status filter pills | COMPLETE | |
| Room detail right panel | COMPLETE | |
| Manual room status change + audit log | COMPLETE | |
| Create new booking (Quick Add Drawer) | COMPLETE | No overlap check yet |
| View booking detail (Booking Detail Drawer) | COMPLETE | |
| Cancel booking (soft delete) | COMPLETE | |
| Update payment status | COMPLETE | |
| Monthly calendar with booking chips | COMPLETE | |
| Gantt / room timeline | COMPLETE | |
| Today highlight | COMPLETE | |
| Month navigation (prev / next / today) | COMPLETE | In both Calendar and Reports |
| Monthly KPIs (revenue, occupancy, bookings, ADR) | COMPLETE | |
| Daily revenue bar chart | COMPLETE | Custom SVG, no recharts |
| Booking source pie/donut chart | COMPLETE | Custom SVG, no recharts |
| Per-room performance table | COMPLETE | |
| Full booking list table | COMPLETE | |
| CSV export | COMPLETE | |
| Toast notifications | COMPLETE | 3.5s auto-dismiss |
| Loading state | COMPLETE | Full-screen spinner with logo |
| Error state | COMPLETE | Full-screen error with Retry button |
| Favicon / Apple touch icon / OG tags | COMPLETE | |
| Auto-set room to occupied on same-day booking | COMPLETE | |

---

## 12. Known Issues & Pending To-Dos

### High Priority

1. **No booking overlap check.** `createBooking()` inserts without verifying the room is free. If the operator creates two bookings for the same room on overlapping dates, both will be saved and the Gantt bars will visually overlap. Implement the client-side pre-check described in Section 5 (`bookings` table).

2. **No Zod validation.** Form validation in `QuickAddDrawer` is manual if/else. Add `zod` + inline schema validation to catch edge cases (e.g., check-out same day as check-in) and get type-safe form values.

### Medium Priority

3. **No polling / live updates.** If two operators have the app open simultaneously, neither will see the other's changes unless they manually click Refresh. Add SWR with `refreshInterval: 8000` as the upgrade path described in Section 4.

4. **Mobile layout is unsupported.** The Rooms grid's 2-column layout works on tablet, but the right panel (w-80 fixed) will overflow on phone screens. The Gantt timeline also requires horizontal scroll. A responsive rework would require either collapsing the right panel into a bottom sheet, or hiding it entirely below `md` breakpoint.

5. **No edit-booking functionality.** `updateBooking()` exists in `actions.ts` but is never called from the UI. There is no way to change dates, room, or guest name after creation. `BookingDetailDrawer` only supports payment status and cancellation.

6. **`StatusBadge` imported in `App.tsx` but unused.** The import `import StatusBadge from './components/StatusBadge'` exists in `App.tsx` but `StatusBadge` is not rendered in `App.tsx` itself (it's used inside `RoomsView`). Remove the import from `App.tsx`.

### Low Priority / Future Features

7. **No PWA / offline detection.** No service worker, no `manifest.json`, no offline fallback. The app silently fails with a loading spinner if the network is unavailable. Add a `navigator.onLine` check and an offline banner.

8. **Room status not auto-reset on checkout.** When a guest's `check_out` date arrives, the room status stays `'occupied'` until the operator manually changes it. A scheduled function (Supabase Edge Function triggered by pg_cron) could scan for expired bookings at midnight and set rooms to `'needs_cleaning'`.

9. **Nightly rate stored as integer.** Rates are stored as `integer` (no cents). If the property ever prices at $25.50/night, the schema would need `ALTER TABLE bookings ALTER COLUMN nightly_rate TYPE numeric(10,2)`.

10. **No per-booking revenue clamping in CSV export.** The CSV export uses the full `differenceInDays(check_out, check_in)` for total, not the month-clamped nights. A booking spanning two months will show its full total in whichever month it appears in, which could be misleading.

11. **`formatDate` format string order sensitivity.** Adding new format tokens requires care about replacement order (see Section 8). Consider replacing with a lookup-based formatter that is order-independent.

---

## 13. Environment & Deployment

- **Dev server:** Vite dev server, auto-started by the Bolt environment. Do NOT run `npm run dev` manually — it is blocked.
- **Build:** `npm run build` produces a `dist/` folder. Build succeeds cleanly as of the last run (1,555 modules, 324KB bundle).
- **Environment variables:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are pre-populated in `.env` and the hosted Bolt environment. Do not modify them.
- **Supabase project ID:** `ljcgnjgppgcujsrsbscn` (visible in the URL in `.env`).
- **Migrations:** The SQL schema file at `supabase/migrations/20260628140910_create_rodland_schema.sql` is a reference copy only. It was applied using the Supabase MCP tool (`mcp__supabase__apply_migration`). The tables and seed data are live in Supabase.
- **Supabase CLI:** NOT supported in this environment. Never run `npx supabase` or `supabase db ...`. Use only the MCP tools for any future schema changes.
