// Traffic and pedestrians: the city that is not Danny.
//
// Civilian cars cruise the roads on a simple rule — keep going straight
// until the next intersection, then maybe turn — and they brake for the
// car in front of them. Pedestrians wander the sidewalks and the parks,
// and they run away from gunfire, punches and speeding cars. Parked cars
// sit in lots and on the Boardwalk: those are the ones Danny steals.
//
// None of this is scripted per car. Each car and each pedestrian carries
// its own little state, and the update step just runs the rules.

import { TUNING, CAR_PAINTS, CAR_MODELS } from './config.js';
import { mulberry32, pick, randRange } from './random.js';
import { createCar, updateCar, carsTouch, resolveCarCollision } from './vehicles.js';
import { onRoad, nearestRoadPoint } from './city.js';

export function createTraffic(city, seed) {
  const rng = mulberry32(seed ^ 0x7aff1c);
  const cars = [];
  const peds = [];
  const parked = [];

  // Moving traffic: seeded models, paints and road starts.
  for (let i = 0; i < TUNING.trafficCount; i += 1) {
    const p = city.randomRoadPoint();
    const model = pick(rng, CAR_MODELS);
    const angle = pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    const car = createCar(model, p.x, p.y, angle, pick(rng, CAR_PAINTS), 'civilian');
    car.speed = TUNING.trafficSpeed * (0.8 + rng() * 0.4);
    car.cruise = car.speed;
    car.turnAt = 0;
    cars.push(car);
  }

  // Parked cars: the stealable ones. A Phoenix waits on the Boardwalk —
  // job two will ask Danny to take it.
  for (let i = 0; i < 9; i += 1) {
    const p = city.randomOpenPoint();
    const model = pick(rng, CAR_MODELS);
    const car = createCar(model, p.x, p.y, pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), pick(rng, CAR_PAINTS), 'parked');
    parked.push(car);
  }
  const phoenix = CAR_MODELS.find((m) => m.name === 'Phoenix');
  const boardwalk = { x: 1350, y: 2440 };
  parked.push(createCar(phoenix, boardwalk.x, boardwalk.y, Math.PI / 2, '#d86a1e', 'parked'));

  // Pedestrians: slow wanderers who keep to open ground.
  for (let i = 0; i < TUNING.pedCount; i += 1) {
    const p = city.randomOpenPoint();
    peds.push({
      x: p.x,
      y: p.y,
      angle: rng() * Math.PI * 2,
      speed: 28 + rng() * 30,
      panic: 0,
      color: pick(rng, ['#e8e4da', '#c96f4a', '#4a7fa5', '#b08a3e', '#7a4a9e', '#5a8a6a']),
      phase: rng() * Math.PI * 2,
    });
  }

  return { cars, peds, parked, rng };
}

// One traffic car, one frame: drive straight along its heading, brake for
// anything ahead, and at an intersection sometimes turn.
export function updateTrafficCar(car, dt, city, allCars, playerCar) {
  // Look ahead: brake when another car (or Danny's car) is close in front.
  let ahead = false;
  for (const other of allCars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 70) {
      const facing = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
      if (facing > 0 && dist < 64) { ahead = true; break; }
    }
  }
  if (playerCar && playerCar !== car) {
    const dx = playerCar.x - car.x;
    const dy = playerCar.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 60) {
      const facing = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
      if (facing > 0) ahead = true;
    }
  }

  const target = ahead ? 0 : car.cruise;
  if (car.speed < target) car.speed += 220 * dt;
  else if (car.speed > target) car.speed -= 420 * dt;

  // At an intersection, roll the dice on a turn.
  if (onRoad(car.x, car.y) && car.turnAt <= 0) {
    const r = Math.random();
    if (r < 0.22) {
      car.angle += Math.PI / 2;
      car.turnAt = 1.2;
    } else if (r < 0.44) {
      car.angle -= Math.PI / 2;
      car.turnAt = 1.2;
    } else {
      car.turnAt = 0.6;
    }
    const snapped = nearestRoadPoint(car.x, car.y);
    car.x = snapped.x * 0.4 + car.x * 0.6;
    car.y = snapped.y * 0.4 + car.y * 0.6;
  }
  car.turnAt -= dt;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (city && !city.isBlocked(nx, ny)) {
    car.x = nx;
    car.y = ny;
  } else {
    // Blocked: turn around rather than grinding into a wall forever.
    car.angle += Math.PI;
    car.speed = car.cruise * 0.5;
  }
}

// One pedestrian, one frame: wander, and run from danger.
export function updatePed(ped, dt, city, danger) {
  if (danger) {
    const dx = ped.x - danger.x;
    const dy = ped.y - danger.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 260) {
      ped.panic = 1.6;
      ped.angle = Math.atan2(dy, dx);
    }
  }
  if (ped.panic > 0) {
    ped.panic -= dt;
    const sp = 150;
    const nx = ped.x + Math.cos(ped.angle) * sp * dt;
    const ny = ped.y + Math.sin(ped.angle) * sp * dt;
    if (city && !city.isBlocked(nx, ny)) { ped.x = nx; ped.y = ny; }
    else ped.angle += Math.PI / 2;
    return;
  }
  ped.phase += dt;
  if (Math.random() < dt * 0.25) ped.angle += (Math.random() - 0.5) * 2.2;
  const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
  if (city && !city.isBlocked(nx, ny)) { ped.x = nx; ped.y = ny; }
  else ped.angle += Math.PI * (0.5 + Math.random());
}

export function updateTraffic(traffic, dt, city, player, danger) {
  const all = [...traffic.cars, ...traffic.parked];
  for (const car of traffic.cars) {
    updateTrafficCar(car, dt, city, all, player.car);
  }
  // Keep civilian cars from stacking on each other.
  for (let i = 0; i < traffic.cars.length; i += 1) {
    for (let j = i + 1; j < traffic.cars.length; j += 1) {
      if (carsTouch(traffic.cars[i], traffic.cars[j])) {
        resolveCarCollision(traffic.cars[i], traffic.cars[j]);
      }
    }
  }
  for (const ped of traffic.peds) {
    updatePed(ped, dt, city, danger);
  }
}

// How many cars exist in the world right now, parked or moving.
export function countCars(traffic) {
  return traffic.cars.length + traffic.parked.length;
}

// The nearest stealable car to a point, within `maxDist` — parked cars
// first, then slow civilian cars. Returns null when nothing is close.
export function nearestStealable(traffic, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of [...traffic.parked, ...traffic.cars]) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// Pull a parked car out of the parked list once Danny takes it.
export function stealParked(traffic, car) {
  const i = traffic.parked.indexOf(car);
  if (i >= 0) traffic.parked.splice(i, 1);
}
