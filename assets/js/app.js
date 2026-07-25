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

  /* ============================= pure logic (DOM-independent) =============================
     These functions never touch the DOM, localStorage, or timers, so they can be
     required directly from plain Node for testing (see the module.exports guard below). */

  function pickWord(pool, rng, avoidWord) {
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

  /* ============================= DOM app ============================= */
  if (typeof document !== "undefined") {
    const DURATIONS = [15, 30, 60, 120];
    const DEFAULT_DURATION = 30;
    const HISTORY_KEY = "wpmflex-history";
    const BEST_KEY = "wpmflex-best";
    const THEME_KEY = "wpmflex-theme";
    const MIN_BUFFER_CHARS = 40; // extend passage once fewer than this many chars remain unseen

    /* ---------- theme ---------- */
    (function initTheme() {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) document.documentElement.setAttribute("data-theme", stored);
      const btn = document.getElementById("theme-toggle");
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

    function initialWordCountFor(dur) {
      // Rough overshoot so an average-fast typist never runs out before extension kicks in.
      return Math.ceil((dur / 60) * 130) + 20;
    }

    function newPassage() {
      text = buildPassage(WORD_POOL, initialWordCountFor(duration));
      charStates = new Array(text.length).fill("pending");
      pos = 0;
      startTime = null;
      finished = false;
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
    function updateHud() {
      if (els.deckMode) els.deckMode.textContent = duration + " Sec";
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
        span.classList.remove("correct", "incorrect", "current");
        const state = charStates[i];
        if (state === "correct") span.classList.add("correct");
        else if (state === "incorrect") span.classList.add("incorrect");
        if (i === pos) span.classList.add("current");
      }
      const currentSpan = spans[pos];
      if (currentSpan) currentSpan.scrollIntoView({ block: "center", inline: "nearest" });
    }

    function maybeExtend() {
      if (text.length - pos < MIN_BUFFER_CHARS) {
        const before = text.length;
        text = extendPassage(text, WORD_POOL, text.length + MIN_BUFFER_CHARS * 2);
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
      charStates[pos] = isCorrect ? "correct" : "incorrect";
      if (isCorrect) {
        setCombo(combo + 1);
        bumpComboAnim("pop");
      } else {
        if (combo > 0) bumpComboAnim("brk");
        setCombo(0);
      }
      pos++;
      maybeExtend();
      paintChars();
      updateLiveStats();
    }

    function handleBackspace() {
      if (finished) return;
      const wordStart = findWordStart(text, pos);
      if (pos <= wordStart) return;
      pos--;
      charStates[pos] = "pending";
      paintChars();
      updateLiveStats();
    }

    function elapsedSeconds() {
      return startTime === null ? 0 : (Date.now() - startTime) / 1000;
    }

    function currentCounts() {
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
    function setDuration(newDuration, { persistSelection = true } = {}) {
      duration = newDuration;
      [...els.durationGroup.children].forEach((btn) => {
        btn.setAttribute("aria-pressed", String(Number(btn.dataset.duration) === duration));
      });
      if (persistSelection) {
        try { localStorage.setItem("wpmflex-duration", String(duration)); } catch {}
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
      if (e.key === "Tab") {
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
    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab" && document.activeElement !== els.typeInput) {
        e.preventDefault();
        restart();
        focusInput();
      }
    });

    /* ---------- init ---------- */
    (function init() {
      const savedDuration = Number(localStorage.getItem("wpmflex-duration"));
      duration = DURATIONS.includes(savedDuration) ? savedDuration : DEFAULT_DURATION;
      [...els.durationGroup.children].forEach((btn) => {
        btn.setAttribute("aria-pressed", String(Number(btn.dataset.duration) === duration));
      });
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
