import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateSets, hotColdDigits } from '../src/engine/generator.js';
import { ticketOracle } from '../src/engine/oracle.js';
import { birthDigits } from '../src/engine/birthdate.js';
import type { Draw } from '../src/engine/generator.js';
import { ZODIAC_SIGNS } from '../src/engine/zodiac.js';

// Resolve from process.cwd() so the test runs from source or compiled output.
const raw = JSON.parse(readFileSync(join(process.cwd(), 'data', 'draws.json'), 'utf8'));
// generateSets accepts the wrapped { draws: [...] } file shape directly.

test('generateSets returns exactly 10 sets for every sign', () => {
  for (const sign of ZODIAC_SIGNS) {
    assert.equal(generateSets(sign, [3, 7], raw).length, 10, sign);
  }
});

test('every set respects digit ranges and field shapes', () => {
  for (const s of generateSets('virgo', [1, 9], raw)) {
    assert.match(s.sixDigit, /^\d{6}$/);
    assert.equal(s.threeDigit.length, 2);
    for (const t of s.threeDigit) assert.match(t, /^\d{3}$/);
    assert.match(s.twoDigit, /^\d{2}$/);
    assert.ok(s.score >= 0 && s.score <= 1, `score ${s.score}`);
  }
});

test('determinism — same inputs give identical output', () => {
  const a = generateSets('scorpio', [4, 8], raw);
  const b = generateSets('scorpio', [4, 8], raw);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('determinism holds with birth info; birth info changes the stream', () => {
  const birth = { date: '1990-08-05', time: '07:30' };
  const a = generateSets('leo', [5], raw, birth);
  assert.deepEqual(a, generateSets('leo', [5], raw, birth));
  assert.notDeepEqual(
    a.map((s) => s.sixDigit),
    generateSets('leo', [5], raw).map((s) => s.sixDigit),
  );
});

test('favoured-digit order is normalised; out-of-range digits are ignored', () => {
  assert.deepEqual(generateSets('leo', [7, 3], raw), generateSets('leo', [3, 7], raw));
  assert.equal(generateSets('aries', [-1, 10, 5, NaN], raw).length, 10);
});

test('different signs produce different sets', () => {
  assert.notDeepEqual(generateSets('aries', [5], raw), generateSets('taurus', [5], raw));
});

test('sets are sorted best-first and all 10 are distinct', () => {
  const sets = generateSets('pisces', [2, 6], raw);
  for (let i = 1; i < sets.length; i++) assert.ok(sets[i - 1].score >= sets[i].score);
  const keys = sets.map((s) => `${s.sixDigit}|${s.threeDigit.join(',')}|${s.twoDigit}`);
  assert.equal(new Set(keys).size, 10);
});

test('input validation — unknown sign, empty draws, malformed draws throw', () => {
  assert.throws(() => generateSets('dragon', [1], raw));
  assert.throws(() => generateSets('leo', [1], { draws: [] }));
  assert.throws(() => generateSets('leo', [1], [{ date: 'x', firstPrize: '12', front3: [], last3: [], last2: '1' }]));
  assert.throws(() => generateSets('leo', [1], raw, { date: '5 Aug 1990', time: '07:30' }));
});

test('flat Draw[] and wrapped DrawsFile shapes give identical results', () => {
  const flat: Draw[] = raw.draws.map((d: Record<string, unknown>) => ({
    date: d.date,
    firstPrize: d.first,
    front3: d.first3,
    last3: d.last3,
    last2: d.last2,
  }));
  assert.deepEqual(generateSets('cancer', [0], flat), generateSets('cancer', [0], raw));
});

test('hotColdDigits returns deterministic permutations of 0..9', () => {
  const { hot, cold } = hotColdDigits(raw);
  assert.deepEqual([...hot].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual([...cold].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(hotColdDigits(raw), { hot, cold });
});

test('ticketOracle is deterministic with valid shapes', () => {
  const birth = { date: '1988-02-29', time: '23:45' };
  const a = ticketOracle(birth);
  assert.deepEqual(a, ticketOracle(birth));
  assert.ok(a.street.length > 0);
  assert.match(a.day, /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/);
  assert.match(a.time, /^\d{2}:\d{2}-\d{2}:\d{2}$/);
  assert.throws(() => ticketOracle({ date: 'nope', time: '07:00' }));
});

test('birthDigits — Thai numerology signals are in range and deterministic', () => {
  const b = birthDigits('1990-08-05', '07:30');
  assert.deepEqual(b, birthDigits('1990-08-05', '07:30'));
  for (const d of [b.birthDayDigit, b.lifePath, b.timeDigit, b.weekDayDigit]) {
    assert.ok(Number.isInteger(d) && d >= 0 && d <= 9, `digit ${d}`);
  }
  // 1990-08-05 was a Sunday -> Thai weekday digit 7
  assert.equal(b.weekDayDigit, 7);
  // day 5 -> 5; date digit sum 1+9+9+0+0+8+0+5=32 -> 5; 07+30=37 -> 10 -> 1
  assert.equal(b.birthDayDigit, 5);
  assert.equal(b.lifePath, 5);
  assert.equal(b.timeDigit, 1);
  // all is deduped + sorted
  assert.deepEqual(b.all, [...new Set(b.all)].sort((x, y) => x - y));
  assert.throws(() => birthDigits('1990/08/05', '07:30'));
  assert.throws(() => birthDigits('1990-08-05', '25:30'));
});

test('birth digits weight the blend — birth info shifts generated sets deterministically', () => {
  const birth = { date: '1985-12-25', time: '11:11' };
  const withBirth = generateSets('capricorn', [6], raw, birth);
  const without = generateSets('capricorn', [6], raw);
  assert.equal(withBirth.length, 10);
  assert.notDeepEqual(
    withBirth.map((s) => s.sixDigit),
    without.map((s) => s.sixDigit),
  );
  // backward compat: omitting birth keeps the legacy 3-arg call working
  assert.equal(generateSets('capricorn', [6], raw).length, 10);
});
