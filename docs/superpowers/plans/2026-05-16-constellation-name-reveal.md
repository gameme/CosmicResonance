# Constellation-Driven Name Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current scroll-driven letter formation (R-a-a-g-a) with a 5-swara constellation reveal during the formation phase. At the supernova burst, the constellation dots scatter and reform as letters. Includes a two-threshold scroll commitment model and constellation-synced chime scheduling.

**Architecture:** A new IIFE module `js/constellations.js` (mirroring the `dualcore.js` pattern) owns the five constellations, their formation/compression rendering, the burst-time dot-to-letter morph, and self-resetting on scroll-out. Integrates via `main.js` (draw call, letter rendering gate, chime dispatch refactor, State threshold updates, letter joint extension) and `supernova.js` (one call to `triggerBurst()`). The two-threshold scroll model decouples state entry from render alpha so the reveal can never "run invisibly."

**Tech Stack:** Vanilla HTML5 Canvas + JavaScript ES2020. No build system, no bundler, no package manager. Tests via in-browser assertions in `tests.html`. Dev server: `python3 dev-server.py` on `0.0.0.0:8080`.

**Spec:** `docs/superpowers/specs/2026-05-16-constellation-name-reveal-design.md`

---

## File Structure

**Created:**
- `js/constellations.js` — IIFE module, all constellation rendering + dot-to-letter morph

**Modified:**
- `js/config.js` — adds `REVEAL_COMMIT_THRESHOLD`, `REVEAL_RESET_THRESHOLD` (top-level), and `Config.CONSTELLATIONS` namespace
- `js/main.js` — five edit points: cacheLetterMetrics extension, `Constellations.draw()` call, letter render gating, chime dispatch refactor, State threshold updates
- `js/supernova.js` — adds one call to `App.Constellations.triggerBurst()` in `trigger()`
- `index.html` — adds `<script src="js/constellations.js"></script>` between `particles.js` and `supernova.js`
- `tests.html` — new tests for constellation state, chime schedule, threshold logic, dot-to-letter assignment determinism

---

## Open-question defaults (locked in for this plan)

These are spec §12 open questions, locked to starting values for implementation. All are tunable later via Config.

| Spec open question | Locked starting value |
|---|---|
| Sa halo ring count | 2 rings (radii 6 and 11 in unit space) |
| Twinkle frequency range | 0.3–0.7 Hz |
| Constellation lines during burst flash | Vanish in white-out (consistent with the flash, no separate "burn out" beat) |
| Chime 6–8 schedule default | `STEADY` (Candidate a) — `[7.5, 9.0, 10.5]` |
| `REVEAL_COMMIT_THRESHOLD` | 0.85 |
| `REVEAL_RESET_THRESHOLD` | 0.70 |
| Dot-to-target seed | `Math.floor(_experienceStartTime)` (deterministic per session, varies per page-load) |
| Letter joints | 3 per letter — letter-glyph-aware key points (start of stroke, mid-curvature, end). Computed in `cacheLetterMetrics` based on font-measured letter bounds. Specific (x, y) offsets are the engineer's call during impl, guided by the "highest curvature" §5.4 heuristic. |

---

## Project conventions (read once before starting)

- **No emoji in code, comments, or commits.** This is a personal/family project but follow standard professional norms.
- **Comments policy** (from `~/.claude/CLAUDE.md`): less is more; "why" comments welcome; "how" comments are noise; "what" comments sparingly. For new files, follow the file's natural rhythm.
- **`// MARK: - Section`** for major sections, `// MARK: Sub-section` for sub-sections (Xcode jump-bar style).
- **All globals on `App`** — never `window.X` directly.
- **DPR-aware** — pixel coordinates are multiplied by `App.DPR` everywhere; raw `clientX/Y` is multiplied at the input boundary in `Input.update`.
- **Time units**: `_scaledTime` and audio (via `audioCtx.currentTime`) are in **seconds**; `Date.now()` deltas and HUD intervals are in **milliseconds**.
- **Debug logging**: format `'CATEGORY: message'` (e.g., `CONSTELLATION:`, `CHIME:`, `MILESTONE:`). Use `App.dbg()` not `console.log`.
- **Commit policy**: this project's owner prefers to manage git commits themselves. The commit step at the end of each task is *suggested* — the executing engineer may run it or leave for the user. If executing inline, ask the user before each commit.
- **Pre-existing comments in modified files**: do not delete pre-existing comments even if they seem stale; if a code change makes a comment factually wrong, update minimally.
- **Style scope**: apply comment/naming guidelines to NEW files and NEW lines in modified files. Don't reformat pre-existing lines just to match.

---

## Tasks

### Task 1 — Add Config constants

**Files:**
- Modify: `js/config.js` (top-level `App.Config` object)

**Why:** All tunables for the new feature live in `Config`. This task adds them upfront so subsequent tasks can reference them without scaffolding.

- [ ] **Step 1: Add scroll-handling thresholds at the top level**

In `js/config.js`, locate the line `REVEAL: [0.85, 0.95],` (the existing reveal trigger range). Immediately AFTER that line, insert:

```js
    REVEAL_COMMIT_THRESHOLD: 0.85,    // §5.6 — revealProgress must reach this for State.enter()
    REVEAL_RESET_THRESHOLD: 0.70,     // §5.6 — pre-complete: drop below to trigger State.reset()
```

- [ ] **Step 2: Add `CONSTELLATIONS` namespace at the end of the Config object**

Just before the closing `};` of the `App.Config` object, insert:

```js
    CONSTELLATIONS: {
        // Formation-phase tunables
        TWINKLE_FREQ_RANGE: [0.3, 0.7],          // Hz
        TWINKLE_ALPHA_RANGE: [0.5, 0.9],
        LINE_DRAW_DURATION: 400,                  // ms — progressive line tween
        LINE_DRAW_DELAY: 250,                     // ms after anchor settles
        ANCHOR_FADE_IN: 250,                      // ms
        FILLER_FADE_IN: 400,                      // ms
        COMPRESSION_LINE_ALPHA_END: 0.9,
        COMPRESSION_LINE_WIDTH_END: 1.2,
        // Labels (Sa · 1 etc.)
        LABEL_DELAY_AFTER_LINES: 150,             // ms — label fades in after lines start drawing
        LABEL_FADE_IN: 200,
        LABEL_BASE_ALPHA: 0.55,
        LABEL_FONT: '"SF Mono", "Menlo", monospace',
        LABEL_SIZE_BASE: 10,                      // px at DPR=1
        LABEL_LETTER_SPACING: 1,
        LABEL_COMPRESSION_PULSE_AMP: 0.05,
        LABEL_BURST_FADE_OUT: 80,
        // Audio chime schedule (seconds from formation start)
        CHIME_SCHEDULE_STEADY: [0, 1.5, 3.0, 4.5, 6.0, 7.5, 9.0, 10.5],
        CHIME_SCHEDULE_ACCEL:  [0, 1.5, 3.0, 4.5, 6.0, 8.0, 9.5, 10.5],
        CHIME_SCHEDULE_ACTIVE: 'STEADY',          // 'STEADY' | 'ACCEL' — A/B during impl
        // Burst transition (durations of each phase, in ms)
        BURST_FLASH_OVERLAP: 100,
        BURST_SCATTER_DURATION: 250,
        BURST_CONVERGE_DURATION: 350,
        BURST_LETTER_DRAW_IN: 200,
        BURST_DOT_LINGER: 200,
        BURST_DOT_FADE: 200,
        // Total transition: 100 + 250 + 350 + 200 + 200 + 200 = 1300ms
    },
```

- [ ] **Step 3: Verify the file parses**

Open `tests.html` in a browser. The page should load without console errors and existing tests should pass. Then visit `index.html` — the experience should still run unchanged at this point (Config additions are inert).

- [ ] **Step 4: Commit**

```bash
git add js/config.js
git commit -m "feat(constellations): add Config tunables for new reveal flow"
```

---

### Task 2 — Create `js/constellations.js` skeleton + wire into `index.html`

**Files:**
- Create: `js/constellations.js`
- Modify: `index.html` (script tag block)

**Why:** Establishes the IIFE module and gets it loading at the right point in the dependency chain. Internals are stubs at this point; subsequent tasks fill them in.

- [ ] **Step 1: Create `js/constellations.js` with the full skeleton**

Write the file at `/Users/vmadigeri/Desktop/Personal/raaga-reveal/js/constellations.js`:

```js
// constellations.js — Five swara constellations during the formation/compression phases,
// scattering and reforming as letters at the supernova burst.
// Spec: docs/superpowers/specs/2026-05-16-constellation-name-reveal-design.md
// IIFE pattern follows dualcore.js.

App.Constellations = (function() {
    const C = App.Config;
    const TWO_PI = Math.PI * 2;

    // MARK: - Per-constellation states
    const STATE = Object.freeze({
        HIDDEN: 0,
        APPEARING: 1,
        SETTLED: 2,
        GLOWING: 3,           // compression-phase intensification
        BURST_SCATTERING: 4,
        BURST_CONVERGING: 5,
        BURST_LINGERING: 6,
        DISSOLVING: 7,
        DONE: 8,
    });

    // MARK: - Constellation Data (filled in Task 3)
    const CONSTELLATION_DATA = [];
    const COLOR_RGB = {};

    // MARK: - Runtime state
    let runtimeState = []; // Per-constellation runtime; initialized in init()
    let burstTriggerTime = -1;
    let burstDots = [];
    let burstSourceAssignments = null; // dot-index -> letter-slot mapping at burst-time

    // MARK: - Public API

    function init() {
        // Filled in Task 3
        runtimeState = [];
    }

    function draw(ctx, revealProgress, formationElapsed, compressionElapsed, burstElapsed) {
        // Filled in subsequent tasks. Intent:
        //  1. Update per-constellation states based on formationElapsed / compressionElapsed / burst state
        //  2. Render each constellation per its state, with revealProgress applied as outer alpha
        //  3. Render burst transition if active
        // For now: no-op while we scaffold
    }

    function triggerBurst() {
        // Filled in Task 11. Intent: capture _scaledTime as burstTriggerTime, set all
        // constellations to BURST_SCATTERING, compute dot trajectories.
    }

    function getDotPositions() {
        // For debug HUD; returns flat array of {x, y, color} for visible dots.
        return [];
    }

    function reset() {
        burstTriggerTime = -1;
        burstDots.length = 0;
        burstSourceAssignments = null;
        for (let i = 0; i < runtimeState.length; i++) {
            const rs = runtimeState[i];
            rs.state = STATE.HIDDEN;
            rs.appearTime = -1;
        }
    }

    // MARK: - Helpers (filled in subsequent tasks)

    function randInRange(a, b) {
        return a + Math.random() * (b - a);
    }

    return {
        init,
        draw,
        triggerBurst,
        getDotPositions,
        reset,
        // Exposed for tests:
        STATE,
        CONSTELLATION_DATA,
        _internal: { /* runtimeState getter etc., filled in Task 3 */ },
    };
})();
```

- [ ] **Step 2: Add `<script>` tag in `index.html`**

Open `index.html`. Find the script tag block at the bottom (around lines 188–201). Insert this line **between** `<script src="js/particles.js"></script>` and `<script src="js/supernova.js"></script>`:

```html
    <script src="js/constellations.js"></script>
```

The full block should now read (in order):
```html
    <script src="js/particles.js"></script>
    <script src="js/constellations.js"></script>
    <script src="js/supernova.js"></script>
```

- [ ] **Step 3: Verify load order and no errors**

Open the experience in the browser via `python3 dev-server.py` and visit `http://localhost:8080`. Check the browser console — no errors. The experience should run unchanged (the new module is loaded but its `draw()` is a no-op).

In the console, type `App.Constellations` and confirm it returns an object with the expected keys (init, draw, triggerBurst, getDotPositions, reset, STATE, CONSTELLATION_DATA).

- [ ] **Step 4: Commit**

```bash
git add js/constellations.js index.html
git commit -m "feat(constellations): scaffold constellations.js IIFE module"
```

---

### Task 3 — Constellation data tables, init(), and reset() with tests

**Files:**
- Modify: `js/constellations.js` (CONSTELLATION_DATA, COLOR_RGB, init, reset)
- Modify: `tests.html` (new test cases)

**Why:** Lock in the canonical data shape for all five constellations and prove `init()` and `reset()` work via tests. This is the foundation for every subsequent rendering task.

- [ ] **Step 1: Write failing tests in `tests.html`**

Open `tests.html`. Locate where existing tests are added (look for `test('description', () => { ... })` or the `assert(...)` pattern — adapt to whatever the file's idiom is). Add a new test block, marked clearly:

```html
<script>
// === Constellation tests (added by constellation reveal feature) ===

// Test: 5 constellations with correct dot counts (1, 2, 3, 4, 5)
assert(App.Constellations.CONSTELLATION_DATA.length === 5,
    'CONSTELLATION_DATA has 5 entries');

const expectedDotCounts = [1, 2, 3, 4, 5];
for (let i = 0; i < 5; i++) {
    const cdata = App.Constellations.CONSTELLATION_DATA[i];
    assert(cdata.dots.length === expectedDotCounts[i],
        `constellation ${cdata.swara} has ${expectedDotCounts[i]} dot(s)`);
}

// Test: each constellation has exactly one anchor dot
for (let i = 0; i < 5; i++) {
    const cdata = App.Constellations.CONSTELLATION_DATA[i];
    const anchors = cdata.dots.filter(d => d.isAnchor);
    assert(anchors.length === 1,
        `constellation ${cdata.swara} has exactly one anchor`);
    assert(cdata.dots[cdata.anchorIdx].isAnchor === true,
        `constellation ${cdata.swara} anchorIdx points at the anchor dot`);
}

// Test: labels are correctly formatted "Sa · 1" etc.
const expectedLabels = ['Sa · 1', 'Re · 2', 'Ga · 3', 'Ma · 4', 'Pa · 5'];
for (let i = 0; i < 5; i++) {
    assert(App.Constellations.CONSTELLATION_DATA[i].label === expectedLabels[i],
        `constellation ${i} label is "${expectedLabels[i]}"`);
}

// Test: Sa has 2 halo rings
assert(App.Constellations.CONSTELLATION_DATA[0].halos.length === 2,
    'Sa has 2 halo rings');

// Test: Pa is a closed pentagon (5 lines connecting 5 dots)
assert(App.Constellations.CONSTELLATION_DATA[4].lines.length === 5,
    'Pa has 5 connecting lines (closed pentagon)');

// Test: init() and reset() cycle leaves all constellations in HIDDEN
App.Constellations.init();
const sH = App.Constellations.STATE.HIDDEN;
// Use the public _internal accessor (added below) or expose runtimeState differently.
// For now, indirect test: call reset and verify no errors.
App.Constellations.reset();
assert(true, 'init() and reset() execute without errors'); // placeholder until we expose state inspector

// Test: getDotPositions() returns array (empty when nothing visible)
const positions = App.Constellations.getDotPositions();
assert(Array.isArray(positions), 'getDotPositions returns an array');
</script>
```

- [ ] **Step 2: Run tests in browser, verify they fail**

Open `tests.html` in browser. Many of the new tests will fail because `CONSTELLATION_DATA` is currently empty. Confirm the failures are the expected ones ("CONSTELLATION_DATA has 5 entries: expected true got false" or similar — depends on the assertion library's failure message format).

- [ ] **Step 3: Fill in `CONSTELLATION_DATA` and `COLOR_RGB` in `constellations.js`**

Replace the `CONSTELLATION_DATA = [];` and `COLOR_RGB = {};` lines in `js/constellations.js` with:

```js
    // Each constellation is a unit-square layout (~30px). Coordinates are relative to
    // the constellation's center (which will be positioned at a letter slot). Color names
    // index into COLOR_RGB. Anchor is the brightest "named" star — exactly one per constellation.
    const CONSTELLATION_DATA = Object.freeze([
        // Sa: 1 dot + 2 halo rings — the foundation note
        {
            swara: 'Sa',
            label: 'Sa · 1',  // U+00B7 middle dot
            dots: [
                { x: 0, y: 0, size: 1.6, color: 'white', isAnchor: true },
            ],
            lines: [],
            halos: [{ r: 11 }, { r: 6 }],
            anchorIdx: 0,
        },
        // Re: 2 dots, vertical pair joined by a line — ascending interval
        {
            swara: 'Re',
            label: 'Re · 2',
            dots: [
                { x: 0, y: -8, size: 1.4, color: 'gold',  isAnchor: false },
                { x: 0, y:  8, size: 1.6, color: 'white', isAnchor: true  },
            ],
            lines: [{ from: 0, to: 1 }],
            halos: [],
            anchorIdx: 1,
        },
        // Ga: 3 dots, upward triangle — the third
        {
            swara: 'Ga',
            label: 'Ga · 3',
            dots: [
                { x: -9, y:  6, size: 1.4, color: 'gold',  isAnchor: false },
                { x:  9, y:  6, size: 1.4, color: 'gold',  isAnchor: false },
                { x:  0, y: -9, size: 1.7, color: 'blue',  isAnchor: true  },
            ],
            lines: [
                { from: 0, to: 2 },
                { from: 1, to: 2 },
                { from: 0, to: 1 },
            ],
            halos: [],
            anchorIdx: 2,
        },
        // Ma: 4 dots, square — balance
        {
            swara: 'Ma',
            label: 'Ma · 4',
            dots: [
                { x: -8, y: -8, size: 1.6, color: 'white', isAnchor: true  },
                { x:  8, y: -8, size: 1.4, color: 'gold',  isAnchor: false },
                { x:  8, y:  8, size: 1.4, color: 'blue',  isAnchor: false },
                { x: -8, y:  8, size: 1.4, color: 'white', isAnchor: false },
            ],
            lines: [
                { from: 0, to: 1 },
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 0 },
            ],
            halos: [],
            anchorIdx: 0,
        },
        // Pa: 5 dots, pentagon — the dominant
        {
            swara: 'Pa',
            label: 'Pa · 5',
            dots: [
                { x:    0, y: -10, size: 1.7, color: 'white', isAnchor: true  },
                { x:  9.5, y:  -3, size: 1.4, color: 'blue',  isAnchor: false },
                { x:    6, y:   9, size: 1.4, color: 'gold',  isAnchor: false },
                { x:   -6, y:   9, size: 1.4, color: 'white', isAnchor: false },
                { x: -9.5, y:  -3, size: 1.4, color: 'blue',  isAnchor: false },
            ],
            lines: [
                { from: 0, to: 1 },
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 0 },
            ],
            halos: [],
            anchorIdx: 0,
        },
    ]);

    // Real-star colors. RGB arrays for canvas rgba(...) string composition.
    const COLOR_RGB = Object.freeze({
        gold:  [255, 214, 128],
        white: [255, 248, 232],
        blue:  [168, 216, 255],
    });
```

- [ ] **Step 4: Implement `init()` and beef up `reset()`**

Replace the stub `init()` with:

```js
    function init() {
        runtimeState = CONSTELLATION_DATA.map((cdata, idx) => ({
            slotIdx: idx,
            state: STATE.HIDDEN,
            appearTime: -1,
            // Per-dot twinkle randomization (filler stars only; anchor unchanged)
            twinkleFreqs: cdata.dots.map(() =>
                randInRange(C.CONSTELLATIONS.TWINKLE_FREQ_RANGE[0], C.CONSTELLATIONS.TWINKLE_FREQ_RANGE[1])),
            twinklePhases: cdata.dots.map(() => Math.random() * TWO_PI),
            // Per-dot color jitter (saturation/lightness multiplier ±10%/±5%)
            colorJitter: cdata.dots.map(() => ({
                sat:   0.9  + Math.random() * 0.2,
                light: 0.95 + Math.random() * 0.1,
            })),
            // Tremor offsets used during compression — initialized fresh per draw()
            tremorOffsets: cdata.dots.map(() => ({ dx: 0, dy: 0 })),
        }));
    }

    // Call init() at module load so runtimeState is available before main.js fires its first draw
    init();
```

The `init()` call right after definition ensures `runtimeState` is populated by the time `main.js` begins drawing. The user can also re-call it explicitly if needed (e.g., after window resize, though resize doesn't currently invalidate constellation data).

- [ ] **Step 5: Add a state inspector for tests**

Replace the placeholder `_internal: { ... }` line in the return block with:

```js
        _internal: {
            getRuntimeState: () => runtimeState,
            STATE,
        },
```

This is exposed only for test introspection.

- [ ] **Step 6: Update tests to use the inspector**

In `tests.html`, replace the placeholder Task 3 init/reset test with:

```js
// Test: init() populates runtimeState[5] all in HIDDEN
App.Constellations.init();
const rs = App.Constellations._internal.getRuntimeState();
assert(rs.length === 5, 'init populates 5 runtimeState entries');
const sH = App.Constellations._internal.STATE.HIDDEN;
for (let i = 0; i < 5; i++) {
    assert(rs[i].state === sH, `runtimeState[${i}] starts in HIDDEN`);
}

// Test: reset() returns all to HIDDEN
rs[0].state = App.Constellations._internal.STATE.SETTLED;
App.Constellations.reset();
for (let i = 0; i < 5; i++) {
    assert(rs[i].state === sH, `after reset, runtimeState[${i}] is HIDDEN`);
}
```

- [ ] **Step 7: Run tests, verify they pass**

Open `tests.html` in browser. All Task 3 tests should pass. Existing tests should also still pass.

- [ ] **Step 8: Commit**

```bash
git add js/constellations.js tests.html
git commit -m "feat(constellations): define 5 constellation data + init/reset with tests"
```

---

### Task 4 — Per-constellation appearance state machine

**Files:**
- Modify: `js/constellations.js` (state-update logic)
- Modify: `tests.html` (state machine tests)

**Why:** Pure-logic core: given `formationElapsed` (seconds since `State.startTime`), compute which state each constellation is in. Pull this into a function so it's testable without invoking canvas.

- [ ] **Step 1: Write failing tests**

Add to `tests.html`:

```js
// Test: state machine transitions through formation phase
// Constellation N appears at t = N * 1.5s, takes ~400ms to reach SETTLED
const Cs = App.Constellations;
const ST = Cs._internal.STATE;
Cs.init();

// At t=0, constellation 0 (Sa) starts appearing; rest are HIDDEN
Cs._internal.updateStates(0.0, false /* not bursting */);
let rs = Cs._internal.getRuntimeState();
assert(rs[0].state === ST.APPEARING || rs[0].state === ST.SETTLED, 't=0: Sa is APPEARING/SETTLED');
for (let i = 1; i < 5; i++) {
    assert(rs[i].state === ST.HIDDEN, `t=0: constellation ${i} is HIDDEN`);
}

// At t=0.5 (after 400ms FILLER_FADE_IN + buffer), Sa should be SETTLED
Cs._internal.updateStates(0.5, false);
rs = Cs._internal.getRuntimeState();
assert(rs[0].state === ST.SETTLED, 't=0.5: Sa is SETTLED');

// At t=1.6 (just after Re's 1.5s appear time), Re is APPEARING
Cs._internal.updateStates(1.6, false);
rs = Cs._internal.getRuntimeState();
assert(rs[1].state === ST.APPEARING || rs[1].state === ST.SETTLED, 't=1.6: Re is APPEARING/SETTLED');
assert(rs[0].state === ST.SETTLED, 't=1.6: Sa still SETTLED');

// At t=7.5 (formation end, all 5 visible), all constellations are SETTLED
Cs._internal.updateStates(7.5, false);
rs = Cs._internal.getRuntimeState();
for (let i = 0; i < 5; i++) {
    assert(rs[i].state === ST.SETTLED, `t=7.5: constellation ${i} is SETTLED`);
}

// At t=10 (mid-compression), all constellations are GLOWING
Cs._internal.updateStates(10.0, false);
rs = Cs._internal.getRuntimeState();
for (let i = 0; i < 5; i++) {
    assert(rs[i].state === ST.GLOWING, `t=10: constellation ${i} is GLOWING`);
}

// At t=8 (mid-compression also), GLOWING again
Cs.init(); // reset for next case
Cs._internal.updateStates(8.0, false);
rs = Cs._internal.getRuntimeState();
for (let i = 0; i < 5; i++) {
    assert(rs[i].state === ST.GLOWING, `t=8: constellation ${i} is GLOWING after fresh init`);
}

// Reset works mid-formation
Cs._internal.updateStates(3.0, false); // partial formation
Cs.reset();
rs = Cs._internal.getRuntimeState();
for (let i = 0; i < 5; i++) {
    assert(rs[i].state === ST.HIDDEN, `after reset mid-formation: constellation ${i} is HIDDEN`);
}
```

- [ ] **Step 2: Run tests, verify they fail**

In browser, the new tests fail with errors like `Cs._internal.updateStates is not a function`.

- [ ] **Step 3: Implement `updateStates(formationElapsed, isBursting)` in `js/constellations.js`**

Add inside the IIFE, after `init()`:

```js
    // MARK: - State machine

    // Per-constellation slot interval — derives from existing letter-formation cadence.
    const SLOT_INTERVAL = 1.5; // seconds; matches Config.LETTER_DURATION

    // Total formation duration (5 slots × 1.5s)
    const FORMATION_DURATION = SLOT_INTERVAL * 5;

    function updateStates(formationElapsed, isBursting) {
        if (isBursting) return; // burst transition manages its own state externally; see triggerBurst

        if (formationElapsed < 0) {
            // Pre-reveal — everything HIDDEN
            for (let i = 0; i < runtimeState.length; i++) runtimeState[i].state = STATE.HIDDEN;
            return;
        }

        for (let i = 0; i < runtimeState.length; i++) {
            const rs = runtimeState[i];
            const slotStart = i * SLOT_INTERVAL;

            if (formationElapsed < slotStart) {
                rs.state = STATE.HIDDEN;
                rs.appearTime = -1;
                continue;
            }

            // Slot has appeared (or is appearing). Capture appearTime once.
            if (rs.appearTime < 0) rs.appearTime = slotStart;

            const sinceAppear = formationElapsed - slotStart;

            // APPEARING window: 0 → max(ANCHOR_FADE_IN, FILLER_FADE_IN)/1000
            const appearWindowSec = Math.max(
                C.CONSTELLATIONS.ANCHOR_FADE_IN,
                C.CONSTELLATIONS.FILLER_FADE_IN
            ) / 1000;

            if (formationElapsed >= FORMATION_DURATION) {
                // Compression has begun — all constellations transition to GLOWING
                rs.state = STATE.GLOWING;
            } else if (sinceAppear < appearWindowSec) {
                rs.state = STATE.APPEARING;
            } else {
                rs.state = STATE.SETTLED;
            }
        }
    }
```

- [ ] **Step 4: Expose `updateStates` for tests**

Update the `_internal` block of the return statement:

```js
        _internal: {
            getRuntimeState: () => runtimeState,
            updateStates,
            STATE,
        },
```

- [ ] **Step 5: Run tests, verify they pass**

In browser, all Task 4 tests should pass. Existing tests should also still pass.

- [ ] **Step 6: Commit**

```bash
git add js/constellations.js tests.html
git commit -m "feat(constellations): add per-constellation state machine + tests"
```

---

### Task 5 — Formation rendering: anchor + filler stars

**Files:**
- Modify: `js/constellations.js` (drawing helpers + draw() body for non-burst phases)

**Why:** First visible artifact — anchor stars and filler stars rendered at their positions. Twinkle, lines, and labels come in subsequent tasks. We want to see *something* render before adding more layers.

- [ ] **Step 1: Implement star color helper and draw helpers**

In `js/constellations.js`, after `updateStates()`, add:

```js
    // MARK: - Rendering helpers

    function colorString(name, alpha, jitter) {
        const rgb = COLOR_RGB[name];
        if (!rgb) return `rgba(255,255,255,${alpha})`;
        // Apply jitter (sat/light multipliers): we approximate by scaling toward white and saturation
        // For simplicity, just multiply each channel by jitter.light (lightness shift)
        const r = Math.min(255, Math.round(rgb[0] * jitter.light));
        const g = Math.min(255, Math.round(rgb[1] * jitter.light));
        const b = Math.min(255, Math.round(rgb[2] * jitter.light));
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // Draws a single star (filled circle with optional small glow).
    // px is the size scalar from CONSTELLATION_DATA (typically 1.4–1.7),
    // unitToPx is the per-constellation scale (px per unit-coordinate, computed in draw()).
    function drawStar(ctx, x, y, sizeUnits, unitToPx, color, alpha) {
        const r = sizeUnits * unitToPx * 0.6; // tune: dot radius is ~60% of "size" units
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TWO_PI);
        ctx.fill();
    }
```

- [ ] **Step 2: Implement per-constellation drawing function**

Continuing in `js/constellations.js`:

```js
    // Draws a single constellation at the given screen position (slotCenterPx) at
    // its current state, with the given outer alpha (already includes revealProgress).
    // unitToPx is the conversion factor from unit coords to screen pixels at current DPR/font.
    function drawConstellation(ctx, slotIdx, slotCenterPx, unitToPx, outerAlpha, now) {
        const rs = runtimeState[slotIdx];
        const cdata = CONSTELLATION_DATA[slotIdx];

        if (rs.state === STATE.HIDDEN || rs.state === STATE.DONE) return;

        const sinceAppear = (rs.appearTime >= 0) ? (now - rs.appearTime - rs.slotIdx * SLOT_INTERVAL) : 0;
        // Actually: appearTime is in formationElapsed-space, so:
        //   formationElapsed - slotStart = sinceAppear, where slotStart = slotIdx * SLOT_INTERVAL.
        // We have only `now` here (== formationElapsed). Recompute:
        const slotStart = rs.slotIdx * SLOT_INTERVAL;
        const sinceSlot = now - slotStart;

        // Anchor fade-in (ms)
        const anchorFade = clamp01(sinceSlot / (C.CONSTELLATIONS.ANCHOR_FADE_IN / 1000));
        // Filler fade-in
        const fillerFade = clamp01(sinceSlot / (C.CONSTELLATIONS.FILLER_FADE_IN / 1000));

        ctx.save();
        ctx.translate(slotCenterPx.x, slotCenterPx.y);

        // Draw each dot
        for (let di = 0; di < cdata.dots.length; di++) {
            const dot = cdata.dots[di];
            const fade = dot.isAnchor ? anchorFade : fillerFade;
            // Slight stagger for fillers (50–80ms per filler index)
            const staggerSec = dot.isAnchor ? 0 : (di * 0.06); // 60ms per filler
            const fadeStaggered = clamp01((sinceSlot - staggerSec) / (C.CONSTELLATIONS.FILLER_FADE_IN / 1000));
            const dotAlpha = (dot.isAnchor ? anchorFade : fadeStaggered) * outerAlpha;
            if (dotAlpha <= 0) continue;

            const jitter = rs.colorJitter[di];
            const col = colorString(dot.color, dotAlpha, jitter);
            drawStar(ctx, dot.x * unitToPx, dot.y * unitToPx, dot.size, unitToPx, col, dotAlpha);
        }

        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    function clamp01(x) {
        return x < 0 ? 0 : (x > 1 ? 1 : x);
    }
```

- [ ] **Step 3: Implement `draw()` to call `updateStates` and `drawConstellation`**

Replace the stub `draw()` body with:

```js
    function draw(ctx, revealProgress, formationElapsed, compressionElapsed, burstElapsed) {
        // Outer alpha multiplier per spec §5.6 — pre-burst gates rendering by revealProgress;
        // post-burst (managed elsewhere by State.isComplete) is the same multiplier.
        if (revealProgress <= 0) return;

        // Determine "now" in formation-time. main.js passes formationElapsed already.
        const now = formationElapsed;
        const isBursting = burstTriggerTime >= 0;
        updateStates(now, isBursting);

        // Letter slot positions come from main.js's cachedLetterPositions, accessed via
        // the global App namespace. main.js sets a getter when it caches; if unavailable,
        // skip drawing this frame.
        const slots = App.getCachedLetterSlots ? App.getCachedLetterSlots() : null;
        if (!slots || slots.length < 5) return;

        // Compute unit-to-px scale: each constellation occupies ~30 units (the unit-square),
        // and we want it to fit roughly one letter slot's width.
        const fontSize = App.cachedConstellationFontSize || 30; // fallback if main.js hasn't set yet
        const unitToPx = fontSize / 30;

        for (let i = 0; i < 5; i++) {
            drawConstellation(ctx, i, slots[i], unitToPx, revealProgress, now);
        }

        // Burst transition rendering — filled in Tasks 11–13
        // if (isBursting) { drawBurstTransition(ctx, slots, unitToPx, revealProgress); }
    }
```

Note: This task introduces two reads from `App` that don't exist yet — `App.getCachedLetterSlots()` and `App.cachedConstellationFontSize`. They are added in Task 10 (which extends `cacheLetterMetrics` to expose these). For now, this draw will be a no-op when those don't exist, which is fine; we'll see rendering once Task 10 wires them in.

- [ ] **Step 4: Verify the file parses and the experience still runs**

Reload the experience. No errors expected. Constellations don't yet render visually because Task 10 hasn't wired the slot getter — that's expected. We verify:
- `tests.html` still passes all tests
- `index.html` runs without console errors

- [ ] **Step 5: Commit**

```bash
git add js/constellations.js
git commit -m "feat(constellations): formation rendering of anchors and fillers"
```

---

### Task 6 — Twinkle (filler stars only)

**Files:**
- Modify: `js/constellations.js` (drawConstellation: alpha modulation for filler stars)

**Why:** Brings constellations to life. Anchor stars stay steady (the "named" star), fillers twinkle quietly. No tests beyond visual — twinkle math is too tied to wall-clock to assert deterministically.

- [ ] **Step 1: Modify the dot loop in `drawConstellation` to apply twinkle**

In `js/constellations.js`, locate the `drawConstellation` function. In the "Draw each dot" loop, modify the `dotAlpha` computation:

```js
        for (let di = 0; di < cdata.dots.length; di++) {
            const dot = cdata.dots[di];
            const staggerSec = dot.isAnchor ? 0 : (di * 0.06);
            const fadeStaggered = clamp01((sinceSlot - staggerSec) / (C.CONSTELLATIONS.FILLER_FADE_IN / 1000));
            let baseFade = dot.isAnchor ? anchorFade : fadeStaggered;

            // Twinkle: filler stars only, after they've fully faded in
            let twinkleMul = 1.0;
            if (!dot.isAnchor && baseFade >= 1.0) {
                const freq = rs.twinkleFreqs[di]; // Hz
                const phase = rs.twinklePhases[di];
                const t = now * freq * TWO_PI + phase;
                // Map sin(t) ∈ [-1, 1] to TWINKLE_ALPHA_RANGE
                const lo = C.CONSTELLATIONS.TWINKLE_ALPHA_RANGE[0];
                const hi = C.CONSTELLATIONS.TWINKLE_ALPHA_RANGE[1];
                twinkleMul = lo + (Math.sin(t) * 0.5 + 0.5) * (hi - lo);
            }

            const dotAlpha = baseFade * twinkleMul * outerAlpha;
            if (dotAlpha <= 0) continue;

            const jitter = rs.colorJitter[di];
            const col = colorString(dot.color, dotAlpha, jitter);
            drawStar(ctx, dot.x * unitToPx, dot.y * unitToPx, dot.size, unitToPx, col, dotAlpha);
        }
```

- [ ] **Step 2: Commit (visual verification deferred to Task 14 when draw is wired in)**

Twinkle won't be visually verifiable until Task 14 puts `Constellations.draw()` into the main loop. For now, commit the logic:

```bash
git add js/constellations.js
git commit -m "feat(constellations): filler-star twinkle (alpha oscillation)"
```

---

### Task 7 — Progressive line draw + Sa halo rings

**Files:**
- Modify: `js/constellations.js` (line drawing + halo rings)

**Why:** Lines are the connective tissue of the constellation; they're drawn IN over 400ms after the dots land, anchor-outward. Sa is special: no lines, but two halo rings instead.

- [ ] **Step 1: Add line and halo drawing to `drawConstellation`**

In `js/constellations.js`, modify `drawConstellation` to add line and halo rendering BEFORE the dot loop (so dots render on top of lines):

```js
        // ...existing fade-in math up to anchorFade/fillerFade...

        ctx.save();
        ctx.translate(slotCenterPx.x, slotCenterPx.y);

        // Draw halo rings (Sa only) — fade in with anchor
        for (let hi = 0; hi < cdata.halos.length; hi++) {
            const halo = cdata.halos[hi];
            const haloAlpha = anchorFade * outerAlpha * (0.25 - hi * 0.08); // outer rings dimmer
            if (haloAlpha <= 0) continue;
            ctx.strokeStyle = `rgba(255, 248, 232, ${haloAlpha})`;
            ctx.lineWidth = 0.6 * unitToPx;
            ctx.beginPath();
            ctx.arc(0, 0, halo.r * unitToPx, 0, TWO_PI);
            ctx.stroke();
        }

        // Draw connecting lines (progressive draw, anchor-outward)
        // Lines begin drawing LINE_DRAW_DELAY ms after slot start; each line tweens 0→1 over LINE_DRAW_DURATION
        if (cdata.lines.length > 0) {
            const lineStartSec = C.CONSTELLATIONS.LINE_DRAW_DELAY / 1000;
            const lineDurSec = C.CONSTELLATIONS.LINE_DRAW_DURATION / 1000;

            // Line ordering: anchor-touching lines first, then non-anchor lines (anchor-outward)
            const orderedLineIdx = orderLinesAnchorOutward(cdata);

            for (let li = 0; li < orderedLineIdx.length; li++) {
                const lineIdx = orderedLineIdx[li];
                const line = cdata.lines[lineIdx];
                // Each line in order draws 80ms after the previous one for staggered "pen-stroke" feel
                const lineStaggerSec = li * 0.08;
                const lineProgress = clamp01((sinceSlot - lineStartSec - lineStaggerSec) / lineDurSec);
                if (lineProgress <= 0) continue;
                drawLineWithProgress(
                    ctx, cdata.dots[line.from], cdata.dots[line.to],
                    unitToPx, lineProgress, outerAlpha, anchorFade
                );
            }
        }

        // ...existing dot loop after this...
```

- [ ] **Step 2: Implement the helper functions**

In `js/constellations.js`, add these helpers near the other rendering helpers:

```js
    function orderLinesAnchorOutward(cdata) {
        // Returns array of line indices: anchor-touching lines first, then others.
        const aIdx = cdata.anchorIdx;
        const touching = [];
        const other = [];
        for (let li = 0; li < cdata.lines.length; li++) {
            const l = cdata.lines[li];
            if (l.from === aIdx || l.to === aIdx) touching.push(li);
            else other.push(li);
        }
        return [...touching, ...other];
    }

    function drawLineWithProgress(ctx, fromDot, toDot, unitToPx, progress, outerAlpha, fadeBase) {
        // Tween the line from fromDot toward toDot, drawing only `progress` portion.
        // Apply easeOutQuint to make the draw feel pen-stroke-like.
        const eased = App.easeOutQuint(progress);
        const x1 = fromDot.x * unitToPx;
        const y1 = fromDot.y * unitToPx;
        const x2 = toDot.x * unitToPx;
        const y2 = toDot.y * unitToPx;
        const tx = x1 + (x2 - x1) * eased;
        const ty = y1 + (y2 - y1) * eased;

        // Color: midpoint blend of the two stars' colors, dim
        const c1 = COLOR_RGB[fromDot.color];
        const c2 = COLOR_RGB[toDot.color];
        const mr = Math.round((c1[0] + c2[0]) / 2);
        const mg = Math.round((c1[1] + c2[1]) / 2);
        const mb = Math.round((c1[2] + c2[2]) / 2);
        const alpha = 0.4 * fadeBase * outerAlpha;

        ctx.strokeStyle = `rgba(${mr},${mg},${mb},${alpha})`;
        ctx.lineWidth = 0.6 * unitToPx;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(tx, ty);
        ctx.stroke();
    }
```

- [ ] **Step 3: Commit**

```bash
git add js/constellations.js
git commit -m "feat(constellations): progressive line draw + Sa halo rings"
```

---

### Task 8 — Constellation labels (Sa · 1, Re · 2, …)

**Files:**
- Modify: `js/constellations.js` (label drawing)

**Why:** Frames each constellation as a named cosmic object; small dim monospace below each.

- [ ] **Step 1: Add label drawing to `drawConstellation`**

In `js/constellations.js`, after the dot loop in `drawConstellation`, add:

```js
        // Label: fades in 150ms after lines start drawing.
        // For Sa (no lines), labels appear on the same delay since lineStartSec is set
        // for non-Sa; we use a unified 'label start' offset.
        const labelStartSec = (C.CONSTELLATIONS.LINE_DRAW_DELAY + C.CONSTELLATIONS.LABEL_DELAY_AFTER_LINES) / 1000;
        const labelFadeSec = C.CONSTELLATIONS.LABEL_FADE_IN / 1000;
        const labelFade = clamp01((sinceSlot - labelStartSec) / labelFadeSec);

        if (labelFade > 0) {
            const labelAlpha = labelFade * outerAlpha * C.CONSTELLATIONS.LABEL_BASE_ALPHA;
            const labelSize = C.CONSTELLATIONS.LABEL_SIZE_BASE * unitToPx / 1.0; // scale with constellation
            ctx.font = `${labelSize}px ${C.CONSTELLATIONS.LABEL_FONT}`;
            ctx.fillStyle = `rgba(255, 214, 128, ${labelAlpha})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            // Letter-spacing approximation: render character by character
            const text = cdata.label;
            const ls = C.CONSTELLATIONS.LABEL_LETTER_SPACING * unitToPx / 1.0;
            // Compute total width for centering
            let totalW = 0;
            for (let i = 0; i < text.length; i++) {
                totalW += ctx.measureText(text[i]).width + (i < text.length - 1 ? ls : 0);
            }
            // Position: ~8 unit-coords below the constellation's lowest dot
            const labelY = lowestDotY(cdata) * unitToPx + 8 * unitToPx;
            let cursorX = -totalW / 2;
            for (let i = 0; i < text.length; i++) {
                ctx.fillText(text[i], cursorX + ctx.measureText(text[i]).width / 2, labelY);
                cursorX += ctx.measureText(text[i]).width + ls;
            }
        }

        ctx.restore();
        ctx.globalAlpha = 1.0;
```

- [ ] **Step 2: Add `lowestDotY` helper**

Near the other helpers:

```js
    function lowestDotY(cdata) {
        let y = -Infinity;
        for (const d of cdata.dots) if (d.y > y) y = d.y;
        return y;
    }
```

- [ ] **Step 3: Commit**

```bash
git add js/constellations.js
git commit -m "feat(constellations): per-constellation labels (Sa · 1 etc.)"
```

---

### Task 9 — Compression-phase intensification

**Files:**
- Modify: `js/constellations.js` (GLOWING-state visual treatment)

**Why:** During 7.5–13.5s, the constellations are "under pressure" — anchor stars pulse with the orb, filler stars tremble, lines glow up, labels breathe.

- [ ] **Step 1: Implement compression intensification in `drawConstellation`**

In the existing `drawConstellation` body, AFTER the existing dot rendering loop but BEFORE the label rendering, branch on `rs.state === STATE.GLOWING`:

Modify the function to compute per-state visual modifiers near the top, before drawing:

```js
        // Compression-phase modifiers (active when rs.state === GLOWING)
        const isGlowing = rs.state === STATE.GLOWING;
        const orbEnergy = (App.orbEnergy || 0); // if not exposed, falls back to 0
        const orbPulse = isGlowing ? Math.sin(now * 6) * 0.5 + 0.5 : 0; // 6 rad/s pulse during compression

        // Compression-phase line glow-up
        const compFraction = isGlowing ? clamp01((now - FORMATION_DURATION) / 6.0) : 0;
        const lineAlphaMul = 1.0 + compFraction * (C.CONSTELLATIONS.COMPRESSION_LINE_ALPHA_END / 0.4 - 1.0);
        const lineWidthMul = 1.0 + compFraction * (C.CONSTELLATIONS.COMPRESSION_LINE_WIDTH_END / 0.6 - 1.0);
```

Then in the line-drawing block, multiply `alpha` and `lineWidth` by these:

```js
        // (inside drawLineWithProgress call, modify the function or pass extra args)
        // For simplicity, modify the drawLineWithProgress signature to accept multipliers,
        // or apply ctx state modifiers before calling.
```

Simpler approach: change `drawLineWithProgress` to accept multipliers:

```js
    function drawLineWithProgress(ctx, fromDot, toDot, unitToPx, progress, outerAlpha, fadeBase, alphaMul, widthMul) {
        const eased = App.easeOutQuint(progress);
        const x1 = fromDot.x * unitToPx;
        const y1 = fromDot.y * unitToPx;
        const x2 = toDot.x * unitToPx;
        const y2 = toDot.y * unitToPx;
        const tx = x1 + (x2 - x1) * eased;
        const ty = y1 + (y2 - y1) * eased;
        const c1 = COLOR_RGB[fromDot.color];
        const c2 = COLOR_RGB[toDot.color];
        const mr = Math.round((c1[0] + c2[0]) / 2);
        const mg = Math.round((c1[1] + c2[1]) / 2);
        const mb = Math.round((c1[2] + c2[2]) / 2);
        const alpha = 0.4 * fadeBase * outerAlpha * (alphaMul || 1.0);
        ctx.strokeStyle = `rgba(${mr},${mg},${mb},${alpha})`;
        ctx.lineWidth = 0.6 * unitToPx * (widthMul || 1.0);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(tx, ty);
        ctx.stroke();
    }
```

And update the call site in `drawConstellation` to pass `lineAlphaMul` and `lineWidthMul`:

```js
            drawLineWithProgress(
                ctx, cdata.dots[line.from], cdata.dots[line.to],
                unitToPx, lineProgress, outerAlpha, anchorFade,
                lineAlphaMul, lineWidthMul
            );
```

- [ ] **Step 2: Anchor pulse + filler tremor in compression**

In the dot loop in `drawConstellation`, modify dot positioning and alpha:

```js
        for (let di = 0; di < cdata.dots.length; di++) {
            const dot = cdata.dots[di];
            const staggerSec = dot.isAnchor ? 0 : (di * 0.06);
            const fadeStaggered = clamp01((sinceSlot - staggerSec) / (C.CONSTELLATIONS.FILLER_FADE_IN / 1000));
            let baseFade = dot.isAnchor ? anchorFade : fadeStaggered;

            // Twinkle (filler stars, post fade-in)
            let twinkleMul = 1.0;
            if (!dot.isAnchor && baseFade >= 1.0) {
                const freq = rs.twinkleFreqs[di];
                const phase = rs.twinklePhases[di];
                const t = now * freq * TWO_PI + phase;
                const lo = C.CONSTELLATIONS.TWINKLE_ALPHA_RANGE[0];
                const hi = C.CONSTELLATIONS.TWINKLE_ALPHA_RANGE[1];
                twinkleMul = lo + (Math.sin(t) * 0.5 + 0.5) * (hi - lo);
            }

            // Compression: anchor pulse (~10% amplitude) on isAnchor; filler tremor (jitter offset)
            let pulseMul = 1.0;
            let drawX = dot.x * unitToPx;
            let drawY = dot.y * unitToPx;
            if (isGlowing) {
                if (dot.isAnchor) {
                    pulseMul = 1.0 + 0.10 * orbPulse; // 10% amplitude
                } else {
                    // Tremor: small per-frame jitter (±0.5px max), independent per-star
                    rs.tremorOffsets[di].dx = (Math.random() - 0.5) * unitToPx * 0.05;
                    rs.tremorOffsets[di].dy = (Math.random() - 0.5) * unitToPx * 0.05;
                    drawX += rs.tremorOffsets[di].dx;
                    drawY += rs.tremorOffsets[di].dy;
                }
            }

            const dotAlpha = baseFade * twinkleMul * pulseMul * outerAlpha;
            if (dotAlpha <= 0) continue;

            const jitter = rs.colorJitter[di];
            const col = colorString(dot.color, dotAlpha, jitter);
            drawStar(ctx, drawX, drawY, dot.size, unitToPx, col, dotAlpha);
        }
```

- [ ] **Step 3: Halo ring breath in compression**

Modify the halo rendering block:

```js
        for (let hi = 0; hi < cdata.halos.length; hi++) {
            const halo = cdata.halos[hi];
            const haloAlpha = anchorFade * outerAlpha * (0.25 - hi * 0.08);
            if (haloAlpha <= 0) continue;
            ctx.strokeStyle = `rgba(255, 248, 232, ${haloAlpha})`;
            ctx.lineWidth = 0.6 * unitToPx;
            // Compression-phase: rings expand/contract subtly with orb pulse
            const haloR = halo.r * unitToPx * (1.0 + (isGlowing ? 0.05 * orbPulse : 0));
            ctx.beginPath();
            ctx.arc(0, 0, haloR, 0, TWO_PI);
            ctx.stroke();
        }
```

- [ ] **Step 4: Label breath in compression**

In the label block, modify `labelAlpha`:

```js
        if (labelFade > 0) {
            // Compression: ±5% alpha pulse synced with orb pulse
            const labelPulseMul = isGlowing
                ? 1.0 + C.CONSTELLATIONS.LABEL_COMPRESSION_PULSE_AMP * (orbPulse - 0.5) * 2
                : 1.0;
            const labelAlpha = labelFade * outerAlpha * C.CONSTELLATIONS.LABEL_BASE_ALPHA * labelPulseMul;
            // ... rest of label drawing unchanged
        }
```

- [ ] **Step 5: Commit**

```bash
git add js/constellations.js
git commit -m "feat(constellations): compression-phase intensification"
```

---

### Task 10 — Extend `cacheLetterMetrics` with letter joints + expose slot getter

**Files:**
- Modify: `js/main.js` (cacheLetterMetrics, plus expose `App.getCachedLetterSlots` and `App.cachedConstellationFontSize`)
- Modify: `tests.html` (joint computation tests)

**Why:** The constellation module needs to know where to position itself (letter slot centers) and where to send dots at burst (letter joints). Both are computed during letter-cache build.

- [ ] **Step 1: Write failing test for joints**

In `tests.html`, add:

```js
// Test: cacheLetterMetrics computes joints (3 per letter)
App.cacheLetterMetrics(); // assumes function is exposed; otherwise call indirectly via render
const slots = App.getCachedLetterSlots ? App.getCachedLetterSlots() : null;
assert(slots !== null, 'getCachedLetterSlots returns a value');
assert(slots.length === 5, 'getCachedLetterSlots returns 5 letter positions');
for (let i = 0; i < 5; i++) {
    assert(typeof slots[i].x === 'number', `slot ${i} has x`);
    assert(Array.isArray(slots[i].joints), `slot ${i} has joints array`);
    assert(slots[i].joints.length === 3, `slot ${i} has 3 joints`);
    for (let j = 0; j < 3; j++) {
        assert(typeof slots[i].joints[j].x === 'number', `slot ${i} joint ${j} has x`);
        assert(typeof slots[i].joints[j].y === 'number', `slot ${i} joint ${j} has y`);
    }
}
```

- [ ] **Step 2: Run tests, verify they fail**

`App.getCachedLetterSlots is not defined` or similar.

- [ ] **Step 3: Modify `cacheLetterMetrics` in `main.js`**

Open `js/main.js`. Locate `cacheLetterMetrics` (around line 322–344). Replace it with:

```js
let cachedLetterPositions = null;
let cachedFontSize = 0;

function cacheLetterMetrics() {
    const W = App.W;
    const fs = App.baseFont(W, App.H);
    if (fs === cachedFontSize && cachedLetterPositions) return;
    cachedFontSize = fs;
    ctx.font = `${fs * C.FONT_HERO}px Nistha, Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const letters = App.NAME_LETTERS;
    const widths = letters.map(l => ctx.measureText(l).width);
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    const startX = W / 2 - totalWidth / 2;
    cachedLetterPositions = [];
    let xOff = 0;
    for (let i = 0; i < letters.length; i++) {
        const cx = startX + xOff + widths[i] / 2;
        const w = widths[i];
        // Joints: 3 high-curvature waypoints per letter, in screen-space relative offsets.
        // These are heuristic per-letter offsets that approximate the most-recognizable
        // "key points" of each glyph. Positions are relative to (cx, baselineY) where
        // baselineY = belowY + offsetY (the screen y at which letters render).
        // The y values here are relative to the letter's vertical center; positive y is below.
        let joints;
        switch (letters[i]) {
            case 'R':
                joints = [
                    { dx: -w * 0.30, dy: -fs * 0.45 },  // top of spine
                    { dx:  w * 0.25, dy: -fs * 0.10 },  // top-right of bowl
                    { dx:  w * 0.30, dy:  fs * 0.45 },  // base of leg
                ];
                break;
            case 'a':
                joints = [
                    { dx:  w * 0.25, dy: -fs * 0.25 },  // top of bowl
                    { dx: -w * 0.25, dy:  fs * 0.05 },  // mid-left of bowl
                    { dx:  w * 0.30, dy:  fs * 0.30 },  // bottom-right of bowl
                ];
                break;
            case 'g':
                joints = [
                    { dx:  w * 0.25, dy: -fs * 0.20 },  // top of bowl
                    { dx: -w * 0.20, dy:  fs * 0.10 },  // bottom-left of bowl
                    { dx:  w * 0.10, dy:  fs * 0.50 },  // descender end
                ];
                break;
            default:
                // Fallback: 3 evenly distributed points
                joints = [
                    { dx: -w * 0.30, dy: -fs * 0.30 },
                    { dx:  0,        dy:  0          },
                    { dx:  w * 0.30, dy:  fs * 0.30 },
                ];
        }
        cachedLetterPositions.push({ x: cx, w, joints });
        xOff += widths[i];
    }
}

// Expose slot data for the constellations module
App.getCachedLetterSlots = function() {
    if (!cachedLetterPositions) return null;
    // Constellations need {x, y, joints} where y is the constellation center y
    // (use the same belowY computation main.js's letter-render uses).
    // For now expose what's known; the y is patched in by main.js when calling Constellations.draw().
    return cachedLetterPositions;
};

// Also expose cached font size so constellations can scale to slot
App.getConstellationFontSize = function() {
    return cachedFontSize * App.Config.FONT_HERO;
};
```

- [ ] **Step 4: Constellation draw needs y position too**

In `js/constellations.js`, the `draw()` function computes screen positions but is missing `y`. Update the slot reading code in `draw()`:

```js
        const rawSlots = App.getCachedLetterSlots ? App.getCachedLetterSlots() : null;
        if (!rawSlots || rawSlots.length < 5) return;

        // Convert raw slot data {x, w, joints} to screen positions.
        // The constellation y position is one constellation-bounding-box ABOVE where the
        // letters would render. Since letters render at belowY (computed in main.js as
        // a function of canvas height), we approximate with App.H/2.
        // main.js needs to set App.constellationCenterY for accurate placement.
        const cy = App.constellationCenterY || (App.H / 2);
        const slots = rawSlots.map(s => ({ x: s.x, y: cy, joints: s.joints }));

        const fontSize = (App.getConstellationFontSize ? App.getConstellationFontSize() : 30);
        const unitToPx = fontSize / 30;

        for (let i = 0; i < 5; i++) {
            drawConstellation(ctx, i, slots[i], unitToPx, revealProgress, now);
        }
```

- [ ] **Step 5: Set `App.constellationCenterY` in `main.js`**

In `js/main.js`, in the main draw loop, BEFORE the call to `Constellations.draw(...)` (which we'll add in Task 14), compute and set the center Y. Look for the existing letter-formation block (around line 895–941). The variable `belowY + offsetY` is the y where letters render. ABOVE the letter-formation block, set:

```js
    // Center y for constellation rendering (matches letter render y so dots → letters morph aligns)
    App.constellationCenterY = belowY + offsetY;
```

(This may need recomputation if `belowY` and `offsetY` are computed inside conditional blocks; in that case, hoist the computation upward or use the letter-formation block's values.)

- [ ] **Step 6: Run tests, verify they pass**

Reload `tests.html`. The new joint tests should pass. Existing tests should still pass.

- [ ] **Step 7: Commit**

```bash
git add js/main.js tests.html
git commit -m "feat(constellations): extend cacheLetterMetrics with letter joints"
```

---

### Task 11 — Burst transition data + scatter animation

**Files:**
- Modify: `js/constellations.js` (triggerBurst, burst data, scatter render)

**Why:** When the supernova fires, the 15 constellation dots become "freed" particles that fly outward, then will reverse and converge in Task 12. This task implements the data structures and the outward-scatter phase only.

- [ ] **Step 1: Implement `triggerBurst` and burst-dot data**

In `js/constellations.js`, replace the stub `triggerBurst`:

```js
    function triggerBurst() {
        burstTriggerTime = App._scaledTime;

        // Compute current world-space positions of all 15 dots, then assign trajectories.
        // Each constellation has dots in unit space; convert to world space using slots[i] and unitToPx.
        const rawSlots = App.getCachedLetterSlots ? App.getCachedLetterSlots() : null;
        const cy = App.constellationCenterY || (App.H / 2);
        const fontSize = (App.getConstellationFontSize ? App.getConstellationFontSize() : 30);
        const unitToPx = fontSize / 30;

        burstDots.length = 0;

        for (let ci = 0; ci < 5; ci++) {
            const cdata = CONSTELLATION_DATA[ci];
            const slot = rawSlots ? rawSlots[ci] : { x: App.W / 2, y: cy };
            for (let di = 0; di < cdata.dots.length; di++) {
                const dot = cdata.dots[di];
                const startX = slot.x + dot.x * unitToPx;
                const startY = cy + dot.y * unitToPx;
                // Outward angle: away from the center of the screen
                const dxFromCenter = startX - App.W / 2;
                const dyFromCenter = startY - App.H / 2;
                const angle = Math.atan2(dyFromCenter, dxFromCenter) + (Math.random() - 0.5) * 0.5; // small random spin
                const speed = unitToPx * (3.0 + Math.random() * 2.0); // px/sec; adjustable
                burstDots.push({
                    constellationIdx: ci,
                    dotIdx: di,
                    color: dot.color,
                    size: dot.size,
                    startX,
                    startY,
                    angle,
                    speed,
                    targetSlot: -1, // assigned in Task 12 (converge phase)
                    targetJoint: -1,
                });
            }
        }

        // All constellations transition to BURST_SCATTERING
        for (let i = 0; i < runtimeState.length; i++) {
            runtimeState[i].state = STATE.BURST_SCATTERING;
        }

        App.dbg && App.dbg('CONSTELLATION: triggerBurst at t=' + burstTriggerTime.toFixed(2));
    }
```

- [ ] **Step 2: Implement scatter rendering in `draw()`**

In `draw()`, after the formation/compression rendering loop, add:

```js
        if (burstTriggerTime >= 0) {
            drawBurstTransition(ctx, rawSlots, unitToPx, revealProgress, now);
        }
```

Then add the `drawBurstTransition` helper:

```js
    function drawBurstTransition(ctx, rawSlots, unitToPx, outerAlpha, now) {
        if (rawSlots === null || rawSlots.length < 5) return;
        const tSinceBurst = now - burstTriggerTime; // seconds
        const flashOverlapSec = C.CONSTELLATIONS.BURST_FLASH_OVERLAP / 1000;
        const scatterDurSec = C.CONSTELLATIONS.BURST_SCATTER_DURATION / 1000;
        const convergeDurSec = C.CONSTELLATIONS.BURST_CONVERGE_DURATION / 1000;
        const lingerStartSec = (C.CONSTELLATIONS.BURST_FLASH_OVERLAP +
                                C.CONSTELLATIONS.BURST_SCATTER_DURATION +
                                C.CONSTELLATIONS.BURST_CONVERGE_DURATION +
                                C.CONSTELLATIONS.BURST_LETTER_DRAWIN) / 1000;
        const fadeStartSec = lingerStartSec + C.CONSTELLATIONS.BURST_DOT_LINGER / 1000;
        const totalDurSec = fadeStartSec + C.CONSTELLATIONS.BURST_DOT_FADE / 1000;

        if (tSinceBurst < flashOverlapSec) {
            // Flash window — dots remain at their original positions, but everything fades
            // alongside the existing white-out (no special render here)
            return;
        }
        if (tSinceBurst > totalDurSec) {
            // Burst transition complete; dots invisible (DONE)
            for (let i = 0; i < runtimeState.length; i++) runtimeState[i].state = STATE.DONE;
            return;
        }

        ctx.save();
        for (let i = 0; i < burstDots.length; i++) {
            const bd = burstDots[i];
            const tInTransition = tSinceBurst - flashOverlapSec; // seconds since scatter onset

            if (tInTransition < scatterDurSec) {
                // Scatter outward
                const sf = tInTransition / scatterDurSec; // 0→1
                const dist = bd.speed * scatterDurSec * App.easeOutQuint(sf);
                const x = bd.startX + Math.cos(bd.angle) * dist;
                const y = bd.startY + Math.sin(bd.angle) * dist;
                const alpha = outerAlpha * (1.0 - sf * 0.2); // slight dim as they spread
                drawBurstDot(ctx, x, y, bd, unitToPx, alpha);
            }
            // Converge (Task 12) and linger (Task 13) handled in subsequent tasks
        }
        ctx.restore();
    }

    function drawBurstDot(ctx, x, y, bd, unitToPx, alpha) {
        const r = bd.size * unitToPx * 0.6;
        const rgb = COLOR_RGB[bd.color];
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TWO_PI);
        ctx.fill();
    }
```

- [ ] **Step 3: Commit**

```bash
git add js/constellations.js
git commit -m "feat(constellations): burst trigger + outward scatter animation"
```

---

### Task 12 — Burst converge: dots fly to letter joints

**Files:**
- Modify: `js/constellations.js` (converge phase + joint assignment)

**Why:** After scatter, dots reverse and converge to letter joints. 3 dots per letter (15 / 5 = 3); assignment uses a deterministic seed so each session is consistent but page-loads vary.

- [ ] **Step 1: Add joint assignment in `triggerBurst`**

At the END of `triggerBurst()` (just before the `App.dbg` log), add:

```js
        // Assign each of the 15 dots to a letter slot (3 per letter) and a joint within
        // that slot. Use deterministic seeded shuffle keyed off _experienceStartTime.
        const seed = Math.floor(App._experienceStartTime || Date.now());
        burstSourceAssignments = assignDotsToJoints(seed);

        // Apply assignments
        for (let i = 0; i < burstDots.length; i++) {
            const a = burstSourceAssignments[i];
            burstDots[i].targetSlot = a.slot;
            burstDots[i].targetJoint = a.joint;
        }
```

- [ ] **Step 2: Implement `assignDotsToJoints`**

In `js/constellations.js`, near the helpers:

```js
    // Deterministic LCG for shuffles
    function seededRandom(seed) {
        let s = seed | 0;
        return function() {
            s = (s * 1664525 + 1013904223) | 0;
            return ((s >>> 0) / 4294967296);
        };
    }

    function assignDotsToJoints(seed) {
        // 15 dots; assign 3 to each of 5 letter slots; 3 joints per slot.
        const rand = seededRandom(seed);
        // Build a flat array of (slot, joint) pairs (15 total)
        const pairs = [];
        for (let s = 0; s < 5; s++) {
            for (let j = 0; j < 3; j++) pairs.push({ slot: s, joint: j });
        }
        // Fisher-Yates shuffle
        for (let i = pairs.length - 1; i > 0; i--) {
            const k = Math.floor(rand() * (i + 1));
            [pairs[i], pairs[k]] = [pairs[k], pairs[i]];
        }
        return pairs; // index i in burstDots maps to pairs[i]
    }
```

- [ ] **Step 3: Add converge rendering**

In `drawBurstTransition`, replace the per-dot loop with:

```js
        for (let i = 0; i < burstDots.length; i++) {
            const bd = burstDots[i];
            const tInTransition = tSinceBurst - flashOverlapSec;

            let x, y, alpha;
            if (tInTransition < scatterDurSec) {
                // Scatter outward
                const sf = tInTransition / scatterDurSec;
                const dist = bd.speed * scatterDurSec * App.easeOutQuint(sf);
                x = bd.startX + Math.cos(bd.angle) * dist;
                y = bd.startY + Math.sin(bd.angle) * dist;
                alpha = outerAlpha * (1.0 - sf * 0.2);
            } else if (tInTransition < scatterDurSec + convergeDurSec) {
                // Converge: from scatter end-position toward letter joint
                const cf = (tInTransition - scatterDurSec) / convergeDurSec;
                const easedC = App.easeOutQuint(cf);
                // Scatter end-position
                const scatterEndDist = bd.speed * scatterDurSec;
                const scatterEndX = bd.startX + Math.cos(bd.angle) * scatterEndDist;
                const scatterEndY = bd.startY + Math.sin(bd.angle) * scatterEndDist;
                // Target joint position
                const targetSlot = rawSlots[bd.targetSlot];
                const joint = targetSlot.joints[bd.targetJoint];
                const targetX = targetSlot.x + joint.dx;
                const targetY = (App.constellationCenterY || App.H / 2) + joint.dy;
                x = scatterEndX + (targetX - scatterEndX) * easedC;
                y = scatterEndY + (targetY - scatterEndY) * easedC;
                alpha = outerAlpha;
            } else {
                // Linger / fade — handled in Task 13
                continue;
            }
            drawBurstDot(ctx, x, y, bd, unitToPx, alpha);
        }
```

- [ ] **Step 4: Commit**

```bash
git add js/constellations.js
git commit -m "feat(constellations): converge phase — dots fly to letter joints"
```

---

### Task 13 — Burst linger + fade + label burst-fade

**Files:**
- Modify: `js/constellations.js` (linger/fade dot rendering, label burst handling)

**Why:** Dots linger as bright points on letter joints for 200ms, then fade over 200ms. Labels fade out 80ms during the initial flash.

- [ ] **Step 1: Add linger and fade phases**

In `drawBurstTransition`, extend the per-dot loop:

```js
            } else if (tInTransition < scatterDurSec + convergeDurSec + (C.CONSTELLATIONS.BURST_LETTER_DRAW_IN / 1000) + (C.CONSTELLATIONS.BURST_DOT_LINGER / 1000)) {
                // Linger: full alpha at letter joint
                const targetSlot = rawSlots[bd.targetSlot];
                const joint = targetSlot.joints[bd.targetJoint];
                x = targetSlot.x + joint.dx;
                y = (App.constellationCenterY || App.H / 2) + joint.dy;
                alpha = outerAlpha;
            } else if (tInTransition < totalDurSec - flashOverlapSec) {
                // Fade
                const fadeStart = scatterDurSec + convergeDurSec + (C.CONSTELLATIONS.BURST_LETTER_DRAW_IN + C.CONSTELLATIONS.BURST_DOT_LINGER) / 1000;
                const fadeProgress = (tInTransition - fadeStart) / (C.CONSTELLATIONS.BURST_DOT_FADE / 1000);
                const targetSlot = rawSlots[bd.targetSlot];
                const joint = targetSlot.joints[bd.targetJoint];
                x = targetSlot.x + joint.dx;
                y = (App.constellationCenterY || App.H / 2) + joint.dy;
                alpha = outerAlpha * (1.0 - clamp01(fadeProgress));
            } else {
                continue;
            }
            drawBurstDot(ctx, x, y, bd, unitToPx, alpha);
        }
```

Note: this requires the inner `if/else` chain to be structured correctly; rewrite the full block as one fall-through chain to maintain clarity. Adjust as appropriate.

- [ ] **Step 2: Label burst fade-out**

In `drawConstellation`, in the label rendering block, suppress label rendering once burst has triggered:

```js
        if (labelFade > 0 && rs.state !== STATE.BURST_SCATTERING && rs.state !== STATE.BURST_CONVERGING) {
            // ... existing label drawing
        } else if (rs.state === STATE.BURST_SCATTERING) {
            // Burst label fade-out: linear over LABEL_BURST_FADE_OUT ms
            const fadeOutSec = C.CONSTELLATIONS.LABEL_BURST_FADE_OUT / 1000;
            const tSinceBurst = burstTriggerTime >= 0 ? (now - burstTriggerTime) : 0;
            const labelFadeAlpha = clamp01(1 - tSinceBurst / fadeOutSec);
            if (labelFadeAlpha > 0) {
                const labelAlpha = labelFade * outerAlpha * C.CONSTELLATIONS.LABEL_BASE_ALPHA * labelFadeAlpha;
                // ... reuse the same drawing logic as the regular path
                // (consider extracting the label-drawing into a helper to dedupe)
            }
        }
```

For simplicity, refactor the label rendering into a helper `drawLabel(ctx, cdata, alpha, unitToPx, x, y)` and call it from both branches.

- [ ] **Step 3: Commit**

```bash
git add js/constellations.js
git commit -m "feat(constellations): burst linger + fade + label burst-out"
```

---

### Task 14 — Wire `Constellations.draw()` into the main draw loop

**Files:**
- Modify: `js/main.js` (add draw call at the right point in the render order)

**Why:** Constellations now exist but aren't drawn yet. This task adds the call site.

- [ ] **Step 1: Identify the insertion point in `main.js`**

Open `js/main.js`. Locate the existing letter-formation block (around line 895–941, starting with the conditional `if (revealElapsed < formationTime && letterPositions) { ... }`).

The `Constellations.draw()` call goes **immediately above** this block, but inside the `if (revealProgress > 0)` block.

- [ ] **Step 2: Compute `formationElapsed`, `compressionElapsed`, and call `Constellations.draw`**

In `js/main.js`, just before the existing letter-formation block (and after `revealProgress > 0` check), add:

```js
        // Constellation rendering — replaces the old letter formation visual.
        // formationElapsed / compressionElapsed / burstElapsed are derived from State.startTime.
        const formationElapsed_C = revealElapsed; // seconds since State.startTime
        // (No need for separate compression/burst args; module reads State internally for burst)
        App.Constellations.draw(
            ctx,
            revealProgress,
            formationElapsed_C,
            null, // not currently used; reserved
            null
        );
```

- [ ] **Step 3: Verify visually with `dev-server.py`**

Start dev-server: `python3 dev-server.py`. Open `http://localhost:8080` in browser. Tap to start. Scroll down through reveal range. You should now see:
- Constellations appearing one at a time, with anchor stars and filler stars fading in
- Lines progressively drawing
- Labels (`Sa · 1`, etc.) fading in
- Twinkle on filler stars
- During compression, anchor pulse + filler tremor + line glow-up + label breath
- Letters from old behavior also visible (this clash is fixed in Task 15)

If anything renders incorrectly, debug here before proceeding.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat(constellations): wire Constellations.draw into main draw loop"
```

---

### Task 15 — Gate letter formation rendering behind `State.photoBurst`

**Files:**
- Modify: `js/main.js` (wrap letter-render block)

**Why:** The old letter-formation visual must NOT render during 0→13.5s in the new design. This task hides the letters until the burst transition has begun rendering them.

- [ ] **Step 1: Wrap the letter-formation block**

In `js/main.js`, locate the letter-formation block (around line 895–941). Wrap the entire block — from the outer `if (revealElapsed < formationTime && letterPositions) {` to its matching `}` — with a check on `State.photoBurst`:

```js
        // Pre-burst: letters are NOT rendered; constellations occupy this visual slot.
        // Post-burst: letters render via the burst transition + post-burst paths.
        if (State.photoBurst && revealElapsed < formationTime && letterPositions) {
            // ... existing block contents unchanged ...
        }
```

Actually, the existing block has nested logic for the swarm phase, sparkle bursts, etc. — be careful that wrapping doesn't break the swarm/sparkle behavior in the post-burst path. If those are still desired post-burst, leave them ungated. Re-check the spec §5.3 — letters draw in over 200ms behind converged dots; we want this to happen.

A safer split: add `if (!State.photoBurst) return;` at the very beginning of the per-letter render section, but allow the swarm/sparkle pre-letter-arrival logic to continue (since constellations replace these visuals).

The minimal change: keep the existing block as-is, but suppress the `for (let i = 0; i < activeIndex; i++) { ... drawGlowText(...) ... }` and the active-letter materialize draw. Replace those `drawGlowText` calls with a no-op when `!State.photoBurst`.

Conservative approach — wrap each `drawGlowText` call with a check:

```js
        if (State.photoBurst) {
            drawGlowText(letters[i], lx, belowY + offsetY, textP);
        }
```

This is brittle if there are multiple draw paths. Instead, restructure the block so the entire visual rendering of letters during formation is guarded:

Find the loop:
```js
for (let i = 0; i < activeIndex; i++) {
    const lx = cx + (letterPositions[i].x - cx) * spreadX;
    drawGlowText(letters[i], lx, belowY + offsetY, textP);
}
```

Wrap it:
```js
if (State.photoBurst) {
    for (let i = 0; i < activeIndex; i++) {
        const lx = cx + (letterPositions[i].x - cx) * spreadX;
        drawGlowText(letters[i], lx, belowY + offsetY, textP);
    }
}
```

Repeat for any other letter glyph drawing in this block (the active-letter materialize phase). Inspect the file carefully to find all such draws and wrap them.

For sparkle bursts and swarm convergence — the spec says these stay (`Sparkles and particle convergence`: unchanged). So keep them outside the `State.photoBurst` guard.

- [ ] **Step 2: Verify visually**

Reload the experience. Now during 0→13.5s only constellations should be visible (no letters). Compression should still work (constellations are visible there). At burst, letters should appear via the burst-transition path.

If letters still appear pre-burst, more wrapping is needed.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(constellations): gate letter formation rendering behind State.photoBurst"
```

---

### Task 16 — Refactor chime dispatch (sync 1–5; schedule 6–8)

**Files:**
- Modify: `js/main.js` (chime dispatch block around line 885–893)
- Modify: `tests.html` (chime schedule tests)

**Why:** The current chime dispatch uses `formationTime / 8` cadence. Per spec §6, chimes 1–5 fire at constellation appearances (0, 1.5, 3.0, 4.5, 6.0s) and chimes 6–8 fire on the active schedule (STEADY: 7.5, 9.0, 10.5).

- [ ] **Step 1: Write failing test for new schedule**

In `tests.html`:

```js
// Test: chime schedule dispatch
// At each scheduled time, the corresponding chime index should fire (within tolerance)
const STEADY = App.Config.CONSTELLATIONS.CHIME_SCHEDULE_STEADY;
assert(STEADY.length === 8, 'STEADY schedule has 8 entries');
assert(STEADY[0] === 0.0 && STEADY[5] === 7.5 && STEADY[7] === 10.5, 'STEADY values match spec');

// computeChimeIndex(elapsed, schedule) should return the highest chime index whose
// scheduled time is <= elapsed (or -1 if none)
assert(App._computeChimeIndex(0.0, STEADY) === 0, 't=0 → chime 0');
assert(App._computeChimeIndex(1.4, STEADY) === 0, 't=1.4 → chime 0 (Re not yet)');
assert(App._computeChimeIndex(1.5, STEADY) === 1, 't=1.5 → chime 1');
assert(App._computeChimeIndex(6.0, STEADY) === 4, 't=6.0 → chime 4 (Pa)');
assert(App._computeChimeIndex(7.49, STEADY) === 4, 't=7.49 → still chime 4');
assert(App._computeChimeIndex(7.5, STEADY) === 5, 't=7.5 → chime 5 (Dha)');
assert(App._computeChimeIndex(10.5, STEADY) === 7, 't=10.5 → chime 7 (Sa\')');
assert(App._computeChimeIndex(15.0, STEADY) === 7, 't=15.0 → still chime 7');
```

- [ ] **Step 2: Run tests, verify fail**

`App._computeChimeIndex is not a function`.

- [ ] **Step 3: Add the helper to `main.js` and refactor dispatch**

In `js/main.js`, add this helper near other utility functions:

```js
// Returns the highest chime index whose scheduled time is <= elapsed, or -1 if none.
function computeChimeIndex(elapsed, schedule) {
    let idx = -1;
    for (let i = 0; i < schedule.length; i++) {
        if (schedule[i] <= elapsed) idx = i;
        else break;
    }
    return idx;
}
App._computeChimeIndex = computeChimeIndex; // exposed for tests
```

Now replace the existing chime-dispatch block (around line 885–893) with the new schedule-driven dispatch:

```js
        // Chime dispatch: schedule-driven per spec §6.
        // The active schedule is selected by Config.CONSTELLATIONS.CHIME_SCHEDULE_ACTIVE.
        const chimeSchedule = (function() {
            const active = C.CONSTELLATIONS.CHIME_SCHEDULE_ACTIVE;
            if (active === 'ACCEL') return C.CONSTELLATIONS.CHIME_SCHEDULE_ACCEL;
            return C.CONSTELLATIONS.CHIME_SCHEDULE_STEADY;
        })();
        if (revealElapsed >= 0) {
            const swaraIdx = computeChimeIndex(revealElapsed, chimeSchedule);
            if (swaraIdx >= 0 && swaraIdx > State.lastSwaraIndex) {
                State.lastSwaraIndex = swaraIdx;
                App.Audio.playLetterChime(swaraIdx);
            }
        }
```

- [ ] **Step 4: Run tests, verify they pass**

Reload `tests.html`. Chime schedule tests should pass. Existing tests should also still pass.

- [ ] **Step 5: Verify audibly**

In dev server, scroll into reveal. Listen: chime 1 (Sa) should sound at constellation 1's appearance (t=0); chime 5 (Pa) at constellation 5's appearance (t=6s); chimes 6, 7, 8 should fire during compression at 7.5, 9, 10.5s.

- [ ] **Step 6: Commit**

```bash
git add js/main.js tests.html
git commit -m "feat(constellations): chime dispatch synced to constellation schedule"
```

---

### Task 17 — Update `State.enter()` and `State.reset()` thresholds

**Files:**
- Modify: `js/main.js` (State conditions at line 860–865 and 396–438)
- Modify: `tests.html` (threshold tests)

**Why:** Per spec §5.6, the reveal must commit (revealProgress ≥ 0.85) before `State.enter()` fires, and reset (revealProgress < 0.70) when pre-complete. This kills the "ghost reveal" bug.

- [ ] **Step 1: Write failing tests for thresholds**

In `tests.html`:

```js
// Test: State.enter() condition uses COMMIT_THRESHOLD
// State.reset() condition uses RESET_THRESHOLD
const COMMIT = App.Config.REVEAL_COMMIT_THRESHOLD;
const RESET = App.Config.REVEAL_RESET_THRESHOLD;
assert(COMMIT === 0.85, 'COMMIT_THRESHOLD is 0.85');
assert(RESET === 0.70, 'RESET_THRESHOLD is 0.70');
assert(COMMIT > RESET, 'COMMIT > RESET (hysteresis)');

// Simulate State entry behavior — exposed via App._stateShouldEnter helper
assert(App._stateShouldEnter(0.0) === false, 'revealProgress=0 → no enter');
assert(App._stateShouldEnter(0.5) === false, 'revealProgress=0.5 → no enter (below commit)');
assert(App._stateShouldEnter(0.84) === false, 'revealProgress=0.84 → no enter');
assert(App._stateShouldEnter(0.85) === true, 'revealProgress=0.85 → enter');
assert(App._stateShouldEnter(0.95) === true, 'revealProgress=0.95 → enter');

// Simulate reset behavior — pre-complete
assert(App._stateShouldReset(0.65, false) === true, 'revealProgress=0.65 pre-complete → reset');
assert(App._stateShouldReset(0.71, false) === false, 'revealProgress=0.71 pre-complete → no reset (above reset threshold)');
assert(App._stateShouldReset(0.30, true)  === false, 'revealProgress=0.30 post-complete → no reset (sticky)');
```

- [ ] **Step 2: Run tests, verify fail**

`App._stateShouldEnter is not a function`.

- [ ] **Step 3: Add helpers + update `State` conditions in main.js**

In `js/main.js`, find the block at line 860–865:

```js
if (revealProgress <= 0) { State.reset(); }
if (revealProgress > 0) {
    if (State.startTime < 0) {
        App.dbg('MILESTONE: reveal started, phase=' + State.phaseName);
        State.enter(time, formationTime);
    }
    // ...
}
```

Replace with:

```js
if (stateShouldReset(revealProgress, State.isComplete)) { State.reset(); }
if (stateShouldEnter(revealProgress)) {
    if (State.startTime < 0) {
        App.dbg('MILESTONE: reveal started, phase=' + State.phaseName);
        State.enter(time, formationTime);
    }
    // ...
}
```

Add the helpers near other utility functions:

```js
function stateShouldEnter(revealProgress) {
    return revealProgress >= App.Config.REVEAL_COMMIT_THRESHOLD;
}

function stateShouldReset(revealProgress, isComplete) {
    if (isComplete) return false; // sticky once complete
    return revealProgress < App.Config.REVEAL_RESET_THRESHOLD;
}

App._stateShouldEnter = stateShouldEnter;
App._stateShouldReset = stateShouldReset;
```

- [ ] **Step 4: Run tests, verify they pass**

Reload `tests.html`. Threshold tests should pass.

- [ ] **Step 5: Verify behavior in dev server**

Start dev server. Scroll slowly into reveal range. Verify:
- Below 0.85 revealProgress, nothing happens (no constellations, no chimes)
- At 0.85, constellation Sa appears
- Scroll back to 0.78 (still > 0.70 reset): constellations remain (gradual fade only; state stays)
- Scroll back to 0.65: constellations reset to HIDDEN; audio chimes stop
- Scroll forward again to 0.85: formation replays from Sa

- [ ] **Step 6: Commit**

```bash
git add js/main.js tests.html
git commit -m "feat(reveal): two-threshold scroll commitment model"
```

---

### Task 18 — Add `Constellations.reset()` to `State.reset()` cleanup

**Files:**
- Modify: `js/main.js` (State object's reset method around line 425–435)

**Why:** Currently `State.reset()` clears sparkles, calls `App.DualCore.reset()`, and `App.Audio.stopRevealSounds()`. Constellations need to be added to this cleanup.

- [ ] **Step 1: Modify `State.reset()` in main.js**

In `js/main.js`, locate the `State.reset()` method (around line 425–435, inside the `State` object). It currently looks like:

```js
reset() {
    this.startTime = -1;
    if (!this.isComplete) {
        this.lastBurstIndex = -1;
        this.lastSwaraIndex = -1;
        this.photoBurst = false;
        sparkles.length = 0;
        App.DualCore.reset();
        App.Audio.stopRevealSounds();
    }
}
```

Add `App.Constellations.reset();` to the cleanup block:

```js
reset() {
    this.startTime = -1;
    if (!this.isComplete) {
        this.lastBurstIndex = -1;
        this.lastSwaraIndex = -1;
        this.photoBurst = false;
        sparkles.length = 0;
        App.DualCore.reset();
        App.Audio.stopRevealSounds();
        App.Constellations.reset();
    }
}
```

- [ ] **Step 2: Verify in dev server**

Scroll into reveal range, then back out below RESET_THRESHOLD. Constellations should disappear, and a re-entry should replay the formation from Sa.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(constellations): reset on State.reset() cleanup"
```

---

### Task 19 — Add `Constellations.triggerBurst()` to `Supernova.trigger()`

**Files:**
- Modify: `js/supernova.js` (the `trigger()` method)

**Why:** When the supernova fires, the constellation burst transition must start. This is the integration point.

- [ ] **Step 1: Add the call**

In `js/supernova.js`, locate the `trigger()` function (around line 74–100). After `App.Particles.clearAll()` (around line 81) and before the burst-particle spawn loop, add:

```js
        // Trigger the constellation dot scatter→converge animation.
        // Must fire before particle spawning so the constellation dots have priority for any
        // ordering-sensitive effects.
        App.Constellations.triggerBurst();
```

- [ ] **Step 2: Verify in dev server**

Scroll all the way through to trigger the burst. You should see:
- Flash + ring + shake (existing)
- Constellation dots scatter outward briefly
- Dots reverse, converge to letter slot positions
- Letters draw in (via the existing post-burst letter pathway, now ungated by the photoBurst flag from Task 15)
- Dots linger as bright points on letter joints, then fade

- [ ] **Step 3: Commit**

```bash
git add js/supernova.js
git commit -m "feat(constellations): trigger burst transition on supernova"
```

---

### Task 20 — End-to-end manual verification

**Files:** None (verification only)

**Why:** The implementation has many integration points; an end-to-end pass catches regressions and visual issues that unit tests won't.

- [ ] **Step 1: Pre-flight — run `tests.html`**

Open `tests.html` in browser. Verify all tests pass (existing + Tasks 3, 4, 10, 16, 17 additions). If any fail, debug before proceeding.

- [ ] **Step 2: Manual verification on desktop**

Run `python3 dev-server.py`. Open `http://localhost:8080`. Tap "awaken" on the start overlay. Then:

- [ ] **Pre-reveal** (scroll progress 0 → 0.85): No constellations visible. Strings, orb forming as today. No chimes.
- [ ] **Cross commit threshold** (revealProgress reaches 0.85): Constellation Sa appears with sparkle burst + audible Sa chime.
- [ ] **Formation phase** (~7.5s): Constellations Re, Ga, Ma, Pa appear at 1.5s intervals. Each gets sparkle + chime. Filler stars twinkle. Lines draw progressively. Labels (`Sa · 1`, `Re · 2`, etc.) fade in below each constellation.
- [ ] **Compression phase** (7.5 → 13.5s): Anchor stars pulse with orb. Filler stars tremble subtly. Lines glow brighter. Labels breathe quietly. Chimes 6, 7, 8 (Dha, Ni, Sa') fire at 7.5, 9, 10.5s respectively.
- [ ] **Burst** (13.5s): Flash + ring + shake. Constellation dots scatter outward (visible briefly). Labels fade out during flash. Dots reverse and converge to letter slot positions.
- [ ] **Burst transition completion** (~14.6–14.8s): Letters draw in behind the converged dots. Dots linger as bright points on letter joints, then fade. Photo continues fading in.
- [ ] **Settled state** (~14.8s+): Letters fully formed, font cycling begins. Photo at full alpha. Footer state machine triggers as today.

- [ ] **Step 3: Manual verification — scroll-up scenarios**

After a clean reveal (don't refresh):

- [ ] **Scroll up partial within REVEAL range** (revealProgress drops to ~0.78, still > 0.70): Visuals dim slightly. State stays. Scroll back forward → visuals restore.
- [ ] **Scroll up below RESET_THRESHOLD** (revealProgress < 0.70) **pre-complete**: Reveal aborts. Constellations to HIDDEN. Audio chimes stop. (Hard to test without timing the scroll-up to mid-formation; use browser dev tools to slow scroll if needed.)
- [ ] **Scroll up post-complete** (after seeing the photo): Letters and photo dim with revealProgress on scroll-up. State stays sticky. Scroll back down → visuals restore at full alpha; no buildup replay.

- [ ] **Step 4: Manual verification — scroll-down-not-enough scenarios**

Refresh the page. Tap "awaken." Then:

- [ ] **Slow scroll into REVEAL range, stopping at revealProgress ~0.50**: NOTHING starts. No constellations, no chimes. (This was the "ghost reveal" bug; verify it's fixed.)
- [ ] **Continue to revealProgress 0.85**: Reveal starts cleanly from Sa.

- [ ] **Step 5: Manual verification — A/B chime schedules**

In browser console, change schedule:
```js
App.Config.CONSTELLATIONS.CHIME_SCHEDULE_ACTIVE = 'ACCEL';
```
Refresh and replay the reveal. Listen for chimes 6, 7, 8 firing at 8.0, 9.5, 10.5 instead of 7.5, 9.0, 10.5. Decide which feels more coherent against the compression sound design.

- [ ] **Step 6: Manual verification — mobile**

If possible, test on a phone connected to the same LAN (`http://<LAN-IP>:8080` per dev-server output). Verify:
- Touch / scroll commitment thresholds feel right
- Mobile inertia doesn't trigger spurious resets
- Constellations render at correct DPR (no half-pixel artifacts)
- Audio plays correctly (iOS gesture lock not triggered)

- [ ] **Step 7: Identify any issues, fix, and re-test**

Common issues to look for:
- Letters appearing during formation (Task 15 not fully gated)
- Dots not arriving at correct letter joints (Task 10 joint coordinates need tuning)
- Twinkle too fast/slow (`Config.CONSTELLATIONS.TWINKLE_FREQ_RANGE`)
- Labels too bright/dim (`Config.CONSTELLATIONS.LABEL_BASE_ALPHA`)
- Burst transition too fast/slow (`BURST_*_DURATION` values)

Fix iteratively. Commit each tuning change with a descriptive message.

---

### Task 21 — Open-question playtest notes

**Files:** None (documentation only)

**Why:** Per spec §12, several values are starting points awaiting playtest validation. Capture observations from playtesting in a follow-up note for the user.

- [ ] **Step 1: Document playtest observations**

After Task 20 verification, write a short note in `docs/superpowers/plans/2026-05-16-constellation-name-reveal-playtest-notes.md` (creating it if needed):

```markdown
# Constellation Reveal — Playtest Observations

**Date:** YYYY-MM-DD
**Tester:** [name]

## §12.6 Chime schedule (STEADY vs ACCEL)
- STEADY: [observations on rhythm, coherence with compression]
- ACCEL: [observations on rhythm, coherence with compression]
- **Recommendation:** [STEADY or ACCEL]

## §12.7 Threshold tuning (COMMIT 0.85, RESET 0.70)
- Commit at 0.85: [does it feel decisive without being inaccessible?]
- Reset at 0.70: [is the hysteresis enough? mobile inertia behavior?]
- **Recommendation:** [adjusted values, or "starting values feel right"]

## §12.4 Twinkle frequency (0.3–0.7 Hz)
- [observations on twinkle pacing]
- **Recommendation:**

## §12.3 Sa halo ring count
- 2 rings: [observations on visual balance]
- **Recommendation:** [2 rings or back to 1]

## §12.5 Constellation lines during burst flash
- Currently vanish in white-out
- **Recommendation:**

## Other observations
- [anything else worth noting]
```

- [ ] **Step 2: Tune Config values based on playtest observations**

Apply any agreed-on tuning changes to `Config.CONSTELLATIONS.*` values. Commit each as a separate descriptive change:

```bash
git add js/config.js
git commit -m "tune(constellations): twinkle freq 0.3-0.7 → 0.4-0.7 per playtest"
```

- [ ] **Step 3: Final commit**

```bash
git add docs/superpowers/plans/2026-05-16-constellation-name-reveal-playtest-notes.md
git commit -m "docs: capture constellation reveal playtest observations"
```

---

## Verification

End-to-end testing protocol:

1. **Tests pass**: Open `tests.html` in browser. All assertions green.
2. **Visual on desktop**: Per Task 20 Steps 2-3 above.
3. **Visual on mobile**: Per Task 20 Step 6.
4. **A/B chime schedule**: Per Task 20 Step 5.
5. **Scroll edge cases**: Per Task 20 Steps 3-4.
6. **No console errors** during the full reveal lifecycle (refresh → tap → scroll through → past the photo).

If all of the above pass, the implementation meets the spec's acceptance criteria (§13).

---

## Plan complete

Plan saved to `docs/superpowers/plans/2026-05-16-constellation-name-reveal.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
