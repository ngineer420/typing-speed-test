# wpmflex.com — working notes for Claude

Free typing-speed (WPM) test built as a **true pixel-art arcade cabinet**
("TYPE RUSH"). Static, zero-dependency site: vanilla HTML/CSS/JS, no build step,
GitHub Pages (`CNAME` → wpmflex.com, Cloudflare DNS). Everything runs
client-side; nothing is uploaded.

## Files

- `index.html` — the whole game UI (the cabinet) + About + article list.
  Articles live in `articles/`.
- `assets/js/app.js` — pure stats/rating helpers up top (DOM-free,
  `module.exports` for Node sanity checks: `buildPassage`, `computeWPM`,
  `computeRawWPM`, `computeAccuracy`, `getRatingTier`, `getGrade`, …), then one
  IIFE with the DOM app (passage engine, timer, results, and the arcade HUD
  flavour).
- `assets/css/styles.css` — the whole design system in one file. The
  page-chrome design system up top, then the **"TYPE RUSH pixel-art cabinet"**
  block at the very bottom.
- `assets/fonts/pressstart2p.woff2` — self-hosted pixel font (see below).
- `privacy.html` / `terms.html` / `404.html` — required for ad networks / Pages;
  keep working.

## Design language — the pixel-art arcade cabinet

Genre = **RHYTHM / "TYPE RUSH"**. This is one of a portfolio of arcade "game"
tool sites, each a *different* genre so they never feel like clones (reflexzap =
quick-draw DUEL yellow/purple, cpsboost = fighting pink/magenta). wpmflex's
distinct identity: **electric-cyan** dominant accent + **lime-green** COMBO
secondary on a deep blue-black CRT — plus a live **COMBO** streak, a big **WPM**
speed gauge, a **"TIME UP!"** slam, and a post-run letter **GRADE** (S/A/B/C/D).

Quality bar: **metekamil.com** (a real pixel-art VS screen). Technique — true
8-bit, not "web pretending to be arcade":

- **Self-hosted pixel font** `assets/fonts/pressstart2p.woff2` (Press Start 2P,
  OFL) via `@font-face "PixArc"`. This is the ONE deliberate exception to
  "system-fonts only" — it is **same-origin**, so it still makes **no
  third-party request** (the privacy intent of the rule holds). Applied to
  arcade chrome ONLY (marquee, HUD gauges, labels, buttons, grade, announce).
- **FLAT colours, HARD pixel edges**: `border-radius:0`, layered hard
  `box-shadow` borders (no thin 1px borders), `image-rendering:pixelated`, hard
  offset `text-shadow` (no `-webkit-text-stroke`, no `skewX`, no blurred glows).
- **Animated diagonal-stripe CRT backdrop** (`.crt-screen`, `stripe-scroll`) +
  scanline `::after` overlay.
- **Full cabinet**: `.cabinet` → `.marquee` (pixel logo TYPE RUSH) →
  `.crt`/`.crt-screen` (`.rush-strip` mode/best · `.rush-hud` WPM/COMBO/ACC/TIME
  gauges · the typed passage · the results screen) → `.deck` (mode-select pixel
  buttons + NEW RUN pixel button + coin door). The results render **on the CRT**
  (framed by the bezel) with the GRADE stamp; "TIME UP!" is a fixed overlay
  (`.announce`) above everything that auto-hides ~1.1s later.

### CRITICAL: the typed passage stays readable MONOSPACE

Pixel font at paragraph length is illegible. The passage (`#passage` / `.char`)
keeps `var(--mono)` and the per-character correct/incorrect colouring + blinking
caret. Pixel font is HUD/labels/buttons/headings only. The CRT interior colours
are **hardcoded light-on-dark** and intentionally do NOT follow the page theme —
an arcade screen is lit and dark regardless of the surrounding light/dark page.

## Hard rules (don't regress)

- **The WPM/accuracy math is sacred.** `computeWPM` = correct chars / 5 per
  minute of the fixed duration; `computeAccuracy` = correct / typed. The pure
  helpers are DOM-free and Node-checkable. The **COMBO / GRADE / TIME-UP /
  HUD are flavour only** and must never feed back into the measurement.
- **COMBO** = consecutive correctly-typed characters, tracked *inside* the
  existing `handleChar` (increment on correct, reset to 0 on wrong). **Do NOT
  add a second keydown handler** — keydown handling stays as-is (one listener on
  `#type-input`, plus the document-level Tab-to-restart).
- **Keep every ID `app.js` uses.** Notably `#duration-group`, `#passage`,
  `#type-input`, `#type-surface`, `#stat-time`/`#stat-wpm`/`#stat-acc`,
  `#restart-btn`, `#test-screen`, `#results-screen`,
  `#res-wpm`/`#res-raw`/`#res-acc`/`#res-correct`/`#res-incorrect`/`#res-missed`/
  `#res-duration`/`#res-rating` (whose `nextElementSibling` gets the rating
  message) `/#res-best`, `#history-list`, `#sparkline`, `#try-again-btn`,
  `#year`, `#theme-toggle`. HUD extras added: `#combo-val`, `#hud-combo`,
  `#deck-mode`, `#rush-best`, `#result-grade`, `#announce`.
- **Ads: AdSense Auto ads only.** ONE `<script>` in `<head>` (client
  `ca-pub-7560786263587509`). NEVER add `.ad-slot` divs or manual units.
- **Zero third-party requests.** No webfonts/CDNs/beacons — the pixel font is
  same-origin. Best-per-duration + last-10 history live in localStorage
  (`wpmflex-best`, `wpmflex-history`, `wpmflex-duration`, `wpmflex-theme`).
- **Respect `prefers-reduced-motion`** — every animation (stripe scroll, combo
  pop, grade slam, announce, caret blink) has a reduce fallback (gated at the
  bottom of the cabinet block).
- **Light + dark themes both work** (page chrome switches; the CRT stays dark).
- The `erabb.it` 🐇 mark is the portfolio signature — **last in `<body>`**,
  flush to the corner, `cursor:default`.

## Cache-bust convention (critical)

Coupled HTML+CSS/JS changes: cached visitors otherwise get new HTML with stale
CSS = a broken raw page (this class of bug has hit sibling sites). So
`styles.css?v=N` / `app.js?v=N` on **every** page (index, 404, privacy, terms,
`articles/*`). **Bump the `?v=` on any coupled change.** Currently `?v=2`.

## Shipping

Worktree under `.claude/worktrees/`, open a PR against
`ngineer420/typing-speed-test`, merge when done. Never push straight to `main`,
never force-push. Verify with a headless render of the idle cabinet; force the
results + typing-in-progress states via throwaway previews (strip `app.js`,
un-hide `#results-screen`, add `.show`/content to `#result-grade` and
`#announce`, pre-class some `.char` spans) since `--screenshot` can't drive the
game. Delete previews before committing.
