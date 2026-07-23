import { generateSets, hotColdDigits } from '../engine/generator.js';
import { ticketOracle } from '../engine/oracle.js';
const signEl = document.getElementById('sign');
const favouredEl = document.getElementById('favoured');
const birthdateEl = document.getElementById('birthdate');
const birthtimeEl = document.getElementById('birthtime');
const btn = document.getElementById('generate');
const resultsEl = document.getElementById('results');
const hotcoldEl = document.getElementById('hotcold');
const hotcoldBody = document.getElementById('hotcold-body');
const oracleEl = document.getElementById('oracle');
const oracleText = document.getElementById('oracle-text');
async function loadDraws() {
    const res = await fetch('data/draws.json');
    if (!res.ok)
        throw new Error('failed to load draw data');
    return res.json();
}
function parseFavoured(raw) {
    return raw
        .split(/[^0-9]+/)
        .filter(Boolean)
        .map((s) => parseInt(s, 10))
        .filter((n) => n >= 0 && n <= 9);
}
function readBirth() {
    const date = birthdateEl.value;
    const time = birthtimeEl.value;
    if (!date || !time)
        return undefined;
    return { date, time };
}
function zodiacFromDate(dateStr) {
    const [, m, d] = dateStr.split('-').map(Number);
    const bounds = [
        [3, 21, 'aries'], [4, 20, 'taurus'], [5, 21, 'gemini'], [6, 21, 'cancer'],
        [7, 23, 'leo'], [8, 23, 'virgo'], [9, 23, 'libra'], [10, 23, 'scorpio'],
        [11, 22, 'sagittarius'], [12, 22, 'capricorn'], [1, 20, 'aquarius'], [2, 19, 'pisces'],
    ];
    let sign = 'capricorn';
    for (const [bm, bd, s] of bounds) {
        if (m > bm || (m === bm && d >= bd))
            sign = s;
    }
    return sign;
}
function renderHotCold(draws) {
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
const STREET_TH = {
    'Sukhumvit Road': 'ถนนสุขุมวิท',
    'Silom Road': 'ถนนสีลม',
    'Yaowarat Road': 'ถนนเยาวราช',
    'Khao San Road': 'ถนนข้าวสาร',
    'Ratchadamnoen Avenue': 'ถนนราชดำเนิน',
    'Charoen Krung Road': 'ถนนเจริญกรุง',
    'Phaya Thai Road': 'ถนนพญาไท',
    'Asoke Montri Road': 'ถนนอโศกมนตรี',
    'Phetchaburi Road': 'ถนนเพชรบุรี',
    'Rama IV Road': 'ถนนพระรามที่ 4',
    'Sathorn Road': 'ถนนสาทร',
    'Victory Monument': 'อนุสาวรีย์ชัยสมรภูมิ',
};
const DAY_TH = {
    Monday: 'วันจันทร์', Tuesday: 'วันอังคาร', Wednesday: 'วันพุธ',
    Thursday: 'วันพฤหัสบดี', Friday: 'วันศุกร์', Saturday: 'วันเสาร์', Sunday: 'วันอาทิตย์',
};
function renderOracle(birth) {
    const o = ticketOracle(birth);
    const street = STREET_TH[o.street] ?? o.street;
    const day = DAY_TH[o.day] ?? o.day;
    oracleText.innerHTML =
        `ฤกษ์มงคลบอกว่า: ไปซื้อสลากที่ <strong>${street}</strong> กรุงเทพฯ ` +
            `<strong>${day}</strong>นี้ ช่วงเวลา <strong>${o.time}</strong> น. ` +
            `อย่าลืมใส่เสื้อสีทองไปด้วยนะ 🌟`;
    oracleEl.hidden = false;
}
function renderSets(sets) {
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
            `<span><span class="set-label">เลข 6 หลัก</span><span class="six">${s.sixDigit}</span></span>` +
                `<span><span class="set-label">เลข 3 ตัว</span><span class="three">${s.threeDigit.join(' · ')}</span></span>` +
                `<span><span class="set-label">เลข 2 ตัว</span><span class="two">${s.twoDigit}</span></span>`;
        const score = document.createElement('div');
        score.className = 'set-score';
        score.textContent = `มงคล ${Math.round(s.score * 100)}%`;
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
        }
        else {
            oracleEl.hidden = true;
        }
    }
    catch (err) {
        resultsEl.innerHTML = `<p class="disclaimer">โหลดข้อมูลผลสลากไม่ได้ — กรุณาตรวจสอบไฟล์ data/draws.json</p>`;
        console.error(err);
    }
    finally {
        btn.disabled = false;
    }
});
