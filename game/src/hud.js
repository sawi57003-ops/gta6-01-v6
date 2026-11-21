// The HUD: cash, health, wanted stars, ammo, the current job, the district
// name and a live minimap.
//
// The minimap is a small top-down of the whole city with the player, the
// mission target, police and traffic as dots. Everything is canvas-drawn —
// no DOM — so it scales with the game window.

import { WORLD, PITCH, PALETTE, CITY_NAME } from './config.js';
import { districtAt } from './city.js';

export function drawHud(ctx, world, vw, vh, time) {
  const player = world.player;
  const missions = world.missions;
  const pad = 16;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // --- Top-left: cash, debt, health, ammo.
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(pad, pad, 250, 108, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudGold;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('$' + player.cash.toLocaleString('en-US'), pad + 14, pad + 34);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '13px sans-serif';
  ctx.fillText('Debt left: $' + missions.debtRemaining().toLocaleString('en-US'), pad + 14, pad + 56);
  // Debt progress: how much of the $75,000 is already earned.
  const paidFrac = 1 - missions.debtRemaining() / 75000;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(pad + 14, pad + 60, 150, 4);
  ctx.fillStyle = PALETTE.hudGold;
  ctx.fillRect(pad + 14, pad + 60, 150 * Math.max(0, Math.min(1, paidFrac)), 4);
  // Health bar: green while healthy, red when it gets grim.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(pad + 14, pad + 66, 150, 10);
  ctx.fillStyle = player.health > 30 ? PALETTE.health : PALETTE.damage;
  ctx.fillRect(pad + 14, pad + 66, 150 * Math.max(0, player.health / 100), 10);
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText('HP ' + Math.ceil(player.health), pad + 172, pad + 76);
  ctx.fillText('Ammo ' + player.ammo + (player.car ? '   •   DRIVING' : ''), pad + 14, pad + 96);

  // --- Top-right: wanted stars, filled for the current heat.
  ctx.fillStyle = PALETTE.hudPanel;
  const starW = 150;
  ctx.beginPath();
  ctx.roundRect(vw - pad - starW, pad, starW, 52, 10);
  ctx.fill();
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < player.wanted ? '★' : '☆';
  ctx.fillStyle = player.wanted > 0 ? PALETTE.star : 'rgba(245,242,232,0.45)';
  ctx.fillText(stars, vw - pad - starW / 2, pad + 36);
  ctx.textAlign = 'left';

  // --- Top centre: district, city, and the current job.
  const district = districtAt(player.x, player.y);
  ctx.fillStyle = PALETTE.hudPanel;
  const dcW = 250;
  ctx.beginPath();
  ctx.roundRect(vw / 2 - dcW / 2, pad, dcW, 52, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudPink;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(district + '  •  ' + CITY_NAME, vw / 2, pad + 22);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '13px sans-serif';
  ctx.fillText(missions.progressText(), vw / 2, pad + 42);
  ctx.textAlign = 'left';

  // --- Current objective, bottom centre.
  const step = missions.currentStep();
  if (missions.active && step) {
    const label = step.kind === 'multi'
      ? step.label + ' (' + step.targets.filter((t) => t.done).length + '/' + step.targets.length + ')'
      : step.label;
    ctx.font = 'bold 16px sans-serif';
    const w = ctx.measureText(label).width + 28;
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.beginPath();
    ctx.roundRect(vw / 2 - w / 2, vh - 116, w, 38, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudGold;
    ctx.textAlign = 'center';
    ctx.fillText(label, vw / 2, vh - 91);
    ctx.textAlign = 'left';
  }

  // --- Toast: mission updates and pickup confirmations.
  if (world.toastTimer > 0 && world.toast) {
    ctx.font = 'bold 17px sans-serif';
    const w = ctx.measureText(world.toast).width + 28;
    ctx.fillStyle = 'rgba(10,12,18,0.8)';
    ctx.beginPath();
    ctx.roundRect(vw / 2 - w / 2, vh - 168, w, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#f5f2e8';
    ctx.textAlign = 'center';
    ctx.fillText(world.toast, vw / 2, vh - 144);
    ctx.textAlign = 'left';
  }

  // --- Minimap, bottom-right: roads, water, target, police, traffic, Danny.
  const mapSize = 168;
  const mx = vw - pad - mapSize;
  const my = vh - pad - mapSize;
  const scale = mapSize / WORLD.size;
  ctx.fillStyle = 'rgba(10,12,18,0.78)';
  ctx.beginPath();
  ctx.roundRect(mx - 6, my - 6, mapSize + 12, mapSize + 12, 10);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mapSize, mapSize);
  ctx.clip();
  ctx.fillStyle = '#3d5a3a';
  ctx.fillRect(mx, my, mapSize, mapSize);
  ctx.fillStyle = '#3a3d44';
  for (let i = 0; i <= WORLD.blocks; i += 1) {
    const c = i * PITCH + 35;
    ctx.fillRect(mx, my + (c - 35) * scale, mapSize, 70 * scale);
    ctx.fillRect(mx + (c - 35) * scale, my, 70 * scale, mapSize);
  }
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(mx, my + WORLD.waterY * scale, mapSize, (WORLD.size - WORLD.waterY) * scale);
  // The mission target pulses gold.
  const target = missions.stepTarget();
  if (target && missions.active) {
    const pulse = 3 + Math.sin(time * 5) * 1.5;
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(mx + target.x * scale, my + target.y * scale, 5 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police in blue, traffic in white, Danny in pink.
  ctx.fillStyle = '#3a6fd8';
  for (const car of world.police.cars) {
    ctx.fillRect(mx + car.x * scale - 2, my + car.y * scale - 2, 4, 4);
  }
  ctx.fillStyle = 'rgba(245,242,232,0.75)';
  for (const car of world.traffic.cars) {
    ctx.fillRect(mx + car.x * scale - 1, my + car.y * scale - 1, 2, 2);
  }
  ctx.fillStyle = '#ff5da2';
  ctx.beginPath();
  ctx.arc(mx + player.x * scale, my + player.y * scale, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5f2e8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // --- Radio station, bottom-left, above the controls hint.
  if (world.radio) {
    ctx.fillStyle = 'rgba(245,242,232,0.6)';
    ctx.font = '13px sans-serif';
    ctx.fillText('♪ ' + world.radio.name + ' — ' + world.radio.tag, pad, vh - pad - 30);
  }
  // --- Controls hint, bottom-left (fades after the first minute).
  if (world.time < 60) {
    ctx.fillStyle = 'rgba(245,242,232,0.55)';
    ctx.font = '13px sans-serif';
    ctx.fillText('WASD move/drive  •  E enter car  •  Space punch  •  F shoot  •  M jobs  •  P pause', pad, vh - pad - 8);
  }

  ctx.restore();
}

// The title screen: big name, the story, the debt, the beats, the jobs.
export function drawTitle(ctx, world, vw, vh, time, beatIndex) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,6,16,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5da2';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SOL BAY HEAT', vw / 2, vh / 2 - 150);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Danny Reyes owes $75,000 to the Solano family.', vw / 2, vh / 2 - 108);
  ctx.fillStyle = '#f5f2e8';
  ctx.font = '16px sans-serif';
  ctx.fillText('One week. Six jobs. The whole bay is hiring.', vw / 2, vh / 2 - 78);
  const beat = world.beats[beatIndex % world.beats.length];
  ctx.fillStyle = 'rgba(245,242,232,0.75)';
  ctx.font = 'italic 16px sans-serif';
  ctx.fillText('“' + beat + '”', vw / 2, vh / 2 - 44);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#4dd8ff';
  const jobs = world.missions.list.map((m, i) => (i + 1) + '. ' + m.title + ' — $' + m.reward.toLocaleString('en-US')).join('   ');
  ctx.fillText(jobs, vw / 2, vh / 2 + 4);
  ctx.fillStyle = '#f5f2e8';
  ctx.font = 'bold 18px sans-serif';
  const blink = Math.floor(time * 2) % 2 === 0;
  if (blink) ctx.fillText('Press ENTER to start — WASD move, E enter car, F shoot', vw / 2, vh / 2 + 56);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(245,242,232,0.55)';
  ctx.fillText('Radio: ' + world.radio.name + ' — ' + world.radio.tag + '   •   R changes station', vw / 2, vh / 2 + 88);
  ctx.restore();
}

// A full-screen message: paused, busted, wasted, complete.
export function drawOverlay(ctx, vw, vh, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,6,16,0.78)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || '#ffd34d';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(title, vw / 2, vh / 2 - 40);
  ctx.fillStyle = '#f5f2e8';
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, vw / 2, vh / 2 + 6 + i * 28);
  });
  ctx.restore();
}
