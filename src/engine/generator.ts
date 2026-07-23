/**
 * generator.ts — seeded lucky-number set generator.
 *
 * Blends three signals:
 *   1. hot digits per position from draw history (frequency.ts)
 *   2. caller-supplied favoured digits
 *   3. zodiac lucky digits (zodiac.ts); birth info, when given, deepens the
 *      personalisation by folding the birth date/time into the seed.
 *
 * Determinism: the RNG is seeded from (sign, favouredDigits, birth), so the
 * same inputs always produce the same 10 sets.
 *
 * Pure module, zero deps. Contract per the shared interface with the UI:
 *   generateSets(sign, favoured, draws, birth?) -> NumberSet[10]
 *   hotColdDigits(draws) -> { hot, cold }
 */

import { analyzeFrequency, normalizeDraws, validateDraw, type FrequencyReport, type PositionStats } from './frequency.js';
import { isZodiacSign, luckyDigitsFor, signForDate, type ZodiacSign } from './zodiac.js';

export interface Draw {
  date: string;        // ISO yyyy-mm-dd
  firstPrize: string;  // 6 digits, leading zeros preserved
  front3: string[];    // 2 entries, 3 digits each
  last3: string[];     // 2 entries, 3 digits each
  last2: string;       // 2 digits
}

export interface BirthInfo {
  date: string;  // ISO yyyy-mm-dd
  time: string;  // HH:MM (24h)
}

export interface NumberSet {
  sixDigit: string;
  threeDigit: string[]; // exactly 2 entries
  twoDigit: string;
  score: number;        // 0..1 confidence-style score
}

/** mulberry32 — small, fast, seedable PRNG. Returns [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash -> 32-bit unsigned seed. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const NUM_SETS = 10;

/** Signal weights; must sum to 1. */
const W_HOT = 0.45;
const W_FAVOURED = 0.30;
const W_ZODIAC = 0.25;

interface DigitPool {
  weights: number[]; // weights[d] = blended desirability of digit d
}

function blendPool(pos: PositionStats, favoured: number[], zodiac: number[]): DigitPool {
  const weights = new Array<number>(10).fill(0);
  const max = Math.max(1, ...pos.counts);
  for (let d = 0; d < 10; d++) weights[d] += W_HOT * (pos.counts[d] / max);
  for (const d of favoured) weights[d] += W_FAVOURED;
  for (const d of zodiac) weights[d] += W_ZODIAC;
  return { weights };
}

function pickDigit(pool: DigitPool, rng: () => number): number {
  const total = pool.weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.floor(rng() * 10);
  let roll = rng() * total;
  for (let d = 0; d < 10; d++) {
    roll -= pool.weights[d];
    if (roll < 0) return d;
  }
  return 9; // floating-point edge
}

/** Mean normalised digit weight of a candidate against its pools, 0..1. */
function scoreCandidate(value: string, pools: DigitPool[]): number {
  let sum = 0;
  for (let i = 0; i < value.length; i++) {
    const d = value.charCodeAt(i) - 48;
    const maxW = Math.max(...pools[i].weights, 1e-9);
    sum += pools[i].weights[d] / maxW;
  }
  return sum / value.length;
}

function makeCandidate(width: number, pools: DigitPool[], rng: () => number): string {
  let out = '';
  for (let i = 0; i < width; i++) out += String(pickDigit(pools[i], rng));
  return out;
}

/** Validate/normalise birth info; returns undefined when absent. */
function normalizeBirth(birth: BirthInfo | undefined): BirthInfo | undefined {
  if (!birth) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth.date)) throw new Error(`birth date must be yyyy-mm-dd, got "${birth.date}"`);
  if (!/^\d{2}:\d{2}$/.test(birth.time)) throw new Error(`birth time must be HH:MM, got "${birth.time}"`);
  return birth;
}

/**
 * Generate exactly 10 blended number sets.
 *
 * @param sign     lowercase zodiac key (aries..pisces)
 * @param favoured caller's favoured digits (0-9); invalid entries ignored
 * @param draws    draw history — flat Draw[] or the wrapped { draws: [...] } file
 * @param birth    optional birth date+time; folds into the seed and, when the
 *                 dropdown sign doesn't match the birth date's sign, the
 *                 birth sign's lucky digits join the zodiac blend
 * @throws on unknown sign, empty draw history, or malformed draws
 */
export function generateSets(
  sign: string,
  favoured: number[],
  draws: Draw[] | { draws: unknown[] } | Record<string, unknown>,
  birth?: BirthInfo,
): NumberSet[] {
  if (!isZodiacSign(sign)) {
    throw new Error(`unknown zodiac sign "${sign}" — expected one of aries..pisces`);
  }
  const flat = normalizeDraws(draws);
  if (flat.length === 0) throw new Error('generateSets requires at least one draw');
  for (const d of flat) validateDraw(d);
  const birthInfo = normalizeBirth(birth);

  const favouredClean = [...new Set(
    (favoured ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 9),
  )].sort((a, b) => a - b);
  const zodiacDigits = new Set(luckyDigitsFor(sign as ZodiacSign));
  if (birthInfo) {
    const [, m, d] = birthInfo.date.split('-').map(Number);
    for (const digit of luckyDigitsFor(signForDate(m, d))) zodiacDigits.add(digit);
  }
  const zodiac = [...zodiacDigits].sort((a, b) => a - b);
  const freq: FrequencyReport = analyzeFrequency(flat);

  const seed = hashString(
    `${sign}|${favouredClean.join(',')}|${birthInfo ? `${birthInfo.date}T${birthInfo.time}` : ''}`,
  );
  const rng = mulberry32(seed);

  const sixPools = freq.firstPrize.map((p) => blendPool(p, favouredClean, zodiac));
  const threePools = freq.threeDigit.map((p) => blendPool(p, favouredClean, zodiac));
  const twoPools = freq.twoDigit.map((p) => blendPool(p, favouredClean, zodiac));

  const sets: NumberSet[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (sets.length < NUM_SETS && guard < NUM_SETS * 50) {
    guard++;
    const sixDigit = makeCandidate(6, sixPools, rng);
    const threeDigit = [makeCandidate(3, threePools, rng), makeCandidate(3, threePools, rng)];
    const twoDigit = makeCandidate(2, twoPools, rng);
    const key = `${sixDigit}|${threeDigit.join(',')}|${twoDigit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const score =
      scoreCandidate(sixDigit, sixPools) * 0.5 +
      scoreCandidate(threeDigit[0], threePools) * 0.15 +
      scoreCandidate(threeDigit[1], threePools) * 0.15 +
      scoreCandidate(twoDigit, twoPools) * 0.2;
    sets.push({ sixDigit, threeDigit, twoDigit, score });
  }

  sets.sort((a, b) => b.score - a.score);
  return sets;
}

/**
 * Overall hot/cold digits across the whole draw history — powers the UI's
 * hot/cold panel. hot: hottest-first; cold: coldest-first.
 */
export function hotColdDigits(draws: unknown): { hot: number[]; cold: number[] } {
  const report = analyzeFrequency(normalizeDraws(draws));
  return { hot: report.overall.hot, cold: report.overall.cold };
}
