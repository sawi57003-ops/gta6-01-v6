// The Solano Bay Police Department.
//
// The wanted level is five stars, and the department answers it with
// cruisers and officers. One star is a single cruiser that cruises after
// you; five stars is the whole department. Cruisers chase Danny's position
// with a little prediction, ram when they catch up, and stall out when
// they hit a wall too hard. On foot, officers get out and walk Danny down
// — if one reaches him, he is busted. Lose the heat by breaking contact:
// stay unseen and out of trouble and the stars tick down one at a time.

import { TUNING, CAR_MODELS } from './config.js';
import { createCar, updateCar, carsTouch } from './vehicles.js';
import { damagePlayer } from './player.js';

const CRUISER_MODEL = { name: 'Interceptor', top: 640, accel: 520, turn: 3.1 };

export function createPolice() {
  return {
    cars: [],
    officers: [],
    spawnTimer: 0,
    sirenTimer: 0,
    bustedTimer: 0,
  };
}

// Send every cruiser and officer home: the heat is over, or Danny paid.
export function clearPolice(police) {
  police.cars = [];
  police.officers = [];
  police.spawnTimer = 0;
}

// How many cruisers the current heat calls for. Five stars is four cars;
// one star is one. Officers appear from two stars up.
export function wantedCruiserCount(wanted) {
  return Math.min(4, Math.max(0, wanted));
}

export function wantedOfficerCount(wanted) {
  if (wanted < 2) return 0;
  return Math.min(3, wanted - 1);
}

function spawnCruiser(police, player, city) {
  // Spawn off-screen-ish: on a road, a few hundred px from Danny, in the
  // direction he is travelling so the chase starts immediately.
  const angle = Math.random() * Math.PI * 2;
  const dist = 520 + Math.random() * 260;
  let x = player.x + Math.cos(angle) * dist;
  let y = player.y + Math.sin(angle) * dist;
  x = Math.max(60, Math.min(2640, x));
  y = Math.max(60, Math.min(2500, y));
  const car = createCar(CRUISER_MODEL, x, y, Math.atan2(player.y - y, player.x - x), '#e8e4da', 'police');
  car.siren = Math.random() * 2;
  police.cars.push(car);
}

function spawnOfficer(police, player, city) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 300 + Math.random() * 160;
  police.officers.push({
    x: Math.max(40, Math.min(2660, player.x + Math.cos(angle) * dist)),
    y: Math.max(40, Math.min(2520, player.y + Math.sin(angle) * dist)),
    angle: 0,
    speed: 165,
    radius: 12,
  });
}

export function updatePolice(police, dt, player, city, sound) {
  const wanted = player.wanted;

  // No heat, no cops: cruisers already out drive off and fade.
  if (wanted <= 0) {
    police.cars = police.cars.filter((c) => {
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      return d < 900;
    });
    police.officers = [];
    return { busted: false };
  }

  // Top up the fleet to what the heat calls for.
  police.spawnTimer -= dt;
  if (police.cars.length < wantedCruiserCount(wanted) && police.spawnTimer <= 0) {
    spawnCruiser(police, player, city);
    police.spawnTimer = TUNING.policeSpawnDelay;
  }
  if (player.car === null && police.officers.length < wantedOfficerCount(wanted) && police.spawnTimer <= 0) {
    spawnOfficer(police, player, city);
    police.spawnTimer = TUNING.policeSpawnDelay;
  }

  // Siren blips, staggered so four cruisers do not chirp in unison.
  police.sirenTimer -= dt;
  if (police.sirenTimer <= 0) {
    police.sirenTimer = 0.9 + Math.random() * 1.4;
    if (sound) sound.sirenBlip();
  }

  // Cruisers: steer at Danny with a little prediction, ram on contact.
  for (const car of police.cars) {
    const lead = 0.35;
    const tx = player.x + Math.cos(player.angle) * (player.car ? player.car.speed : 0) * lead;
    const ty = player.y + Math.sin(player.angle) * (player.car ? player.car.speed : 0) * lead;
    const want = Math.atan2(ty - car.y, tx - car.x);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.2));
    const hit = updateCar(car, { throttle: 1, steer }, dt, city);
    if (hit && sound) sound.crash();
    // Ram: contact with Danny's car shoves it and hurts him a little.
    const target = player.car || player;
    const d = Math.hypot(car.x - target.x, car.y - target.y);
    if (d < car.radius + target.radius + 2) {
      if (player.car) {
        player.car.speed *= 0.82;
        player.car.angle += (Math.random() - 0.5) * 0.12;
      }
      damagePlayer(player, 4);
      if (sound) sound.crash();
    }
  }

  // Officers on foot: walk Danny down. Touch him and he is busted.
  let busted = false;
  for (const off of police.officers) {
    const dx = player.x - off.x;
    const dy = player.y - off.y;
    const d = Math.hypot(dx, dy) || 1;
    off.angle = Math.atan2(dy, dx);
    const step = off.speed * dt;
    const nx = off.x + (dx / d) * step;
    const ny = off.y + (dy / d) * step;
    if (city && !city.isBlocked(nx, ny)) { off.x = nx; off.y = ny; }
    if (d < TUNING.arrestRange && player.car === null) busted = true;
  }

  return { busted };
}

// Tick the wanted decay: while Danny stays out of trouble and out of
// sight of a cruiser, the heat cools one star per interval.
export function decayWanted(police, player, dt, state) {
  if (player.wanted <= 0) return;
  state.timer -= dt;
  if (state.timer > 0) return;
  state.timer = TUNING.wantedDecaySeconds;
  // Only cool down when no cruiser is close — being chased keeps the heat.
  const near = police.cars.some((c) => Math.hypot(c.x - player.x, c.y - player.y) < 420);
  if (!near) player.wanted = Math.max(0, player.wanted - 1);
}
