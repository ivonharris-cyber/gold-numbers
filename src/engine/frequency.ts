/**
 * frequency.ts — digit hot/cold analysis per position over historical draws.
 *
 * Pure module, zero deps. Numbers are fixed-width strings so leading zeros
 * are preserved and per-position analysis is meaningful.
 */

import type { Draw } from './generator.js';

export interface PositionStats {
  /** counts[d] = occurrences of digit d at this position */
  counts: number[];
  /** digits ranked hottest-first (ties: lower digit first — deterministic) */
  hot: number[];
  /** digits ranked coldest-first */
  cold: number[];
}

export interface FrequencyReport {
  /** per-position stats for the 6-digit first prize (indices 0..5) */
  firstPrize: PositionStats[];
  /** per-position stats across all 3-digit prizes (front3 + last3 pooled) */
  threeDigit: PositionStats[];
  /** per-position stats for the 2-digit prize */
  twoDigit: PositionStats[];
  /** overall digit frequency across every prize string in the dataset */
  overall: PositionStats;
}

function emptyCounts(): number[] {
  return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

function rankDigits(counts: number[]): { hot: number[]; cold: number[] } {
  const digits = counts.map((_, d) => d);
  const hot = [...digits].sort((a, b) => counts[b] - counts[a] || a - b);
  const cold = [...digits].sort((a, b) => counts[a] - counts[b] || a - b);
  return { hot, cold };
}

function buildPositionStats(width: number, values: string[]): PositionStats[] {
  const positions: PositionStats[] = [];
  for (let i = 0; i < width; i++) {
    const counts = emptyCounts();
    for (const v of values) {
      const d = v.charCodeAt(i) - 48;
      if (d >= 0 && d <= 9) counts[d]++;
    }
    positions.push({ counts, ...rankDigits(counts) });
  }
  return positions;
}

/** Fail fast on malformed draw data — never let bad input skew the stats. */
export function validateDraw(d: Draw): void {
  if (!/^\d{6}$/.test(d.firstPrize)) throw new Error(`draw ${d.date}: firstPrize must be 6 digits`);
  for (const v of d.front3) if (!/^\d{3}$/.test(v)) throw new Error(`draw ${d.date}: front3 entries must be 3 digits`);
  for (const v of d.last3) if (!/^\d{3}$/.test(v)) throw new Error(`draw ${d.date}: last3 entries must be 3 digits`);
  if (!/^\d{2}$/.test(d.last2)) throw new Error(`draw ${d.date}: last2 must be 2 digits`);
}

/** Accept both the flat Draw[] shape and the wrapped DrawsFile shape
 *  ({ draws: [...] }) so callers can pass fetched JSON directly. */
export function normalizeDraws(input: unknown): Draw[] {
  const arr: unknown[] = Array.isArray(input) ? input : (input as { draws: unknown[] }).draws;
  if (!Array.isArray(arr)) throw new Error('draw data must be an array or { draws: [...] }');
  // Map wrapped-schema field names (first/first3) to the contract names.
  return arr.map((raw) => {
    const d = raw as Record<string, unknown>;
    return {
      date: String(d.date),
      firstPrize: String(d.firstPrize ?? d.first),
      front3: (d.front3 ?? d.first3) as string[],
      last3: d.last3 as string[],
      last2: String(d.last2),
    };
  });
}

/** Compute frequency stats over the full draw history. */
export function analyzeFrequency(draws: Draw[]): FrequencyReport {
  for (const d of draws) validateDraw(d);

  const firstPrize = buildPositionStats(6, draws.map((d) => d.firstPrize));
  const threeDigit = buildPositionStats(3, draws.flatMap((d) => [...d.front3, ...d.last3]));
  const twoDigit = buildPositionStats(2, draws.map((d) => d.last2));

  const overallCounts = emptyCounts();
  for (const d of draws) {
    const all = d.firstPrize + d.front3.join('') + d.last3.join('') + d.last2;
    for (const c of all) overallCounts[c.charCodeAt(0) - 48]++;
  }

  return {
    firstPrize,
    threeDigit,
    twoDigit,
    overall: { counts: overallCounts, ...rankDigits(overallCounts) },
  };
}
