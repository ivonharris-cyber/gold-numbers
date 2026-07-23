/**
 * engine.ts — Gold Numbers lottery engine.
 *
 * Implements the shared contract in ./types.ts:
 *   - analyse(data):        digit frequency across every prize string in the
 *                           draw history -> hot / cold / raw counts.
 *   - generateGoldSets(...): deterministic, seeded generator of exactly 10
 *                           gold sets (6-digit + 3-digit + 2-digit picks),
 *                           blending draw-history "hot" digits with star-sign
 *                           numerology.
 *
 * Pure module: no DOM, no fetch, no Node APIs — runs in the browser and
 * under node:test alike. Determinism guarantee: identical (data, starSign,
 * dateSalt) always yields an identical EngineResult.
 */

import type {
  DigitStats,
  DrawsFile,
  EngineResult,
  GoldSet,
  StarSign,
} from './types.js';

/* ------------------------------------------------------------------ *
 * Star-sign numerology
 * ------------------------------------------------------------------ */

/**
 * Lucky-digit scheme (documented for the UI):
 *   primary   = (signIndex mod 9) + 1         -> always in 1..9
 *   secondary = ((primary + 5) mod 9) + 1     -> a "complement" digit in 1..9
 * Signs in zodiac order (aries=0 .. pisces=11).
 */
const STAR_SIGNS: readonly StarSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

/** Lucky digit pair for a star sign. */
export function luckyDigitsForSign(sign: StarSign): [number, number] {
  const idx = STAR_SIGNS.indexOf(sign);
  if (idx === -1) throw new Error(`unknown star sign: ${sign}`);
  const primary = (idx % 9) + 1;
  const secondary = ((primary + 5) % 9) + 1;
  return [primary, secondary];
}

/* ------------------------------------------------------------------ *
 * Deterministic RNG + hashing
 * ------------------------------------------------------------------ */

/** mulberry32 — small, fast, seedable PRNG. Returns values in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash -> 32-bit unsigned int. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ *
 * Frequency analysis
 * ------------------------------------------------------------------ */

/** Collect every prize number string in a DrawsFile, preserving leading zeros. */
function allPrizeStrings(data: DrawsFile): string[] {
  const out: string[] = [];
  for (const d of data.draws) {
    out.push(d.first, ...d.first3, ...d.last3, d.last2);
  }
  return out;
}

/** Rank digits by frequency. Tie-break: lower digit value first (deterministic). */
function rank(counts: number[], desc: boolean): number[] {
  const digits = counts.map((_, d) => d);
  digits.sort((a, b) => {
    const diff = desc ? counts[b] - counts[a] : counts[a] - counts[b];
    return diff !== 0 ? diff : a - b;
  });
  return digits;
}

/**
 * Digit frequency across ALL prize numbers (first, first3, last3, last2 of
 * every draw). hot = most frequent first; cold = least frequent first.
 */
export function analyse(data: DrawsFile): DigitStats {
  const counts = new Array<number>(10).fill(0);
  for (const s of allPrizeStrings(data)) {
    for (const ch of s) {
      const d = ch.charCodeAt(0) - 48;
      if (d >= 0 && d <= 9) counts[d]++;
    }
  }
  return { hot: rank(counts, true), cold: rank(counts, false), counts };
}

/* ------------------------------------------------------------------ *
 * Gold-set generation
 * ------------------------------------------------------------------ */

const NUM_SETS = 10;

/**
 * Per-digit weights for the generator:
 *   base 1 for every digit (keeps randomness alive, cold digits can appear),
 *   + (count / maxCount) * 2   for hot digits (~2-3x total vs a cold digit),
 *   + 1.5 per star-sign lucky digit.
 */
function buildWeights(stats: DigitStats, lucky: readonly number[]): number[] {
  const weights = new Array<number>(10).fill(1);
  const max = Math.max(1, ...stats.counts);
  for (let d = 0; d < 10; d++) {
    weights[d] += (stats.counts[d] / max) * 2;
  }
  for (const d of lucky) weights[d] += 1.5;
  return weights;
}

/** Weighted digit pick. Deterministic for a fixed rng stream. */
function pickDigit(weights: readonly number[], rng: () => number): number {
  let total = 0;
  for (const w of weights) total += w;
  let roll = rng() * total;
  for (let d = 0; d < 10; d++) {
    roll -= weights[d];
    if (roll < 0) return d;
  }
  return 9; // floating-point edge
}

/** Build a zero-padded digit string of the given width. */
function makeNumber(width: number, weights: readonly number[], rng: () => number): string {
  let out = '';
  for (let i = 0; i < width; i++) out += String(pickDigit(weights, rng));
  return out.padStart(width, '0');
}

/**
 * Generate exactly 10 gold sets for a star sign.
 *
 * Seed = FNV-1a(`${starSign}:${dateSalt ?? 'gold'}`) XOR a hash of the
 * dataset's hot digits + total digit count, so the engine is "connected"
 * to draw history while remaining fully deterministic.
 */
export function generateGoldSets(
  data: DrawsFile,
  starSign: StarSign,
  dateSalt?: string,
): EngineResult {
  const stats = analyse(data);
  const lucky = luckyDigitsForSign(starSign);

  const totalDigits = stats.counts.reduce((a, b) => a + b, 0);
  const seed = (
    fnv1a(`${starSign}:${dateSalt ?? 'gold'}`) ^
    fnv1a(`${stats.hot.join('')}:${totalDigits}`)
  ) >>> 0;

  const rng = mulberry32(seed);
  const weights = buildWeights(stats, lucky);

  const sets: GoldSet[] = [];
  const seenSix = new Set<string>();
  let guard = 0;
  while (sets.length < NUM_SETS && guard < NUM_SETS * 100) {
    guard++;
    const sixDigit = makeNumber(6, weights, rng);
    const threeDigit = makeNumber(3, weights, rng);
    const twoDigit = makeNumber(2, weights, rng);
    if (seenSix.has(sixDigit)) continue; // 6-digit picks must be unique
    seenSix.add(sixDigit);
    sets.push({
      index: sets.length + 1,
      sixDigit,
      threeDigit,
      twoDigit,
      luckyDigit: lucky[sets.length % lucky.length],
    });
  }

  return { starSign, seed, stats, sets };
}
