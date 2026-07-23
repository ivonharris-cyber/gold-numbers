/**
 * zodiac.ts — the 12 Western zodiac signs and their lucky digits, via
 * date-range numerology. Keys are lowercase English (aries..pisces).
 *
 * Pure module, zero deps.
 */

export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

interface SignRange {
  sign: ZodiacSign;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

const RANGES: SignRange[] = [
  { sign: 'aries',       startMonth: 3,  startDay: 21, endMonth: 4,  endDay: 19 },
  { sign: 'taurus',      startMonth: 4,  startDay: 20, endMonth: 5,  endDay: 20 },
  { sign: 'gemini',      startMonth: 5,  startDay: 21, endMonth: 6,  endDay: 20 },
  { sign: 'cancer',      startMonth: 6,  startDay: 21, endMonth: 7,  endDay: 22 },
  { sign: 'leo',         startMonth: 7,  startDay: 23, endMonth: 8,  endDay: 22 },
  { sign: 'virgo',       startMonth: 8,  startDay: 23, endMonth: 9,  endDay: 22 },
  { sign: 'libra',       startMonth: 9,  startDay: 23, endMonth: 10, endDay: 22 },
  { sign: 'scorpio',     startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
  { sign: 'sagittarius', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
  { sign: 'capricorn',   startMonth: 12, startDay: 22, endMonth: 1,  endDay: 19 },
  { sign: 'aquarius',    startMonth: 1,  startDay: 20, endMonth: 2,  endDay: 18 },
  { sign: 'pisces',      startMonth: 2,  startDay: 19, endMonth: 3,  endDay: 20 },
];

/** Digital root: keep summing digits until one remains. */
export function digitalRoot(n: number): number {
  while (n > 9) {
    let s = 0;
    while (n > 0) { s += n % 10; n = Math.floor(n / 10); }
    n = s;
  }
  return n;
}

/**
 * Lucky digits for a sign: digital roots of the range start, range end,
 * and their sum (as month*100 + day). 1-3 unique digits, sorted ascending
 * for determinism.
 */
export function luckyDigitsFor(sign: ZodiacSign): number[] {
  const r = RANGES.find((x) => x.sign === sign);
  if (!r) throw new Error(`unknown zodiac sign: ${sign}`);
  const start = r.startMonth * 100 + r.startDay;
  const end = r.endMonth * 100 + r.endDay;
  const digits = new Set<number>([
    digitalRoot(start),
    digitalRoot(end),
    digitalRoot(start + end),
  ]);
  return [...digits].sort((a, b) => a - b);
}

/** Resolve a (month, day) of birth to its zodiac sign. */
export function signForDate(month: number, day: number): ZodiacSign {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`invalid date: month=${month} day=${day}`);
  }
  for (const r of RANGES) {
    if (r.startMonth === r.endMonth) {
      if (month === r.startMonth && day >= r.startDay && day <= r.endDay) return r.sign;
    } else {
      if ((month === r.startMonth && day >= r.startDay) ||
          (month === r.endMonth && day <= r.endDay)) return r.sign;
    }
  }
  throw new Error(`no sign found for month=${month} day=${day}`);
}

/** Type guard / normaliser for untrusted input. */
export function isZodiacSign(s: string): s is ZodiacSign {
  return (ZODIAC_SIGNS as readonly string[]).includes(s);
}
