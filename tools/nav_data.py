"""wpmflex.com navigation data — the single source of truth for the toolbar.

This is the ONLY file that differs between sites. `sync_nav.py` is generic and
copies verbatim. Nothing here is computed at runtime by the browser: sync_nav
renders it into the static HTML of every page.

Tier rule (portfolio spec, ngineer420.github.io#13): a page is tier 1 only if it
answers a *different question*, and the same tool with a parameter baked in is
tier 2. wpmflex is the spec's named exception: this is a single-tool site where
the variants *are* the product, so the five test pages are promoted to tier 1 and
carry the rail. There is nothing else here for them to be peers of, and the
in-deck 15s/30s/60s/120s controls are a parameter of whichever test is running —
they are not pages and are deliberately not links.

Home is the brand, per the spec, so index.html takes no rail or sheet slot.
"""

# Noun used in the menu trigger: "All 9 pages". Not "tools" — five of the nine
# are one tool wearing different clothes and four are articles.
NOUN = "pages"

# Tier-1 destinations, in traffic order. The rail takes the first 8 (spec cap);
# all nine are in the sheet, so the rail is never the only route to anything.
#   label -> rail chip text, <= 18 chars
#   long  -> anchor text in the sheet
#   group -> sheet grouping key, used because this site passes 8 destinations
TOOLS = [
    {"href": "/1-minute-typing-test/", "label": "1 Min",       "long": "1 Minute Typing Test",   "group": "tests",  "tier": 1},
    {"href": "/5-minute-typing-test/", "label": "5 Min",       "long": "5 Minute Typing Test",   "group": "tests",  "tier": 1},
    {"href": "/code-typing-test/",     "label": "Code",        "long": "Code Typing Test",       "group": "tests",  "tier": 1},
    # "Custom", not "Custom Text": this site's column is 860px, and the eight
    # chips only clear it without scrolling on desktop once this one is short.
    {"href": "/custom-text/",          "label": "Custom",      "long": "Custom Text Test",       "group": "tests",  "tier": 1},
    {"href": "/accuracy-drill/",       "label": "Accuracy",    "long": "Accuracy Drill",         "group": "tests",  "tier": 1},

    {"href": "/articles/what-is-a-good-wpm.html",     "label": "Good WPM",    "long": "What's a Good WPM Score?", "group": "guides", "tier": 1},
    {"href": "/articles/how-to-type-faster.html",     "label": "Type Faster", "long": "How to Type Faster",       "group": "guides", "tier": 1},
    {"href": "/articles/history-of-typing-tests.html", "label": "History",    "long": "History of Typing Tests",  "group": "guides", "tier": 1},
    {"href": "/articles/how-this-test-works.html",    "label": "How It Works", "long": "How This Test Works",     "group": "guides", "tier": 1},
]

# Sheet groups, in order. Nine destinations is past the flat-list threshold, so
# these are rendered. Names come from the visitor's vocabulary, not the repo's.
GROUPS = [
    ("tests",  "Typing tests"),
    ("guides", "Guides"),
]

# No tier-2 family on this site: the durations are a control, not a page.
HUBS = []

# No footer tool list here today, and the spec says not to add one where none
# exists — the rail carries every tier-1 destination visibly and the sheet
# carries all nine, so a footer duplicate would be pure boilerplate.
FOOTER = []

# One-time --migrate: this site has no nav markup at all to strip, so the only
# op is dropping the marker pair in the one place the spec allows — a direct
# child of <body>, immediately after </header> and above <main>.
MIGRATE = [
    {"op": "insert_after", "region": "nav", "pattern": r"</header>", "indent": ""},
]
