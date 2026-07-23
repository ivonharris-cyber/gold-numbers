# 🏆 Gold Numbers — Thai Lottery Lucky Picks

A web-first lucky-number app for the Thai Government Lottery. Combines:

- **Recent draw stats** — hot/cold digit frequency from the last 8 real GLO draws
- **Favoured digits** — your personal lucky numbers, seeded in
- **Star-sign numerology** — zodiac-weighted digit pools

Generates **10 "gold" sets**, each with a 6-digit first-prize pick, two 3-digit picks, and a 2-digit pick.

## Run it

```bash
npm install
npm run build      # outputs dist/
npm run serve      # http://localhost:8080 (serves repo root — open dist/index.html or copy dist to any static host)
```

## Stack

Vanilla TypeScript → ES2022, zero runtime deps, single-page static site.

## Lanes

| Owner | Files |
|-------|-------|
| Winston | `index.html`, `styles.css`, `src/ui/`, build config |
| Peters | `data/draws.json`, `src/engine/`, `tests/` |

## ⚠️ Disclaimer

Lottery draws are random. This app is **for entertainment only** — no method can predict winning numbers. Play responsibly.
