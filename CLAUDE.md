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
  `WORD_POOL`, `CODE_POOL`, `RARE_WORD_POOL`, `recordKeystroke`,
  `summarizeKeyStats`, `weakKeys`, `drillPool`, `keyboardLayout`, …), then one
  IIFE with the DOM app (passage engine, timer, results, the per-key report and
  the arcade HUD flavour).
- `assets/css/styles.css` — the whole design system in one file. The
  page-chrome design system up top, then the **"TYPE RUSH pixel-art cabinet"**
  block at the very bottom.
- `typing-weak-keys/` + `typing-weak-keys.html` — the per-key heatmap
  explainer, linked from every results screen. Same twin-file rule as the tool
  pages, but it is an article: `container-narrow`, no cabinet, no `app.js`.
- `assets/js/percentile.js` — the cited population-percentile engine, ported
  from reflexzap (`reaction-time-test/assets/js/percentile.js`). The engine is
  identical. Only `SOURCES` and the two models (`TYPING_WPM` from Dhakal et al.
  2018, `MOBILE_TYPING_WPM` from Palin et al. 2019) belong to this site. Every
  number in a model traces to a URL in `SOURCES`. Loaded before `app.js` on the
  seven test pages. `app.js` reads it through `populationNote(wpm, variant)`
  and renders `#res-population` under the rating badge. The code test has no
  model on purpose: no published code-typing distribution exists.
- `test/percentile.test.js` — `node --test` runs it. It checks bounds,
  monotonicity, that each model reproduces its cited figures, that every test
  page loads `percentile.js` before `app.js`, and that no shipped file claims
  the percentiles come from this site's visitors.
- `assets/js/nav.js` — the portfolio toolbar's behaviour, loaded on **every**
  page. Separate from `app.js` because only the six test pages load that one,
  and the articles and legal pages need the chrome to work too. Pure
  enhancement: with JS off the `<details>` still discloses, the rail is still a
  native scroll container of real links, the fades and scrim are still CSS.
- `assets/fonts/pressstart2p.woff2` — self-hosted pixel font (see below).
- `privacy.html` / `terms.html` / `404.html` — required for ad networks / Pages;
  keep working.
- `tools/build_sitemap.py` — computes `<lastmod>` for every `<loc>` in
  `sitemap.xml` from the served file's mtime. The URL list, `<changefreq>` and
  `<priority>` stay hand-curated. Run it LAST, after every other generator, and
  `--check` before shipping.

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
- **The accuracy drill can be weighted toward weak keys.** When
  `wpmflex-drill-keys` is set (the "Drill these keys" button on any results
  screen writes it), `activePool()` returns `drillPool(WORD_POOL,
  RARE_WORD_POOL, keys, 3)` — the ordinary pool plus every matching word
  repeated three times, so the weak letters come up several times as often
  without the passage stopping being English. `RARE_WORD_POOL` exists because
  `WORD_POOL` has no z-word and one q-word: without it there is nothing to
  weight toward for exactly the keys the heatmap flags first.
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
  Per-key report, on every tool page's results screen: `#keys-section`,
  `#key-heatmap`, `#keys-note`, `#keys-missed`, `#keys-slowest`,
  `#keys-table-body`, `#drill-keys-btn`; `/accuracy-drill/` also has
  `#drill-banner`, `#drill-key-list`, `#drill-clear`.
  IDs are looked up by id, not by position — the accuracy drill deliberately
  reorders the HUD and the results headline to lead with accuracy.
- **Every page carries the inline theme script FIRST in `<head>`** — one small
  `<script>` reads `wpmflex-theme` and writes `data-theme` before the first
  stylesheet, so no page flashes the wrong theme and the 15 pages that never
  load `app.js` keep the visitor's choice. `app.js` still owns the toggle button
  and the write-back; its `initTheme` read is a harmless duplicate.
- **Every page must link to the others.** The `#other-tests` section (built from
  the same `.faq-item` shape as `#articles`) is what keeps the tool pages out of
  orphan status; index.html links to all six.
- **Ads: AdSense Auto ads only.** ONE `<script>` in `<head>` (client
  `ca-pub-7560786263587509`). NEVER add `.ad-slot` divs or manual units.
- **Zero third-party requests.** No webfonts/CDNs/beacons — the pixel font is
  same-origin. Best-per-duration + last-10 history live in localStorage
  (`wpmflex-best`, `wpmflex-history`, `wpmflex-duration`, `wpmflex-theme`), plus
  the per-variant suffixed keys above (`wpmflex-best-code`, …). A custom passage
  lives in the URL, not in storage and not on a server.
- **Per-key stats are deliberately NOT variant-scoped.** `wpmflex-keystats` and
  `wpmflex-drill-keys` are global: your `z` is your `z` whether you met it on
  the word test or the code page, and the whole value of the store is that it
  crosses runs. Nothing about it leaves the device, and the results screen says
  so where the visitor can read it.
- **Respect `prefers-reduced-motion`** — every animation (stripe scroll, combo
  pop, grade slam, announce, caret blink) has a reduce fallback (gated at the
  bottom of the cabinet block).
- **Light + dark themes both work** (page chrome switches; the CRT stays dark).
- The `erabb.it` 🐇 mark is the portfolio signature — **last in `<body>`**,
  flush to the corner, `cursor:default`.

## Navigation — never hand-edit it

The header toolbar (rail + sheet) is the portfolio pattern from
`ngineer420/ngineer420.github.io#13`. It is **generated**, not written:

- `tools/nav_data.py` — the only file to edit. Destinations, labels, groups.
- `tools/sync_nav.py` — generic, byte-identical across the portfolio. Do not
  edit it; if it needs a change, the change belongs on every site.
- `python3 tools/sync_nav.py` rewrites the `<!-- nav:start -->` … `<!-- nav:end -->`
  region in all 22 HTML files. `--check` exits nonzero if any file is stale;
  run it before shipping, because one hand-edited page is how these repos drift.

`aria-current="page"` is derived from each file's own path, so both members of
every flat-file/directory twin pair are stamped from the one list.

The in-deck 15s/30s/60s/120s controls are **not** navigation: they are a
parameter of whichever test is running, and 15/30/120 have no page of their own.
The rail is the variant switcher. Do not turn the deck buttons into links.

## Cache-bust convention (critical)

Coupled HTML+CSS/JS changes: cached visitors otherwise get new HTML with stale
CSS = a broken raw page (this class of bug has hit sibling sites). So
`styles.css?v=N` / `app.js?v=N` on **every** page — index, 404, privacy, terms,
`articles/*`, `typing-weak-keys*`, and **both copies** of all six tool pages
(22 HTML files today).
**Bump the `?v=` on any coupled change.** Currently `?v=9` (`nav.js` is on `?v=5`).

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
not by committing throwaway preview files. `node --test` runs `test/percentile.test.js`. For the rest, `node -e`
against the `module.exports` helpers is the closest thing, and the code-token
"no internal space" rule in particular is worth re-checking there.
