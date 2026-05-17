# Cosmic Resonance — Constellation-Driven Name Reveal

## Design Specification

**Date:** 2026-05-16
**Status:** Draft (for review)
**Scope:** Formation-phase visual, supernova burst transition, dot-to-letter morph. Frontend only — no architectural changes outside the visual reveal subsystem.

---

## 1. Summary

The name reveal currently happens during scroll: the five letters materialize one-by-one across the 7.5s formation window, then the supernova burst delivers the photo. The dramatic peak (burst) is spent on the photo alone; by the time it fires, the name is 13.5 seconds old.

This rework moves the name reveal entirely past the burst. The formation window is occupied by **five swara-numbered constellations** (Sa, Re, Ga, Ma, Pa with 1, 2, 3, 4, 5 dots respectively). The supernova burst scatters the constellation dots as starlight, which then converge into the letterforms of the name. The burst becomes the moment "the music's notation becomes the name."

Photo behavior, footer state machine, dual-core flight, particle system internals, and scroll mechanics are **unchanged**.

---

## 2. Why this change

The current name reveal is mechanically gated on scroll progress — letters appear because the user scrolled, not because something dramatic happened. The real drama is in the supernova (compression build, harmonic stack, accelerating sub, flash, ring, shake), and that drama is currently mortgaged entirely to the photo. Two reveals split the emotional weight: name first, photo second; neither is the unified moment of identity.

The new flow gives the burst a **single unified payload** — *the name and the photo arrive together*, born from the same supernova. The constellations during formation provide visual anchor and audio coupling, but withhold linguistic content until the burst.

---

## 3. Current state (background)

Today, during the reveal window:

| Window | Action |
|---|---|
| 0 → 7.5s | Letters R-A-A-G-A appear one per 1.5s. Sparkle burst (30 sparks) per letter. Particle swarm converges onto the active letter. |
| 0 → 7.5s, ÷8 | Swara chime sequence Sa-Re-Ga-Ma-Pa-Dha-Ni-Sa' fires every ≈0.94s. Polyrhythmic with letter cadence. |
| 7.5 → 13.5s | Compression: orb shrinks; vortex pulls particles in; audio noise sweep + sub pulse + 10-harmonic stack with detune and pitch bend. |
| 13.5s | **SUPERNOVA BURST** — flash, ring, shake, 450 particle explosion, dual-core launch. Audio: stopCompression → playBurst → playSingingBowl → startMelody. |
| 13.5 → 15.5s | Photo fades in over `PHOTO_FADE_DURATION` (2s). |
| 13.5s+ | Font cycling begins through the four `Config.CYCLE_FONTS` variants. |

Letters are visible from t≈0 onward. The burst is "photo reveal."

---

## 4. The new flow

### 4.1 Phase timeline (changes only)

| Window | Was | Becomes |
|---|---|---|
| 0 → 7.5s | Letters materialize | **Five swara constellations materialize** (Sa, Re, Ga, Ma, Pa). Letters do not render. |
| 7.5 → 13.5s | Compression with letters visible | Compression with constellations visible. Letters do not render. |
| 13.5s → 13.6s | Flash + ring + shake + photo fade-in begins | Same — plus **constellation dots scatter outward** as star particles. |
| 13.6s → 13.85s | (no equivalent) | Dots accelerate outward (~250ms scatter phase). |
| 13.85s → 14.2s | (no equivalent) | **Dots reverse and converge** to the five letter slot positions (~350ms). |
| 14.2s → 14.4s | (no equivalent) | **Letterforms draw in** behind the converged dots (~200ms). |
| 14.4s → 14.6s | (no equivalent) | Dots linger as bright points on letter joints (~200ms). |
| 14.6s → 14.8s | (no equivalent) | Lingering dots **fade**; clean letterforms remain (~200ms). |
| 14.8s+ | Font cycling already running | Font cycling begins from this beat. |
| 13.5 → 15.5s | Photo fades over 2s | Unchanged — photo fade overlaps the dot-to-letter morph. |

### 4.2 The five constellations

| Slot | Swara | Dot count | Geometry | Anchor (brightest) |
|---|---|---|---|---|
| 1 | Sa | 1 | central dot inside two dim halo rings — the foundation note | the dot itself |
| 2 | Re | 2 | vertical pair joined by a thin line — ascending interval | upper |
| 3 | Ga | 3 | upward triangle — the third | apex |
| 4 | Ma | 4 | square — balance, four directions | upper-left |
| 5 | Pa | 5 | pentagon — the dominant, perfect-fifth completion | top |

Each constellation occupies a bounding box approximately the size of a letter slot (~30px square at base resolution; DPR-multiplied at render). Anchor positions are deliberately offset within each box to prevent visual symmetry across the row.

### 4.3 Color palette

Three real-star colors evoke the spectral classes of actual night-sky stars:

| Role | Color | Hex | Notes |
|---|---|---|---|
| Hot blue | electric blue | `#a8d8ff` | hottest stellar class |
| Sun-like white | warm white | `#fff8e8` | medium-temperature, slight warmth |
| Cool gold | warm gold | `#ffd680` | matches the project's existing gold palette member |

**Per-constellation color distribution** (chosen for visual variety; anchor star always brightest):

| Slot | Anchor color | Filler colors |
|---|---|---|
| Sa | white (sun-like, the home note) | — (no fillers; halo rings instead) |
| Re | white | gold |
| Ga | blue (apex) | gold, gold |
| Ma | white (upper-left) | gold, blue, white |
| Pa | white (top) | blue, gold, white, blue |

Random small variation (±10% saturation, ±5% lightness) per filler star at init time keeps the row from looking machine-printed.

### 4.4 Constellation labels

Each constellation is captioned with a small monospace label combining its **swara name** and **dot count**, in the form `Sa · 1`, `Re · 2`, `Ga · 3`, `Ma · 4`, `Pa · 5` (middle-dot separator, U+00B7). The labels frame the constellations as named cosmic objects — astronomical-catalog entries — and create a brief misdirection beat ("is the name *Sa*? *Re*?") that the supernova then resolves.

| Constellation | Label |
|---|---|
| Sa | `Sa · 1` |
| Re | `Re · 2` |
| Ga | `Ga · 3` |
| Ma | `Ma · 4` |
| Pa | `Pa · 5` |

**Typography**:
- Font: `"SF Mono", "Menlo", monospace`
- Size: ~10px effective at base scale, DPR-multiplied at render time
- Letter-spacing: +1px
- Base alpha: 0.55
- Color: `rgba(255, 214, 128, 0.55)` — dim gold, the desaturated cousin of the anchor gold; reads as metadata, not as content.

**Placement**: ~8px below the constellation's lowest dot, horizontally centered on the constellation's bounding box.

**Why monospace specifically**: the post-burst name renders in elegant serif/script (Nistha, AnekKannada, Akasha — the existing `Config.CYCLE_FONTS`). Monospace is visually distinct enough that no viewer mistakes a label for the name itself; the label reads as *scientific notation*, the name reads as *typography*. The contrast is intentional.

---

## 5. Behavioral spec

### 5.1 Formation phase (0 → 7.5s)

**Constellation appearance cadence**: every 1.5s — same as the current letter cadence. `LETTER_DURATION × NAME_LETTERS.length = 7.5s` is preserved. The constellation slot index is computed identically to today's letter index from `_scaledTime - State.startTime`.

**On appearance** (per constellation):
- Anchor star fades in over ~250ms with a 30-spark sparkle burst (matching today's `letterBurst`).
- Filler stars fade in over ~400ms, slightly staggered (each filler offset by 50–80ms from anchor onset).
- Connecting lines do **not** appear with the dots; they draw in progressively (see below).
- Particle swarm convergence target: the anchor star's screen position. Reuses the current letter-target convergence logic.

**Twinkle** (filler stars only):
- Alpha oscillates between 0.5 and 0.9 at a frequency of 0.3–0.7 Hz.
- Each filler has a randomized phase offset and frequency, so they do not strobe in unison.
- Anchor star does not twinkle — it remains steady, the "named" star of the constellation.

**Progressive line draw**:
- Begins ~250ms after the constellation's anchor settles.
- Each connecting line tweens from 0% to 100% length over 400ms (eased — `easeOutQuint`).
- Lines emanate **outward from the anchor star**: first the line(s) touching the anchor; then lines connecting non-anchor stars.
- Line color: dimmed mix of the two stars' colors at the line's midpoint. Stroke width: 0.6px (DPR-scaled), alpha 0.4.

**Label appearance**:
- Each label fades in 150ms *after* its constellation's connecting lines begin drawing — the appearance order is **anchor → fillers → lines → label**.
- Fade-in duration: 200ms (linear).
- Final alpha: 0.55 (per Section 4.4).
- Sa has no connecting lines (single dot + halo rings); its label appears 250ms after the anchor settles, matching the line-draw delay the other four constellations use, so all five labels arrive on the same per-constellation rhythm.

**Sparkles and particle convergence**: unchanged from today's logic — the constellation-appearance event reuses the per-letter sparkle burst and particle-target retarget exactly.

**Swara chimes**: trigger schedule changes per §6 — chimes 1–5 (Sa–Pa) fire on constellation appearances (t = 0, 1.5, 3.0, 4.5, 6.0s); chimes 6–8 (Dha, Ni, Sa') fire during compression on either Candidate (a) or (b) per §6.1.

### 5.2 Compression phase (7.5 → 13.5s)

The five constellations remain visible. Their visual treatment intensifies:

- **Anchor stars** pulse with the orb's pulse (alpha modulated by `orbEnergy` at the orb's pulse rate). Subtle, ~10% amplitude.
- **Filler stars** tremble: each acquires a small per-frame jitter offset (±0.5px max), independent per star. The twinkle alpha oscillation continues.
- **Connecting lines** glow up: alpha tweens 0.4 → 0.9 across the compression window (linear); stroke width tweens 0.6px → 1.2px.
- **Halo rings** (Sa only): expand and contract subtly with the orb pulse.
- **Labels** breathe quietly: alpha modulated by `orbEnergy` at the orb's pulse rate, smaller amplitude than anchor stars (~5% of base alpha). They remain readable but visibly under the same gravitational tension as their constellations.

The result reads as "the constellations are under pressure, about to dissolve."

### 5.3 Burst transition (13.5s → 14.8s)

This is the new central choreography. All timings are relative to the burst trigger (t = 13.5s).

| Time (relative) | Event |
|---|---|
| t + 0ms | Supernova fires: flash, ring, shake, particle explosion (existing). All connecting lines vanish in the white-out. **Labels fade out** (alpha → 0 over 80ms), gone before dot scatter begins. |
| t + 100ms | Flash begins to subside. The 15 dots accelerate **outward from constellation positions**, each on its own trajectory away from the orb center, with random small spin. Motion-blur trails as they fly. |
| t + 350ms | Outward velocity decays to zero. Dots reverse direction. |
| t + 350–700ms | Dots **converge to letter slot positions** along curved paths (each dot is assigned a target — see §5.5 Dot-to-letter assignment). |
| t + 700–900ms | **Letterforms draw in** behind the now-arrived dots (existing letter-render logic, but draw-in animation collapses to ~200ms instead of materializing per-letter over 1.5s). All five letters draw in concurrently. |
| t + 900–1100ms | Dots linger as **bright points on letter joints** at full glow over the typography. |
| t + 1100–1300ms | Lingering dots fade. |
| t + 1300ms+ | Clean letterforms; font cycling begins from this beat. |

Photo fade-in (2s, beginning at t + 0) overlaps the second half of the morph. Photo is at ~55% opacity when letters become legible — they appear *together*, not sequentially.

### 5.4 Dot-to-letter assignment

Each of the 15 constellation dots maps to one of the 5 letter slots. Initial assignment:

- **3 dots per letter slot** (15 ÷ 5 = 3 even distribution).
- Within each letter slot, 3 dots target the letter's **visual joints**: the highest-curvature points along the letterform (e.g., for "R": top of the spine, top-right of the bowl, base of the leg).

Specific joint positions per letter are computed at letter-cache build time as part of the existing `cachedLetterPositions` infrastructure (extended with per-letter joint arrays).

Source-to-target mapping is randomized at burst-time (deterministic seed) so each viewing has a slightly different "which star goes where" detail without varying the overall choreography.

### 5.5 Post-burst

Photo fades in over 2s as today. Footer state machine triggers per its current timing. Dual-core launch fires from supernova trigger as today. Font cycling begins per existing logic. Tap-burst behavior and tap-on-name font advance are unchanged.

**Post-burst rendering simplicity:** the persistent visual elements after `markComplete` are the cycling name, photo, and footer credits — nothing more. Constellations are terminal at DONE (per §8.2) and do not re-engage under any condition (including scroll-up, which is already guarded by `State.isComplete`). Nothing flickers, nothing reappears, nothing animates beyond the existing font cycle and footer state machine. This is intentional: the experience is a one-shot artifact, and the post-reveal state is its quiet, settled tail.

**Render alpha post-burst:** the cycling name, photo, and any lingering burst-transition dots follow `revealProgress` as their alpha multiplier — they dim visually on scroll-up (matching the existing photo behavior) without unwinding state. See §5.6 for the full scroll-handling contract.

### 5.6 Scroll handling during the reveal (two-threshold commitment model)

Scroll-up and scroll-down behavior during the reveal is governed by a **two-threshold commitment model**, applied uniformly to all reveal-phase visuals (constellations, compression, burst transition, letter draw-in, photo). This addresses two failure modes in the simpler "any non-zero `revealProgress` triggers reveal" approach:

- **Scroll-down-not-enough**: user enters REVEAL range partially (e.g., `revealProgress = 0.23`) and stops. The reveal triggers and runs *invisibly* at low alpha; user later scrolls in and lands on the post-reveal state without having seen the buildup.
- **Scroll-up-mid-reveal**: user mid-reveal scrolls back partway and stops. Formation continues at low alpha, progressing through compression and burst unseen.

Both fail because state entry and render alpha share the same gate. The two-threshold model splits them.

**The two thresholds:**

- **`REVEAL_COMMIT_THRESHOLD = 0.85`** — `revealProgress` must reach this before `State.enter()` fires. Below this, the user is approaching the reveal but has not committed; nothing starts.
- **`REVEAL_RESET_THRESHOLD = 0.70`** — once REVEALING is active and `!isComplete`, dropping below this fires `State.reset()`. Constellations reset to HIDDEN, chime dispatch index resets, audio reveal sounds stop.

The 0.85/0.70 hysteresis gap prevents thrashing on scroll jitter (mobile bounce, momentum overshoot). The user must move clearly out of the commit zone (down to 0.70 or below) to abort; small backwards jitters within [0.70, 0.85] do not reset.

**Pre-COMPLETE scenarios:**

| Scroll context | What happens |
|---|---|
| Scroll into REVEAL range gently, `revealProgress` < 0.85 | Reveal does **not** start. User sees strings, orb formation, but no constellations. Scroll further to commit. |
| Cross commit threshold (`revealProgress` ≥ 0.85) | `State.enter()` fires; formation begins; constellation Sa appears with sparkle + chime. |
| Hold or scroll forward through formation / compression / burst | Reveal proceeds normally. `revealProgress` is at or near 1.0; alpha multiplier is high. |
| Scroll back, stay in [0.70, 0.85] | Reveal continues. Render alpha dims slightly to ~70–85% of inner alpha. State and timers continue. |
| Scroll back below 0.70 | `State.reset()` fires. All constellations to HIDDEN. Audio reveal sounds stop. User must scroll back across 0.85 to re-enter; formation replays from t=0. |

**Post-COMPLETE behavior** (`State.isComplete = true`):

Thresholds disengage. `State.reset()` is a no-op. Animation timers (photo fade, font cycling, footer state machine) continue independently. Render alpha on letters, photo, and any in-flight burst-transition dots continues to follow `revealProgress` — they fade visually on scroll-up but state stays sticky. Scroll-back-down restores rendering at whatever frame the timers have reached. `State.enter()` while COMPLETE rewinds `startTime` to skip the pre-photo build (existing semantics, unchanged).

**Render alpha contract:**

All reveal-phase modules multiply their final alpha by `revealProgress`. By construction, while REVEALING and pre-COMPLETE, `revealProgress ≥ 0.70` (the reset floor), so visuals are always meaningfully visible during active reveal. There is no "ghost reveal at 23% alpha" mode — the commit threshold prevents the reveal from starting, and the reset threshold prevents it from continuing, in low-visibility regions.

**Scope of this change:**

This is a change to the **whole reveal mechanic**, not just constellations. Letters (existing), photo, audio reveal sounds, and constellations all inherit the new gating. The current `State.enter()` condition (`revealProgress > 0`) and `State.reset()` condition (`revealProgress <= 0`) are both replaced with the two-threshold model. Implementation is documented in §7.3 (changes to `main.js`) and §8.1 (state machine).

---

## 6. Audio

The 8-chime swara sequence (Sa Re Ga Ma Pa Dha Ni Sa') is **partially synchronized with the constellation appearance cadence**:

- **Chimes 1–5 (Sa–Pa)** fire **at the moment each corresponding constellation appears**. Each chime's onset coincides with its constellation's anchor-star fade-in start (t = 0, 1.5, 3.0, 4.5, 6.0s).
- **Chimes 6–8 (Dha, Ni, Sa')** fire during the compression phase, since no further constellations exist to anchor them. The exact schedule for these three chimes is an open design decision (see §6.1) — both candidates are speced for direct A/B comparison.

**Why sync (rationale)**: with the constellations now labeled by swara name (`Sa · 1` ... `Pa · 5`, per §4.4), the audio "Sa" should fire when the visual "Sa" arrives. Without sync, the viewer reads one swara name while hearing a different one — a small dissonance the labels themselves create. The label change tipped the polyrhythm-vs-sync trade-off; before the labels existed the polyrhythm was defensible, with them it isn't.

**L→R panning preserved**: the existing `_playBaseNote` pan sequence (full-left at chime 1 → full-right at chime 8) uses the formula `index / (count - 1)`. Re-spacing the chimes in time changes only when each pan position fires; the L→R sequence itself is identical.

### 6.1 Chimes 6–8 schedule — two candidates

Final timing for Dha, Ni, and Sa' is deferred to implementation. Both schedules are built behind a config flag and listened to end-to-end before choosing.

**Candidate (a) — Steady cadence into compression**

| Chime | Swara | Time (s) | Note |
|---|---|---|---|
| 1 | Sa | 0.0 | constellation Sa appears |
| 2 | Re | 1.5 | constellation Re appears |
| 3 | Ga | 3.0 | constellation Ga appears |
| 4 | Ma | 4.5 | constellation Ma appears |
| 5 | Pa | 6.0 | constellation Pa appears |
| 6 | Dha | 7.5 | compression begins; no new constellation |
| 7 | Ni | 9.0 | mid-compression |
| 8 | Sa' | 10.5 | last chime, 3s before burst |

The 1.5s per-chime cadence continues unchanged from formation into compression. Last chime fires 3 seconds before the supernova burst at 13.5s — leaving the final compression window to the harmonic stack and accelerating sub pulse alone, no chimes competing.

Reading: *the music keeps ascending after the stars run out; Dha, Ni, Sa' are the missing constellations you hear but don't see.*

**Candidate (b) — Accelerating into compression**

| Chime | Swara | Time (s) | Note |
|---|---|---|---|
| 1–5 | Sa–Pa | 0.0, 1.5, 3.0, 4.5, 6.0 | as in (a) |
| 6 | Dha | 8.0 | small held breath into compression (2.0s gap) |
| 7 | Ni | 9.5 | tightening cadence (1.5s gap) |
| 8 | Sa' | 10.5 | quickened into burst-prep (1.0s gap) |

Cadence tightens from 1.5s → 1.5s → 1.0s as compression intensifies. Last chime still lands at 10.5s, but the gaps shrink — matches the sub pulse's already-accelerating rhythm and gives the chimes their own internal crescendo into the burst.

Reading: *the music tightens with the cosmos, racing toward the burst.*

**Decision deferred**: build both candidates behind a `Config.CHIME_SCHEDULE` selector; listen to each end-to-end during implementation; choose based on which schedule reads more coherent against the compression sound design (harmonic stack onset at 7.5s, sub pulse acceleration final 25%, harmonic detune sweep). The candidates differ only in the timing of three chimes; switching between them is a one-line config change.

### 6.2 Burst sequence audio

Unchanged from today: `stopCompression → playBurst (boom + crack + shimmer) → playSingingBowl → startMelody` fires on burst trigger.

---

## 7. Implementation outline

### 7.1 New module: `js/constellations.js`

IIFE following the `dualcore.js` shape, exposing `App.Constellations`:

- `init()` — pre-compute the five constellation definitions (dots, lines, colors, anchor index). Pre-bake any sprite atlases needed.
- `draw(ctx, revealProgress, formationProgress, compressionProgress, burstProgress)` — orchestrates all phase rendering. **`revealProgress` is applied as the outer alpha multiplier on every drawn primitive** (per §5.6 contract). Reads `_scaledTime` and `State` from globals; consumes `cachedLetterPositions` for slot positions.
- `triggerBurst()` — called from `Supernova.trigger()`. Initiates the dot scatter→converge animation; tracks per-dot trajectories and timing.
- `getDotPositions()` — exposed for any cross-module read (currently only debug HUD).
- `reset()` — called from `State.reset()` when reveal is rewound. Clears all per-constellation states to HIDDEN, cancels in-flight tweens (line draws, fades, twinkle phase, label fades, scatter→converge animations), resets internal chime dispatch index. Idempotent: safe to call multiple times.

### 7.2 Module load order

In `index.html`, load `constellations.js` **after** `particles.js` (it triggers sparkle bursts via the particle system) and **before** `supernova.js` (supernova will call into it on trigger). Suggested position: between `particles.js` and `supernova.js`.

### 7.3 Changes to `main.js`

- **Reveal entry/exit conditions update per §5.6**: `State.enter()` now fires at `revealProgress >= REVEAL_COMMIT_THRESHOLD` (was: `revealProgress > 0`). `State.reset()` now fires at `revealProgress < REVEAL_RESET_THRESHOLD && !isComplete` (was: `revealProgress <= 0 && !isComplete`). Both thresholds live as top-level `Config` constants.
- The existing letter-formation subroutine (which materializes letters during 0 → 7.5s based on `_scaledTime - State.startTime`) is **gated**: it does not render letter glyphs while `!State.photoBurst`.
- A new call to `Constellations.draw(ctx, revealProgress, ...)` is added to the main draw loop, in the same position the letter formation subroutine occupies today. `revealProgress` is passed in explicitly so the module can apply it as the outer alpha multiplier.
- The existing per-letter-arrival hook (sparkle burst + particle target switch + swara chime trigger) is reshaped: chimes 1–5 (Sa–Pa) fire **at constellation appearances** (the existing per-arrival hook); chimes 6–8 (Dha, Ni, Sa') fire on the new schedule per §6.1 (`Config.CONSTELLATIONS[Config.CONSTELLATIONS.CHIME_SCHEDULE_ACTIVE]`) — dispatched against `_scaledTime - State.startTime` in the same draw loop position the existing chime check occupies today.
- The `lastSwaraIndex` monotonic counter (per the post-`f348ae0` refactor) keeps its semantics: incremented as each scheduled chime time elapses, dispatching the next chime's panning index.
- After `State.photoBurst` flips true, the letter rendering pathway re-engages — but is now driven by the burst transition state rather than per-letter timing.

### 7.4 Changes to `audio.js`

**None required.** The chime synthesis (`_playBaseNote` and the Sa–Sa' just-intonation generation) is unchanged. Only the *dispatch timing* changes, and dispatch lives in `main.js` per §7.3. The L→R pan formula `index / (count - 1)` continues to fire correctly with the re-spaced chime times.

### 7.5 Changes to `supernova.js`

- `trigger()` adds one call to `App.Constellations.triggerBurst()` after the existing flash/ring/shake setup.
- No changes to compression curve, vortex, ripple, or any other supernova internals.

### 7.6 New `Config` constants

**Top-level `Config` additions** (the scroll thresholds apply to the overall reveal mechanic, not just constellations — placement matches the existing `Config.REVEAL` neighborhood):

```js
REVEAL_COMMIT_THRESHOLD: 0.85,   // §5.6 — revealProgress must reach this for State.enter()
REVEAL_RESET_THRESHOLD: 0.70,    // §5.6 — pre-complete: drop below to trigger State.reset()
```

**`Config.CONSTELLATIONS` namespace** (centralization per project convention — "Read this file for any numeric constant"):

```js
CONSTELLATIONS: {
  TWINKLE_FREQ_RANGE: [0.3, 0.7],   // Hz
  TWINKLE_ALPHA_RANGE: [0.5, 0.9],
  LINE_DRAW_DURATION: 400,           // ms, progressive line tween
  LINE_DRAW_DELAY: 250,              // ms after anchor settles
  ANCHOR_FADE_IN: 250,               // ms
  FILLER_FADE_IN: 400,               // ms
  COMPRESSION_LINE_ALPHA_END: 0.9,
  COMPRESSION_LINE_WIDTH_END: 1.2,
  // Labels (constellation captions: "Sa · 1" etc.)
  LABEL_DELAY_AFTER_LINES: 150,      // ms — labels begin fading in this long after lines start drawing
  LABEL_FADE_IN: 200,                // ms — label fade-in duration
  LABEL_BASE_ALPHA: 0.55,
  LABEL_FONT: '"SF Mono", "Menlo", monospace',
  LABEL_SIZE_BASE: 10,               // px at DPR=1
  LABEL_LETTER_SPACING: 1,           // px
  LABEL_COMPRESSION_PULSE_AMP: 0.05, // ±5% of base alpha during compression
  LABEL_BURST_FADE_OUT: 80,          // ms — labels fade out during initial burst flash
  // Audio chime schedule (seconds from formation start)
  // Two candidates per §6.1 — switch with CHIME_SCHEDULE_ACTIVE
  CHIME_SCHEDULE_STEADY: [0, 1.5, 3.0, 4.5, 6.0, 7.5, 9.0, 10.5],   // candidate (a)
  CHIME_SCHEDULE_ACCEL:  [0, 1.5, 3.0, 4.5, 6.0, 8.0, 9.5, 10.5],   // candidate (b)
  CHIME_SCHEDULE_ACTIVE: 'STEADY',                                  // 'STEADY' | 'ACCEL' — A/B during impl
  // Burst transition (durations of each phase, in ms)
  BURST_FLASH_OVERLAP: 100,          // initial flash before dots become visible
  BURST_SCATTER_DURATION: 250,       // dots flying outward
  BURST_CONVERGE_DURATION: 350,      // dots flying back to letter slots
  BURST_LETTER_DRAW_IN: 200,          // letters drawing in behind dots
  BURST_DOT_LINGER: 200,             // bright dots held on letter joints
  BURST_DOT_FADE: 200,               // bright dots fading out
  // Total transition: 100 + 250 + 350 + 200 + 200 + 200 = 1300ms
}
```

---

## 8. State machine impact

### 8.1 Reveal phase machine

Same machine (`IDLE → REVEALING → COMPLETE`), but **entry and exit conditions update per §5.6**:

- `State.enter()` fires when `revealProgress >= Config.REVEAL_COMMIT_THRESHOLD` (was: `revealProgress > 0`).
- `State.reset()` fires when `revealProgress < Config.REVEAL_RESET_THRESHOLD && !isComplete` (was: `revealProgress <= 0 && !isComplete`).
- `State.reset()` while `isComplete` remains a no-op (existing semantics, unchanged).

Internal sub-progress (`lastBurstIndex`, `lastSwaraIndex`) drives constellation appearance instead of letter appearance — same indices, different visual effect.

### 8.2 New constellation render states (within `Constellations` module)

Per-constellation:

```
HIDDEN
  ↓ slotIndex ≤ currentConstellationIndex
APPEARING (anchor + fillers fading in, ~400ms)
  ↓ all stars settled
SETTLED (twinkle active, lines drawing in)
  ↓ lines fully drawn
GLOWING (compression-phase intensification)
  ↓ Supernova.trigger() called
BURST_SCATTERING (dots flying outward, ~350ms)
  ↓
BURST_CONVERGING (dots flying to letter slots, ~350ms)
  ↓
BURST_LINGERING (dots bright on letter joints, ~200ms)
  ↓
DISSOLVING (dots fading out, ~200ms)
  ↓
DONE (no longer drawn)
```

The `State.reset()` path (when reveal rewinds while not yet complete) returns all constellations to HIDDEN.

---

## 9. Performance

- 15 dots + ~14 connecting lines + 5 anchor halos. Simple primitives (circle, line). Negligible cost vs the existing particle workload.
- Twinkle and tremor: per-frame alpha and position perturbation on 14 stars (excluding anchors). ~14 sin() calls per frame. Negligible.
- Burst transition: 15 dots animated for ~1.3s. Trivial.
- No new pre-baked sprite sheets required — dots are small filled circles; halo rings use radial gradients similar to the orb.

The `clear, rays+str, particles, orb, dualcore, reveal` profile sections gain a small new "constellations" section. Expected per-section cost: well under 1ms on target devices.

---

## 10. Risks and mitigations

### 10.1 First-time vs rewatched experience

**Not a meaningful risk for this experience.** This is a one-shot artifact intended for a small audience watching once or a few times across a small set of people; it is not a SaaS product where users return daily. We are not engineering for high-frequency repeat viewing. The post-reveal state is intentionally minimal (per §5.5) and the experience plays once, ends settled, and is over. If a viewer comes back, they re-watch the same arc and end at the same settled state — no looping, no replay button, no easter eggs to discover. Treating "rewatch fatigue" as a design constraint here would be over-engineering against a problem that barely exists.

### 10.2 Mobile engagement during the longer no-name window

**Risk**: 13.5 seconds without the name visible may push impatient users to scroll back or away.

**Mitigation**: The constellations *are* the visual content — they appear, twinkle, draw lines, glow up under compression. Each new constellation arrival is its own small event (sparkle + chime). The visual density during 0 → 13.5s is *higher* than today's letter-only formation, not lower.

### 10.3 Burst transition crowd-out

**Risk**: At burst, three things compete for attention — flash + photo fade-in + dot-to-letter morph. Cognitive overload.

**Mitigation**: Strict timing stagger:
- Flash dominates 0 → 100ms (white-out).
- Dots scatter visible 100 → 350ms (when flash is fading).
- Photo fade is at 0–25% opacity during dot scatter (not yet legible).
- Letter draw-in occurs at 700 → 900ms when photo is at ~50% (visible but not dominant).
- Photo and letters reach full clarity together at ~1.4s.

This keeps each beat as the focal point during its own window.

### 10.4 Dot-to-letter morph believability

**Risk**: Dots flying around and forming letters can read as cheesy if the choreography isn't right.

**Mitigation**: The "explosion → reverse → settle on joints" pattern echoes the supernova-creates-matter metaphor. Dots arriving on letter joints (not dissolving away) keeps the visual continuity from constellations to letters concrete. Specific timings are tunable; A/B during implementation. If the morph reads poorly, fallback is a clean cross-fade (constellations fade out, letters fade in over ~600ms) — not as dramatic but still works.

### 10.5 Color rendering across devices

**Risk**: The chosen blue (`#a8d8ff`) and white (`#fff8e8`) may shift on different displays; gold is well-saturated and safe.

**Mitigation**: Colors are paint-controlled (canvas fill style), not emoji or font-dependent. Tested on iOS (P3) and sRGB displays at implementation time.

### 10.6 Chimes 6–8 firing without a visual anchor

**Risk**: With chimes 1–5 now bound to constellation appearances, chimes 6–8 (Dha, Ni, Sa') fire during compression with no new visual to anchor them. Viewer hears the music ascending past Pa but sees nothing new — could read as audio-visual disconnect.

**Mitigation**: This is intentional and narratively load-bearing. The reading is *the music keeps ascending after the visible stars run out*, which earns the compression phase audibly. The compression's existing audio (harmonic stack onset at 7.5s, accelerating sub pulse, harmonic detune sweep) gives the chimes sonic context to ride. Both schedules in §6.1 are designed around this — neither tries to "fill" the visual gap, both let the chimes stand alone.

---

## 11. Out of scope (this design)

- **Footer state machine** — emanation timing, "Made with ❣️" copy, persistent glow gradient.
- **Dual-core flight and settle** — orbit, bezier flight, candle flames on `i` dots.
- **Supernova internals** — flash, ring, shake, vortex, particle explosion, screen shake.
- **Particle system** — pool, sprite sheet, swept collision, evict-weakest.
- **Scroll mechanics, start overlay, audio init sequencing.**
- **Tap interactions** — pre-reveal taps, post-reveal tap-burst, tap-on-name font advance.
- **Photo fade-in duration and behavior.**

If any of those need adjustment to integrate cleanly with this design, that's a separate change; the spec assumes their current behavior holds.

---

## 12. Open questions for refinement during implementation

These are details intentionally deferred to the implementation phase, not blockers for the design:

1. **Per-letter dot joint positions** — the specific (x, y) targets for each of the 3 dots arriving at each letter. Computed at letter-cache build; tunable for visual harmony.
2. **Random seed for dot-to-target assignment** — deterministic per session or per page-load? Affects rewatch consistency.
3. **Halo ring count for Sa** — two rings proposed; a single ring may read cleaner. Implementation will A/B.
4. **Twinkle frequency randomization range** — 0.3–0.7 Hz is a starting point; may tune to 0.4–0.6 if 0.3 feels too slow.
5. **Whether constellation lines also flash white during the burst-flash white-out** — proposed yes (consistent), but might want them to "burn out" 50ms before flash for a beat of anticipation.
6. **Chimes 6–8 schedule (§6.1)** — choose between Candidate (a) steady cadence and Candidate (b) accelerating cadence after listening to both end-to-end. Decision driven by which feels more coherent against the compression's harmonic stack and accelerating sub pulse.
7. **Scroll-handling thresholds (§5.6)** — `REVEAL_COMMIT_THRESHOLD = 0.85` and `REVEAL_RESET_THRESHOLD = 0.70` are starting values. Final values determined by playtesting on desktop and mobile (mobile inertia / momentum scroll especially), with attention to: (i) does crossing the commit threshold feel decisive without being inaccessible? (ii) does the reset feel forgiving of jitter without being too sticky?

---

## 13. Acceptance criteria

A successful implementation will:

1. Render no letterforms during 0 → 13.5s; render the five swara constellations instead.
2. Trigger the existing sparkle burst, particle target retarget, and swara chime at each constellation appearance, with chimes 1–5 synchronized to constellation appearances and chimes 6–8 firing on the active schedule per §6.1. Render a dim monospace label (`Sa · 1` ... `Pa · 5`) below each constellation per §4.4, fading them out at the supernova flash.
3. At supernova trigger, scatter the 15 dots and converge them to letter slot positions over the documented timeline.
4. Show letterforms fully drawn and font-cycling beginning by ≈14.8s of formation time (1.3s after burst trigger). Photo fade-in continues until 15.5s as today; letters and photo are both legible from ≈14.4s onward.
5. Continue to support `State.reset()` rewinding the constellation sub-state correctly when reveal is undone before completion.
6. Pass the existing test harness (`tests.html`) — new tests added for constellation phase transitions and dot-to-letter assignment determinism.
7. Honor the scroll commitment thresholds per §5.6: reveal must not start while `revealProgress < REVEAL_COMMIT_THRESHOLD`; pre-`markComplete` reveal must reset (constellations to HIDDEN, audio reveal sounds stopped, chime index reset) when `revealProgress < REVEAL_RESET_THRESHOLD`. Post-`markComplete`, scroll-up dims rendering but does not unwind state.

---

*End of design specification.*
