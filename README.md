# Streamda 🎬

A fast, beautiful streaming portal for **English movies & series** and **Tamil cinema** — built with React 19, Vite 8 and Tailwind CSS v4.

![Streamda](public/og-cover.png)

## Features

- **Two portals, one app** — Hollywood (IMDB-backed metadata, multiple stream servers) and Tamil cinema (year-wise catalogue, direct quality-resolved streams).
- **Cinematic hero** — auto-rotating featured slides with crossfading backdrops.
- **Unified search** — debounced live search across English movies, series and Tamil movies with recent & trending suggestions.
- **Custom video player** — for Tamil direct streams: gestures (double-tap seek), keyboard shortcuts, speed control, PiP, fullscreen, buffering states, skip-intro.
- **Watchlist & Continue Watching** — persisted locally, with real resume positions for direct streams.
- **Multi-profile** — switch between household profiles.
- **Genre & year browsing** — genre chips with pagination for English, year chips for Tamil.
- **Production-grade plumbing**:
  - Resilient HTTP layer: timeouts, retries with backoff (handles Render free-tier cold starts), request dedup, TTL cache, abort-on-unmount.
  - Route-level code splitting (every page is its own lazy chunk).
  - PWA: installable, app-shell service worker for instant repeat loads.
  - Error boundary, 404 page, skeleton loaders, empty/error states everywhere.
  - Accessibility: focus-visible rings, focus-trapped modals, aria labels, reduced-motion support.
  - 32 unit tests (Vitest + Testing Library), ESLint + Prettier, GitHub Actions CI.

## Getting started

```bash
npm install
npm run dev        # local dev server
```

### Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start Vite dev server with HMR  |
| `npm run build`     | Production build to `dist/`     |
| `npm run preview`   | Preview the production build    |
| `npm run lint`      | ESLint                          |
| `npm run format`    | Prettier write                  |
| `npm test`          | Run the Vitest suite            |

## Architecture

```
src/
├── api/            # Backend endpoint modules (english, tamil)
├── components/
│   ├── ui/         # Design-system primitives (Button, Badge, Modal, Skeleton, Toast…)
│   ├── HeroBanner  # Rotating hero carousel
│   ├── MovieCarousel  # Drag-scroll poster shelf + continue-watching cards
│   ├── PosterCard  # Poster tile (English + Tamil shapes)
│   ├── VideoPlayer # Custom HTML5 player
│   └── Sidebar     # Desktop rail + mobile bottom bar
├── context/        # AppContext: watchlist, progress, profiles, toasts
├── hooks/          # useApi, useDebouncedValue, usePageMeta, useMediaQuery
├── lib/            # http (retry/cache/dedup), storage, format utils
├── pages/          # Home, EnglishPortal, TamilPortal, Search, Watch*, Profile, Watchlist, 404
└── test/           # Vitest suites
```

### Backend

Content is served by a separate FastAPI backend (`moviesda-backend.onrender.com`):

- `GET /api/english/{movies|series}/popular?skip=N` — paginated catalogue
- `GET /api/english/{movies|series}/top` — top rated
- `GET /api/english/genres` + `/api/english/{type}/genre/{genre}` — genre browsing
- `GET /api/english/{movie|series}/{imdbId}` — details + stream servers
- `GET /api/years`, `/api/movies?year_url=…`, `/api/search`, `/api/auto-stream?movie_url=…` — Tamil catalogue & stream resolution

The frontend never scrapes directly; all fetching goes through the resilient `src/lib/http.js` wrapper.

## Deployment

Static build — deploy `dist/` anywhere (Netlify, Vercel, Cloudflare Pages, GitHub Pages). The service worker and manifest make it installable as a PWA. SPA routing requires a rewrite rule (`/* -> /index.html`) on most hosts.

## Notes

- Stream sources are third-party embeds; the app sandboxes iframes (`sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`) and never injects credentials.
- Watchlist/progress live in `localStorage` only — no accounts, no tracking.

## License

[MIT](LICENSE) © Abhishek
