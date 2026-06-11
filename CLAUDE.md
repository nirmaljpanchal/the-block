# Vehicle Auction Bidding Prototype — Conventions

This document outlines the technical conventions and patterns for this Vite + React + TypeScript project. All code must follow these guidelines.

## TypeScript & Type Safety

- Strict mode enabled in `tsconfig.json` (strict: true)
- No `any` types — always use explicit types
- All functions and variables must have type annotations
- Component props interfaces should be colocated with the component

## Data Access & State Management

- Single data access point: `VehicleService` interface in `src/api/client.ts`
- All components must use this service layer — never access seed data or localStorage directly
- Use `@tanstack/react-query` for server state and caching
- UI components are consumers; they never know about data loading details
- All user input validation happens in the service layer, not in components

## Security

### Dangerous Functions

- Never use `dangerouslySetInnerHTML` — always render strings as plain text
- Never execute user input as code or HTML

### URL Handling

- All image URLs must be sanitized through `src/lib/urls.ts` before rendering
- `sanitizeImageUrl(url)` whitelist:
  - `http://` and `https://` absolute URLs (external images)
  - Same-origin relative paths (e.g., `/images/vehicle.jpg`)
- Rejects:
  - `data:` URLs
  - `javascript:` URLs
  - Any other protocol or invalid format
- Falls back to placeholder image for rejected URLs
- Never construct image URLs from user input; validate before rendering

## Money & Numbers

- Store all monetary values as **dollars** (not cents or floats)
  - Example: $14,500 is stored as `14500` (dollars only)
  - Use integer arithmetic to avoid floating-point precision errors
- Display money using `Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })`
- Use `formatCurrency(dollars: number): string` from `src/lib/formatters.ts`
- Store kilometers as integers (not floats)
- Use `formatOdometer(km: number): string` from `src/lib/formatters.ts`

## Dates & Times

- Auction times are normalized relative to load time at app startup
- Load time reference: `LOAD_TIME = new Date('2026-04-05T12:00:00Z')`
- Seed data has `auctionStart` as ISO strings (e.g., `'2026-04-12T14:30:00Z'`)
- Service normalizes these to `auctionEndTime` (milliseconds since epoch) during load
- Use `formatDate(ms: number): string` from `src/lib/formatters.ts`
- Use `getTimeRemaining(endTime: number): string` for auction countdowns

## Components

- Small, single-purpose, colocated with their module CSS file
- Feature components live under `src/features/`
- UI primitives live under `src/components/`
- Each component file has a corresponding `.module.css` file
- Props validation: use TypeScript interfaces, not prop validation libraries
- No prop drilling — use context or react-query for shared state
- Components are stateless consumers — all data fetching via react-query

## CSS & Styling

- CSS Modules for component styles (filename.module.css)
- Mobile-first design: start with mobile constraints, add media queries for larger screens
- Test at two breakpoints minimum: 375px (mobile) and 1280px (desktop)
- CSS custom properties (CSS variables) for colors and spacing
- No global styles in components — use `src/index.css` for resets and base styles
- Responsive grid: `grid-template-columns: repeat(auto-fill, minmax(250px, 1fr))` for vehicle cards

## Project Structure

```
src/
  api/
    client.ts         # VehicleService interface and mock implementation
    normalize.ts      # Data normalization (dates, seed data)
  components/         # Reusable UI primitives
    Button.tsx        # Button component
    Badge.tsx         # Badge component
    Spinner.tsx       # Loading spinner
    ErrorState.tsx    # Error display
    EmptyState.tsx    # Empty state display
  features/
    inventory/        # Vehicle listing page
      InventoryPage.tsx
      InventoryPage.module.css
    vehicle/          # Vehicle detail page
      VehicleDetailPage.tsx
      VehicleDetailPage.module.css
    bidding/          # (TODO) Bidding features
  hooks/              # Custom React hooks
  lib/
    formatters.ts     # formatCurrency, formatDate, formatOdometer, getTimeRemaining
    urls.ts           # sanitizeImageUrl
  types/
    index.ts          # Shared TypeScript interfaces
  App.tsx
  App.module.css
  main.tsx
  index.css

data/
  vehicles.json       # Seed data — raw, unnormalized

CLAUDE.md             # This file
```

## No External UI Libraries

- No Material-UI, Tailwind, Bootstrap, or component libraries
- Plain CSS Modules and CSS custom properties only
- Build components from scratch: Button, Badge, Spinner, etc.

## Dependencies

Runtime dependencies only:
- `react`
- `react-dom`
- `react-router-dom`
- `@tanstack/react-query`

Dev dependencies are handled by Vite template defaults.

## Testing

- TypeScript compiler validation: `npm run build`
- Development server: `npm run dev` (both routes render)
- Manual browser testing: navigate to "/" (inventory) and "/vehicles/:id" (detail)
- Test responsive layouts at 375px and 1280px viewport widths

## Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] "/" route renders InventoryPage with vehicle grid
- [ ] "/vehicles/:id" route renders VehicleDetailPage with vehicle details
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] No `any` types in the codebase
- [ ] All data access goes through VehicleService
- [ ] All images use sanitizeImageUrl
- [ ] All money is in dollars
- [ ] All dates are in milliseconds since epoch
- [ ] Mobile-first CSS at 375px and 1280px
