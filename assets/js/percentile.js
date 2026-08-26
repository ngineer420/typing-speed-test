/* percentile.js — a cited, population-model percentile engine.
   DOM-free and dependency-free. Loaded before app.js as a plain <script>;
   also require()-able from Node for unit tests.

   Ported from reaction-time-test/assets/js/percentile.js (reflexzap). The
   engine is byte-for-byte the same. Only the SOURCES and the models below the
   "SITE-SPECIFIC POPULATION MODEL" heading belong to this site.

   ─────────────────────────────────────────────────────────────────────────
   WHAT THIS IS, AND WHAT IT IS NOT
   ─────────────────────────────────────────────────────────────────────────
   The percentiles this file produces come from a MODEL fitted to figures
   published in the scientific literature — every one of them cited in the
   SOURCES block below.

   They are NOT this site's own visitor data. This site has no backend and
   stores nothing off your device; it cannot and does not aggregate results.
   Any copy rendered from this module must name that origin — the model's
   `populationPhrase` carries the wording — and must never imply "other
   visitors here". A test greps every shipped page for the phrasings that
   would break that. If a number cannot be traced to a source below, it does
   not belong here.
*/

(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PercentileEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ===================== generic math ===================== */

  /* Abramowitz & Stegun 7.1.26 rational approximation of the error function
     (|error| < 1.5e-7). Monotone across the range we evaluate it over, which
     is what keeps percentileForScore monotone — see test/percentile.test.js. */
  function erf(x) {
    var sign = x < 0 ? -1 : 1;
    var ax = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * ax);
    var y =
      1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
        0.254829592) *
        t *
        Math.exp(-ax * ax);
    return sign * y;
  }

  function normalCdf(z) {
    return 0.5 * (1 + erf(z / Math.SQRT2));
  }

  /* Inverse standard normal CDF — Acklam's rational approximation
     (|error| < 1.15e-9). Used to turn a percentile back into a score. */
  function normalQuantile(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
             1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
    var b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
             6.680131188771972e1, -1.328068155288572e1];
    var c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
             -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
    var d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
             3.754408661907416e0];
    var pLow = 0.02425, pHigh = 1 - pLow, q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > pHigh) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
              ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  /* A lognormal is the standard shape for reaction-time-like data: bounded
     below by zero, right-skewed, long slow tail. Optional `shift` moves the
     floor; mu/sigma describe log(score - shift).

     The model is pinned to TWO published numbers and has no free parameters.
     Anchor it on whichever central figure the source actually reports:

       median given (preferred — robust to a junk tail):
         M       = median - shift
         u       = exp(sigma^2), solved from  SD^2 = M^2 * u * (u - 1)
                   ->  u = (1 + sqrt(1 + 4*(SD/M)^2)) / 2
         mu      = ln(M)

       mean given:
         m       = mean - shift
         sigma^2 = ln(1 + SD^2 / m^2)
         mu      = ln(m) - sigma^2 / 2                                      */
  function lognormalParams(model) {
    var shift = model.shift || 0;
    var sd = model.sd;
    if (model.median != null) {
      var M = model.median - shift;
      var k = (sd / M) * (sd / M);
      var u = (1 + Math.sqrt(1 + 4 * k)) / 2;
      return { mu: Math.log(M), sigma: Math.sqrt(Math.log(u)), shift: shift };
    }
    var m = model.mean - shift;
    var sigmaSq = Math.log(1 + (sd * sd) / (m * m));
    return { mu: Math.log(m) - sigmaSq / 2, sigma: Math.sqrt(sigmaSq), shift: shift };
  }

  function paramsFor(model) {
    if (!model._params) model._params = lognormalParams(model);
    return model._params;
  }

  /* ===================== generic engine ===================== */

  /* Share (0..1) of the modelled population scoring at or below `score`. */
  function shareAtOrBelow(model, score) {
    var p = paramsFor(model);
    var x = score - p.shift;
    if (!(x > 0)) return 0;
    return normalCdf((Math.log(x) - p.mu) / p.sigma);
  }

  /* Raw score at a given share (0..1) of the population. */
  function scoreAtShare(model, share) {
    var p = paramsFor(model);
    if (share <= 0) return p.shift;
    if (share >= 1) return Infinity;
    return p.shift + Math.exp(p.mu + p.sigma * normalQuantile(share));
  }

  /* Probability density at `score` (unnormalised units are fine — only ever
     used to give the drawn curve its shape). */
  function density(model, score) {
    var p = paramsFor(model);
    var x = score - p.shift;
    if (!(x > 0)) return 0;
    var z = (Math.log(x) - p.mu) / p.sigma;
    return Math.exp(-0.5 * z * z) / (x * p.sigma * Math.sqrt(2 * Math.PI));
  }

  function modeOf(model) {
    var p = paramsFor(model);
    return p.shift + Math.exp(p.mu - p.sigma * p.sigma);
  }

  /* THE headline function: what percentage of the modelled population does
     this score beat? Always finite and within 0-100. Monotone — a better
     score can never come back with a lower percentile. */
  function percentileForScore(score, model) {
    if (!model || !Number.isFinite(score)) return NaN;
    var below = shareAtOrBelow(model, score);
    var beaten = model.lowerIsBetter ? 1 - below : below;
    return Math.min(100, Math.max(0, beaten * 100));
  }

  /* Inverse: the score sitting at "beats P% of the population". */
  function scoreForPercentile(percentile, model) {
    if (!model || !Number.isFinite(percentile)) return NaN;
    var beaten = Math.min(100, Math.max(0, percentile)) / 100;
    return scoreAtShare(model, model.lowerIsBetter ? 1 - beaten : beaten);
  }

  /* Display form. Clamped to 1-99: the tails of a smooth model fitted to
     published summary statistics do not support "beats 100% of people". */
  function formatPercentile(percentile) {
    if (!Number.isFinite(percentile)) return "";
    return String(Math.min(99, Math.max(1, Math.round(percentile))));
  }

  /* Comparison copy. The population wording is owned by the model so it can
     never drift into implying we aggregate visitor results. */
  function comparisonText(score, model) {
    if (!model || !Number.isFinite(score)) return "";
    var pct = formatPercentile(percentileForScore(score, model));
    return model.betterWord + " than " + pct + "% of " + model.populationPhrase + ".";
  }

  /* A quantile table: [{ percentile, score }, ...] for the reference page and
     for the results-screen ladder. `percentile` is again "beats this many".
     Scores are rounded to model.precision decimals — whole milliseconds here,
     but a clicks-per-second model would want 2. */
  function quantileTable(model, percentiles) {
    var factor = Math.pow(10, model.precision || 0);
    return (percentiles || DEFAULT_PERCENTILES).map(function (p) {
      return { percentile: p, score: Math.round(scoreForPercentile(p, model) * factor) / factor };
    });
  }

  var DEFAULT_PERCENTILES = [99, 95, 90, 75, 50, 25, 10, 5];

  /* ===================== generic curve geometry ===================== */

  function resolveGeom(model, geom) {
    var g = geom || {};
    var domain = model.domain || [model.mean - 3 * model.sd, model.mean + 4 * model.sd];
    return {
      width: g.width || 320,
      height: g.height || 130,
      padTop: g.padTop == null ? 12 : g.padTop,
      padBottom: g.padBottom == null ? 26 : g.padBottom,
      padLeft: g.padLeft == null ? 10 : g.padLeft,
      padRight: g.padRight == null ? 10 : g.padRight,
      min: g.min == null ? domain[0] : g.min,
      max: g.max == null ? domain[1] : g.max,
      samples: g.samples || 96,
    };
  }

  function scalesFor(model, geom) {
    var g = resolveGeom(model, geom);
    var plotW = g.width - g.padLeft - g.padRight;
    var plotH = g.height - g.padTop - g.padBottom;
    var span = g.max - g.min || 1;
    var peak = density(model, modeOf(model)) || 1;
    return {
      g: g,
      baseline: g.padTop + plotH,
      xFor: function (score) {
        var t = (score - g.min) / span;
        return g.padLeft + Math.min(1, Math.max(0, t)) * plotW;
      },
      yFor: function (score) {
        var d = density(model, score) / peak;
        return g.padTop + (1 - Math.min(1, Math.max(0, d))) * plotH;
      },
    };
  }

  /* SVG path `d` for the distribution curve.
     opts.close — close the path down to the baseline (a fillable area)
     opts.step  — draw a staircase instead of a smooth polyline
     opts.from / opts.to — draw only that score slice (used to shade the part
     of the population the visitor beat). */
  function distributionPath(model, geom) {
    if (!model) return "";
    var s = scalesFor(model, geom);
    var g = s.g;
    var from = geom && geom.from != null ? Math.max(g.min, geom.from) : g.min;
    var to = geom && geom.to != null ? Math.min(g.max, geom.to) : g.max;
    if (!(to > from)) return "";
    var stepped = !!(geom && geom.step);
    var step = (to - from) / g.samples;
    var parts = [];
    for (var i = 0; i <= g.samples; i++) {
      var score = from + i * step;
      var x = s.xFor(score).toFixed(2);
      var y = s.yFor(score).toFixed(2);
      // A staircase repeats each sample's height across its own bin width, so
      // the curve reads as hard-edged pixel steps rather than a smooth spline.
      if (stepped && i > 0) parts.push("L" + x + " " + parts[parts.length - 1].split(" ")[1]);
      parts.push((i === 0 ? "M" : "L") + x + " " + y);
    }
    var d = parts.join(" ");
    if (geom && geom.close) {
      d += " L" + s.xFor(to).toFixed(2) + " " + s.baseline.toFixed(2);
      d += " L" + s.xFor(from).toFixed(2) + " " + s.baseline.toFixed(2) + " Z";
    }
    return d;
  }

  /* Where the visitor's marker sits on that same curve. */
  function projectScore(model, score, geom) {
    var s = scalesFor(model, geom);
    var clamped = Math.min(s.g.max, Math.max(s.g.min, score));
    return {
      score: clamped,
      x: s.xFor(clamped),
      y: s.yFor(clamped),
      baseline: s.baseline,
      top: s.g.padTop,
      clamped: clamped !== score,
    };
  }

  /* The slice of the drawn domain this score beats — the part of the curve
     worth shading. Which side that is depends only on model.lowerIsBetter,
     so callers stay unit-agnostic. */
  function beatenRange(model, score, geom) {
    var s = scalesFor(model, geom);
    var at = Math.min(s.g.max, Math.max(s.g.min, score));
    return model.lowerIsBetter ? { from: at, to: s.g.max } : { from: s.g.min, to: at };
  }

  /* Evenly spaced axis ticks across the drawn domain. */
  function axisTicks(model, geom, count) {
    var s = scalesFor(model, geom);
    var n = count || 4;
    var out = [];
    for (var i = 0; i <= n; i++) {
      var score = s.g.min + ((s.g.max - s.g.min) * i) / n;
      out.push({ score: Math.round(score), x: s.xFor(score) });
    }
    return out;
  }

  /* ===================== SOURCES ===================== */
  /* Every figure in the models below traces to one of these. Nothing in this
     file comes from visitors to this site. */

  var SOURCES = [
    {
      id: "dhakal2018",
      citation:
        "Dhakal V, Feit AM, Kristensson PO, Oulasvirta A (2018). Observations on Typing " +
        "from 136 Million Keystrokes. Proceedings of the 2018 CHI Conference on Human " +
        "Factors in Computing Systems, paper 646, 1-12.",
      url: "https://doi.org/10.1145/3173574.3174220",
      pdf: "https://userinterfaces.aalto.fi/136Mkeystrokes/resources/chi-18-analysis.pdf",
      kind: "peer-reviewed",
      used:
        "Online transcription typing test, N = 168,960 volunteers, 136,857,600 keystrokes. " +
        "Mean 51.56 WPM (SD 20.20), skewness 0.513, excess kurtosis -0.11. The fastest 10% " +
        "type above approximately 78 WPM and the slowest 10% below approximately 26 WPM. WPM " +
        "counts one word as five characters of the transcribed string, timed from the first " +
        "to the last keypress of each sentence. The sample is self-selected from a typing " +
        "test website: mean age 24.5, 68% from the US, 72% took a typing course.",
    },
    {
      id: "palin2019",
      citation:
        "Palin K, Feit AM, Kim S, Kristensson PO, Oulasvirta A (2019). How do People Type " +
        "on Mobile Devices? Observations from a Study with 37,000 Volunteers. Proceedings " +
        "of MobileHCI 2019, article 9, 1-12.",
      url: "https://doi.org/10.1145/3338286.3340120",
      pdf: "https://userinterfaces.aalto.fi/typing37k/resources/Mobile_typing_study.pdf",
      kind: "peer-reviewed",
      used:
        "The same transcription test on phones and tablets, N = 37,370 volunteers. Mean " +
        "36.17 WPM (SD 13.22), skewness 0.72, and 75% of participants below 43.98 WPM. " +
        "Same WPM definition as Dhakal et al. Same self-selection caveat.",
    },
  ];

  /* ===================== SITE-SPECIFIC POPULATION MODEL ===================== */

  /* HOW THESE MODELS WERE BUILT — the whole derivation, so every number is
     checkable.

     Each model is a shifted lognormal pinned to THREE published numbers: the
     mean, the SD and the skewness. The skewness fixes the shape parameter, the
     SD then fixes the scale, and the mean fixes the position. There are no free
     parameters.

       skewness of a lognormal  g = (u + 2) * sqrt(u - 1),  u = exp(sigma^2)
       scale                    m = SD / sqrt(u * (u - 1))
       shift                    = mean - m

     A plain lognormal (shift 0) with the Dhakal mean and SD has a skewness of
     1.24, more than twice the published 0.513, and it puts the slowest 10% at
     about 30 WPM where the paper reports about 26. Solving for the shift that
     reproduces the published skewness moves the floor below zero and the
     result lands on both of the paper's tail figures:

       DESKTOP  mean 51.56, SD 20.20, skewness 0.513
                -> u = 1.0287, sigma = 0.168, m = 117.6, shift = -66.0
                p10 = 27.1 (paper: about 26), p90 = 78.2 (paper: about 78)

       MOBILE   mean 36.17, SD 13.22, skewness 0.72
                -> u = 1.0555, sigma = 0.232, m = 54.6, shift = -18.4
                p75 = 43.9 (paper: 43.98)

     The negative shift is a property of the fitted curve, not a claim that a
     negative typing speed exists. The share of the model below 0 WPM is 0.05%
     on desktop and effectively 0 on mobile.

     WHAT THE COMPARISON DOES NOT CAPTURE, stated rather than hidden:

     - This site counts only correct characters (computeWPM in app.js). The
       source counts every character of the transcribed string and reports
       uncorrected errors separately. With the source's mean error rate of
       1.2%, the two definitions differ by about one WPM at the mean.
     - This site times a fixed run of 15 to 300 seconds. The source times each
       sentence from its first to its last keypress, so it excludes the pause
       before the first key. A short run here carries more sampling noise than
       the source's 15-sentence average.
     - The source sample is self-selected typing-test users, mostly young, 68%
       from the US, 72% with typing training. It types faster than the general
       population, so a percentile here is a comparison against typing-test
       volunteers, not against everyone.

     The code test gets no model. No published distribution of code-typing
     speed exists that this file could cite, and a prose distribution would be
     the wrong population for it. */

  var TYPING_WPM = {
    id: "typing-wpm",
    label: "Typing speed, words per minute, physical keyboard",
    unit: "WPM",
    precision: 0,
    lowerIsBetter: false,
    betterWord: "Faster",
    populationPhrase: "typists in published typing data (Dhakal et al., 2018)",
    source: "dhakal2018",

    mean: 51.56,
    sd: 20.2,
    shift: -66.0, // solved from skewness 0.513, see derivation above
    domain: [0, 130],

    /* Quoted on the results screen next to the percentile. */
    n: 168960,
    quantiles: [],
  };

  var MOBILE_TYPING_WPM = {
    id: "mobile-typing-wpm",
    label: "Typing speed, words per minute, phone or tablet",
    unit: "WPM",
    precision: 0,
    lowerIsBetter: false,
    betterWord: "Faster",
    populationPhrase: "mobile typists in published typing data (Palin et al., 2019)",
    source: "palin2019",

    mean: 36.17,
    sd: 13.22,
    shift: -18.4, // solved from skewness 0.72, see derivation above
    domain: [0, 100],

    n: 37370,
    quantiles: [],
  };

  var MODELS = [TYPING_WPM, MOBILE_TYPING_WPM];

  MODELS.forEach(function (model) {
    model.quantiles = [99, 95, 90, 75, 50, 25, 10, 5, 1].map(function (p) {
      return { percentile: p, score: Math.round(scoreForPercentile(p, model)) };
    });
  });

  return {
    // engine
    percentileForScore: percentileForScore,
    scoreForPercentile: scoreForPercentile,
    formatPercentile: formatPercentile,
    comparisonText: comparisonText,
    quantileTable: quantileTable,
    shareAtOrBelow: shareAtOrBelow,
    density: density,
    distributionPath: distributionPath,
    projectScore: projectScore,
    beatenRange: beatenRange,
    axisTicks: axisTicks,
    DEFAULT_PERCENTILES: DEFAULT_PERCENTILES,
    // math (exported for tests)
    erf: erf,
    normalCdf: normalCdf,
    normalQuantile: normalQuantile,
    lognormalParams: lognormalParams,
    // site data
    SOURCES: SOURCES,
    MODELS: MODELS,
    TYPING_WPM: TYPING_WPM,
    MOBILE_TYPING_WPM: MOBILE_TYPING_WPM,
  };
});
