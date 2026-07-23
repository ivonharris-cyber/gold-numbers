/**
 * oracle.ts — playful "where/when to buy your ticket" oracle, derived
 * deterministically from birth info. Entertainment only.
 *
 * Pure module, zero deps. Same birth info in -> same oracle out.
 */
import { signForDate, luckyDigitsFor } from './zodiac.js';
const STREETS = [
    'Sukhumvit Road', 'Silom Road', 'Yaowarat Road', 'Khao San Road',
    'Ratchadamnoen Avenue', 'Charoen Krung Road', 'Phaya Thai Road',
    'Asoke Montri Road', 'Phetchaburi Road', 'Rama IV Road',
    'Sathorn Road', 'Victory Monument',
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** FNV-1a — same hashing scheme as the generator, keeps the family consistent. */
function hashString(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
/**
 * Deterministic oracle reading for a birth date+time.
 * @throws on malformed birth info (same validation as the generator).
 */
export function ticketOracle(birth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth.date))
        throw new Error(`birth date must be yyyy-mm-dd, got "${birth.date}"`);
    if (!/^\d{2}:\d{2}$/.test(birth.time))
        throw new Error(`birth time must be HH:MM, got "${birth.time}"`);
    const [y, m, d] = birth.date.split('-').map(Number);
    const [hh, mm] = birth.time.split(':').map(Number);
    const sign = signForDate(m, d);
    const lucky = luckyDigitsFor(sign);
    const h = hashString(`${birth.date}T${birth.time}`);
    const street = STREETS[(h + lucky[0]) % STREETS.length];
    // Day of week (Sakamoto) blended with the secondary lucky digit
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    const yy = m < 3 ? y - 1 : y;
    const dow = (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
    const day = DAYS[(dow + (lucky[lucky.length - 1] % 7)) % 7];
    // Time window: 2-hour block anchored by birth hour and the hash
    const start = (hh + (h % 6)) % 22; // 00..21 so the window stays inside the day
    const pad = (n) => String(n).padStart(2, '0');
    const time = `${pad(start)}:${pad(mm % 60)}-${pad(start + 2)}:${pad(mm % 60)}`;
    return { street, day, time };
}
