// Screenshot staging for ?shot=.
//
// The game reads ?shot=<name> from the URL and, before the first frame,
// arranges the world into a composed scene: where Danny stands, whether
// he is driving, how much heat is on him, and which job is showing. The
// four scenes are the four screenshots the entry ships with.
//
//   start   — title screen over the Boardwalk at dusk, Danny on foot
//   drive   — Danny driving a Stallion down the Downtown strip
//   chase   — three stars, two cruisers closing in near the Harbor
//   mission — Danny on foot at the Harbor pickup, job one active
//
// Staging never touches the save file and never starts a mission the
// player did not start; it only poses the world, then lets the game run.

import { districtPoint } from './city.js';
import { CAR_MODELS } from './config.js';
import { createCar } from './vehicles.js';
import { enterCar } from './player.js';

export const SHOTS = ['start', 'drive', 'chase', 'mission'];

// The scene names, for the dossier and for any tooling that lists them.
export function shotNames() {
  return SHOTS.slice();
}

export function stageShot(world, name) {
  const player = world.player;
  if (name === 'start') {
    // Title screen: Danny on foot on the Boardwalk, city behind him.
    player.x = 1350;
    player.y = 2400;
    player.angle = -Math.PI / 2;
    player.wanted = 0;
    world.screen = 'title';
    return true;
  }
  if (name === 'drive') {
    // Danny in a red Stallion, mid-strip Downtown, doing speed.
    const model = CAR_MODELS.find((m) => m.name === 'Stallion');
    const car = createCar(model, districtPoint('Downtown').x, districtPoint('Downtown').y, 0, '#c23b2e', 'civilian');
    car.speed = 420;
    enterCar(player, car);
    player.wanted = 0;
    world.screen = 'playing';
    return true;
  }
  if (name === 'chase') {
    // Three stars, Danny driving, cruisers already closing in.
    const model = CAR_MODELS.find((m) => m.name === 'Phoenix');
    const car = createCar(model, districtPoint('Harbor').x - 200, districtPoint('Harbor').y, Math.PI, '#d86a1e', 'civilian');
    car.speed = 380;
    enterCar(player, car);
    player.wanted = 3;
    world.screen = 'playing';
    return true;
  }
  if (name === 'mission') {
    // Job one active, Danny on foot at the Harbor pickup point.
    const p = districtPoint('Harbor');
    player.x = p.x - 90;
    player.y = p.y + 40;
    player.angle = Math.atan2(p.y - player.y, p.x - player.x);
    player.wanted = 0;
    world.missions.start();
    world.screen = 'playing';
    return true;
  }
  return false;
}

// Read ?shot= from the page URL. Returns the scene name or null.
export function shotFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    return SHOTS.includes(shot) ? shot : null;
  } catch (e) {
    return null;
  }
}

// Read ?seed= from the page URL. A word works as well as a number.
export function seedFromUrl(fallback) {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('seed');
    if (raw === null) return fallback;
    const n = Number(raw);
    if (!Number.isNaN(n)) return n >>> 0;
    let h = 2166136261 >>> 0;
    for (let i = 0; i < raw.length; i += 1) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  } catch (e) {
    return fallback;
  }
}
