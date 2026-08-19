(() => {
  "use strict";

  /* ============================= word pool ============================= */
  /* ~220 common, short English words used to build randomized test passages. */
  const WORD_POOL = [
    "the","be","to","of","and","a","in","that","have","it","for","not","on","with",
    "he","as","you","do","at","this","but","his","by","from","they","we","say","her",
    "she","or","an","will","my","one","all","would","there","their","what","so","up",
    "out","if","about","who","get","which","go","me","when","make","can","like","time",
    "no","just","him","know","take","people","into","year","your","good","some","could",
    "them","see","other","than","then","now","look","only","come","its","over","think",
    "also","back","after","use","two","how","our","work","first","well","way","even",
    "new","want","because","any","these","give","day","most","us","life","home","water",
    "room","area","money","story","fact","month","lot","right","study","book","job",
    "word","business","issue","side","kind","head","house","service","friend","father",
    "power","hour","game","line","end","member","law","car","city","name","team",
    "minute","idea","body","information","parent","face","level","office","door",
    "health","person","art","war","history","party","result","change","morning",
    "reason","research","girl","guy","moment","air","teacher","force","education",
    "foot","boy","age","policy","process","music","market","sense","nation","plan",
    "college","interest","death","experience","effect","chair","table","chance","order",
    "group","government","company","number","world","school","state","family",
    "student","country","problem","hand","part","place","case","week","system",
    "program","question","night","point","own","unit","value","article","event",
    "cost","letter","note","choice","series","natural","human","single","past",
    "present","action","activity","animal","food","culture","environment","garden",
    "tree","forest","river","ocean","mountain","valley","cloud","wind","storm",
    "shadow","distance","journey","path","road","bridge","station","village",
    "island","beach","desert","season","spring","summer","autumn","winter","light",
    "dark","paper","phone","screen","window","cabin","color","shape","sound","voice",
    "dream","trust","truth","peace","doubt","glass","stone","metal","cloth",
    "bread","fruit","field","cattle","engine","wheel","fire","earth","space","planet",
  ];

  /* ============================= code token pool =============================
     Used by the "code" variant (/code-typing-test/). Code typing is a different
     motor skill from prose: the hands live on the symbol row, on brackets, and on
     capitalised identifiers instead of on lowercase letters and spaces. Every
     entry is a SINGLE token with NO internal space, so the space-delimited
     passage engine (buildPassage / findWordStart / backspace-within-word) works
     on it unchanged. */
  const CODE_POOL = [
    "const","let","var","function","return","class","extends","super","static","new",
    "if","else","for","while","switch","break","continue","do","try","catch","finally",
    "throw","typeof","instanceof","delete","void","yield","async","await","import",
    "export","default","this","in","of","public","private","interface","struct","enum",
    "null","undefined","true","false","NaN","void*","int","float","bool","string",
    "===","!==","==","!=",">=","<=","&&","||","??","?.","=>","++","--","+=","-=","*=",
    "/=","%=","**","<<",">>","&","|","^","~","!","->","::","...",
    "{","}","();","{};","[];","});","})();",");","]);","(){","}else{","}}","(!",
    "i++)","(i=0;","i<n;","(x,","(a,","b)","(err,","(req,","res)","(key,","val)",
    "userName","itemCount","isVisible","hasError","maxLength","currentIndex",
    "totalCount","defaultValue","onClickHandler","fetchUserData","parseResponse",
    "renderComponent","updateState","getElementById","createElement","appendChild",
    "addEventListener","toLowerCase","toUpperCase","charCodeAt","indexOf","padStart",
    "isLoading","nextElementSibling","querySelectorAll","requestAnimationFrame",
    "MAX_RETRIES","API_KEY","DEFAULT_TIMEOUT","HTTP_OK","BUFFER_SIZE",
    "JSON.stringify(data)","JSON.parse(raw)","Object.keys(obj)","Array.isArray(x)",
    "Math.floor(n)","Math.max(a,","parseInt(str,","Number.isFinite(n)",
    "console.log(err)","process.env.PORT","module.exports","require('fs')",
    "document.body","element.classList.add('on')","node.textContent",
    "localStorage.getItem(key)","window.location.href","this.props.children",
    "state.value","props.onChange","data.items.length","response.status",
    "error.message","config.options","callback(null,","promise.then((res)",
    "fetch(url)","reject)","resolve(value)","Error('failed')","return;","0;",
    "break;","continue;","default:","label:","/*","*/","//","#include",
    "<div>","</div>","<span","class=\"row\">","</p>","?:","'utf-8'","\"error\"",
    "`${name}`","'/api/v1/users'","0x1F","3.14","1e3","-1","42","0","1","255,","404;",
    "Map<string,number>","Array<Item>","Promise<void>","string[]","T[]","(T)",
  ];

  /* ============================= pure logic (DOM-independent) =============================
     These functions never touch the DOM, localStorage, or timers, so they can be
     required directly from plain Node for testing (see the module.exports guard below). */

  function pickWord(pool, rng, avoidWord) {
    if (!pool || pool.length === 0) return "";
    if (pool.length === 1) return pool[0];
    let word;
    do {
      word = pool[Math.floor(rng() * pool.length)];
    } while (word === avoidWord);
    return word;
  }

  // Builds a passage of `wordCount` random words from `pool`, space-separated,
  // never repeating the same word twice in a row.
  function buildPassage(pool, wordCount, rng = Math.random) {
    const words = [];
    let prev = null;
    for (let i = 0; i < wordCount; i++) {
      const w = pickWord(pool, rng, prev);
      words.push(w);
      prev = w;
    }
    return words.join(" ");
  }

  // Appends whole words to `text` (from `pool`) until its length is at least
  // `minLength`, so a running typing test never catches up to the end of the text.
  function extendPassage(text, pool, minLength, rng = Math.random) {
    let result = text;
    let prev = result.length ? result.slice(result.lastIndexOf(" ") + 1) : null;
    while (result.length < minLength) {
      const w = pickWord(pool, rng, prev);
      result += (result.length ? " " : "") + w;
      prev = w;
    }
    return result;
  }

  // Index where the word containing `pos` begins (0 if at/before the first word).
  function findWordStart(text, pos) {
    const before = text.lastIndexOf(" ", Math.max(pos - 1, 0));
    return pos === 0 ? 0 : before === -1 ? 0 : before + 1;
  }

  // Index just past the end of the word containing `pos` (i.e. the next space,
  // or the text length if `pos` is in the final word).
  function findWordEnd(text, pos) {
    const next = text.indexOf(" ", pos);
    return next === -1 ? text.length : next;
  }

  // How many characters of the in-progress word were never reached when the
  // test ended (used for the "missed" count on the results screen).
  function countMissedInWord(text, pos) {
    return Math.max(findWordEnd(text, pos) - pos, 0);
  }

  // Final WPM: (correct characters / 5) per minute of the fixed test duration.
  function computeWPM(correctChars, durationSeconds) {
    if (!durationSeconds) return 0;
    const minutes = durationSeconds / 60;
    return Math.max(0, (correctChars / 5) / minutes);
  }

  // Raw WPM: every typed character counts, correct or not.
  function computeRawWPM(totalTypedChars, durationSeconds) {
    if (!durationSeconds) return 0;
    const minutes = durationSeconds / 60;
    return Math.max(0, (totalTypedChars / 5) / minutes);
  }

  // Accuracy percentage of typed characters that were correct. 0 typed -> 0, not NaN.
  function computeAccuracy(correctChars, totalTypedChars) {
    if (!totalTypedChars) return 0;
    return Math.min(100, (correctChars / totalTypedChars) * 100);
  }

  // Rating tiers, anchored on ~40 WPM as the average typist.
  const RATING_TIERS = [
    { min: 0, tier: "below-average", label: "Below average", message: "Keep practicing — the average typist lands around 40 WPM." },
    { min: 40, tier: "average", label: "Average", message: "Right around the ~40 WPM average typist." },
    { min: 65, tier: "above-average", label: "Above average", message: "Faster than most — above-average territory is ~65-70 WPM." },
    { min: 90, tier: "fast", label: "Fast", message: "That's a fast typist — 90+ WPM." },
    { min: 120, tier: "exceptional", label: "Exceptional", message: "Exceptional speed — 120+ WPM puts you in rare company." },
  ];

  function getRatingTier(wpm) {
    let tier = RATING_TIERS[0];
    for (const t of RATING_TIERS) {
      if (wpm >= t.min) tier = t;
    }
    return { tier: tier.tier, label: tier.label, message: tier.message };
  }

  // Arcade letter grade S/A/B/C/D from final WPM, aligned to the rating tiers
  // above (presentation only — never feeds the WPM/accuracy math).
  function getGrade(wpm) {
    if (wpm >= 120) return "S";
    if (wpm >= 90) return "A";
    if (wpm >= 65) return "B";
    if (wpm >= 40) return "C";
    return "D";
  }

  /* ============================= URL state (pure) =============================
     Every tool page can be linked with ?d=<seconds> and, on /custom-text/,
     ?text=<passage>. Both come from a stranger's URL, so both are validated here
     rather than at the call site. The passage is only ever put on the page
     through textContent / createTextNode (see renderPassage), never innerHTML. */

  const MAX_CUSTOM_CHARS = 5000;

  // Turns an untrusted ?text= payload into something safe to type against:
  // control characters (including newlines and tabs) and runs of whitespace
  // collapse to single spaces — the passage engine is space-delimited, so
  // word-boundary backspace stays coherent — and the result is length-capped.
  function sanitizeCustomText(raw, maxChars = MAX_CUSTOM_CHARS) {
    if (typeof raw !== "string") return "";
    return raw
      .replace(/[\u0000-\u001F\u007F]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars)
      .trim();
  }

  // ?d= / data-test-duration: a whole number of seconds between 5s and 1 hour,
  // or null. Anything else (NaN, "60; drop", 1e9, -30) is rejected outright.
  function parseDurationParam(raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 5 || n > 3600) return null;
    return n;
  }

  // "45s" / "5m" — used for duration buttons the page didn't ship with (a ?d=
  // value outside the variant's own list gets its own button rather than
  // silently disagreeing with the deck).
  function formatDurationLabel(seconds) {
    return seconds >= 60 && seconds % 60 === 0 ? seconds / 60 + "m" : seconds + "s";
  }

  /* ============================= variants =============================
     ONE engine, six pages. Each standalone tool page declares itself with
     <body data-test-variant="code" data-test-duration="60">; an absent attribute
     means the "words" variant, which is index.html behaving exactly as before.

     `storageSuffix` scopes the saved duration preference, the per-duration bests
     and the history per variant: the words variant keeps the original unsuffixed
     keys (so existing visitors keep their scores), and every other page gets its
     own namespace. That is what stops a saved 15s preference from quietly
     turning /5-minute-typing-test/ into a 15-second test, and stops a code run
     from being compared against a prose run. */
  const VARIANTS = {
    words:    { durations: [15, 30, 60, 120],      defaultDuration: 30,  pool: WORD_POOL, storageSuffix: "" },
    minute:   { durations: [15, 30, 60, 120],      defaultDuration: 60,  pool: WORD_POOL, storageSuffix: "-minute" },
    long:     { durations: [15, 30, 60, 120, 300], defaultDuration: 300, pool: WORD_POOL, storageSuffix: "-long" },
    code:     { durations: [15, 30, 60, 120],      defaultDuration: 60,  pool: CODE_POOL, storageSuffix: "-code" },
    custom:   { durations: [15, 30, 60, 120],      defaultDuration: 60,  pool: WORD_POOL, storageSuffix: "-custom", custom: true },
    accuracy: { durations: [15, 30, 60, 120],      defaultDuration: 60,  pool: WORD_POOL, storageSuffix: "-accuracy", strict: true },
    /* Same engine and same word pool as `words`; it exists for the storage
       suffix. A thumb-typed run and a ten-finger run are not the same
       measurement, so a phone score must not overwrite the desktop best or land
       in the same history sparkline. 30s by default — nobody thumb-types for
       two minutes on a page they found on a phone. */
    mobile:   { durations: [15, 30, 60, 120],      defaultDuration: 30,  pool: WORD_POOL, storageSuffix: "-mobile" },
  };

  function resolveVariant(name) {
    return Object.prototype.hasOwnProperty.call(VARIANTS, name) ? VARIANTS[name] : VARIANTS.words;
  }

  /* ============================= rare-letter word pool =============================
     WORD_POOL is 269 of the most common English words, which is exactly right for
     measuring speed and exactly wrong for drilling a weak key: it contains no
     z-word at all and a single q-word, so weighting a drill toward the letters a
     heatmap flags first would have nothing to weight. This supplementary pool is
     ordinary English chosen for coverage of the letters that go missing — z, q,
     x, j, k, v, w and y — so the accuracy drill can lean on a weak key without
     turning into nonsense syllables. Same shape as WORD_POOL: lowercase, no
     spaces, so the space-delimited passage engine is unchanged. */
  const RARE_WORD_POOL = [
    "zebra","zone","zero","zoom","zigzag","zipper","size","prize","dozen","frozen",
    "amazing","puzzle","buzz","jazz","fuzzy","lazy","crazy","hazard","wizard",
    "citizen","horizon","magazine","organize","realize","recognize","analyze",
    "freeze","breeze","seize","blaze","gaze","maze","quick","queen","quiet","quote",
    "query","quality","question","require","request","unique","liquid","equal",
    "square","quarter","acquire","frequent","sequence","quilt","quiver","extra",
    "exact","exam","excuse","expert","export","mixture","complex","index","oxygen",
    "taxi","box","fox","six","fix","mix","next","text","exit","axis","jump","join",
    "judge","joke","journey","junior","project","subject","object","inject","major",
    "enjoy","jacket","joyful","key","kind","king","knee","knife","knock","know",
    "kitchen","market","thank","break","awkward","vivid","vacuum","value","various",
    "velvet","victory","volume","voyage","vowel","weekly","wagon","widow","yield",
    "yellow","yesterday","yogurt","rhythm","syrup","myth","gypsy","jockey","kayak",
    "vaquero","quartz","jigsaw","voxel","zenith","juxtapose","exquisite",
  ];

  /* ============================= per-key statistics (pure) =============================
     Every character is already graded in place during a run; these helpers are
     what stops that grading being thrown away at the end of it. A single run is
     noise — a 30s run at 60 WPM is ~150 keystrokes spread over 26 letters — so
     the numbers only mean anything once they are accumulated across runs, and a
     key is only ever named out loud once it has cleared MIN_KEY_SAMPLES. */

  // Below this many attempts a key is tracked but never ranked, shaded or named.
  // Twelve is roughly two runs' worth of a mid-frequency letter: enough that one
  // fumbled 'z' cannot become "your worst key is Z".
  const MIN_KEY_SAMPLES = 12;

  // Gaps longer than this are a pause, not a keystroke latency — a phone call, a
  // re-read of the line — and would swamp the mean for whichever key happened to
  // follow. They still count as an attempt; only the timing is discarded.
  const MAX_KEY_GAP_MS = 3000;

  /* Which key a character belongs to. Case folds and un-shifts: 'E' and '(' are
     the E and 9 keys under the finger, and a heatmap of physical keys is the
     only kind a typist can act on. That matters most on /code-typing-test/,
     where the passage is mostly shifted symbols — without the un-shifting, the
     one page whose whole point is the symbol row would track almost nothing.
     Anything the board does not draw (backtick, tab, every non-ASCII character)
     is ignored rather than silently lumped in somewhere. */
  const TRACKED_KEYS = "abcdefghijklmnopqrstuvwxyz0123456789-=[]\\;',./";
  const SHIFTED_KEYS = {
    "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6", "&": "7",
    "*": "8", "(": "9", ")": "0", _: "-", "+": "=", "{": "[", "}": "]",
    "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/",
  };

  function keyIdentity(ch) {
    if (typeof ch !== "string" || ch.length !== 1) return null;
    if (ch === " ") return "space";
    const unshifted = SHIFTED_KEYS[ch] || ch.toLowerCase();
    return TRACKED_KEYS.indexOf(unshifted) === -1 ? null : unshifted;
  }

  /* Folds one keystroke into a stats object, in place, and returns it.

     `expectedChar` is the character the passage was asking for, NOT the one the
     typist produced. That is the whole point: "your worst key is Z" has to mean
     "you fail to produce Z", and attributing an error to whatever wrong key was
     hit instead would spread every mistake across the keyboard at random. */
  function recordKeystroke(stats, expectedChar, correct, ms) {
    const key = keyIdentity(expectedChar);
    if (!key) return stats;
    const entry = stats[key] || (stats[key] = { hits: 0, errors: 0, totalMs: 0, timed: 0 });
    if (correct) entry.hits++;
    else entry.errors++;
    if (typeof ms === "number" && isFinite(ms) && ms > 0 && ms <= MAX_KEY_GAP_MS) {
      entry.totalMs += ms;
      entry.timed++;
    }
    return stats;
  }

  function mergeKeystrokes(stats, keystrokes) {
    const out = stats && typeof stats === "object" ? stats : {};
    (keystrokes || []).forEach((k) => recordKeystroke(out, k.char, k.correct, k.ms));
    return out;
  }

  /* Turns the raw store into something rankable. `eligible` is the subset that
     has cleared the sample gate; `meanMs` is the typist's own average across
     those keys, which is the only baseline a latency comparison can honestly
     use — everyone's absolute milliseconds differ. */
  function summarizeKeyStats(stats, minSamples) {
    const gate = minSamples === undefined ? MIN_KEY_SAMPLES : minSamples;
    const rows = [];
    let totalMs = 0;
    let timed = 0;
    Object.keys(stats || {}).forEach((key) => {
      const e = stats[key] || {};
      const hits = e.hits || 0;
      const errors = e.errors || 0;
      const attempts = hits + errors;
      if (attempts === 0) return;
      const row = {
        key,
        hits,
        errors,
        attempts,
        errorRate: errors / attempts,
        meanMs: e.timed ? e.totalMs / e.timed : null,
        eligible: attempts >= gate,
      };
      rows.push(row);
      if (row.eligible && e.timed) {
        totalMs += e.totalMs;
        timed += e.timed;
      }
    });
    rows.sort((a, b) => a.key.localeCompare(b.key));
    const eligible = rows.filter((r) => r.eligible);
    return {
      rows,
      eligible,
      meanMs: timed ? totalMs / timed : null,
      attempts: rows.reduce((n, r) => n + r.attempts, 0),
      gate,
    };
  }

  function slowestKeys(summary, n) {
    return summary.eligible
      .filter((r) => r.meanMs !== null)
      .slice()
      .sort((a, b) => b.meanMs - a.meanMs || b.attempts - a.attempts)
      .slice(0, n === undefined ? 5 : n);
  }

  function mostMissedKeys(summary, n) {
    return summary.eligible
      .filter((r) => r.errors > 0)
      .slice()
      .sort((a, b) => b.errorRate - a.errorRate || b.errors - a.errors)
      .slice(0, n === undefined ? 5 : n);
  }

  /* The set handed to the drill. Accuracy leads — a key you get wrong costs more
     than a key you are merely slow on — and the slow list fills the remainder,
     so a typist with no errors left still gets something to work on. */
  function weakKeys(summary, max) {
    const cap = max === undefined ? 6 : max;
    const out = [];
    const push = (row) => {
      if (out.length < cap && out.indexOf(row.key) === -1) out.push(row.key);
    };
    mostMissedKeys(summary, cap).forEach(push);
    slowestKeys(summary, cap).forEach(push);
    return out;
  }

  /* A pool weighted toward the weak keys, for the accuracy drill.

     The base pool stays in — a drill made only of z-words is a tongue-twister,
     not practice — and matching words are repeated `weight` times so they come
     up several times as often without ever being the only thing on screen.
     Non-letter weak keys (punctuation, digits) have no word to hide in, so they
     are dropped here and the UI says which keys the drill could actually use. */
  function drillPool(basePool, extraPool, keys, weight) {
    const letters = (keys || []).filter((k) => k.length === 1 && k >= "a" && k <= "z");
    if (!letters.length) return basePool.slice();
    const times = weight === undefined ? 3 : weight;
    const hasWeak = (word) => letters.some((k) => word.indexOf(k) !== -1);
    const matches = basePool.concat(extraPool || []).filter(hasWeak);
    if (!matches.length) return basePool.slice();
    let pool = basePool.slice();
    for (let i = 0; i < times; i++) pool = pool.concat(matches);
    return pool;
  }

  /* The QWERTY board as unit cells, so the SVG renderer is a loop rather than a
     hand-placed drawing. x/y/w are in key units; the renderer picks the pixel
     size. Row offsets are the real stagger of a physical board. */
  const KEY_ROWS = [
    { offset: 0, keys: "1234567890-=" },
    { offset: 0.5, keys: "qwertyuiop[]" },
    { offset: 0.75, keys: "asdfghjkl;'" },
    { offset: 1.25, keys: "zxcvbnm,./" },
  ];

  function keyboardLayout() {
    const cells = [];
    KEY_ROWS.forEach((row, r) => {
      row.keys.split("").forEach((k, i) => {
        cells.push({ key: k, label: k, x: row.offset + i, y: r, w: 1 });
      });
    });
    cells.push({ key: "space", label: "space", x: 3.5, y: 4, w: 6 });
    return cells;
  }

  function keyboardWidth() {
    return keyboardLayout().reduce((max, c) => Math.max(max, c.x + c.w), 0);
  }

  /* ============================= DOM app ============================= */
  if (typeof document !== "undefined") {
    /* Which tool page is this? <body data-test-variant="..."> — absent means the
       original words test, so index.html keeps behaving exactly as it did. */
    const VARIANT = resolveVariant(document.body.getAttribute("data-test-variant") || "words");
    const DURATIONS = VARIANT.durations.slice();
    const PARAMS = new URLSearchParams(location.search);
    const PINNED_DURATION = parseDurationParam(PARAMS.get("d"));
    const DEFAULT_DURATION =
      parseDurationParam(document.body.getAttribute("data-test-duration")) || VARIANT.defaultDuration;
    const HISTORY_KEY = "wpmflex-history" + VARIANT.storageSuffix;
    const BEST_KEY = "wpmflex-best" + VARIANT.storageSuffix;
    const DURATION_KEY = "wpmflex-duration" + VARIANT.storageSuffix;
    const THEME_KEY = "wpmflex-theme";
    const MIN_BUFFER_CHARS = 40; // extend passage once fewer than this many chars remain unseen

    /* ---------- theme ---------- */
    (function initTheme() {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) document.documentElement.setAttribute("data-theme", stored);
      const btn = document.getElementById("theme-toggle");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const current =
          document.documentElement.getAttribute("data-theme") ||
          (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem(THEME_KEY, next); } catch {}
      });
    })();

    /* ---------- persistence ---------- */
    function loadJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    }
    function saveJSON(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }

    function getBests() { return loadJSON(BEST_KEY, {}); }
    function saveBest(duration, wpm) {
      const bests = getBests();
      if (!bests[duration] || wpm > bests[duration]) {
        bests[duration] = wpm;
        saveJSON(BEST_KEY, bests);
      }
      return bests[duration];
    }
    function getHistory() { return loadJSON(HISTORY_KEY, []); }
    function pushHistory(entry) {
      const history = getHistory();
      history.unshift(entry);
      saveJSON(HISTORY_KEY, history.slice(0, 10));
      return history.slice(0, 10);
    }

    /* ---------- elements ---------- */
    const els = {
      durationGroup: document.getElementById("duration-group"),
      passage: document.getElementById("passage"),
      typeInput: document.getElementById("type-input"),
      typeSurface: document.getElementById("type-surface"),
      timeLeft: document.getElementById("stat-time"),
      liveWpm: document.getElementById("stat-wpm"),
      liveAcc: document.getElementById("stat-acc"),
      restartBtn: document.getElementById("restart-btn"),
      testScreen: document.getElementById("test-screen"),
      resultsScreen: document.getElementById("results-screen"),
      resWpm: document.getElementById("res-wpm"),
      resRaw: document.getElementById("res-raw"),
      resAcc: document.getElementById("res-acc"),
      resCorrect: document.getElementById("res-correct"),
      resIncorrect: document.getElementById("res-incorrect"),
      resMissed: document.getElementById("res-missed"),
      resDuration: document.getElementById("res-duration"),
      resRating: document.getElementById("res-rating"),
      resBest: document.getElementById("res-best"),
      historyList: document.getElementById("history-list"),
      sparkline: document.getElementById("sparkline"),
      tryAgainBtn: document.getElementById("try-again-btn"),
      /* arcade HUD flavour (never touches the WPM/accuracy math) */
      comboVal: document.getElementById("combo-val"),
      hudCombo: document.getElementById("hud-combo"),
      deckMode: document.getElementById("deck-mode"),
      rushBest: document.getElementById("rush-best"),
      resultGrade: document.getElementById("result-grade"),
      announce: document.getElementById("announce"),
      /* /custom-text/ only — absent everywhere else */
      customInput: document.getElementById("custom-text"),
      customApply: document.getElementById("custom-apply"),
      customShare: document.getElementById("custom-share"),
      customStatus: document.getElementById("custom-status"),
      customCount: document.getElementById("custom-count"),
      /* per-key report — on every tool page's results screen */
      keysSection: document.getElementById("keys-section"),
      keyHeatmap: document.getElementById("key-heatmap"),
      keysNote: document.getElementById("keys-note"),
      keysMissed: document.getElementById("keys-missed"),
      keysSlowest: document.getElementById("keys-slowest"),
      keysTableBody: document.getElementById("keys-table-body"),
      drillKeysBtn: document.getElementById("drill-keys-btn"),
      /* /accuracy-drill/ only */
      drillBanner: document.getElementById("drill-banner"),
      drillKeyList: document.getElementById("drill-key-list"),
      drillClear: document.getElementById("drill-clear"),
    };

    /* ---------- state ---------- */
    let duration = DEFAULT_DURATION;
    let text = "";
    let charStates = []; // 'pending' | 'correct' | 'incorrect'
    let pos = 0;
    let startTime = null;
    let tickHandle = null;
    let finished = false;
    let combo = 0; // consecutive correctly-typed characters (arcade flavour)
    /* strict ("accuracy") variant: a wrong key is counted but does NOT advance the
       caret, so charStates over [0,pos) can no longer tell us how many characters
       were typed — the errors are counted explicitly instead. */
    let strictErrors = 0;
    let strictWrongAt = -1; // index the typist is currently stuck on, or -1
    /* custom variant: the passage the visitor supplied (?text= or the textarea) */
    let customText = VARIANT.custom ? sanitizeCustomText(PARAMS.get("text")) : "";

    function initialWordCountFor(dur) {
      // Rough overshoot so an average-fast typist never runs out before extension kicks in.
      return Math.ceil((dur / 60) * 130) + 20;
    }

    // Characters a very fast typist could get through in `dur`, with headroom —
    // used to decide how many times a short custom passage has to repeat.
    function targetCharsFor(dur) {
      return Math.ceil((dur / 60) * 900) + 200;
    }

    // Where extra text comes from when the typist nears the end of the passage.
    // For a custom passage that is the passage itself (it loops); otherwise it is
    // the variant's word/token pool.
    function activePool() {
      if (VARIANT.custom && customText) return [customText];
      /* The accuracy drill, when it has been handed a weak-key set, types the
         same real English weighted toward those keys — see drillPool. */
      if (VARIANT.strict && drillKeys.length) {
        return drillPool(VARIANT.pool, RARE_WORD_POOL, drillKeys, 3);
      }
      return VARIANT.pool;
    }

    function newPassage() {
      text = VARIANT.custom && customText
        ? extendPassage(customText, [customText], targetCharsFor(duration))
        : buildPassage(activePool(), initialWordCountFor(duration));
      charStates = new Array(text.length).fill("pending");
      pos = 0;
      startTime = null;
      finished = false;
      strictErrors = 0;
      strictWrongAt = -1;
      runKeystrokes = [];
      lastKeyTime = null;
      setCombo(0);
      renderPassage();
      updateStatsDisplay(0, 0, duration);
      updateHud();
      stopTimer();
    }

    /* ---------- arcade HUD flavour (combo / grade / announce) ---------- */
    function setCombo(n) {
      combo = n;
      if (els.comboVal) els.comboVal.textContent = n;
      if (els.hudCombo) els.hudCombo.classList.toggle("hot", n >= 10);
    }
    function bumpComboAnim(cls) {
      const el = els.hudCombo;
      if (!el) return;
      el.classList.remove("pop", "brk");
      void el.offsetWidth; // restart the animation
      el.classList.add(cls);
    }
    function modeLabel(sec) {
      return sec >= 300 && sec % 60 === 0 ? sec / 60 + " Min" : sec + " Sec";
    }
    function updateHud() {
      if (els.deckMode) els.deckMode.textContent = modeLabel(duration);
      if (els.rushBest) {
        const best = getBests()[duration];
        els.rushBest.textContent = best ? best + " WPM" : "—";
      }
    }
    function showAnnounce(text) {
      const a = els.announce;
      if (!a) return;
      a.textContent = "";
      const span = document.createElement("span");
      span.className = "announce-text";
      span.textContent = text;
      a.appendChild(span);
      a.classList.add("show");
      clearTimeout(showAnnounce._t);
      showAnnounce._t = setTimeout(() => a.classList.remove("show"), 1100);
    }

    function renderPassage() {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < text.length; i++) {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = text[i];
        frag.appendChild(span);
      }
      els.passage.textContent = "";
      els.passage.appendChild(frag);
      paintChars();
    }

    function paintChars() {
      const spans = els.passage.children;
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i];
        span.classList.remove("correct", "incorrect", "current", "blocked");
        const state = charStates[i];
        if (state === "correct") span.classList.add("correct");
        else if (state === "incorrect") span.classList.add("incorrect");
        if (i === pos) span.classList.add("current");
        if (i === strictWrongAt) span.classList.add("blocked");
      }
      const currentSpan = spans[pos];
      if (currentSpan) scrollToLine(currentSpan);
    }

    /* Move the passage window in WHOLE line boxes. scrollIntoView({block:"center"})
       centres on the character, which leaves a sliced half-line at the top and
       bottom edge of the window; a typing test wants complete lines only. The
       window is three lines tall (see .passage in styles.css), so the current
       line sits one in from the top with a line of read-ahead below it. */
    function scrollToLine(span) {
      const box = els.passage;
      const lineH = parseFloat(getComputedStyle(box).lineHeight);
      if (!lineH) return;
      const top = span.getBoundingClientRect().top -
                  box.getBoundingClientRect().top + box.scrollTop;
      const line = Math.round(top / lineH);
      box.scrollTop = Math.max(0, line - 1) * lineH;
    }

    function maybeExtend() {
      if (text.length - pos < MIN_BUFFER_CHARS) {
        const before = text.length;
        text = extendPassage(text, activePool(), text.length + MIN_BUFFER_CHARS * 2);
        for (let i = before; i < text.length; i++) charStates.push("pending");
        const frag = document.createDocumentFragment();
        for (let i = before; i < text.length; i++) {
          const span = document.createElement("span");
          span.className = "char";
          span.textContent = text[i];
          frag.appendChild(span);
        }
        els.passage.appendChild(frag);
      }
    }

    function handleChar(key) {
      if (finished) return;
      if (startTime === null) {
        startTime = Date.now();
        startTimer();
      }
      const isCorrect = key === text[pos];

      /* One row per keystroke, against the character the passage ASKED for — see
         recordKeystroke. Pushed into an array here and folded into the saved
         totals once, at the end of the run; nothing is written to storage
         mid-run. */
      const now = Date.now();
      runKeystrokes.push({
        char: text[pos],
        correct: isCorrect,
        ms: lastKeyTime === null ? null : now - lastKeyTime,
      });
      lastKeyTime = now;

      /* Strict mode (/accuracy-drill/): the wrong key is counted as an error but
         the caret does not move, so the typist has to produce the right character
         before anything else happens. */
      if (VARIANT.strict && !isCorrect) {
        strictErrors++;
        strictWrongAt = pos;
        if (combo > 0) bumpComboAnim("brk");
        setCombo(0);
        paintChars();
        updateLiveStats();
        return;
      }

      charStates[pos] = isCorrect ? "correct" : "incorrect";
      if (isCorrect) {
        setCombo(combo + 1);
        bumpComboAnim("pop");
      } else {
        if (combo > 0) bumpComboAnim("brk");
        setCombo(0);
      }
      strictWrongAt = -1;
      pos++;
      maybeExtend();
      paintChars();
      updateLiveStats();
    }

    function handleBackspace() {
      if (finished) return;
      strictWrongAt = -1;
      const wordStart = findWordStart(text, pos);
      if (pos <= wordStart) {
        paintChars();
        return;
      }
      pos--;
      charStates[pos] = "pending";
      paintChars();
      updateLiveStats();
    }

    function elapsedSeconds() {
      return startTime === null ? 0 : (Date.now() - startTime) / 1000;
    }

    function currentCounts() {
      if (VARIANT.strict) {
        /* Strict mode only ever advances on a correct key, so every consumed
           character is a correct one; the errors live in their own counter
           because they left no trace in charStates. computeWPM / computeAccuracy
           themselves are untouched — they still just take (correct, total). */
        return { correct: pos, incorrect: strictErrors, total: pos + strictErrors };
      }
      let correct = 0, incorrect = 0;
      for (let i = 0; i < pos; i++) {
        if (charStates[i] === "correct") correct++;
        else if (charStates[i] === "incorrect") incorrect++;
      }
      return { correct, incorrect, total: pos };
    }

    function updateLiveStats() {
      const elapsed = elapsedSeconds();
      const { correct, total } = currentCounts();
      const remaining = Math.max(0, duration - elapsed);
      const effectiveElapsed = Math.max(elapsed, 0.001);
      updateStatsDisplay(computeWPM(correct, effectiveElapsed), computeAccuracy(correct, total), remaining);
      if (remaining <= 0) endTest();
    }

    function updateStatsDisplay(wpm, acc, remaining) {
      els.timeLeft.textContent = Math.ceil(remaining);
      els.liveWpm.textContent = Math.round(wpm);
      els.liveAcc.textContent = total_or_zero(acc) + "%";
    }
    function total_or_zero(n) { return Number.isFinite(n) ? Math.round(n) : 0; }

    function startTimer() {
      stopTimer();
      tickHandle = setInterval(updateLiveStats, 200);
    }
    function stopTimer() {
      if (tickHandle) clearInterval(tickHandle);
      tickHandle = null;
    }

    function endTest() {
      if (finished) return;
      finished = true;
      stopTimer();
      const { correct, incorrect, total } = currentCounts();
      const missed = countMissedInWord(text, pos);
      const wpm = Math.round(computeWPM(correct, duration));
      const raw = Math.round(computeRawWPM(total, duration));
      const acc = Math.round(computeAccuracy(correct, total));

      els.resWpm.textContent = wpm;
      els.resRaw.textContent = raw;
      els.resAcc.textContent = acc + "%";
      els.resCorrect.textContent = correct;
      els.resIncorrect.textContent = incorrect;
      els.resMissed.textContent = missed;
      els.resDuration.textContent = duration + "s";

      const rating = getRatingTier(wpm);
      els.resRating.textContent = rating.label;
      els.resRating.className = "rating-badge rating-" + rating.tier;
      els.resRating.nextElementSibling.textContent = rating.message;

      const best = saveBest(duration, wpm);
      els.resBest.textContent = best;

      const grade = getGrade(wpm);
      if (els.resultGrade) {
        els.resultGrade.textContent = grade;
        els.resultGrade.setAttribute("data-grade", grade);
        els.resultGrade.classList.add("show");
      }
      showAnnounce("Time Up!");
      updateHud();

      const history = pushHistory({ wpm, accuracy: acc, duration, timestamp: Date.now() });
      renderHistory(history);

      commitRunKeystrokes();
      renderKeyReport();

      els.testScreen.hidden = true;
      els.resultsScreen.hidden = false;
    }

    function renderHistory(history) {
      els.historyList.textContent = "";
      if (!history.length) {
        const li = document.createElement("li");
        li.className = "history-empty";
        li.textContent = "No previous results yet.";
        els.historyList.appendChild(li);
      } else {
        for (const entry of history) {
          const li = document.createElement("li");
          const date = new Date(entry.timestamp);
          li.innerHTML =
            '<span class="h-wpm">' + entry.wpm + " WPM</span>" +
            '<span class="h-meta">' + entry.accuracy + "% · " + entry.duration + "s · " +
            date.toLocaleDateString() + "</span>";
          els.historyList.appendChild(li);
        }
      }
      renderSparkline(history);
    }

    function renderSparkline(history) {
      const svgNs = "http://www.w3.org/2000/svg";
      els.sparkline.textContent = "";
      const points = history.slice(0, 10).reverse();
      if (points.length < 2) {
        els.sparkline.setAttribute("hidden", "");
        return;
      }
      els.sparkline.removeAttribute("hidden");
      const w = 200, h = 40, pad = 4;
      const max = Math.max(...points.map((p) => p.wpm), 1);
      const min = Math.min(...points.map((p) => p.wpm), 0);
      const range = Math.max(max - min, 1);
      const step = (w - pad * 2) / Math.max(points.length - 1, 1);
      const coords = points.map((p, i) => {
        const x = pad + i * step;
        const y = h - pad - ((p.wpm - min) / range) * (h - pad * 2);
        return x + "," + y;
      });
      const polyline = document.createElementNS(svgNs, "polyline");
      polyline.setAttribute("points", coords.join(" "));
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", "currentColor");
      polyline.setAttribute("stroke-width", "2");
      polyline.setAttribute("stroke-linecap", "round");
      polyline.setAttribute("stroke-linejoin", "round");
      els.sparkline.setAttribute("viewBox", "0 0 " + w + " " + h);
      els.sparkline.appendChild(polyline);
    }

    function restart() {
      if (els.announce) els.announce.classList.remove("show");
      if (els.resultGrade) els.resultGrade.classList.remove("show");
      els.resultsScreen.hidden = true;
      els.testScreen.hidden = false;
      newPassage();
      focusInput();
    }

    /* ---------- the hidden input's sentinel buffer ----------
       The field is kept permanently NON-EMPTY. Chrome on Android does not
       reliably emit `deleteContentBackward` when the caret already sits at the
       start of an empty field — there is nothing there to delete — so an input
       that is cleared after every event has a dead Backspace key. Instead it
       holds a run of no-break spaces with the caret parked at the end: the
       keyboard always believes there is something behind the caret, every
       Backspace produces a real event, and the padding is re-applied after each
       one so the buffer never drains. U+00A0 rather than a normal space because
       it is still whitespace to the IME (nothing to autocorrect or suggest
       against) while counting as content to delete. */
    const PAD_CHAR = "\u00a0";
    const PAD_LEN = 8;
    const PAD = PAD_CHAR.repeat(PAD_LEN);

    function repadInput() {
      const el = els.typeInput;
      if (el.value !== PAD) el.value = PAD;
      // Caret at the end, so a soft keyboard has padding behind it to delete.
      try { el.setSelectionRange(PAD_LEN, PAD_LEN); } catch {}
    }

    function focusInput() {
      els.typeInput.focus();
      repadInput();
    }

    /* ---------- duration selector ---------- */
    function syncDurationButtons() {
      [...els.durationGroup.children].forEach((btn) => {
        btn.setAttribute("aria-pressed", String(Number(btn.dataset.duration) === duration));
      });
    }

    // A ?d= value the page doesn't ship a button for gets one, in numeric order,
    // so the deck never disagrees with the test that's actually running.
    function ensureDurationButton(seconds) {
      const existing = [...els.durationGroup.children].some(
        (btn) => Number(btn.dataset.duration) === seconds
      );
      if (existing) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-duration", String(seconds));
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = formatDurationLabel(seconds);
      const after = [...els.durationGroup.children].find(
        (b) => Number(b.dataset.duration) > seconds
      );
      els.durationGroup.insertBefore(btn, after || null);
    }

    function setDuration(newDuration, { persistSelection = true } = {}) {
      duration = newDuration;
      syncDurationButtons();
      if (persistSelection) {
        try { localStorage.setItem(DURATION_KEY, String(duration)); } catch {}
      }
      newPassage();
    }

    els.durationGroup.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-duration]");
      if (!btn) return;
      setDuration(Number(btn.dataset.duration));
      focusInput();
    });

    /* ---------- input handling ---------- */
    els.typeInput.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Plain Tab restarts the run. Shift+Tab is deliberately left alone: the
      // page focuses this input on arrival, so without an unclaimed key there
      // is no way off the test and out to the nav with a keyboard.
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        restart();
        return;
      }
      if (finished) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key === " ") e.preventDefault();
      if (e.key.length === 1) {
        e.preventDefault();
        handleChar(e.key);
      }
    });
    /* ---------- soft-keyboard input path (Android, and any IME) ----------
       Android soft keyboards do not report characters on keydown. GBoard and
       friends fire keydown with `key === "Unidentified"` / keyCode 229 and
       deliver the actual text through beforeinput/input, so the keydown
       listener above — which only ever acts on `e.key.length === 1` — never
       sees a printable key and the passage never advances. On a phone the test
       simply looks broken. This is the path that fixes it.

       There is deliberately NO "already handled this frame" flag. On desktop
       the keydown listener calls preventDefault() on the printable key, and a
       defaulted-prevented keydown never produces the beforeinput that would
       have followed it, so these handlers are simply not reached for ordinary
       hardware keystrokes. A frame-scoped flag would guard nothing and would
       introduce a race with the very fast repeats it is meant to protect. */

    // True between compositionstart and compositionend. While an IME is
    // composing, the text in the field is a draft the user has not committed —
    // it is read once, at compositionend, and nothing is repadded underneath it.
    let composing = false;

    // Multi-character insertions are real, not theoretical: GBoard commits a
    // whole autocorrected or predicted word in one insertText. Each character
    // is fed through the ordinary handleChar so grading, COMBO and per-key
    // stats behave exactly as they do for hardware keys.
    function typeString(str) {
      for (const ch of str) {
        if (finished) return;
        handleChar(ch);
      }
    }

    function backspaceToWordStart() {
      // handleBackspace already refuses to cross the start of the current word,
      // so "delete the word" is just "backspace until it stops moving".
      for (let guard = 0; guard < 200; guard++) {
        const before = pos;
        handleBackspace();
        if (pos === before) return;
      }
    }

    els.typeInput.addEventListener("compositionstart", () => { composing = true; });
    els.typeInput.addEventListener("compositionend", (e) => {
      composing = false;
      // The committed string, once. Nothing was consumed while it was a draft.
      if (typeof e.data === "string" && e.data) typeString(e.data);
      repadInput();
    });

    els.typeInput.addEventListener("beforeinput", (e) => {
      const type = e.inputType;

      // Composition drafts are ignored until they are committed above.
      // `insertFromComposition` is the Safari spelling of that same commit and
      // is followed by compositionend, so acting on it would double-count.
      if (e.isComposing || type === "insertCompositionText" || type === "insertFromComposition") return;

      if (type === "insertText") {
        e.preventDefault();
        if (typeof e.data === "string" && e.data) typeString(e.data);
        repadInput();
        return;
      }

      if (type === "deleteContentBackward") {
        e.preventDefault();
        handleBackspace();
        repadInput();
        return;
      }

      if (type === "deleteWordBackward" || type === "deleteSoftLineBackward" ||
          type === "deleteHardLineBackward") {
        e.preventDefault();
        backspaceToWordStart();
        repadInput();
        return;
      }

      /* Everything else is refused, and the two refusals worth naming are
         deliberate:

         `insertReplacementText` — GBoard rewriting a word the visitor already
         finished (autocorrect, or tapping a suggestion). Those characters were
         graded when they were typed and are already sitting in charStates. A
         replacement is not a keystroke, so applying it would let autocorrect
         retroactively fix a misspelling the visitor actually typed and inflate
         the accuracy of a run they did not make. The run keeps the keys that
         were pressed; the drafted word stands as typed.

         `insertFromPaste` / `insertFromDrop` — a typing test that accepts
         pasted text is not measuring typing. */
      e.preventDefault();
      repadInput();
    });

    // Anything that still slipped a value into the field — an unknown inputType,
    // an autofill — is discarded and the sentinel padding restored. Never during
    // composition: rewriting the field mid-draft cancels the IME's own state.
    els.typeInput.addEventListener("input", (e) => {
      if (e.isComposing || composing) return;
      repadInput();
    });

    els.typeSurface.addEventListener("click", focusInput);
    els.restartBtn.addEventListener("click", () => restart());
    els.tryAgainBtn.addEventListener("click", () => restart());
    /* "Tab restarts" is a real convenience, but it was bound to every Tab press
       anywhere on the page, so Tab could never move focus off the test — the
       theme toggle, the toolbar and the footer were all unreachable without a
       mouse. Restart only when nothing in particular has focus; once the
       visitor is on a real control, Tab has to keep walking. */
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const el = document.activeElement;
      if (el === els.typeInput) return; // its own handler already restarted
      if (el && el !== document.body && el !== document.documentElement) return;
      e.preventDefault();
      restart();
      focusInput();
    });

    /* ---------- custom passage panel (/custom-text/ only) ---------- */
    function shareUrlFor(passage, seconds) {
      const base = location.origin + location.pathname;
      return base + "?text=" + encodeURIComponent(passage) + "&d=" + seconds;
    }

    function fallbackCopy(str) {
      const ta = document.createElement("textarea");
      ta.value = str;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }

    function copyToClipboard(str) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(str).then(
          () => true,
          () => fallbackCopy(str)
        );
      }
      return Promise.resolve(fallbackCopy(str));
    }

    function setCustomStatus(message) {
      if (els.customStatus) els.customStatus.textContent = message;
    }

    function updateCustomCount() {
      if (!els.customCount || !els.customInput) return;
      els.customCount.textContent =
        els.customInput.value.length + " / " + MAX_CUSTOM_CHARS;
    }

    function initCustomPanel() {
      if (!VARIANT.custom || !els.customInput) return;

      if (customText) {
        els.customInput.value = customText;
        setCustomStatus(
          "Loaded " + customText.length + " characters from this link — start typing."
        );
      } else if (PARAMS.get("text")) {
        setCustomStatus("That link's text was empty after cleanup, so random words are loaded instead.");
      }
      updateCustomCount();

      els.customInput.addEventListener("input", updateCustomCount);

      if (els.customApply) {
        els.customApply.addEventListener("click", () => {
          const full = sanitizeCustomText(els.customInput.value, Infinity);
          const cleaned = sanitizeCustomText(els.customInput.value);
          if (!cleaned) {
            setCustomStatus("Paste or type some text first.");
            return;
          }
          const truncated = full.length > cleaned.length;
          customText = cleaned;
          els.customInput.value = cleaned;
          updateCustomCount();
          try {
            history.replaceState(null, "", shareUrlFor(cleaned, duration));
          } catch {}
          restart();
          setCustomStatus(
            truncated
              ? "Loaded the first " + MAX_CUSTOM_CHARS + " characters — the rest was trimmed."
              : "Loaded " + cleaned.length + " characters. The passage repeats if you reach the end."
          );
        });
      }

      if (els.customShare) {
        els.customShare.addEventListener("click", () => {
          const cleaned = sanitizeCustomText(els.customInput.value);
          if (!cleaned) {
            setCustomStatus("Add some text before copying a link.");
            return;
          }
          const url = shareUrlFor(cleaned, duration);
          copyToClipboard(url).then((ok) => {
            setCustomStatus(ok ? "Shareable link copied to your clipboard." : "Couldn't copy — here it is: " + url);
          });
        });
      }
    }

    /* ---------- per-key report (heatmap, lists, table, drill) ----------
       Everything here is read from and written to this browser only. There is no
       endpoint to send it to; the page says so out loud because a per-keystroke
       record is exactly the kind of thing a visitor is right to ask about. */

    // The whole point of the store is that it crosses runs, so unlike the bests
    // and the history it is NOT scoped per variant: your 'z' is your 'z' whether
    // you met it in a 30-second word test or on the code page.
    const KEYSTATS_KEY = "wpmflex-keystats";
    const DRILL_KEYS_KEY = "wpmflex-drill-keys";

    let runKeystrokes = [];
    let lastKeyTime = null;
    let keySummary = null;

    /* The keys the accuracy drill is currently weighting toward. Recomputed from
       live stats every time the drill page loads, so the drill follows the typist
       as the weak keys change rather than pinning yesterday's list forever. */
    let drillKeys = [];

    function loadKeyStats() {
      const raw = loadJSON(KEYSTATS_KEY, {});
      return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    }

    function commitRunKeystrokes() {
      if (!runKeystrokes.length) return;
      saveJSON(KEYSTATS_KEY, mergeKeystrokes(loadKeyStats(), runKeystrokes));
      runKeystrokes = [];
    }

    function refreshDrillKeys(persist) {
      const stored = loadJSON(DRILL_KEYS_KEY, null);
      const storedKeys =
        stored && Array.isArray(stored.keys) ? stored.keys.filter((k) => typeof k === "string") : [];
      if (!storedKeys.length) {
        drillKeys = [];
        return drillKeys;
      }
      const fresh = weakKeys(summarizeKeyStats(loadKeyStats()), 6);
      drillKeys = fresh.length ? fresh : storedKeys;
      if (persist && fresh.length) saveJSON(DRILL_KEYS_KEY, { keys: drillKeys, savedAt: Date.now() });
      return drillKeys;
    }

    /* ---- colour ramps ----
       Flat colours off the cabinet palette, mixed in RGB and rounded — no
       gradients, no blur: a keycap is a solid block with a hard edge like every
       other surface on this screen. */
    const HEAT_COOL = [20, 56, 74];    // #14384a — tracked, clean
    const HEAT_HOT = [255, 107, 122];  // #ff6b7a — the CRT's error red
    const EDGE_COOL = [29, 74, 94];    // #1d4a5e — at or under your own average
    const EDGE_HOT = [33, 230, 255];   // #21e6ff — slower than your own average
    const CAP_UNTRACKED = "#0a1e28";

    function mixHex(a, b, t) {
      const k = Math.max(0, Math.min(1, t));
      const ch = (i) => Math.round(a[i] + (b[i] - a[i]) * k).toString(16).padStart(2, "0");
      return "#" + ch(0) + ch(1) + ch(2);
    }

    // 12% of attempts wrong saturates the ramp. A typist at 94% overall accuracy
    // is around 6% on their worst keys, so this keeps the top of the scale just
    // out of reach rather than painting half the board solid red.
    const ERROR_RATE_FULL = 0.12;

    function renderKeyHeatmap(summary) {
      const svg = els.keyHeatmap;
      if (!svg) return;
      const ns = "http://www.w3.org/2000/svg";
      svg.textContent = "";

      const U = 28;      // pixels per key unit
      const GAP = 3;     // gutter between caps
      const SHADOW = 3;  // hard offset shadow, no blur
      const cells = keyboardLayout();
      const rows = 5;
      const w = keyboardWidth() * U + SHADOW;
      const h = rows * U + SHADOW;
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

      const byKey = {};
      summary.rows.forEach((r) => { byKey[r.key] = r; });

      cells.forEach((cell) => {
        const row = byKey[cell.key];
        const x = cell.x * U;
        const y = cell.y * U;
        const cw = cell.w * U - GAP;
        const chh = U - GAP;

        let fill = CAP_UNTRACKED;
        let edge = "#12303d";
        let edgeWidth = 2;
        let label = "#33596b";
        if (row && row.eligible) {
          fill = mixHex(HEAT_COOL, HEAT_HOT, row.errorRate / ERROR_RATE_FULL);
          label = "#dff6fc";
          if (row.meanMs !== null && summary.meanMs) {
            const t = (row.meanMs / summary.meanMs - 0.95) / 0.75;
            edge = mixHex(EDGE_COOL, EDGE_HOT, t);
            // Thickness carries the same signal as the colour, so the slow keys
            // are still findable with the colours turned off.
            if (t > 0.66) edgeWidth = 4;
          } else {
            edge = mixHex(EDGE_COOL, EDGE_HOT, 0);
          }
        }

        const shadow = document.createElementNS(ns, "rect");
        shadow.setAttribute("x", x + SHADOW);
        shadow.setAttribute("y", y + SHADOW);
        shadow.setAttribute("width", cw);
        shadow.setAttribute("height", chh);
        shadow.setAttribute("fill", "#000");
        shadow.setAttribute("shape-rendering", "crispEdges");
        svg.appendChild(shadow);

        const cap = document.createElementNS(ns, "rect");
        cap.setAttribute("x", x);
        cap.setAttribute("y", y);
        cap.setAttribute("width", cw);
        cap.setAttribute("height", chh);
        cap.setAttribute("fill", fill);
        cap.setAttribute("stroke", edge);
        cap.setAttribute("stroke-width", edgeWidth);
        cap.setAttribute("shape-rendering", "crispEdges");
        svg.appendChild(cap);

        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", x + cw / 2);
        text.setAttribute("y", y + chh / 2 + 3);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", label);
        text.setAttribute("font-size", cell.key === "space" ? 7 : 9);
        text.textContent = cell.key === "space" ? "SPACE" : cell.label.toUpperCase();
        svg.appendChild(text);
      });
    }

    function keyLabel(key) {
      return key === "space" ? "Space" : key.toUpperCase();
    }

    function renderKeyList(el, rows, valueFor, emptyText) {
      if (!el) return;
      el.textContent = "";
      if (!rows.length) {
        const li = document.createElement("li");
        li.className = "keys-empty";
        li.textContent = emptyText;
        el.appendChild(li);
        return;
      }
      rows.forEach((row) => {
        const li = document.createElement("li");
        const k = document.createElement("span");
        k.className = "keys-cap";
        k.textContent = keyLabel(row.key);
        const v = document.createElement("span");
        v.className = "keys-val";
        v.textContent = valueFor(row);
        li.appendChild(k);
        li.appendChild(v);
        el.appendChild(li);
      });
    }

    function renderKeyTable(summary) {
      const body = els.keysTableBody;
      if (!body) return;
      body.textContent = "";
      const rows = summary.eligible
        .slice()
        .sort((a, b) => b.errorRate - a.errorRate || (b.meanMs || 0) - (a.meanMs || 0));
      if (!rows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.textContent = "No key has been typed " + summary.gate + " times yet.";
        tr.appendChild(td);
        body.appendChild(tr);
        return;
      }
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        const cells = [
          keyLabel(row.key),
          String(row.attempts),
          Math.round(row.errorRate * 100) + "%",
          row.meanMs === null ? "—" : Math.round(row.meanMs) + " ms",
        ];
        cells.forEach((value, i) => {
          const cell = document.createElement(i === 0 ? "th" : "td");
          if (i === 0) cell.setAttribute("scope", "row");
          cell.textContent = value;
          tr.appendChild(cell);
        });
        body.appendChild(tr);
      });
    }

    function renderKeyReport() {
      if (!els.keysSection) return;
      const summary = summarizeKeyStats(loadKeyStats());
      keySummary = summary;

      renderKeyHeatmap(summary);
      renderKeyList(
        els.keysMissed,
        mostMissedKeys(summary, 5),
        (r) => Math.round(r.errorRate * 100) + "% of " + r.attempts,
        "Nothing yet — no key has missed often enough to name."
      );
      renderKeyList(
        els.keysSlowest,
        slowestKeys(summary, 5),
        (r) => Math.round(r.meanMs) + " ms",
        "Nothing yet — keep typing and the slow keys will surface."
      );
      renderKeyTable(summary);

      if (els.keysNote) {
        els.keysNote.textContent = summary.eligible.length
          ? summary.eligible.length + " keys tracked · a key joins in at " + summary.gate + " attempts"
          : "Keys join in at " + summary.gate + " attempts each — a couple more runs and the board fills in";
      }

      if (els.drillKeysBtn) {
        const weak = weakKeys(summary, 6);
        const letters = weak.filter((k) => k.length === 1 && k >= "a" && k <= "z");
        els.drillKeysBtn.disabled = letters.length === 0;
        els.drillKeysBtn.textContent = letters.length
          ? "Drill these keys: " + letters.map((k) => k.toUpperCase()).join(" ")
          : "Drill these keys";
      }
    }

    function startDrillOnWeakKeys() {
      const summary = keySummary || summarizeKeyStats(loadKeyStats());
      const keys = weakKeys(summary, 6).filter((k) => k.length === 1 && k >= "a" && k <= "z");
      if (!keys.length) return;
      saveJSON(DRILL_KEYS_KEY, { keys, savedAt: Date.now() });
      if (VARIANT.strict) {
        // Already on the drill: swap the pool and start a fresh run rather than
        // reloading the page out from under the visitor.
        drillKeys = keys;
        syncDrillBanner();
        restart();
      } else {
        location.href = "/accuracy-drill/";
      }
    }

    function syncDrillBanner() {
      if (!els.drillBanner) return;
      if (!drillKeys.length) {
        els.drillBanner.hidden = true;
        return;
      }
      els.drillBanner.hidden = false;
      if (els.drillKeyList) {
        els.drillKeyList.textContent = drillKeys
          .filter((k) => k.length === 1 && k >= "a" && k <= "z")
          .map((k) => k.toUpperCase())
          .join(" ");
      }
    }

    function initKeyReport() {
      if (els.drillKeysBtn) els.drillKeysBtn.addEventListener("click", startDrillOnWeakKeys);
      if (els.drillClear) {
        els.drillClear.addEventListener("click", () => {
          try { localStorage.removeItem(DRILL_KEYS_KEY); } catch {}
          drillKeys = [];
          syncDrillBanner();
          restart();
        });
      }
      if (VARIANT.strict) {
        refreshDrillKeys(true);
        syncDrillBanner();
      }
    }

    /* ---------- init ---------- */
    (function init() {
      let savedDuration = NaN;
      try { savedDuration = Number(localStorage.getItem(DURATION_KEY)); } catch {}
      if (PINNED_DURATION !== null) {
        // A ?d= link wins over the saved preference and is deliberately NOT
        // persisted — a link someone handed you shouldn't rewrite your setting.
        ensureDurationButton(PINNED_DURATION);
        duration = PINNED_DURATION;
      } else {
        duration = DURATIONS.includes(savedDuration) ? savedDuration : DEFAULT_DURATION;
      }
      syncDurationButtons();
      initCustomPanel();
      initKeyReport();
      newPassage();
      renderHistory(getHistory());
      focusInput();
      document.getElementById("year").textContent = new Date().getFullYear();
    })();
  }

  /* ============================= exports (Node sanity checks) ============================= */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      WORD_POOL,
      CODE_POOL,
      RARE_WORD_POOL,
      VARIANTS,
      MAX_CUSTOM_CHARS,
      resolveVariant,
      sanitizeCustomText,
      parseDurationParam,
      formatDurationLabel,
      buildPassage,
      extendPassage,
      findWordStart,
      findWordEnd,
      countMissedInWord,
      MIN_KEY_SAMPLES,
      MAX_KEY_GAP_MS,
      keyIdentity,
      recordKeystroke,
      mergeKeystrokes,
      summarizeKeyStats,
      slowestKeys,
      mostMissedKeys,
      weakKeys,
      drillPool,
      keyboardLayout,
      keyboardWidth,
      computeWPM,
      computeRawWPM,
      computeAccuracy,
      getRatingTier,
      getGrade,
    };
  }
})();
