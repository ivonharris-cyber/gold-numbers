import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analyse, generateGoldSets, luckyDigitsForSign } from '../src/engine.js';
import type { DrawsFile } from '../src/types.js';

// Resolve against the repo root (process.cwd()) so the test works both from
// ts-node-style source runs and from compiled dist-tests/ output, where the
// relative location of data/ differs.
const data = JSON.parse(
  readFileSync(join(process.cwd(), 'data', 'draws.json'), 'utf8'),
) as DrawsFile;

/* ---------- tiny synthetic fixture ---------- */
const tiny: DrawsFile = {
  source: 'synthetic test fixture',
  fetched: '2026-07-23',
  draws: [
    { date: '2026-07-01', first: '000000', first3: ['000', '111'], last3: ['111', '000'], last2: '00' },
    { date: '2026-07-16', first: '111111', first3: ['000', '111'], last3: ['111', '000'], last2: '11' },
  ],
};
// tiny digit totals (recount):
//   draw 1: 0s = 6 (first) + 3 (first3[0]) + 3 (last3[1]) + 2 (last2) = 14; 1s = 3 + 3 = 6
//   draw 2: 0s = 3 + 3 = 6;                                 1s = 6 + 3 + 3 + 2 = 14
//   totals: 0 -> 20, 1 -> 20, everything else 0 (40 digits total)

/* ---------- analyse() ---------- */

test('analyse: counts sum to total digits in data', () => {
  const stats = analyse(data);
  const total = stats.counts.reduce((a, b) => a + b, 0);
  // 8 draws * (6 + 3 + 3 + 3 + 3 + 2) = 8 * 20 = 160
  assert.equal(total, 160);
});

test('analyse: hot/cold are deterministic permutations of 0..9', () => {
  const stats = analyse(data);
  assert.deepEqual([...stats.hot].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual([...stats.cold].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(stats.counts.length, 10);
});

test('analyse: hot[0] has the max count, cold[0] the min count', () => {
  const stats = analyse(data);
  assert.equal(stats.counts[stats.hot[0]], Math.max(...stats.counts));
  assert.equal(stats.counts[stats.cold[0]], Math.min(...stats.counts));
  // hot is descending frequency; the ranking is self-consistent
  for (let i = 1; i < 10; i++) {
    assert.ok(stats.counts[stats.hot[i - 1]] >= stats.counts[stats.hot[i]]);
    assert.ok(stats.counts[stats.cold[i - 1]] <= stats.counts[stats.cold[i]]);
  }
});

test('analyse: hot/cold on tiny synthetic fixture', () => {
  const stats = analyse(tiny);
  assert.equal(stats.counts[0], 20);
  assert.equal(stats.counts[1], 20);
  assert.equal(stats.counts.reduce((a, b) => a + b, 0), 40);
  // 0 and 1 tie at 20 -> tie-break by digit value puts 0 first
  assert.deepEqual(stats.hot.slice(0, 2), [0, 1]);
  // cold: the eight zero-count digits first (tie -> ascending), then the tied pair
  assert.deepEqual(stats.cold.slice(0, 8), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(stats.cold.slice(8), [0, 1]);
});

test('analyse: tie-break is by digit value', () => {
  const tied: DrawsFile = {
    source: 't',
    fetched: 't',
    draws: [
      { date: '2026-01-01', first: '975310', first3: ['975', '310'], last3: ['975', '310'], last2: '97' },
    ],
  };
  const stats = analyse(tied);
  // 7 and 9 appear 4 times (hottest, tie -> 7 first);
  // 0,1,3,5 appear 3 times; 2,4,6,8 appear 0 (coldest)
  assert.deepEqual(stats.hot, [7, 9, 0, 1, 3, 5, 2, 4, 6, 8]);
  assert.deepEqual(stats.cold, [2, 4, 6, 8, 0, 1, 3, 5, 7, 9]);
});

/* ---------- generateGoldSets() ---------- */

test('generateGoldSets: exactly 10 sets with correct shapes', () => {
  const res = generateGoldSets(data, 'leo');
  assert.equal(res.sets.length, 10);
  res.sets.forEach((s, i) => {
    assert.equal(s.index, i + 1);
    assert.match(s.sixDigit, /^\d{6}$/);
    assert.match(s.threeDigit, /^\d{3}$/);
    assert.match(s.twoDigit, /^\d{2}$/);
    assert.ok(s.luckyDigit >= 0 && s.luckyDigit <= 9);
  });
});

test('generateGoldSets: 6-digit picks are unique within the 10 sets', () => {
  const res = generateGoldSets(data, 'leo');
  const sixes = res.sets.map((s) => s.sixDigit);
  assert.equal(new Set(sixes).size, 10);
});

test('generateGoldSets: deterministic — same inputs give identical output', () => {
  const a = generateGoldSets(data, 'leo');
  const b = generateGoldSets(data, 'leo');
  assert.deepEqual(a, b);
});

test('generateGoldSets: dateSalt changes the stream, undefined salt is stable', () => {
  const plain1 = generateGoldSets(data, 'leo');
  const plain2 = generateGoldSets(data, 'leo', undefined);
  assert.deepEqual(plain1, plain2);

  const salted = generateGoldSets(data, 'leo', '2026-07-23');
  assert.ok(salted.seed !== plain1.seed);
  assert.notDeepEqual(
    salted.sets.map((s) => s.sixDigit),
    plain1.sets.map((s) => s.sixDigit),
  );
  // salted generation is itself deterministic
  assert.deepEqual(salted, generateGoldSets(data, 'leo', '2026-07-23'));
});

test('generateGoldSets: different signs give different seeds and sets', () => {
  const leo = generateGoldSets(data, 'leo');
  const aries = generateGoldSets(data, 'aries');
  assert.equal(leo.starSign, 'leo');
  assert.equal(aries.starSign, 'aries');
  assert.ok(leo.seed !== aries.seed);
  assert.notDeepEqual(
    leo.sets.map((s) => s.sixDigit),
    aries.sets.map((s) => s.sixDigit),
  );
});

test('generateGoldSets: result echoes stats and seed; seed is uint32', () => {
  const res = generateGoldSets(data, 'scorpio');
  assert.deepEqual(res.stats, analyse(data));
  assert.ok(Number.isInteger(res.seed));
  assert.ok(res.seed >= 0 && res.seed <= 0xffffffff);
});

test('generateGoldSets: works on a single-draw dataset (no crash, valid shapes)', () => {
  const one: DrawsFile = { source: 't', fetched: 't', draws: [data.draws[0]] };
  const res = generateGoldSets(one, 'pisces');
  assert.equal(res.sets.length, 10);
  assert.equal(new Set(res.sets.map((s) => s.sixDigit)).size, 10);
});

/* ---------- lucky digit mapping ---------- */

test('luckyDigitsForSign: all 12 signs map to two digits in 1..9', () => {
  const signs = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ] as const;
  for (const s of signs) {
    const [p, q] = luckyDigitsForSign(s);
    assert.ok(p >= 1 && p <= 9, `${s} primary`);
    assert.ok(q >= 1 && q <= 9, `${s} secondary`);
  }
  // documented scheme: primary = idx mod 9 + 1
  assert.deepEqual(luckyDigitsForSign('aries'), [1, 7]);
  assert.deepEqual(luckyDigitsForSign('leo'), [5, 2]);
  assert.deepEqual(luckyDigitsForSign('pisces'), [3, 9]);
});
