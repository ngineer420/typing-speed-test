# wpmflex.com — working notes for Claude

Free typing-speed (WPM) test built as a **true pixel-art arcade cabinet**
("TYPE RUSH"). Static, zero-dependency site: vanilla HTML/CSS/JS, no build step,
GitHub Pages (`CNAME` → wpmflex.com, Cloudflare DNS). Everything runs
client-side; nothing is uploaded.

It is a **six-page suite**, not one page — one tool URL per search cluster, all
driving the SAME engine in `app.js`. See "Tool pages" below.

## Files

- `index.html` — the default word test (the cabinet) + About + tool list +
  article list. Articles live in `articles/`.
- **Tool pages** — five more standalone pages, each written TWICE (see
  "Extensionless URLs" below): `1-minute-typing-test/`, `5-minute-typing-test/`,
  `code-typing-test/`, `custom-text/`, `accuracy-drill/`.
- `assets/js/app.js` — pure helpers up top (DOM-free, `module.exports` for Node
  sanity checks: `buildPassage`, `computeWPM`, `computeRawWPM`,
  `computeAccuracy`, `getRatingTier`, `getGrade`, `sanitizeCustomText`,
  `parseDurationParam`, `formatDurationLabel`, `resolveVariant`, `VARIANTS`,
  `WORD_POOL`, `CODE_POOL`, …), then one IIFE with the DOM app (passage engine,
  timer, results, and the arcade HUD flavour).
- `assets/css/styles.css` — the whole design system in one file. The
  page-chrome design system up top, then the **"TYPE RUSH pixel-art cabinet"**
  block at the very bottom.
- `assets/fonts/pressstart2p.woff2` — self-hosted pixel font (see below).
- `privacy.html` / `terms.html` / `404.html` — required for ad networks / Pages;
  keep working.

## Tool pages — ONE engine, six variants

Every page loads the same `app.js`. A page declares itself on `<body>`:

```html
<body data-test-variant="code" data-test-duration="60">
```

An **absent** `data-test-variant` means the `words` variant, i.e. index.html
behaving exactly as it always has. Never fork the engine per page.

| page | variant | durations | default | pool / behaviour |
|---|---|---|---|---|
| `/` | `words` (default) | 15/30/60/120 | 30 | `WORD_POOL` |
| `/1-minute-typing-test/` | `minute` | 15/30/60/120 | 60 | `WORD_POOL` |
| `/5-minute-typing-test/` | `long` | 15/30/60/120/**300** | 300 | `WORD_POOL` |
| `/code-typing-test/` | `code` | 15/30/60/120 | 60 | `CODE_POOL` |
| `/custom-text/` | `custom` | 15/30/60/120 | 60 | the visitor's own passage |
| `/accuracy-drill/` | `accuracy` | 15/30/60/120 | 60 | strict mode (below) |

- **`CODE_POOL` tokens must contain NO internal space.** The whole passage
  engine (`buildPassage`, `findWordStart`, backspace-within-word) is
  space-delimited, so `foo(bar, baz)` has to be the two tokens `foo(bar,` and
  `baz)`. Worth re-checking in Node after any edit to the pool.
- **Strict mode (`accuracy`)**: an incorrect keystroke is counted as an error but
  does **not** advance the caret — `handleChar` returns early, and the stuck
  character gets `.char.blocked`. Because nothing lands in `charStates`,
  `currentCounts()` branches for this variant and returns
  `{ correct: pos, incorrect: strictErrors, total: pos + strictErrors }`.
  `computeWPM` / `computeAccuracy` themselves stay pure and untouched.
- **Custom passages loop.** A short passage is fed back through
  `extendPassage(text, [passage], …)` so the test never runs out of text.
- **Storage is scoped per variant** via `VARIANTS[x].storageSuffix`: `words`
  keeps the original unsuffixed `wpmflex-best` / `wpmflex-history` /
  `wpmflex-duration` keys (existing visitors keep their scores), everything else
  gets e.g. `wpmflex-duration-code`. That is what stops a saved 15s preference
  from turning the 5-minute page into a lie, and stops a code run from being
  compared against a prose run.

## URL state

- **`?text=<passage>`** (`/custom-text/` only) loads that exact passage.
  Untrusted input: `sanitizeCustomText` collapses control characters and
  whitespace runs to single spaces and caps the result at `MAX_CUSTOM_CHARS`
  (5000). It reaches the DOM only via `textContent` (`renderPassage` builds one
  span per character) — **never `innerHTML`**. Keep it that way.
- **`?d=<seconds>`** (any page) pins the duration. `parseDurationParam` accepts
  a whole number 5–3600 and nothing else. A pinned value the page has no button
  for gets one inserted in numeric order, and a `?d=` link is deliberately **not**
  persisted — a link someone handed you must not rewrite your saved preference.
- The `/custom-text/` panel (`#custom-text` textarea, `#custom-apply`,
  `#custom-share`, `#custom-status`, `#custom-count`) writes the same URL back
  with `history.replaceState` and copies it with `navigator.clipboard` plus a
  `document.execCommand` fallback.

## Extensionless URLs — CRITICAL

GitHub Pages serves an extensionless file as `application/octet-stream`, so the
browser **downloads** it instead of rendering it. Every tool page is therefore
written **twice, with identical content**: `slug/index.html` (what humans get,
and what `rel=canonical` points at) **and** a flat `slug.html` alias. Change one,
change both — generate them from one string rather than hand-editing two files.
`sitemap.xml` lists the **directory form only**, never the alias, and must match
what is actually on disk.

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
- **Keep every ID `app.js` uses, on every page.** Notably `#duration-group`,
  `#passage`, `#type-input`, `#type-surface`, `#stat-time`/`#stat-wpm`/`#stat-acc`,
  `#restart-btn`, `#test-screen`, `#results-screen`,
  `#res-wpm`/`#res-raw`/`#res-acc`/`#res-correct`/`#res-incorrect`/`#res-missed`/
  `#res-duration`/`#res-rating` (whose `nextElementSibling` gets the rating
  message) `/#res-best`, `#history-list`, `#sparkline`, `#try-again-btn`,
  `#year`, `#theme-toggle`. HUD extras: `#combo-val`, `#hud-combo`,
  `#deck-mode`, `#rush-best`, `#result-grade`, `#announce`. `/custom-text/` only:
  `#custom-text`, `#custom-apply`, `#custom-share`, `#custom-status`,
  `#custom-count` (the engine no-ops on the other pages if they are absent).
  IDs are looked up by id, not by position — the accuracy drill deliberately
  reorders the HUD and the results headline to lead with accuracy.
- **Every page must load `app.js`** — the `data-theme` restore from localStorage
  lives in its `initTheme`, so a page without it flashes the wrong theme.
- **Every page must link to the others.** The `#other-tests` section (built from
  the same `.faq-item` shape as `#articles`) is what keeps the tool pages out of
  orphan status; index.html links to all five.
- **Ads: AdSense Auto ads only.** ONE `<script>` in `<head>` (client
  `ca-pub-7560786263587509`). NEVER add `.ad-slot` divs or manual units.
- **Zero third-party requests.** No webfonts/CDNs/beacons — the pixel font is
  same-origin. Best-per-duration + last-10 history live in localStorage
  (`wpmflex-best`, `wpmflex-history`, `wpmflex-duration`, `wpmflex-theme`), plus
  the per-variant suffixed keys above (`wpmflex-best-code`, …). A custom passage
  lives in the URL, not in storage and not on a server.
- **Respect `prefers-reduced-motion`** — every animation (stripe scroll, combo
  pop, grade slam, announce, caret blink) has a reduce fallback (gated at the
  bottom of the cabinet block).
- **Light + dark themes both work** (page chrome switches; the CRT stays dark).
- The `erabb.it` 🐇 mark is the portfolio signature — **last in `<body>`**,
  flush to the corner, `cursor:default`.

## Cache-bust convention (critical)

Coupled HTML+CSS/JS changes: cached visitors otherwise get new HTML with stale
CSS = a broken raw page (this class of bug has hit sibling sites). So
`styles.css?v=N` / `app.js?v=N` on **every** page — index, 404, privacy, terms,
`articles/*`, and **both copies** of all five tool pages (18 HTML files today).
**Bump the `?v=` on any coupled change.** Currently `?v=3`.

## Shipping

Worktree under `.claude/worktrees/`, open a PR against
`ngineer420/typing-speed-test`, merge when done. Never push straight to `main`,
never force-push.

Verify by serving the worktree (`python3 -m http.server`) and rendering every
tool page — both the directory form and the flat alias — in headless Chrome, then
**looking at the PNGs**. The interactive states (a wrong key in strict mode, a
`?text=` passage mid-run, the results screen) cannot be screenshotted from a cold
load: drive them over the DevTools Protocol with `Input.dispatchKeyEvent`, or
force `#results-screen` open with `Runtime.evaluate`. Do that **in the browser**,
not by committing throwaway preview files. There is no test suite; `node -e`
against the `module.exports` helpers is the closest thing, and the code-token
"no internal space" rule in particular is worth re-checking there.
