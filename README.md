# wpmflex.com

A free, ad-supported typing speed test:

- Randomized passages drawn from a pool of 200+ common English words, so text doesn't repeat run to run.
- Choose a duration — 15, 30, 60, or 120 seconds — then start typing; the timer starts on your first keystroke, not on page load.
- Live WPM, accuracy, and time-remaining while you type. Each character is marked correct/incorrect in place with a blinking caret. Backspace corrects within the current word only (you can't backspace past the start of the word you're on).
- Results screen: final WPM, raw WPM, accuracy, correct/incorrect/missed character counts, and a rating tier (average ~40 WPM, above-average ~65-70, fast 90+, exceptional 120+).
- Best WPM per duration and your last 10 results are saved in `localStorage` and shown on the results screen.

Everything runs client-side — no backend, no build step, no uploads. Deployed as static files on GitHub Pages.

## Local development

No build tooling required. Serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Structure

```
index.html            Main app (typing test)
privacy.html           Privacy policy (required for ad networks)
terms.html             Terms of use
404.html                Custom 404 page
assets/css/styles.css  Design system
assets/js/app.js       App logic — word pool, passage generation, WPM/accuracy math,
                       rating tiers, and the typing engine. The pure calculation
                       functions (no DOM/localStorage) are exported via a
                       `typeof module !== "undefined"` guard so they can be
                       unit-tested directly from Node.
assets/favicon.svg     Favicon (original mark)
CNAME                   GitHub Pages custom domain (wpmflex.com)
```

## Enabling ads (Google AdSense)

1. Deploy the site and get it live at wpmflex.com.
2. Apply at https://adsense.google.com with the live URL. Approval requires a working privacy policy (already included) and some real content/traffic — it isn't instant.
3. Once approved, uncomment the AdSense `<script>` tag in `index.html`'s `<head>` and replace `ca-pub-XXXXXXXXXXXXXXXX` with your publisher ID. Auto ads then places ad units automatically — no manual placement needed.

## Custom domain (wpmflex.com)

**Note: wpmflex.com has not been registered yet.** The `CNAME` file below is ready for it, but until the domain is purchased and DNS is pointed at GitHub Pages, the site will only be reachable at the default `github.io` URL for this repo.

Once the domain is registered, the `CNAME` file tells GitHub Pages to serve this repo at `wpmflex.com`. You still need to point DNS at GitHub Pages yourself:

- Apex domain (`wpmflex.com`): four `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
- `www` subdomain (optional): `CNAME` record to `<username>.github.io`.

Then enable Pages in the repo's Settings → Pages, and enter `wpmflex.com` as the custom domain (GitHub will offer to enforce HTTPS once DNS propagates).
