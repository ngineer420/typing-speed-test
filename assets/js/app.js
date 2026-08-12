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
  };

  function resolveVariant(name) {
    return Object.prototype.hasOwnProperty.call(VARIANTS, name) ? VARIANTS[name] : VARIANTS.words;
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
      return VARIANT.custom && customText ? [customText] : VARIANT.pool;
    }

    function newPassage() {
      text = VARIANT.custom && customText
        ? extendPassage(customText, [customText], targetCharsFor(duration))
        : buildPassage(VARIANT.pool, initialWordCountFor(duration));
      charStates = new Array(text.length).fill("pending");
      pos = 0;
      startTime = null;
      finished = false;
      strictErrors = 0;
      strictWrongAt = -1;
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
      if (currentSpan) currentSpan.scrollIntoView({ block: "center", inline: "nearest" });
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

    function focusInput() {
      els.typeInput.value = "";
      els.typeInput.focus();
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
    // Keep the hidden input's own value irrelevant — logic runs entirely off keydown —
    // but clear it on any 'input' event so mobile autocomplete/IME text never accumulates.
    els.typeInput.addEventListener("input", () => { els.typeInput.value = ""; });

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
      computeWPM,
      computeRawWPM,
      computeAccuracy,
      getRatingTier,
      getGrade,
    };
  }
})();
