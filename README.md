# FreakyMustard — An Editorial Streaming Journal

English films, series and Tamil cinema, set like a printed film journal:
paper surfaces, serif headlines, numbered sections, one oxblood accent.
No gradients, no glass, no glow.

## Sections

| Route | What it is |
|---|---|
| `/` | Front page — one cover story, continue-reading ledger, numbered shelves |
| `/films` | English film index (popular, top-rated, by genre) |
| `/series` | Series index (popular, top-rated, by genre) |
| `/tamil` | Tamil archive (by year + web series) |
| `/search` | The index — unified search across all three |
| `/saved` | Your list + continue reading (browser-local only) |
| `/watch/movie/:imdb` | Screening room — house print, exchange prints, further prints |
| `/watch/series/:imdb` | Screening room + episode index |
| `/watch/tamil/:encodedUrl` | Tamil archive print |
| `/watch/tamil-series/:encodedUrl` | Tamil series screening room |

Legacy routes (`/english`, `/watchlist`, `/profile`, old watch URLs) redirect
to their new equivalents so saved links keep working.

## Styling

Vanilla CSS in `src/styles/` — `tokens.css` (the whole palette: paper, ink,
one accent), `base.css`, `journal.css` (every component class, `fm-`
prefixed). No Tailwind, no utility soup. The video frame is the only dark
surface. Motion is opacity-only; `prefers-reduced-motion` is respected.

Type: Fraunces (display serif) + Inter (body) via Google Fonts; system mono
for metadata.

## Backend

All content resolves through one FastAPI press on Hugging Face Spaces
(`freakymustard67-potato.hf.space`): `src/api/` holds the four endpoint
modules (english, tamil, direct HLS proxy, backup prints). The frontend never
scrapes directly; `src/lib/http.js` wraps fetching with timeouts, retries,
dedup and a small TTL cache.

## Getting started

```bash
npm install
npm run dev        # local dev server
```

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest suite |

## Notes

- Playback preference: house print (our ad-free HLS booth) → exchange embeds
  (iframes, popup-guarded) → further prints (as-is, collapsible).
- Saved list and reading history live in `localStorage` only — no accounts.
- Static build — deploy `dist/` anywhere. SPA routing needs a rewrite rule
  (`/* -> /index.html`, see `vercel.json`).

## License

[MIT](LICENSE) © Abhishek
