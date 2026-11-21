// The renderer: everything Danny sees, drawn on one canvas.
//
// The camera follows Danny and the world is drawn in layers: ground and
// water, roads and lane markings, parks and lots, buildings with neon,
// palms and cranes, then the mission marker, the cars, the pedestrians,
// the police and Danny himself, and finally the little effects — muzzle
// flashes, punch arcs, skid dust. Nothing here knows about game rules;
// it only reads positions and draws them.

import { WORLD, PITCH, PALETTE } from './config.js';

// Draw the whole world inside the camera view. `cam` is {x, y} — the
// top-left of the viewport in world coordinates.
export function drawWorld(ctx, world, cam, vw, vh, time) {
  const city = world.city;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  drawGround(ctx, city);
  drawRoads(ctx);
  drawParksAndLots(ctx, city);
  drawBuildings(ctx, city, time);
  drawPalmsAndCranes(ctx, city, time);
  drawMissionMarker(ctx, world, time);
  drawPickups(ctx, world, time);
  for (const car of world.traffic.parked) drawCar(ctx, car, time);
  for (const car of world.traffic.cars) drawCar(ctx, car, time);
  for (const car of world.police.cars) drawPoliceCar(ctx, car, time);
  for (const ped of world.traffic.peds) drawPed(ctx, ped, time);
  for (const off of world.police.officers) drawOfficer(ctx, off);
  if (world.player.car) drawCar(ctx, world.player.car, time);
  drawPlayer(ctx, world.player, time);
  drawEffects(ctx, world, time);

  ctx.restore();
}

function drawGround(ctx, city) {
  // Lawns.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD.size, WORLD.size);
  // Mow stripes: alternating bands so the grass is not flat.
  ctx.fillStyle = PALETTE.grassDark;
  for (let i = 0; i < WORLD.blocks; i += 1) {
    if (i % 2 === 0) continue;
    ctx.fillRect(0, i * PITCH, WORLD.size, PITCH);
  }
  // Beach sand, then the sea.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, WORLD.beachY, WORLD.size, WORLD.size - WORLD.beachY);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, WORLD.waterY, WORLD.size, WORLD.size - WORLD.waterY);
  // A darker swell line in the water.
  ctx.fillStyle = PALETTE.waterDeep;
  ctx.fillRect(0, WORLD.waterY + 34, WORLD.size, 10);
}

function drawRoads(ctx) {
  ctx.fillStyle = PALETTE.asphalt;
  for (let i = 0; i <= WORLD.blocks; i += 1) {
    const c = i * PITCH;
    ctx.fillRect(c, 0, WORLD.road, WORLD.size);
    ctx.fillRect(0, c, WORLD.size, WORLD.road);
  }
  // Dashed centre lines.
  ctx.fillStyle = PALETTE.lane;
  for (let i = 0; i <= WORLD.blocks; i += 1) {
    const c = i * PITCH + WORLD.road / 2;
    for (let d = 0; d < WORLD.size; d += 44) {
      ctx.fillRect(c - 2, d, 4, 22);
      ctx.fillRect(d, c - 2, 22, 4);
    }
  }
  // Sidewalk edges around each block.
  ctx.strokeStyle = PALETTE.curb;
  ctx.lineWidth = 3;
  for (let bx = 0; bx < WORLD.blocks; bx += 1) {
    for (let by = 0; by < WORLD.blocks; by += 1) {
      ctx.strokeRect(bx * PITCH + WORLD.road, by * PITCH + WORLD.road, WORLD.block, WORLD.block);
    }
  }
}

function drawParksAndLots(ctx, city) {
  for (const p of city.parks) {
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(p.x0, p.y0, p.w, p.h);
    ctx.fillStyle = PALETTE.treeLight;
    ctx.beginPath();
    ctx.arc(p.x0 + p.w * 0.3, p.y0 + p.h * 0.35, 18, 0, Math.PI * 2);
    ctx.arc(p.x0 + p.w * 0.7, p.y0 + p.h * 0.6, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const lot of city.parkingLots) {
    ctx.fillStyle = PALETTE.asphaltDark;
    ctx.fillRect(lot.x0, lot.y0, lot.w, lot.h);
    ctx.strokeStyle = 'rgba(245,242,232,0.35)';
    ctx.lineWidth = 2;
    for (let x = lot.x0 + 24; x < lot.x0 + lot.w - 20; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, lot.y0 + 8);
      ctx.lineTo(x, lot.y0 + 40);
      ctx.stroke();
    }
  }
}

function drawBuildings(ctx, city, time) {
  for (const b of city.buildings) {
    // Fake height: a darker offset slab behind the roof.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 6, b.y + 6 + b.height * 2, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = PALETTE.buildingEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Roof details: a lighter inner rectangle and a vent square.
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(b.x + b.w - 26, b.y + b.h - 26, 14, 14);
    if (b.neon) {
      const glow = 0.6 + 0.4 * Math.sin(time * 3 + b.x * 0.01);
      ctx.strokeStyle = b.neon;
      ctx.globalAlpha = glow;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      ctx.globalAlpha = 1;
    }
  }
  for (const sign of city.neonSigns) {
    const glow = 0.65 + 0.35 * Math.sin(time * 4 + sign.x * 0.02);
    ctx.globalAlpha = glow;
    ctx.fillStyle = sign.color;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sign.text, sign.x, sign.y);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

function drawPalmsAndCranes(ctx, city, time) {
  for (const palm of city.palms) {
    const s = palm.s;
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(palm.x, palm.y);
    ctx.lineTo(palm.x + 3 * s, palm.y - 14 * s);
    ctx.stroke();
    ctx.fillStyle = PALETTE.palmLight;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + time * 0.1;
      ctx.beginPath();
      ctx.ellipse(palm.x + 3 * s + Math.cos(a) * 10 * s, palm.y - 14 * s + Math.sin(a) * 6 * s, 9 * s, 3.5 * s, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const crane of city.cranes) {
    ctx.strokeStyle = '#d8b13a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(crane.x, crane.y + 60);
    ctx.lineTo(crane.x, crane.y - crane.h);
    ctx.lineTo(crane.x + 70, crane.y - crane.h);
    ctx.stroke();
    ctx.strokeStyle = '#8a7a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(crane.x + 70, crane.y - crane.h);
    ctx.lineTo(crane.x + 70, crane.y - crane.h + 26);
    ctx.stroke();
    ctx.fillStyle = '#3a3d44';
    ctx.fillRect(crane.x - 14, crane.y + 44, 28, 16);
  }
}

function drawMissionMarker(ctx, world, time) {
  const target = world.missions.stepTarget();
  if (!target || !world.missions.active) return;
  const pulse = 1 + 0.18 * Math.sin(time * 5);
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = PALETTE.mission;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.mission;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(10, -14);
  ctx.lineTo(-10, -14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPickups(ctx, world, time) {
  for (const p of world.pickups) {
    const bob = Math.sin(time * 4 + p.x) * 2;
    ctx.fillStyle = p.kind === 'ammo' ? '#ffd34d' : '#58d164';
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#10121a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.kind === 'ammo' ? 'A' : '+', p.x, p.y + bob + 4);
    ctx.textAlign = 'left';
  }
}

export function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-19, -11, 40, 24);
  // Body.
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-20, -11, 40, 22, 6);
  ctx.fill();
  // Cabin and windscreen.
  ctx.fillStyle = 'rgba(20,24,32,0.85)';
  ctx.beginPath();
  ctx.roundRect(-6, -9, 14, 18, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.5)';
  ctx.fillRect(8, -8, 4, 16);
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(18, -9, 3, 5);
  ctx.fillRect(18, 4, 3, 5);
  // Brake glow when the car just crashed.
  if (car.crashTimer > 0) {
    ctx.fillStyle = 'rgba(229,72,77,0.8)';
    ctx.fillRect(-21, -9, 3, 5);
    ctx.fillRect(-21, 4, 3, 5);
  }
  ctx.restore();
}

function drawPoliceCar(ctx, car, time) {
  drawCar(ctx, car, time);
  // Light bar, flashing red/blue.
  const phase = Math.floor(time * 6 + car.siren) % 2 === 0;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = phase ? '#e5484d' : '#3a6fd8';
  ctx.fillRect(-4, -11, 8, 6);
  ctx.fillStyle = phase ? '#3a6fd8' : '#e5484d';
  ctx.fillRect(-4, 5, 8, 6);
  ctx.restore();
  // "POLICE" on the roof is overkill at this zoom; the light bar says it.
}

function drawPed(ctx, ped, time) {
  const bob = Math.sin(time * 8 + ped.phase) * 1.5;
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(ped.x, ped.y + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(ped.x, ped.y + bob - 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawOfficer(ctx, off) {
  ctx.fillStyle = '#2a3a5a';
  ctx.beginPath();
  ctx.arc(off.x, off.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath();
  ctx.arc(off.x, off.y - 2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(off.x, off.y, 12, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlayer(ctx, player, time) {
  if (player.car) return; // Danny is inside the car; the car is drawn.
  const bob = player.walking ? Math.sin(time * 10) * 1.5 : 0;
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.rotate(player.angle);
  // Danny: red jacket, dark jeans — visible at a glance in a crowd.
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5f2e8';
  ctx.beginPath();
  ctx.arc(4, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22262b';
  ctx.fillRect(-6, -3, 6, 6);
  ctx.restore();
  // Hurt flash: a red ring while the invulnerability window runs.
  if (player.hurtTimer > 0) {
    ctx.strokeStyle = 'rgba(229,72,77,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 17, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEffects(ctx, world, time) {
  // --- Speed streaks: faint lines past the camera when Danny is flying.
  if (world.player.car && Math.abs(world.player.car.speed) > 430) {
    const p = world.player;
    ctx.strokeStyle = 'rgba(245,242,232,0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const ox = (Math.sin(time * 7 + i * 2.1) * 260);
      const oy = (Math.cos(time * 5 + i * 1.7) * 180);
      ctx.beginPath();
      ctx.moveTo(p.x + ox, p.y + oy);
      ctx.lineTo(p.x + ox - Math.cos(p.angle) * 46, p.y + oy - Math.sin(p.angle) * 46);
      ctx.stroke();
    }
  }
  // Muzzle flash.
  if (world.muzzleTimer > 0) {
    const p = world.player;
    const fx = p.x + Math.cos(p.angle) * 26;
    const fy = p.y + Math.sin(p.angle) * 26;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(fx, fy, 7 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Punch arc.
  if (world.punchTimer > 0) {
    const p = world.player;
    ctx.strokeStyle = 'rgba(245,242,232,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, p.angle - 0.7, p.angle + 0.7);
    ctx.stroke();
  }
}
