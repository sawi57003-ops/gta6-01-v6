// Seeded randomness for Sol Bay.
//
// Every placement in the city — buildings, parks, palms, traffic, the
// mission props — comes from one of these functions, fed by a single seed.
// The same seed rebuilds the same city, which is what makes ?seed=N work
// and what keeps a screenshot staged the same way twice.

// mulberry32: a small, fast, well-behaved seeded generator. It takes a
// 32-bit integer seed and returns a function that yields numbers in [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one element of an array, uniformly, from the given generator.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// A number in [min, max) from the given generator.
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

// A random integer in [min, max] inclusive.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// A random true/false, weighted by `chance` (default half and half).
export function randBool(rng, chance) {
  return rng() < (chance === undefined ? 0.5 : chance);
}

// Shuffle a copy of an array in place order, Fisher-Yates, seeded.
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Turn an arbitrary string into a 32-bit seed, so a word works as well as
// a number in ?seed=. Short and deterministic; collisions do not matter.
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
