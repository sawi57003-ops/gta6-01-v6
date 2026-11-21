// SOL BAY HEAT — every number the game runs on, in one place.
//
// Sol Bay is a fictional coastal city at dusk: a neon Boardwalk along the
// sea, cranes over the Harbor, glass towers Downtown, domino tables in
// Little Havana. Danny Reyes is a getaway driver who owes $75,000 to the
// Solano family and has one week and six jobs to clear it. Anything that
// needs balancing lives here, so tuning never means digging through the
// rest of the game.

// The world is a square. Streets run on a regular grid; the beach and the
// sea close off the south edge, and the Harbor closes off the east.
export const WORLD = {
  size: 2700, // the world is a square, 2700 px on a side
  blocks: 8, // 8 x 8 city blocks
  block: 250, // each block is 250 px across
  road: 70, // each road is 70 px wide
  beachY: 2580, // sand starts here, along the south edge
  waterY: 2632, // the sea starts here — do not drive into it
};

// Distance from one road centre to the next.
export const PITCH = WORLD.block + WORLD.road;

// How Danny, the cars and the cops behave. Speeds are px per second,
// angles are radians, damage is hit points.
export const TUNING = {
  walkSpeed: 185,
  runSpeed: 280,
  playerRadius: 13,
  playerHealth: 100,
  carAccel: 470,
  carBrake: 780,
  carReverseMax: 185,
  carMaxSpeed: 590,
  carTurn: 2.8,
  carRadius: 17,
  trafficSpeed: 140,
  trafficCount: 16,
  pedCount: 28,
  policeSpeed: 620,
  policeSpawnDelay: 2.2,
  punchRange: 38,
  punchDamage: 30,
  pistolRange: 350,
  pistolDamage: 50,
  pistolAmmoStart: 30,
  ammoPickupAmount: 12,
  pickupRadius: 30,
  wantedDecaySeconds: 14,
  bustedHoldSeconds: 1.5,
  arrestRange: 30,
  missionRewardBase: 9000,
};

// The sunset palette: warm sand and green lawns under pink and cyan neon.
export const PALETTE = {
  grass: '#6fae5e',
  grassDark: '#639d51',
  sand: '#eecf9a',
  water: '#2e7fa8',
  waterDeep: '#256b8f',
  asphalt: '#3a3d44',
  asphaltDark: '#32343b',
  lane: '#e8d95a',
  sidewalk: '#b5afa0',
  curb: '#8f8a7c',
  buildingRoof: ['#c96f4a', '#4a7fa5', '#a55a6e', '#5a8a6a', '#b08a3e', '#6e5a8a', '#8a6a4a', '#4a8a8a', '#d86a8a', '#3e6e9e'],
  buildingEdge: 'rgba(0,0,0,0.28)',
  buildingNeon: ['#ff5da2', '#4dd8ff', '#ffd34d', '#9dff5d', '#ff8a3d'],
  park: '#5d9b4a',
  tree: '#2f6b2a',
  treeLight: '#4c8a3a',
  palm: '#3a7a34',
  palmLight: '#5da34c',
  hudPanel: 'rgba(10,12,18,0.74)',
  hudText: '#f5f2e8',
  hudGold: '#ffd34d',
  hudPink: '#ff5da2',
  mission: '#ffd34d',
  police: '#3a6fd8',
  star: '#ffd34d',
  health: '#58d164',
  damage: '#e5484d',
  neonSign: '#ff5da2',
};

// Paint jobs for civilian traffic. Police cruisers are blue-and-white and
// the Sunrise taxi is yellow by definition, never random.
export const CAR_PAINTS = [
  '#c23b2e', '#2e6fc2', '#e8b73a', '#e8e4da', '#22262b', '#7a4a9e',
  '#3fae7a', '#d86a1e', '#5a8a9e', '#b03a5a', '#8a9e2e', '#4a4a55',
  '#ff5da2', '#4dd8ff',
];

// The cars of Sol Bay. `top` is top speed in px/s, `accel` the launch,
// `turn` how sharply it steers. The Phoenix is the one the Solanos want
// stolen off the Boardwalk in job two.
export const CAR_MODELS = [
  { name: 'Stallion', top: 565, accel: 470, turn: 2.8 },
  { name: 'Cheetah', top: 525, accel: 435, turn: 2.6 },
  { name: 'Phoenix', top: 615, accel: 505, turn: 3.0 },
  { name: 'Admiral', top: 545, accel: 455, turn: 2.7 },
  { name: 'Sunrise', top: 485, accel: 405, turn: 2.5 },
  { name: 'Buffalo', top: 505, accel: 425, turn: 2.4 },
];

export const PLAYER_NAME = 'Danny Reyes';
export const CITY_NAME = 'Sol Bay';
export const GAME_TITLE = 'SOL BAY HEAT';
export const DEBT = 75000;
export const STORY =
  'Danny Reyes is a getaway driver who owes $75,000 to the Solano family. ' +
  'One week. Six jobs. The whole bay is hiring — if you can drive, run, ' +
  'and stay out of the cells long enough to collect.';
