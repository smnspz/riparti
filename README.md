# Backseat

Split the cost of a car trip among passengers, based on fuel and tolls.

The project has two parts:

- an interactive React app with an OpenStreetMap map, where you add passengers
  and legs, search addresses or cities, and choose between fastest and toll-free
  routes. The UI is built with shadcn/ui components on Tailwind CSS;
- a dependency-free calculation module in `src/core/` that works in integer
  euro cents so the shares always add up to the trip total exactly.

The editable trip lives in a small zustand store in `src/store/`, which keeps
the drafts, the undo history, and the browser persistence in one place.

## Web app

```sh
pnpm install
pnpm dev
```

The app opens with a sample Rome → Florence leg so the map and the result are
immediately visible.

- **Add leg** creates a leg above the existing ones; search its start and end
  addresses or cities to build the route. A leg keeps its numbered default
  (**Leg 1**, **Leg 2**, …) until both endpoints are chosen, then it takes the
  route name (for example **Rome - Florence**).
- **Search address or city** fields find addresses, streets, and cities by
  typing, with an autocomplete list from Photon. Suggestions show the city,
  region, and country; the chosen field keeps the address or place name, plus
  its city when that adds context. Choosing a suggestion sets the endpoint and
  requests the route immediately.
- **Route** appears when a toll-free alternative exists: choose **Fastest**
  (which may use tolls) or **Avoid tolls**. The map, kilometre field, and trip
  total update immediately. Choosing a toll-free route sets the toll amount to
  €0.00 for that leg.
- Each leg has its own consumption, fuel price, tolls, round-trip flag, and
  passenger selection, so passengers can join only some legs.
- The map draws each leg's road geometry with numbered markers and a dashed line
  for round trips.
- **Undo** and **redo** on the map, or Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z, revert
  endpoint, route, leg, and passenger changes. Fuel, toll, and round-trip fields
  keep the browser's own text undo.
- The trip is saved in the browser: passengers, legs, the payer, and the
  PayPal.Me link come back after a reload. The undo history is per session.
- The result card updates live with the trip total, each passenger's share, and
  the per-leg fuel/litre/toll breakdown.
- **Paid by** in the passengers card marks who fronted the trip. With a
  PayPal.Me link saved in settings, every other passenger gets a **Request**
  link pre-filled with their exact share.
- **Share summary** creates a link to a read-only page with the trip map and a
  visual split: the total, each passenger's share, who paid, and the fuel and
  tolls behind every leg. The trip is encoded in the link itself, so the page
  works without an account or a server; edit the trip and share a new link.

The interface is available in Italian (the default) and English, and the theme
can follow the operating system (the default), stay light, or stay dark. Open
the **settings** gear in the top-right corner of the map to change the language
and theme and to save the PayPal.Me link of the person who paid; all choices are
stored in the browser. Currency, distances, and place search results follow the
selected language, and map tiles are darkened with the dark theme.

Map tiles come from OpenStreetMap, address and place search from Photon, and
routing from the public Valhalla demo server; all three need network access and
none needs an API key. Payment requests are plain PayPal.Me links: Backseat does
not connect to PayPal, take payments, or know whether a share was paid. If
routing is unavailable, the app falls back to a straight line, shows a
warning, and leaves the kilometre field editable. For production traffic, point
the endpoints in `src/lib/routing.ts` and `src/lib/geocoding.ts` at self-hosted
instances.

## Usage

```ts
import { calculateTrip } from './src/core'
import type { Trip } from './src/core'

const trip: Trip = {
  passengers: [
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
    { id: 'carol', name: 'Carol' },
  ],
  legs: [
    {
      distanceKm: 320,
      fuelConsumptionLPer100Km: 6.5,
      fuelPriceCentsPerLiter: 189,
      tollCents: 2450,
      passengerIds: ['alice', 'bob'],
    },
    {
      distanceKm: 120,
      fuelConsumptionLPer100Km: 6.5,
      fuelPriceCentsPerLiter: 189,
      roundTrip: true,
      passengerIds: ['carol'],
    },
  ],
}

const result = calculateTrip(trip)

console.log(result.totalCents) // 9329
console.log(result.legs[0]) // { distanceKm: 320, liters: 20.8, ... }
console.log(result.passengers)
// [
//   { id: 'alice', name: 'Alice', totalCents: 3191 },
//   { id: 'bob', name: 'Bob', totalCents: 3190 },
//   { id: 'carol', name: 'Carol', totalCents: 2948 },
// ]
```

## Data model

- `Passenger`: a person with a stable `id` and a display `name`.
- `Leg`: one stage of the trip. `distanceKm` must be greater than zero;
  `fuelConsumptionLPer100Km` is in litres per 100 km; `tollCents` defaults to 0;
  `roundTrip` defaults to false and doubles both distance and tolls;
  `passengerIds` lists who is in the car and must contain at least one id.
- `Trip`: the declared passengers plus the legs in travel order.

All monetary inputs are **integer cents**: `fuelPriceCentsPerLiter` and
`tollCents`. A diesel price of €1.89 per litre is `189`.

The result contains:

- `totalCents`: total cost of the trip.
- `legs`: per-leg `distanceKm` (effective, doubled on a return trip), `liters`,
  `fuelCostCents`, `tollCents`, `totalCents`, and each passenger's `shares`.
- `passengers`: the total owed by every declared passenger, including those who
  joined no leg (they owe 0).

## Rounding

Fuel cost is `liters × price` and is rounded once per leg to integer cents. Each
leg total is then split equally; leftover cents go to the first passengers in
the leg, so the sum of all shares equals the leg total exactly. Passenger totals
are sums of these shares, so they also equal the trip total exactly.

## Validation

`calculateTrip` throws an `Error` when:

- a leg has no passengers,
- a leg references an unknown passenger id, or lists the same passenger twice,
- a passenger id is declared twice on the trip,
- `distanceKm` is zero, negative, or not finite,
- `fuelConsumptionLPer100Km` is negative or not finite,
- `fuelPriceCentsPerLiter` or `tollCents` is negative or not an integer.

## Development

```sh
pnpm install
pnpm test        # unit tests (Vitest)
pnpm test:watch  # tests in watch mode
pnpm dev         # Vite dev server for the React shell
pnpm build       # type-check and production build
```

Note: `pnpm lint` currently fails because the scaffold combines
`typescript-eslint@8` with `typescript@7.0.2`, which typescript-eslint rejects at
load time. It is unrelated to the calculation module.
