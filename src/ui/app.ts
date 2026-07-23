import { generateSets, hotColdDigits } from '../engine/generator.js';
import type { Draw } from '../engine/generator.js';

const signEl = document.getElementById('sign') as HTMLSelectElement;
const favouredEl = document.getElementById('favoured') as HTMLInputElement;
const btn = document.getElementById('generate') as HTMLButtonElement;
const resultsEl = document.getElementById('results') as HTMLElement;
const hotcoldEl = document.getElementById('hotcold') as HTMLElement;
const hotcoldBody = document.getElementById('hotcold-body') as HTMLElement;

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
    renderHotCold(draws);
    const sets = generateSets(signEl.value, favoured, draws);
    renderSets(sets);
  } catch (err) {
    resultsEl.innerHTML = `<p class="disclaimer">Could not load draw data — check data/draws.json exists.</p>`;
    console.error(err);
  } finally {
    btn.disabled = false;
  }
});
