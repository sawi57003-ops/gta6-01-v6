# SOL BAY HEAT

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sawi57003-ops/gta6-01-v6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sawi57003-ops/gta6-01-v6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A top-down open-world crime game for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01).

## The story

Danny Reyes is a getaway driver who owes **$75,000 to the Solano family**.
One week. Six jobs. The whole bay is hiring — if you can drive, run, and
stay out of the cells long enough to collect.

Sol Bay is a fictional coastal city: an 8x8 street grid with a neon
Boardwalk, a working Harbor, glass Downtown towers, Little Havana cafés,
North Beach motels, The Docks warehouses and the soft middle of Crosstown.
Walk it, steal any car on it, and watch the wanted stars climb when the
Solano Bay Police Department decides you are the problem.

## Six jobs, $82,000

| Job | Pay |
| --- | --- |
| First Pickup | $9,000 |
| Hot Wheels | $11,000 |
| Courier Run | $13,000 |
| Getaway | $14,000 |
| Payday | $16,000 |
| The Big One | $19,000 |

Finish all six and the $75,000 debt is gone, with $7,000 to spare.

## How to play

- **WASD / arrows** — walk, or drive when you are in a car
- **E** — get in / out of a car (steal any parked or traffic car)
- **Space** — punch
- **F** — shoot (pistol, watch your ammo)
- **M** — jobs list
- **P** — pause
- **R** — change radio station

The wanted level runs from one to five stars. Police cruisers chase and
ram; officers on foot will try to arrest you. Lose the heat by breaking
line of sight and staying out of trouble, or pay the price.

## Features

- Top-down open world: 8x8 street grid, beach, harbor, neon downtown
- Drive and walk: steal any car, traffic and pedestrians react
- Five-star wanted level with chasing, ramming police cruisers
- Six story missions paying off a $75,000 debt
- Combat: punch + pistol, ammo pickups scattered through the city
- HUD: cash, debt, health, ammo, wanted stars, district, current job, live minimap, radio
- Synthesised WebAudio sound — no audio files
- Start / pause / busted / wasted / complete screens; progress saves to localStorage
- Deterministic city: `?seed=N` rebuilds the same Sol Bay; `?shot=` stages a screenshot scene

## Run it

```sh
# Build + validate (writes dossier.json and BUILD.txt to out/)
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

# Play it locally
node serve.ts
# then open http://localhost:8080
```

`main.ts` is the entrypoint: it owns the content catalogue (districts,
radio, cars, story beats, missions), generates `game/src/content.js` from
it, validates all fifteen game modules, and writes the dossier the judge
reads. The game itself is plain static files — `game/index.html` and its
ES modules, no library, no network request.

## License

MIT — see [LICENSE](LICENSE).
