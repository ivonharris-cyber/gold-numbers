import { generateSets, hotColdDigits } from '../engine/generator.js';
import { ticketOracle } from '../engine/oracle.js';
import type { Draw, BirthInfo } from '../engine/generator.js';

const signEl = document.getElementById('sign') as HTMLSelectElement;
const favouredEl = document.getElementById('favoured') as HTMLInputElement;
const birthdateEl = document.getElementById('birthdate') as HTMLInputElement;
const birthtimeEl = document.getElementById('birthtime') as HTMLInputElement;
const btn = document.getElementById('generate') as HTMLButtonElement;
const resultsEl = document.getElementById('results') as HTMLElement;
const hotcoldEl = document.getElementById('hotcold') as HTMLElement;
const hotcoldBody = document.getElementById('hotcold-body') as HTMLElement;
const oracleEl = document.getElementById('oracle') as HTMLElement;
const oracleText = document.getElementById('oracle-text') as HTMLElement;

async function loadDraws(): Promise<Draw[]> {
  const res = await fetch('data/draws.json');
  if (!res.ok) throw new Error('failed to load draw data');
  return res.json() as Promise<Draw[]>;
}

function parseFavoured(raw: string): number[] {
  return raw
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((s) => parseInt(s, 10))
    .filter((n) => n >= 0 && n <= 9);
}

function readBirth(): BirthInfo | undefined {
  const date = birthdateEl.value;
  const time = birthtimeEl.value;
  if (!date || !time) return undefined;
  return { date, time };
}

function zodiacFromDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  const bounds: [number, number, string][] = [
    [3, 21, 'aries'], [4, 20, 'taurus'], [5, 21, 'gemini'], [6, 21, 'cancer'],
    [7, 23, 'leo'], [8, 23, 'virgo'], [9, 23, 'libra'], [10, 23, 'scorpio'],
    [11, 22, 'sagittarius'], [12, 22, 'capricorn'], [1, 20, 'aquarius'], [2, 19, 'pisces'],
  ];
  let sign = 'capricorn';
  for (const [bm, bd, s] of bounds) {
    if (m > bm || (m === bm && d >= bd)) sign = s;
  }
  return sign;
}

function renderHotCold(draws: Draw[]): void {
  const { hot, cold } = hotColdDigits(draws);
  hotcoldBody.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'digit-row';
  for (const d of hot) {
    const chip = document.createElement('span');
    chip.className = 'digit-chip hot';
    chip.textContent = `🔥 ${d}`;
    row.appendChild(chip);
  }
  for (const d of cold) {
    const chip = document.createElement('span');
    chip.className = 'digit-chip cold';
    chip.textContent = `❄ ${d}`;
    row.appendChild(chip);
  }
  hotcoldBody.appendChild(row);
  hotcoldEl.hidden = false;
}

function renderOracle(birth: BirthInfo): void {
  const o = ticketOracle(birth);
  oracleText.innerHTML =
    `The stars say: buy your ticket on <strong>${o.street}</strong>, Bangkok, ` +
    `this <strong>${o.day}</strong> between <strong>${o.time}</strong>. ` +
    `Wear something gold. 🌟`;
  oracleEl.hidden = false;
}

function renderSets(sets: ReturnType<typeof generateSets>): void {
  resultsEl.innerHTML = '';
  sets.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'set-card';
    card.style.animationDelay = `${i * 45}ms`;

    const rank = document.createElement('div');
    rank.className = 'set-rank';
    rank.textContent = `#${i + 1}`;

    const nums = document.createElement('div');
    nums.className = 'set-nums';
    nums.innerHTML =
      `<span><span class="set-label">6-digit</span><span class="six">${s.sixDigit}</span></span>` +
      `<span><span class="set-label">3-digit</span><span class="three">${s.threeDigit.join(' · ')}</span></span>` +
      `<span><span class="set-label">2-digit</span><span class="two">${s.twoDigit}</span></span>`;

    const score = document.createElement('div');
    score.className = 'set-score';
    score.textContent = `gold ${Math.round(s.score * 100)}%`;

    card.append(rank, nums, score);
    resultsEl.appendChild(card);
  });
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  try {
    const draws = await loadDraws();
    const favoured = parseFavoured(favouredEl.value);
    const birth = readBirth();
    const sign = birth ? zodiacFromDate(birth.date) : signEl.value;
    renderHotCold(draws);
    const sets = generateSets(sign, favoured, draws, birth);
    renderSets(sets);
    if (birth) {
      renderOracle(birth);
    } else {
      oracleEl.hidden = true;
    }
  } catch (err) {
    resultsEl.innerHTML = `<p class="disclaimer">Could not load draw data — check data/draws.json exists.</p>`;
    console.error(err);
  } finally {
    btn.disabled = false;
  }
});
