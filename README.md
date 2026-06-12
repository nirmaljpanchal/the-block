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
