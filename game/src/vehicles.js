// Cars: how they move, how they turn, how they stop.
//
// A car is a point with a heading, a speed along that heading, a model
// (top speed, acceleration, steering) and a paint job. Driving is arcade:
// hold up to accelerate, down to brake and then reverse, left and right to
// steer — but steering only bites while the car is moving, and it bites
// harder the slower you go, so a handbrake turn feels like one. Cars
// collide with buildings (they stop, with a crunch the caller hears) and
// slide along them rather than sticking.

import { TUNING } from './config.js';

let nextCarId = 1;

// Make a car. `model` is one of CAR_MODELS; `kind` is 'civilian',
// 'parked', 'police' or 'mission'. Police and mission cars get their
// colours from the caller, never from the random paint list.
export function createCar(model, x, y, angle, color, kind) {
  return {
    id: nextCarId,
    kind: kind || 'civilian',
    model,
    name: model.name,
    x,
    y,
    angle: angle || 0,
    speed: 0,
    color: color || '#c23b2e',
    radius: TUNING.carRadius,
    crashed: false,
    crashTimer: 0,
    siren: 0,
  };
}

// Drive one car for one frame. `drive` is { throttle: -1..1, steer: -1..1 }
// where throttle 1 is full acceleration and -1 is brake/reverse. `city`
// is the built city, used only for building collision. Returns true when
// the car hit something solid this frame.
export function updateCar(car, drive, dt, city) {
  const top = car.model.top;
  const accel = car.model.accel;
  const turn = car.model.turn;
  let hit = false;

  if (drive.throttle > 0) {
    car.speed += accel * drive.throttle * dt;
  } else if (drive.throttle < 0) {
    if (car.speed > 8) {
      // Still rolling forward: braking.
      car.speed += TUNING.carBrake * drive.throttle * dt;
    } else {
      // Stopped or nearly: reverse, capped low.
      car.speed += accel * 0.55 * drive.throttle * dt;
      if (car.speed < -TUNING.carReverseMax) car.speed = -TUNING.carReverseMax;
    }
  } else {
    // Coasting: drag bleeds speed off.
    car.speed -= car.speed * 1.6 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  if (car.speed > top) car.speed = top;

  // Steering scales with speed but never vanishes entirely, and reverses
  // when reversing — the car turns the way its nose is going.
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 140);
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += drive.steer * turn * steerAuthority * dir * dt;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (city && city.isBlocked(nx, ny)) {
    // Try sliding along one axis before giving up and stopping.
    if (!city.isBlocked(nx, car.y)) {
      car.x = nx;
    } else if (!city.isBlocked(car.x, ny)) {
      car.y = ny;
    }
    if (Math.abs(car.speed) > 120) hit = true;
    car.speed *= 0.35;
  } else {
    car.x = nx;
    car.y = ny;
  }

  if (car.crashTimer > 0) car.crashTimer -= dt;
  if (hit) car.crashTimer = 0.3;
  return hit;
}

// Stop a car dead — used when the player bails out or a cruiser is rammed
// into a wall hard enough to stall it.
export function stopCar(car) {
  car.speed = 0;
}

// How fast this car is going, as a 0..1 fraction of its own top speed.
export function speedNorm(car) {
  return Math.min(1, Math.abs(car.speed) / car.model.top);
}

// True when a car is effectively parked — rolling slower than a walk.
export function isStopped(car) {
  return Math.abs(car.speed) < 8;
}

// Distance between two cars, centre to centre.
export function carDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// True when two cars overlap enough to count as a collision.
export function carsTouch(a, b) {
  return carDistance(a, b) < a.radius + b.radius - 4;
}

// Push two overlapping cars apart along the line between them, and trade
// a little speed so a ram feels like a ram instead of a ghost pass.
export function resolveCarCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const overlap = (a.radius + b.radius - 4 - d) / 2;
  if (overlap <= 0) return;
  const ux = dx / d;
  const uy = dy / d;
  a.x -= ux * overlap;
  a.y -= uy * overlap;
  b.x += ux * overlap;
  b.y += uy * overlap;
  const swap = a.speed;
  a.speed = a.speed * 0.4 + b.speed * 0.25;
  b.speed = b.speed * 0.4 + swap * 0.25;
}
