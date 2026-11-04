# Riparti

Splitting a road trip by hand is fiddly: fuel prices, consumption, tolls and
round trips change from leg to leg, and passengers rarely travel the whole way.

Riparti does the maths for you. Add the legs of the trip, choose who is in the
car on each one, and it returns what every passenger owes, plus a link you can
send them.

## What it does

- **Splits leg by leg.** Every leg has its own consumption, fuel price, tolls
  and round-trip flag.
- **Builds the route.** Search addresses and cities, then compare the fastest
  route with a toll-free alternative when one exists.
- **Never loses a cent.** Amounts are integer cents, so the shares always add up
  to the trip total exactly.
- **Shares with a link.** The map and the split are encoded in the URL: no
  account, no server, nothing to install.
- **Speaks Italian and English** and keeps the trip in the browser.

## Development

You need Node.js 22.23 or newer and pnpm.

```sh
pnpm install
pnpm dev        # editor at http://localhost:5173/app/
pnpm dev:site   # landing and legal pages at http://localhost:4321
```

The editor starts with a sample Rome → Florence trip, so the map and the split
are visible immediately.

```sh
pnpm test       # unit tests
pnpm build      # production build
pnpm preview    # serve the built site
```

The repository is a pnpm workspace with two apps: `apps/app` is the React
editor, served under `/app/`, and `apps/site` is the Astro landing page and
content pages, served at `/`.
