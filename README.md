# Vehicle Auction Bidding Prototype

A real-time vehicle auction bidding application built with React, TypeScript, and Vite. Users can browse vehicles, place bids, and compete in live auctions with anti-snipe protection and race condition handling.

## Features

- **Live Auctions** — Real-time bidding with countdown timers
- **Auction Status Filters** — View live, upcoming, or ended auctions
- **Vehicle Search** — Multi-word search across vehicle fields (make, model, year, VIN, etc.)
- **Pagination** — Browse vehicles with 12 items per page
- **Bid History** — View all bids on a vehicle with relative timestamps
- **Race Condition Handling** — Smooth recovery when outbid between render and submit
- **Anti-Snipe Logic** — Auction extends by 60s if bid lands in final 60 seconds
- **Responsive Design** — Mobile-first layout (tested at 375px and 1280px)
- **Type Safety** — Full TypeScript with strict mode

## Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool with HMR
- **React Query** — Server state management
- **React Router** — Client-side routing
- **CSS Modules** — Component-scoped styling

## Local Setup

### Prerequisites

- **Node.js** 18+ (check with `node --version`)
- **npm** 9+ (check with `npm --version`)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VehicleBidding
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173`

4. **Type check**
   ```bash
   npx tsc
   ```
   Runs TypeScript compiler to check for type errors (no build output).

5. **Build for production**
   ```bash
   npm run build
   ```
   TypeScript check + production build.

## Available Scripts

- `npm run dev` — Start development server with hot reload
- `npx tsc` — Type check only (no build output)
- `npm run build` — Type check + production build
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint

## How It Works

### Inventory Page (`/`)

The inventory page displays a grid of vehicles with filtering and search:

1. **Search** — Type vehicle make/model/year/VIN (debounced 800ms)
2. **Filters** — Filter by make, body style, or auction status
3. **Sorting** — Sort by ending soon, price (low/high), or mileage
4. **Pagination** — Browse 12 vehicles per page
5. **Status Badges** — "LIVE" (red), "Upcoming" (yellow), "Ended" (gray)

**Auction Data**
- **Ended Auctions** — 5 random vehicles ended 0-7 days ago
- **Upcoming Auctions** — 3 random vehicles starting 1-2 days from now
- **Live Auctions** — Remaining vehicles with 48-hour duration

### Vehicle Detail Page (`/vehicles/:id`)

The detail page shows vehicle information and a live bidding panel:

1. **Gallery** — Main image with thumbnails, swipe/arrow navigation
2. **Specifications** — VIN, mileage, transmission, drivetrain, etc.
3. **Damage Notes** — Known issues (if any)
4. **Dealership Info** — Location and seller details
5. **Auction Panel** (right sidebar) — Real-time bidding interface

### Bidding Panel

Sticky right sidebar with:

1. **Countdown Timer** — "2d 5h remaining" or "Auction ended"
2. **Auction Details**
   - Current High Bid
   - Total Bids
   - Minimum Next Bid

3. **Bid Form** (if auction is live)
   - Input field with validation
   - Quick bid buttons (+1, +2, +5 increments)
   - Submit button (disabled if validation fails)

4. **Bid History** — Last 10 bids, scrollable
   - Bidder name with "(You)" indicator
   - Bid amount in CAD
   - Relative time (e.g., "5m ago")
   - Highlight animation for new bids

### Bidding Logic

**Validation (Server-Side Authoritative)**
- Bid amount must be ≥ minimum next bid
- Bid amount must be ≤ 10x current high (fat-finger guard)
- Auction must not have ended

**Race Condition Handling**
If outbid between render and submit:
1. Show error: "You've been outbid — current high is $X"
2. Pre-fill form with new minimum bid
3. Announce to screen readers
4. Allow retry

**Anti-Snipe Protection**
- If bid lands within final 60 seconds, auction extends by 60 seconds
- Prevents last-second sniping

### Data Architecture

**Single Data Access Point**
- All components use `VehicleService` interface in `src/api/client.ts`
- Mock implementation in `src/api/mockClient.ts` simulates server behavior

**State Management**
- **Server State** — Vehicles, bids → React Query
- **UI State** — Form inputs, filters, pagination → Local state
- **Real-Time State** — Live bids → Custom `useLiveBids` hook with WebSocket simulation

**Money & Numbers**
- All monetary values stored as **cents** (integer arithmetic)
- Display using `formatCurrency()` to CAD format
- Mileage stored as kilometers (integer)

**Dates & Times**
- Auction times normalized to milliseconds since epoch
- All times are server-authoritative (`Date.now()`)
- Relative time formatting for UI (e.g., "5m ago")

### Search Implementation

Search is debounced (800ms) and handles multiple words:

**User Input:** "honda civic"
1. Split into terms: ["honda", "civic"]
2. Combined vehicle text: "year make model trim vin"
3. Match if **all** terms present in combined text
4. Results: All Hondas with "civic" in any field

Supports partial matches: "20 honda" finds 2020 Honda vehicles.

## Project Structure

```
src/
  api/
    client.ts         # VehicleService interface
    mockClient.ts     # Mock server implementation
    normalize.ts      # Data normalization
    seed.ts           # Vehicle seed data (with auction status distribution)
  components/         # Reusable UI primitives
    Button.tsx
    Badge.tsx
    Spinner.tsx
    ErrorState.tsx
    EmptyState.tsx
  features/
    inventory/        # Inventory listing page
      InventoryPage.tsx
      InventoryPage.module.css
    vehicle/          # Vehicle detail page
      VehicleDetailPage.tsx
      VehicleDetailPage.module.css
      BiddingPanel.tsx
      BiddingPanel.module.css
  hooks/              # Custom React hooks
    useLiveBids.ts    # Live bid subscription with deduplication
  lib/
    formatters.ts     # formatCurrency, formatDate, formatOdometer
    urls.ts           # sanitizeImageUrl with CSP compliance
    bidding.ts        # getMinimumNextBid calculation
    money.ts          # parseMoneyInput validation
  types/
    index.ts          # TypeScript interfaces
  App.tsx             # Routes
  main.tsx            # Entry point
  index.css           # Global styles

data/
  vehicles.json       # Raw seed data
```

## CSS Conventions

- **Mobile-First** — Start with mobile constraints, add breakpoints
- **CSS Modules** — Filename.module.css for component styles
- **CSS Variables** — Custom properties for colors/spacing
- **No UI Libraries** — Plain CSS Modules (no Tailwind/Material-UI)
- **Responsive Grid** — `repeat(auto-fill, minmax(250px, 1fr))`

## Testing

**Type Safety & Build Validation**
- `npx tsc` — TypeScript strict mode validation (no `any` types, full coverage)
- `npm run build` — Full production build with type checking; zero errors required

**Manual Browser Testing**
- Development server: `npm run dev` (Vite HMR for fast iteration)
- Routes tested: "/" (inventory), "/vehicles/:id" (detail with bidding)
- Real-time bid updates: Refresh page → bids persist (localStorage verification)
- Race conditions: Placed bid → outbid before submit → error message pre-fills form

**Responsive Layout Testing**
- Mobile (375px viewport): Single column grid, stacked panels, readable text
- Desktop (1280px viewport): Multi-column grid, sidebar bidding panel, full gallery
- Device testing: Chrome DevTools responsive mode at both breakpoints
- Auction countdown, bid history, and form inputs verified at both sizes

**Functional Areas Tested**
1. **Search & Filters** — Multi-word search ("honda civic"), make filter, body style filter, auction status (live/upcoming/ended), combined filters
2. **Pagination** — 12 items per page, navigation between pages, correct vehicle count
3. **Bidding** — Place bid → update high bid, quick-bid buttons (+1/+2/+5), form validation, minimum bid enforcement
4. **Anti-Snipe** — Bid in final 60s → auction extends by 60s (verified in countdown)
5. **Bid History** — New bids appear without duplicates, relative time updates every 1s, "You" label on user bids, scrollable list of 10+
6. **Gallery** — Thumbnail navigation, arrow key navigation, main image updates
7. **Live Data** — Rival bids arrive randomly; countdown timer updates; sorting by "ending soon" reflects live auction times

**Limitations**
- No automated unit tests (Jest/React Testing Library) — manual verification only
- No e2e tests (Cypress/Playwright) — single browser session tested
- No performance profiling (Lighthouse) — visual inspection only
- No accessibility audit beyond keyboard nav and aria-live verification

## Testing Checklist

- [ ] `npm run dev` starts without errors
- [ ] "/" route renders inventory with vehicle grid
- [ ] Search works with single and multi-word queries
- [ ] Filters work independently and combined
- [ ] Pagination displays correctly with 12 items per page
- [ ] "/vehicles/:id" route renders detail page
- [ ] Gallery thumbnails navigate correctly
- [ ] Countdown timer updates in real-time
- [ ] Can place bids on live auctions
- [ ] Outbid message appears with new minimum bid
- [ ] Bid history shows all bids without duplicates
- [ ] Anti-snipe extends auction in final 60s
- [ ] Responsive at 375px (mobile) and 1280px (desktop)
- [ ] `npx tsc` passes with zero errors

## Time Spent

**~ Around 4 hours total** across 3 sessions:

1. **Project Setup** (Session 1) — Initialized Vite + React + TypeScript, configured strict tsconfig, set up folder structure, created base UI components (Button, Badge, Spinner), established routing (inventory and detail pages), and verified build/dev server.

2. **Bidding Experience** (Session 2) — Implemented form validation with strict money parsing (regex-only, no parseFloat), quick-bid buttons (+1/+2/+5), race condition handling (outbid detection + pre-fill), bid history with relative time updates, anti-snipe protection (60s extension), and accessibility (aria-live announcements).

3. **Search, Filters, & Listing UI** (Session 3) — Built multi-word search (debounced), auction status filtering (live/upcoming/ended), make/body style filters, pagination (12 items/page), responsive vehicle card grid, image gallery with thumbnail nav, and comprehensive test coverage.

**Approach:** Focused on completing one feature end-to-end per session. Started with project foundations and incremental verification (build → dev server → routes). Leveraged React Query for server state and built custom hooks for real-time behavior (useLiveBids). Prioritized strict type safety and mobile-first responsive design.

## Assumptions and Scope

**Included:**
- Live, upcoming, and ended auction statuses with realistic seed data distribution
- Real-time bid updates via custom hook (WebSocket simulation in mock client)
- Full vehicle filtering (make, body style, auction status), search, and sorting
- Responsive layouts tested at 375px (mobile) and 1280px (desktop)
- Type safety throughout (strict TypeScript, no `any` types)
- Accessibility basics (aria-live, aria-describedby, keyboard navigation)

**Skipped:**
- Backend API (mock client with seed data only)
- User authentication or multi-user accounts
- Payment processing or real transaction handling
- WebSocket real-time sync (simulated in mock client)
- Email notifications or push alerts
- Analytics or event tracking
- Internationalization (CAD/en-CA hardcoded)

**Simplified:**
- Bid history capped at 10 display items (show all button available)
- Dealership contact via address only (no phone/email links)
- Vehicle condition based on single grade field (not detailed report card)
- Damage notes as plain text (not clickable regions or photo links)

## Notable Decisions

**1. React Query Over useState**
- Server state (vehicles, bids) managed by React Query; UI state (filters, form inputs) managed locally
- Why: Avoids prop drilling, enables deduplication of concurrent requests, and decouples UI updates from server sync

**2. Relative Time (Not Absolute Timestamps)**
- Bid history and countdown timers show "5m ago" and "2d 5h remaining" (refreshed every 1s)
- Why: Better UX; no need to tell users to refresh; mimics real auction sites

**3. Bid Persistence with loadBids / saveBids**
- Bids are persisted to localStorage (`'bids:v1'`) on app load and after each bid placement
- Structure: `{ [vehicleId]: Bid[] }` with validation; corrupted data is silently discarded
- Why: Preserves bid history across page refreshes and browser restarts without a backend; enables testing and demo persistence; in production would delegate to server

**5. Mobile-First CSS & Auto-Fill Grid**
- Responsive grid uses `repeat(auto-fill, minmax(250px, 1fr))`; layouts start mobile and add media queries
- Why: Ensures usability on all screen sizes; simpler than framework breakpoints

## What I'd Do With More Time

**High Priority:**
- **Persistent Bidder Identity** — Store bidder name in localStorage; pass to mock client to track "your" bids
- **Vehicle Comparison** — Add bidding history chart showing bid escalation over time
- **Advanced Filters** — Price range, mileage range, transmission type, transmission filters
- **Keyboard Shortcuts** — Quick-bid buttons triggered by number keys (1, 2, 5)
- **Unit Tests** — Jest + React Testing Library for components and utility functions (money parsing, formatters)

**Medium Priority:**
- **Image Optimization** — Lazy load thumbnails; next-gen formats (webp); CDN paths
- **Undo Bid** — Allow retraction within 10 seconds (if rules permit)
- **Bidding Notifications** — Toast alerts for outbid, successful bid, auction extended
- **Auction Countdown Color** — Red when <5m remaining
- **Performance Monitoring** — LCP, FID, CLS tracking to catch regressions

**Nice-to-Have:**
- **Dark Mode Toggle** — CSS variables already support it
- **Export Bid History** — CSV or PDF download
- **Real Websocket Sync** — Replace mock client with actual backend
- **Email Notifications** — Integration with backend for outbid/won alerts
- **Bidder Reputation** — Display bid count or auction history per bidder

## Conventions & Rules

See `CLAUDE.md` for detailed development conventions:
- Strict TypeScript (no `any` types)
- No `dangerouslySetInnerHTML`
- Image URLs sanitized through `sanitizeImageUrl()`
- All money in dollars (not cents) at application boundaries
- Dates in milliseconds since epoch
- Components are stateless; data flows through React Query
- No external UI libraries

## License

This is a learning/prototype project.
