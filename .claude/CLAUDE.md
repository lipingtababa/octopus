# Octopus — Project Guidelines

## What Is This

A **PWA podcast player** that delivers daily Swedish news briefings as audio digests with article summaries. Chinese-language audio narration of Swedish news stories.

- **Repo**: `lipingtababa/octopus` on GitHub
- **Hosted**: GitHub Pages at `/octopus/`
- **No build step** — vanilla HTML/CSS/JS, edit and deploy directly

## Architecture

Single-page app with 7 files at the root:

| File | Purpose |
|------|---------|
| `index.html` | Main page template |
| `app.js` | All application logic (player, routing, rendering) |
| `style.css` | Dark theme styling, mobile-first |
| `sw.js` | Service worker (cache-first static, network-first digests) |
| `manifest.json` | PWA manifest (scope: `/octopus/`) |
| `icon.svg` | Octopus logo |
| `digests/` | Daily digest JSON + MP3 files |

## Data Model

### Digest (episode)
```
digests/YYYY-MM-DD.json  →  { date, title, audio_url, duration_seconds, stories[], script }
digests/latest.json      →  same structure, points to today's digest
digests/YYYY-MM-DD.mp3   →  audio file (~3-4MB)
```

### Story (article within a digest)
```
{ headline, summary, source, link }
```

- Each digest has ~10-12 stories
- Sources are Swedish outlets (Ekot, DN, SVT, Aftonbladet, Kvartal, etc.)
- Headlines/summaries in English, audio script in Chinese

## UI Layout (scroll order)

1. **Player hero** (100vh) — artwork, title, date, play/pause, progress bar
2. **Previous days** — past 7 days of digest cards (clickable to play)
3. **In this briefing** — story cards with headline, summary, source link
4. **Footer**

## Design Tokens (CSS variables)

- `--bg-primary: #0d0d1a` / `--bg-card: #1a1a2e` / `--accent: #e94560`
- Dark theme only, mobile-first, max-width 640px content area
- System font stack, no external fonts

## Key Behaviours

- Auto-plays new digest on load; shows "You're up to date" if already heard
- Playback state tracked in `localStorage` (`octopus-last-played`)
- Service worker: cache-first for static assets, network-first for digests
- Cache version: `CACHE_NAME` in `sw.js` — bump when changing static assets

## Conventions

- Vanilla JS (ES5-compatible, no transpilation)
- No dependencies, no package.json, no build tools
- Commits are daily digests: "Digest YYYY-MM-DD"
- Keep it minimal — this is intentionally a tiny, zero-dependency project
