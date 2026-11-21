// The six jobs: Danny's week, and his way out of debt.
//
// The catalogue here is the same list main.ts owns — same ids, same
// titles, same rewards — and the build refuses if the two ever disagree.
// Rewards sum to $82,000: the $75,000 debt to the Solano family, with
// $7,000 to spare. Jobs run in order; finishing one starts the next, and
// finishing the sixth clears the debt and completes the game.
//
// Each job is a list of steps. A step is a place to reach ("goto"), a
// heat level to lose ("loseHeat"), or a set of drops in any order
// ("multi"). The update step watches Danny's position and advances the
// job; the game supplies the toast and the sound through the world object
// it passes in.

import { DEBT } from './config.js';
import { districtPoint } from './city.js';

export const MISSIONS = [
  {
    id: 'm1',
    title: 'First Pickup',
    reward: 9000,
    brief: 'The Solanos left a package at the Harbor. Drive there, grab it, bring it back to the Little Havana garage.',
    steps: [
      { label: 'Pick up the package at the Harbor', kind: 'goto', at: districtPoint('Harbor'), radius: 70 },
      { label: 'Bring the package to the Little Havana garage', kind: 'goto', at: districtPoint('Little Havana'), radius: 70 },
    ],
  },
  {
    id: 'm2',
    title: 'Hot Wheels',
    reward: 11000,
    brief: 'A Phoenix is parked on the Boardwalk and the Solanos want it. Steal it, then lose the heat before you drop it at the chop shop in The Docks.',
    steps: [
      { label: 'Steal the Phoenix on the Boardwalk', kind: 'goto', at: { x: 1350, y: 2440 }, radius: 60 },
      { label: 'Lose the heat — no stars, then go', kind: 'loseHeat', radius: 0 },
      { label: 'Drop the Phoenix at the chop shop in The Docks', kind: 'goto', at: districtPoint('The Docks'), radius: 70 },
    ],
  },
  {
    id: 'm3',
    title: 'Courier Run',
    reward: 13000,
    brief: 'Three drops, one night. Hit the Downtown club, the North Beach motel and the Crosstown office — in any order.',
    steps: [
      {
        label: 'Make the three drops — Downtown, North Beach, Crosstown',
        kind: 'multi',
        targets: [
          { label: 'Downtown club', at: districtPoint('Downtown'), radius: 70, done: false },
          { label: 'North Beach motel', at: districtPoint('North Beach'), radius: 70, done: false },
          { label: 'Crosstown office', at: districtPoint('Crosstown'), radius: 70, done: false },
        ],
      },
    ],
  },
  {
    id: 'm4',
    title: 'Getaway',
    reward: 14000,
    brief: 'A Solano wheelman is pinned down by the PD in Crosstown. Get him out and drive him to the Harbor while the whole department gives chase.',
    steps: [
      { label: 'Reach the wheelman in Crosstown', kind: 'goto', at: districtPoint('Crosstown'), radius: 70 },
      { label: 'Drive the wheelman to the Harbor', kind: 'goto', at: districtPoint('Harbor'), radius: 70 },
    ],
  },
  {
    id: 'm5',
    title: 'Payday',
    reward: 16000,
    brief: 'The Solanos are moving a payroll through Little Havana. Intercept the armoured car, take the cash, and get it to the Downtown club.',
    steps: [
      { label: 'Intercept the payroll in Little Havana', kind: 'goto', at: districtPoint('Little Havana'), radius: 70 },
      { label: 'Deliver the cash to the Downtown club', kind: 'goto', at: districtPoint('Downtown'), radius: 70 },
    ],
  },
  {
    id: 'm6',
    title: 'The Big One',
    reward: 19000,
    brief: 'Last job. The Solano family is settling accounts at the Boardwalk hotel. Get in, take the ledger, and drive it to the Harbor.',
    steps: [
      { label: 'Get the ledger at the Boardwalk hotel', kind: 'goto', at: districtPoint('Boardwalk'), radius: 70 },
      { label: 'Drive the ledger to the Harbor', kind: 'goto', at: districtPoint('Harbor'), radius: 70 },
    ],
  },
];

export const TOTAL_REWARD = MISSIONS.reduce((sum, m) => sum + m.reward, 0);

export function createMissions() {
  return {
    list: MISSIONS,
    index: 0, // which job Danny is on
    stepIndex: 0,
    active: false,
    finished: false,
    earned: 0,

    current() {
      return this.list[this.index] || null;
    },

    currentStep() {
      const m = this.current();
      if (!m) return null;
      return m.steps[this.stepIndex] || null;
    },

    // Where the gold marker on the map points right now.
    stepTarget() {
      const step = this.currentStep();
      if (!step || !this.active) return null;
      if (step.kind === 'multi') {
        const next = step.targets.find((t) => !t.done);
        return next ? next.at : null;
      }
      return step.at || null;
    },

    progressText() {
      if (this.finished) return 'Debt paid — Sol Bay is yours';
      const m = this.current();
      if (!m) return 'No jobs left';
      return 'Job ' + (this.index + 1) + '/6: ' + m.title + ' ($' + m.reward.toLocaleString('en-US') + ')';
    },

    // One line per job for the jobs screen: done, current, or waiting.
    jobsSummary() {
      return this.list.map((m, i) => {
        const mark = i < this.index ? '✓ ' : (i === this.index ? '→ ' : '· ');
        return mark + m.title + ' — $' + m.reward.toLocaleString('en-US') + ' — ' + m.brief;
      });
    },

    debtRemaining() {
      return Math.max(0, DEBT - this.earned);
    },

    start() {
      this.active = true;
      this.index = 0;
      this.stepIndex = 0;
      this.earned = 0;
      this.finished = false;
    },

    // Advance one step inside the current job, or finish the job and pay.
    // `world` carries player, sound and a setToast(text) the game wires up.
    update(world) {
      if (!this.active || this.finished) return;
      const m = this.current();
      if (!m) return;
      const step = this.currentStep();
      if (!step) return;
      const player = world.player;

      if (step.kind === 'loseHeat') {
        if (player.wanted === 0) this._advanceStep(world, m);
        return;
      }

      if (step.kind === 'multi') {
        for (const t of step.targets) {
          if (t.done) continue;
          const d = Math.hypot(player.x - t.at.x, player.y - t.at.y);
          if (d < t.radius) {
            t.done = true;
            if (world.sound) world.sound.pickup();
            if (world.setToast) world.setToast('Drop done: ' + t.label);
          }
        }
        if (step.targets.every((t) => t.done)) this._advanceStep(world, m);
        return;
      }

      // Plain "goto": reach the marker.
      const d = Math.hypot(player.x - step.at.x, player.y - step.at.y);
      if (d < step.radius) {
        if (m.id === 'm2' && this.stepIndex === 0 && player.car === null) {
          // Job two is a car theft: the Phoenix only counts when Danny is
          // sitting in it, not when he strolls past on foot.
          return;
        }
        if (m.id === 'm4' && this.stepIndex === 0) {
          // Picking the wheelman up brings the whole department down.
          player.wanted = Math.max(player.wanted, 3);
          if (world.setToast) world.setToast('Wheelman aboard — the PD is coming!');
        }
        if (world.sound) world.sound.pickup();
        this._advanceStep(world, m);
      }
    },

    _advanceStep(world, m) {
      this.stepIndex += 1;
      if (this.stepIndex < m.steps.length) return;
      // Job done: pay Danny, move to the next job, or finish the game.
      this.earned += m.reward;
      world.player.cash += m.reward;
      if (world.sound) world.sound.missionDone();
      if (world.setToast) world.setToast(m.title + ' done — $' + m.reward.toLocaleString('en-US'));
      this.index += 1;
      this.stepIndex = 0;
      if (this.index >= this.list.length) {
        this.finished = true;
        this.active = false;
        if (world.onComplete) world.onComplete();
      } else if (world.sound) {
        world.sound.missionStart();
      }
    },
  };
}
