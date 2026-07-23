/**
 * birthdate.ts — Thai-numerology lucky digits derived from birth date + time.
 *
 * Pure module, zero deps. Deterministic: same birth info in -> same digits out.
 *
 * Signals (all wrapped into 0-9):
 *   birthDayDigit  — digital root of the day of month
 *   lifePath       — digital root of the full date's digit sum (classic)
 *   timeDigit      — digital root of (hour + minute)
 *   weekDayDigit   — Thai weekday number, Monday=1 ... Sunday=7
 *
 * In Thai numerology Wednesday daytime and Wednesday night are sometimes
 * treated separately; we keep the simple Mon=1..Sun=7 mapping for clarity.
 */
/** Digital root of a non-negative integer (0 -> 0). */
function digitalRoot(n) {
    while (n > 9) {
        let s = 0;
        while (n > 0) {
            s += n % 10;
            n = Math.floor(n / 10);
        }
        n = s;
    }
    return n;
}
/**
 * Day of week for an ISO date (Sakamoto's algorithm — no Date objects, so
 * no timezone surprises). Returns 0=Sunday .. 6=Saturday.
 */
function dayOfWeek(y, m, d) {
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    const yy = m < 3 ? y - 1 : y;
    return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}
/**
 * Derive the four Thai-numerology birth digits.
 * @param date ISO yyyy-mm-dd
 * @param time HH:MM (24h)
 * @throws on malformed input or out-of-range components
 */
export function birthDigits(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new Error(`birth date must be yyyy-mm-dd, got "${date}"`);
    if (!/^\d{2}:\d{2}$/.test(time))
        throw new Error(`birth time must be HH:MM, got "${time}"`);
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31)
        throw new Error(`birth date out of range: "${date}"`);
    if (hh > 23 || mm > 59)
        throw new Error(`birth time out of range: "${time}"`);
    const birthDayDigit = digitalRoot(d);
    const lifePath = digitalRoot(String(y).split('').reduce((a, c) => a + Number(c), 0)
        + String(m).split('').reduce((a, c) => a + Number(c), 0)
        + String(d).split('').reduce((a, c) => a + Number(c), 0));
    const timeDigit = digitalRoot(hh + mm);
    // Sakamoto gives 0=Sun..6=Sat; Thai mapping is Mon=1..Sat=6, Sun=7.
    const dow = dayOfWeek(y, m, d);
    const weekDayDigit = dow === 0 ? 7 : dow;
    const all = [...new Set([birthDayDigit, lifePath, timeDigit, weekDayDigit])].sort((a, b) => a - b);
    return { birthDayDigit, lifePath, timeDigit, weekDayDigit, all };
}
