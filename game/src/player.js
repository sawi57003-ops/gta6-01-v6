// Danny Reyes, on foot and behind the wheel.
//
// The player is one object with two modes. On foot Danny walks (Shift to
// run), punches, shoots, and can be arrested or hurt. In a car he IS the
// car: his position and heading follow it, and getting out drops him
// beside the driver's door. Cash, health, ammo and the wanted level live
// here because every system reads them — the HUD, the police, the
// missions, the save file.

import { TUNING } from './config.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2,
    radius: TUNING.playerRadius,
    health: TUNING.playerHealth,
    cash: 0,
    ammo: TUNING.pistolAmmoStart,
    wanted: 0,
    car: null, // the car Danny is driving, or null when on foot
    speed: 0,
    punchTimer: 0,
    shootTimer: 0,
    hurtTimer: 0,
    invulnTimer: 0,
    walking: false,
  };
}

// Walk Danny for one frame. `axis` is the input axis (-1..1 each way),
// `running` is the Shift state. Blocked by buildings; the sea stops him
// at the sand. Returns nothing — position and facing are updated in place.
export function updatePlayerOnFoot(player, axis, running, dt, city) {
  const speed = running ? TUNING.runSpeed : TUNING.walkSpeed;
  const len = Math.hypot(axis.x, axis.y);
  player.walking = len > 0.1;
  if (len < 0.1) {
    player.speed = 0;
    return;
  }
  const nx = axis.x / len;
  const ny = axis.y / len;
  player.angle = Math.atan2(ny, nx);
  const stepX = nx * speed * dt;
  const stepY = ny * speed * dt;
  const tx = player.x + stepX;
  const ty = player.y + stepY;
  if (city) {
    if (!city.isBlocked(tx, player.y)) player.x = tx;
    if (!city.isBlocked(player.x, ty)) player.y = ty;
  } else {
    player.x = tx;
    player.y = ty;
  }
  player.speed = speed;
}

// Put Danny into a car: he takes the driver's seat and the car becomes
// his body for movement, collisions and the camera.
export function enterCar(player, car) {
  player.car = car;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
}

// Step out beside the driver's door. Returns false when there is no room
// to stand (a wall right against the door) — then Danny stays put.
export function exitCar(player, city) {
  const car = player.car;
  if (!car) return true;
  const side = car.angle + Math.PI / 2;
  const px = car.x + Math.cos(side) * 26;
  const py = car.y + Math.sin(side) * 26;
  if (city && city.isBlocked(px, py)) {
    const other = car.angle - Math.PI / 2;
    const qx = car.x + Math.cos(other) * 26;
    const qy = car.y + Math.sin(other) * 26;
    if (city.isBlocked(qx, qy)) return false;
    player.x = qx;
    player.y = qy;
  } else {
    player.x = px;
    player.y = py;
  }
  player.angle = car.angle;
  player.car = null;
  player.speed = 0;
  return true;
}

// Hurt Danny by `amount`, with a short invulnerability window so one
// collision does not drain the whole bar in a single frame. Returns true
// when he actually took the hit.
export function damagePlayer(player, amount) {
  if (player.invulnTimer > 0) return false;
  player.health -= amount;
  player.hurtTimer = 0.4;
  player.invulnTimer = 0.5;
  if (player.health < 0) player.health = 0;
  return true;
}

export function healPlayer(player, amount) {
  player.health = Math.min(TUNING.playerHealth, player.health + amount);
}

// Give Danny more bullets, with no upper limit — Sol Bay is generous.
export function addAmmo(player, amount) {
  player.ammo += amount;
  return player.ammo;
}

// Raise the wanted level, capped at five stars. Returns the new level.
export function addWanted(player, stars) {
  player.wanted = Math.min(5, player.wanted + stars);
  return player.wanted;
}

export function clearWanted(player) {
  player.wanted = 0;
}

// True when Danny is dead (wasted) — health hit zero.
export function isWasted(player) {
  return player.health <= 0;
}

// True when Danny is driving right now.
export function isDriving(player) {
  return player.car !== null;
}
