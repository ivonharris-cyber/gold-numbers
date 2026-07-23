// Shared contract between engine (Peters) and UI (Winston).
// Engine implements these types + generateGoldSets(); UI consumes them.

export type StarSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export interface Draw {
  date: string;          // ISO yyyy-mm-dd
  first: string;         // 6-digit 1st prize
  first3: string[];      // two 3-digit prizes
  last3: string[];       // two 3-digit prizes
  last2: string;         // 2-digit prize
}

export interface DrawsFile {
  source: string;
  fetched: string;
  draws: Draw[];
}

export interface DigitStats {
  hot: number[];         // digits 0-9 ranked by frequency desc (top first)
  cold: number[];        // least frequent digits, asc frequency
  counts: number[];      // counts[d] = occurrences of digit d across all draws
}

export interface GoldSet {
  index: number;         // 1..10
  sixDigit: string;      // 6 chars
  threeDigit: string;    // 3 chars
  twoDigit: string;      // 2 chars
  luckyDigit: number;    // dominant digit for this set (star-sign seeded)
}

export interface EngineResult {
  starSign: StarSign;
  seed: number;          // deterministic seed used (for display/reproducibility)
  stats: DigitStats;
  sets: GoldSet[];       // exactly 10
}

// Engine entry point. draws = parsed DrawsFile. Must be deterministic:
// same (draws, starSign, dateSalt) => identical output.
export declare function generateGoldSets(
  data: DrawsFile,
  starSign: StarSign,
  dateSalt?: string   // optional extra entropy, e.g. today's date; UI passes undefined for reproducible demo
): EngineResult;

export declare function analyse(data: DrawsFile): DigitStats;
