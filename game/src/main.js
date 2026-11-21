// SOL BAY HEAT — the game itself.
//
// Danny Reyes, getaway driver, owes $75,000 to the Solano family. One
// week, six jobs, one open city. This file is the entrypoint: it builds
// the world (city, traffic, police, missions, Danny), runs the frame loop,
// owns the screens (title, playing, paused, jobs, busted, wasted,
// complete), and wires every system together — input to cars, combat to
// the wanted level, missions to cash, and all of it to the save file.
//
// The game reads its words from ./content.js (districts, radio, cars,
// beats) and its numbers from ./config.js. Progress saves to localStorage;
// ?seed=N rebuilds the same city and ?shot= stages a screenshot scene.

import { WORLD, TUNING, CAR_MODELS, CAR_PAINTS, PLAYER_NAME, CITY_NAME, GAME_TITLE, DEBT, STORY } from './config.js';
import { CONTENT } from './content.js';
import { mulberry32, pick } from './random.js';
import { buildCity, districtAt, districtPoint, roadCenter } from './city.js';
import { createInput } from './input.js';
import { SoundEngine } from './audio.js';
import { createCar, updateCar, speedNorm, carsTouch, resolveCarCollision } from './vehicles.js';
import { createPlayer, updatePlayerOnFoot, enterCar, exitCar, damagePlayer, healPlayer, addAmmo, addWanted, clearWanted, isWasted, isDriving } from './player.js';
import { createTraffic, updateTraffic, nearestStealable, stealParked } from './traffic.js';
import { createPolice, updatePolice, decayWanted, clearPolice } from './police.js';
import { createMissions } from './missions.js';
import { drawWorld } from './render.js';
import { drawHud, drawTitle, drawOverlay } from './hud.js';
import { stageShot, shotFromUrl, seedFromUrl } from './shots.js';

const SAVE_KEY = 'solbayheat-save-v1';
const DEFAULT_SEED = 20261121;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const input = createInput();
input.attach(window);
const sound = new SoundEngine();

// --- World ---------------------------------------------------------------

function buildWorld(seed) {
  const city = buildCity(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const start = districtPoint('Little Havana');
  const player = createPlayer(start.x, start.y);
  const traffic = createTraffic(city, seed);
  const police = createPolice();
  const missions = createMissions();

  // Pickups: ammo boxes and health kits scattered through the city.
  const pickups = [];
  for (let i = 0; i < 8; i += 1) {
    const p = city.randomOpenPoint();
    pickups.push({ x: p.x, y: p.y, kind: 'ammo' });
  }
  for (let i = 0; i < 4; i += 1) {
    const p = city.randomOpenPoint();
    pickups.push({ x: p.x, y: p.y, kind: 'health' });
  }

  const world = {
    seed,
    city,
    rng,
    player,
    traffic,
    police,
    missions,
    pickups,
    radio: CONTENT.radio[0],
    radioIndex: 0,
    beats: CONTENT.beats,
    screen: 'title',
    time: 0,
    cam: { x: 0, y: 0 },
    toast: '',
    toastTimer: 0,
    muzzleTimer: 0,
    punchTimer: 0,
    beatIndex: 0,
    beatTimer: 0,
    saveTimer: 0,
    wantedState: { timer: TUNING.wantedDecaySeconds },
    bustedTimer: 0,
    wastedTimer: 0,
    danger: null,
    setToast(text) {
      this.toast = text;
      this.toastTimer = 3.2;
    },
    onComplete() {
      this.screen = 'complete';
      this.save();
    },
    save() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          cash: this.player.cash,
          earned: this.missions.earned,
          index: this.missions.index,
          health: this.player.health,
          ammo: this.player.ammo,
          x: this.player.x,
          y: this.player.y,
        }));
      } catch (e) { /* storage may be unavailable; the game goes on */ }
    },
  };

  // The missions module calls back into the world for toasts and sounds.
  world.sound = sound;
  return world;
}

let world = buildWorld(seedFromUrl(DEFAULT_SEED));

// Restore a previous run, unless a screenshot scene asked for a fresh pose.
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.cash !== 'number') return;
    world.player.cash = s.cash;
    world.player.health = s.health || 100;
    world.player.ammo = s.ammo || TUNING.pistolAmmoStart;
    world.missions.earned = s.earned || 0;
    world.missions.index = Math.min(s.index || 0, 5);
    world.missions.active = true;
    if (typeof s.x === 'number') { world.player.x = s.x; world.player.y = s.y; }
  } catch (e) { /* a corrupt save is ignored, not fatal */ }
}

const shot = shotFromUrl();
if (shot) {
  stageShot(world, shot);
} else {
  loadSave();
}

// --- Actions -------------------------------------------------------------

function cycleRadio() {
  world.radioIndex = (world.radioIndex + 1) % CONTENT.radio.length;
  world.radio = CONTENT.radio[world.radioIndex];
  world.setToast('♪ ' + world.radio.name + ' — ' + world.radio.tag);
  sound.click();
}

function tryEnterCar() {
  const player = world.player;
  if (player.car) {
    if (exitCar(player, world.city)) sound.click();
    return;
  }
  const car = nearestStealable(world.traffic, player.x, player.y, 64);
  if (!car) return;
  if (car.kind === 'parked') stealParked(world.traffic, car);
  if (car.kind === 'civilian') {
    // Stealing a car with its driver in it is a crime, obviously.
    addWanted(player, 1);
    world.setToast('Car stolen — the PD has your plate');
  }
  enterCar(player, car);
  sound.door();
  sound.horn();
}

function tryPunch() {
  const player = world.player;
  if (player.car || player.punchTimer > 0) return;
  player.punchTimer = 0.28;
  world.punchTimer = 0.28;
  sound.punch();
  // Anything close in front of Danny's fist gets shoved and scared.
  const range = TUNING.punchRange;
  const fx = Math.cos(player.angle);
  const fy = Math.sin(player.angle);
  for (const ped of world.traffic.peds) {
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;
    if (Math.hypot(dx, dy) < range && dx * fx + dy * fy > 0) {
      ped.panic = 2;
      ped.angle = Math.atan2(dy, dx);
    }
  }
  for (const off of world.police.officers) {
    const dx = off.x - player.x;
    const dy = off.y - player.y;
    if (Math.hypot(dx, dy) < range && dx * fx + dy * fy > 0) {
      // Knocking an officer down is a very bad idea, legally speaking.
      off.x -= fx * 60;
      off.y -= fy * 60;
      addWanted(player, 1);
    }
  }
  // A punch near a parked car sets its alarm off. Noise brings heat.
  for (const car of world.traffic.parked) {
    if (Math.hypot(car.x - player.x, car.y - player.y) < 70) {
      addWanted(player, 1);
      world.setToast('Car alarm! Someone called it in');
      break;
    }
  }
}

function tryShoot() {
  const player = world.player;
  if (player.car || player.ammo <= 0 || player.shootTimer > 0) {
    if (player.ammo <= 0 && !player.car) world.setToast('Out of ammo — find a gold box');
    return;
  }
  player.ammo -= 1;
  player.shootTimer = 0.32;
  world.muzzleTimer = 0.09;
  sound.shoot();
  addWanted(player, 1);
  const fx = Math.cos(player.angle);
  const fy = Math.sin(player.angle);
  // Hit the closest thing roughly in front of the barrel: officer first,
  // then pedestrian, then a traffic car (which swerves and stops).
  let best = null;
  let bestD = TUNING.pistolRange;
  const consider = (x, y, kind, ref) => {
    const dx = x - player.x;
    const dy = y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < bestD && dx * fx + dy * fy > d * 0.7) { bestD = d; best = { kind, ref }; }
  };
  for (const off of world.police.officers) consider(off.x, off.y, 'officer', off);
  for (const ped of world.traffic.peds) consider(ped.x, ped.y, 'ped', ped);
  for (const car of world.traffic.cars) consider(car.x, car.y, 'car', car);
  if (!best) return;
  if (best.kind === 'officer') {
    const i = world.police.officers.indexOf(best.ref);
    if (i >= 0) world.police.officers.splice(i, 1);
    addWanted(player, 1);
    world.setToast('Officer down — that was a mistake');
  } else if (best.kind === 'ped') {
    best.ref.panic = 3;
    world.danger = { x: player.x, y: player.y };
  } else if (best.kind === 'car') {
    best.ref.speed = 0;
    best.ref.cruise = 0;
    world.danger = { x: player.x, y: player.y };
  }
}

function collectPickups() {
  const player = world.player;
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const p = world.pickups[i];
    if (Math.hypot(p.x - player.x, p.y - player.y) < TUNING.pickupRadius) {
      if (p.kind === 'ammo') {
        addAmmo(player, TUNING.ammoPickupAmount);
        world.setToast('Ammo +' + TUNING.ammoPickupAmount);
      } else {
        healPlayer(player, 35);
        world.setToast('Health +35');
      }
      sound.pickup();
      world.pickups.splice(i, 1);
    }
  }
}

function respawn(penalty, label) {
  const player = world.player;
  const garage = districtPoint('Little Havana');
  player.x = garage.x;
  player.y = garage.y;
  player.angle = -Math.PI / 2;
  player.health = TUNING.playerHealth;
  player.car = null;
  player.wanted = 0;
  player.cash = Math.max(0, player.cash - penalty);
  clearPolice(world.police);
  world.setToast(label + ' — $' + penalty.toLocaleString('en-US') + ' gone');
  world.save();
}

// --- Frame update ----------------------------------------------------------

function update(dt) {
  const player = world.player;
  world.time += dt;
  if (world.toastTimer > 0) world.toastTimer -= dt;
  if (world.muzzleTimer > 0) world.muzzleTimer -= dt;
  if (world.punchTimer > 0) world.punchTimer -= dt;
  if (player.punchTimer > 0) player.punchTimer -= dt;
  if (player.shootTimer > 0) player.shootTimer -= dt;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
  world.beatTimer += dt;
  if (world.beatTimer > 4) { world.beatTimer = 0; world.beatIndex += 1; }

  if (world.screen === 'title') {
    // Slow pan over the city behind the title.
    world.cam.x = 600 + Math.sin(world.time * 0.05) * 500;
    world.cam.y = 1200 + Math.cos(world.time * 0.04) * 300;
    if (input.confirm) {
      sound.ensure();
      sound.missionStart();
      world.screen = 'playing';
      if (!world.missions.active && !world.missions.finished) {
        world.missions.start();
        world.setToast('Job 1: First Pickup — $9,000');
      }
    }
    return;
  }

  if (world.screen === 'paused' || world.screen === 'jobs') {
    if (input.pause || (world.screen === 'jobs' && input.jobs)) {
      world.screen = 'playing';
      sound.click();
    }
    return;
  }

  if (world.screen === 'busted' || world.screen === 'wasted') {
    const timerKey = world.screen === 'busted' ? 'bustedTimer' : 'wastedTimer';
    world[timerKey] -= dt;
    if (world[timerKey] <= 0 && input.confirm) {
      world.screen = 'playing';
      sound.click();
    }
    return;
  }

  if (world.screen === 'complete') {
    if (input.confirm) world.screen = 'title';
    return;
  }

  // --- Playing -----------------------------------------------------------
  if (input.pause) { world.screen = 'paused'; sound.click(); return; }
  if (input.jobs) { world.screen = 'jobs'; sound.click(); return; }
  if (input.radio) cycleRadio();

  const axis = input.moveAxis();
  if (player.car) {
    const drive = {
      throttle: (input.up ? 1 : 0) + (input.downKey ? -1 : 0),
      steer: (input.right ? 1 : 0) + (input.left ? -1 : 0),
    };
    const hit = updateCar(player.car, drive, dt, world.city);
    if (hit) {
      sound.crash();
      damagePlayer(player, 3);
    }
    player.x = player.car.x;
    player.y = player.car.y;
    player.angle = player.car.angle;
    player.speed = player.car.speed;
    sound.engine(speedNorm(player.car));
    if (input.enterCar) tryEnterCar();
  } else {
    sound.engine(0);
    updatePlayerOnFoot(player, axis, input.running(), dt, world.city);
    if (input.enterCar) tryEnterCar();
    if (input.punch) tryPunch();
    if (input.shoot) tryShoot();
  }

  // Traffic and pedestrians react to Danny (and to his gunfire).
  const danger = world.muzzleTimer > 0 ? { x: player.x, y: player.y } : null;
  updateTraffic(world.traffic, dt, world.city, player, danger);

  // Danny's car shoves traffic out of the way; a hard hit costs health.
  if (player.car) {
    for (const car of [...world.traffic.cars, ...world.traffic.parked]) {
      if (car === player.car) continue;
      if (carsTouch(player.car, car)) {
        const fast = Math.abs(player.car.speed) > 260;
        resolveCarCollision(player.car, car);
        if (fast) {
          sound.crash();
          damagePlayer(player, 5);
          addWanted(player, 1);
        }
      }
    }
    // Running a pedestrian over is a crime and a tragedy.
    for (const ped of world.traffic.peds) {
      if (Math.hypot(ped.x - player.x, ped.y - player.y) < 24 && Math.abs(player.car.speed) > 60) {
        ped.panic = 3;
        ped.x += (Math.random() - 0.5) * 40;
        ped.y += (Math.random() - 0.5) * 40;
        addWanted(player, 1);
      }
    }
  }

  // Police: chase, ram, arrest. Busted ends the run where it stands.
  const result = updatePolice(world.police, dt, player, world.city, sound);
  if (result.busted) {
    world.screen = 'busted';
    world.bustedTimer = TUNING.bustedHoldSeconds;
    sound.busted();
    respawn(500, 'BUSTED');
    return;
  }
  decayWanted(world.police, player, dt, world.wantedState);

  // Missions advance, pay, and eventually complete the game.
  world.missions.update(world);

  collectPickups();

  if (isWasted(player)) {
    world.screen = 'wasted';
    world.wastedTimer = TUNING.bustedHoldSeconds;
    sound.wasted();
    respawn(1000, 'WASTED');
    return;
  }

  // Autosave every few seconds while playing.
  world.saveTimer += dt;
  if (world.saveTimer > 5) { world.saveTimer = 0; world.save(); }

  // Camera: follow Danny, clamped to the world edges.
  const vw = canvas.width;
  const vh = canvas.height;
  world.cam.x = Math.max(0, Math.min(WORLD.size - vw, player.x - vw / 2));
  world.cam.y = Math.max(0, Math.min(WORLD.size - vh, player.y - vh / 2));
}

// --- Frame render ----------------------------------------------------------

function render() {
  const vw = canvas.width;
  const vh = canvas.height;
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, vw, vh);

  drawWorld(ctx, world, world.cam, vw, vh, world.time);

  if (world.screen === 'title') {
    drawTitle(ctx, world, vw, vh, world.time, world.beatIndex);
  } else if (world.screen === 'playing' || world.screen === 'paused' || world.screen === 'jobs') {
    drawHud(ctx, world, vw, vh, world.time);
    if (world.screen === 'paused') {
      drawOverlay(ctx, vw, vh, 'PAUSED', [
        'Danny Reyes is catching his breath.',
        'Press P to keep driving.',
        'Cash $' + world.player.cash.toLocaleString('en-US') + '  •  Debt left $' + world.missions.debtRemaining().toLocaleString('en-US'),
      ], '#4dd8ff');
    } else if (world.screen === 'jobs') {
      const lines = world.missions.jobsSummary();
      lines.push('Press M to close.');
      drawOverlay(ctx, vw, vh, 'THE SIX JOBS', lines, '#ffd34d');
    }
  } else if (world.screen === 'busted') {
    drawHud(ctx, world, vw, vh, world.time);
    drawOverlay(ctx, vw, vh, 'BUSTED', [
      'The Solano Bay PD caught Danny Reyes.',
      'Bail paid. The debt is still waiting.',
      'Press ENTER to get back out there.',
    ], '#3a6fd8');
  } else if (world.screen === 'wasted') {
    drawHud(ctx, world, vw, vh, world.time);
    drawOverlay(ctx, vw, vh, 'WASTED', [
      'Danny Reyes did not make it out of that one.',
      'Hospital bill paid. The debt is still waiting.',
      'Press ENTER to get back out there.',
    ], '#e5484d');
  } else if (world.screen === 'complete') {
    drawOverlay(ctx, vw, vh, 'DEBT PAID', [
      'Six jobs. $82,000. The Solano family is settled.',
      'Danny Reyes is free — and Sol Bay is his.',
      'Press ENTER for the title screen.',
    ], '#58d164');
  }

  // Screen-reader status line, kept in step with the game.
  const district = districtAt(world.player.x, world.player.y);
  statusEl.textContent = GAME_TITLE + ': ' + world.screen + '. ' + district + ', ' + CITY_NAME +
    '. Cash $' + world.player.cash + ', debt left $' + world.missions.debtRemaining() +
    ', wanted ' + world.player.wanted + ' stars. ' + world.missions.progressText();
}

// --- Main loop -------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}

// Announce the game for the dossier and the title screen.
console.log(GAME_TITLE + ' — ' + PLAYER_NAME + ' owes $' + DEBT.toLocaleString('en-US') + ' in ' + CITY_NAME + '. ' + STORY);
requestAnimationFrame(frame);
