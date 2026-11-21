// Sol Bay's street grid.
//
// The city is a regular 8x8 grid of blocks separated by roads, with a
// beach and the sea along the south edge, a neon Downtown in the middle, a
// working Harbor on the east side, and parks scattered through the quieter
// blocks. Every placement is seeded, so the same seed rebuilds the same
// city. Buildings sit inside blocks with a sidewalk margin; each block
// holds one or two buildings, a park, or a parking lot. Palms line the
// beach road and the Boardwalk strip, and neon signs mark the Downtown
// blocks after dark.

import { WORLD, PITCH, PALETTE } from './config.js';
import { mulberry32, pick, randRange } from './random.js';

// Centre of the i-th road (0-based) along either axis.
export function roadCenter(i) {
  return i * PITCH + WORLD.road / 2;
}

// Top-left corner of the i-th block along either axis.
export function blockOrigin(i) {
  return i * PITCH + WORLD.road;
}

// True when a point is on a road: within half a road width of a grid line.
export function onRoad(x, y) {
  const m = ((x % PITCH) + PITCH) % PITCH;
  const n = ((y % PITCH) + PITCH) % PITCH;
  return m < WORLD.road || n < WORLD.road;
}

// Snap a point to the nearest road centre line, keeping the other axis.
export function nearestRoadPoint(x, y) {
  const gx = Math.round((x - WORLD.road / 2) / PITCH);
  const gy = Math.round((y - WORLD.road / 2) / PITCH);
  const cx = gx * PITCH + WORLD.road / 2;
  const cy = gy * PITCH + WORLD.road / 2;
  if (Math.abs(x - cx) < Math.abs(y - cy)) return { x: cx, y };
  return { x, y: cy };
}

// The block indices {bx, by} a point sits in, for district and spawn logic.
export function nearestBlock(x, y) {
  return { bx: Math.floor(x / PITCH), by: Math.floor(y / PITCH) };
}

// The centre of a named block, for mission targets and spawns.
export function blockCenter(bx, by) {
  return { x: blockOrigin(bx) + WORLD.block / 2, y: blockOrigin(by) + WORLD.block / 2 };
}

export function buildCity(seed) {
  const rng = mulberry32(seed ^ 0x5a1b0e77);
  const blocks = [];
  const buildings = [];
  const parks = [];
  const palms = [];
  const neonSigns = [];
  const parkingLots = [];
  const cranes = [];

  // A scatter of palms inside one block, used for parks and the beach row.
  function scatterPalms(x0, y0, w, h, count) {
    for (let i = 0; i < count; i += 1) {
      palms.push({
        x: x0 + 20 + rng() * (w - 40),
        y: y0 + 30 + rng() * (h - 60),
        s: 0.8 + rng() * 0.5,
      });
    }
  }

  for (let bx = 0; bx < WORLD.blocks; bx += 1) {
    for (let by = 0; by < WORLD.blocks; by += 1) {
      const x0 = blockOrigin(bx);
      const y0 = blockOrigin(by);
      const w = WORLD.block;
      const h = WORLD.block;
      const isBeachRow = by === WORLD.blocks - 1;
      const isDowntown = bx >= 3 && bx <= 5 && by >= 2 && by <= 4;
      const isHarbor = bx === WORLD.blocks - 1 && by >= 4 && by <= 6;
      blocks.push({ bx, by, x0, y0, w, h, isBeachRow, isDowntown, isHarbor });

      if (isBeachRow) {
        // Beachfront: sand and palms, no buildings at all.
        scatterPalms(x0, y0, w, h, 6);
        continue;
      }
      if (isHarbor) {
        // The Harbor is container yards and one big lot for the trucks.
        parkingLots.push({ x0: x0 + 14, y0: y0 + 14, w: w - 28, h: h - 28 });
        cranes.push({ x: x0 + w / 2, y: y0 + 40, h: 120 + rng() * 60 });
        continue;
      }
      const roll = rng();
      if (roll < 0.14) {
        // A park: grass, a couple of trees, palms.
        parks.push({ x0: x0 + 16, y0: y0 + 16, w: w - 32, h: h - 32 });
        scatterPalms(x0, y0, w, h, 5);
        continue;
      }
      if (roll < 0.22) {
        parkingLots.push({ x0: x0 + 14, y0: y0 + 14, w: w - 28, h: h - 28 });
        continue;
      }
      // One or two buildings per block, with a roof colour and — Downtown —
      // a neon edge and a glowing sign.
      const two = rng() < 0.45;
      const parts = two
        ? [
            { x: x0 + 18, y: y0 + 18, w: w * 0.42, h: h * 0.55 },
            { x: x0 + w * 0.52, y: y0 + h * 0.32, w: w * 0.38, h: h * 0.5 },
          ]
        : [{ x: x0 + 24, y: y0 + 24, w: w - 48, h: h - 48 }];
      for (const p of parts) {
        const roof = pick(rng, PALETTE.buildingRoof);
        const neon = isDowntown && rng() < 0.75 ? pick(rng, PALETTE.buildingNeon) : null;
        buildings.push({
          x: p.x, y: p.y, w: p.w, h: p.h,
          roof,
          neon,
          height: 1 + Math.floor(rng() * 3),
        });
        if (neon) {
          neonSigns.push({
            x: p.x + p.w / 2,
            y: p.y - 6,
            w: Math.min(64, p.w * 0.5),
            color: neon,
            text: pick(rng, ['SOL', 'HEAT', '24H', 'BAR', 'HOTEL', 'CLUB', 'CASINO']),
          });
        }
      }
      // A palm or two on the block corners, Downtown especially.
      if (rng() < 0.5) {
        palms.push({
          x: x0 + 10 + rng() * 20,
          y: y0 + 10 + rng() * 20,
          s: 0.7 + rng() * 0.4,
        });
      }
    }
  }

  // A row of beach palms along the south road, for the Boardwalk shot.
  for (let i = 0; i < 26; i += 1) {
    palms.push({
      x: 30 + rng() * (WORLD.size - 60),
      y: WORLD.beachY - 14 - rng() * 26,
      s: 0.9 + rng() * 0.5,
    });
  }

  return {
    seed,
    blocks,
    buildings,
    parks,
    palms,
    neonSigns,
    parkingLots,
    cranes,

    // A building blocks walking and driving; roads, lots and sand are open.
    // The water past the beach edge is not.
    isBlocked(x, y) {
      if (x < 0 || y < 0 || x > WORLD.size || y > WORLD.size) return true;
      if (y > WORLD.beachY + 6) return true;
      for (const b of buildings) {
        if (x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4) return true;
      }
      return false;
    },

    // A random open point (road or lot) for spawning a car or a pedestrian.
    randomOpenPoint() {
      for (let tries = 0; tries < 40; tries += 1) {
        const x = 40 + rng() * (WORLD.size - 80);
        const y = 40 + rng() * (WORLD.beachY - 80);
        if (!this.isBlocked(x, y)) return { x, y };
      }
      return { x: roadCenter(2), y: roadCenter(2) };
    },

    // A random open point on a road, for traffic that must stay on tarmac.
    randomRoadPoint() {
      const i = Math.floor(rng() * (WORLD.blocks + 1));
      const j = Math.floor(rng() * (WORLD.blocks + 1));
      if (rng() < 0.5) return { x: roadCenter(i), y: 40 + rng() * (WORLD.beachY - 80) };
      return { x: 40 + rng() * (WORLD.size - 80), y: roadCenter(j) };
    },
  };
}

// The district name for a point, for the HUD's location readout. The
// geography is fixed: beach south, Harbor east, Downtown centre, Little
// Havana west, North Beach north, The Docks far east, Crosstown the rest.
export function districtAt(x, y) {
  const bx = Math.floor(x / PITCH);
  const by = Math.floor(y / PITCH);
  if (by >= WORLD.blocks - 1) return 'Boardwalk';
  if (bx >= WORLD.blocks - 1 && by >= 4) return 'Harbor';
  if (bx >= 3 && bx <= 5 && by >= 2 && by <= 4) return 'Downtown';
  if (bx <= 1 && by >= 2 && by <= 5) return 'Little Havana';
  if (by <= 1) return 'North Beach';
  if (bx >= 6) return 'The Docks';
  return 'Crosstown';
}

// A point inside a named district, for mission targets. The map is coarse
// on purpose: a mission says "the Harbor" and this answers with a road
// point inside it, so the marker always lands somewhere drivable.
export function districtPoint(name) {
  const spots = {
    Boardwalk: { x: roadCenter(4), y: roadCenter(7) },
    Harbor: { x: roadCenter(7), y: roadCenter(5) },
    Downtown: { x: roadCenter(4), y: roadCenter(3) },
    'Little Havana': { x: roadCenter(1), y: roadCenter(4) },
    'North Beach': { x: roadCenter(2), y: roadCenter(1) },
    'The Docks': { x: roadCenter(6), y: roadCenter(6) },
    Crosstown: { x: roadCenter(5), y: roadCenter(5) },
  };
  return spots[name] || { x: roadCenter(4), y: roadCenter(4) };
}
