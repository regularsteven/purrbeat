# Perbeat / Per — Camera-Driven HUD UI Mockup Brief

## 1) What you're designing

A full-screen, camera-first audio instrument UI that feels like a futuristic HUD (Matrix / Minority Report / game UI / AR overlay).

- The live camera feed is always visible behind the UI (user sees body/hands/face).
- UI elements float on top of the feed with translucency, blur, gradient fades, glow accents, and smooth motion.
- The interface is designed for gesture control first (hands in camera), but must also be readable and usable on desktop/mobile.

**Deliverable:** high-fidelity mockups (mobile first), plus variants showing desktop/TV scaling.

---

## 2) Core layout: Banks on top, Controls on bottom

The experience has two tiers.

### A) Top Tier = Banks (primary sections)

Banks are the current instrument mode.

Initial bank set for mockups:

- Per (hum / drones / tonal backdrop)
- Percussion
- General

Design goals:

- Active bank is unmistakable.
- Inactive banks stay visible but de-emphasized.
- Styling feels HUD-like: minimal and stylized, not standard web navigation.

Suggested behavior:

- Active bank: stronger glow, brighter text, thicker outline, optional subtle scan/shine animation.
- Inactive banks: dimmer, slightly smaller, lower contrast.

### B) Bottom Tier = Controls (within a bank)

Inside the selected bank (start with **Per**) is a radial/looping carousel of controls.

- Bottom UI acts as the instrument panel.
- Focused control is dominant.
- Surrounding controls progressively fall off in size/contrast.

Required hierarchy with 5 visible controls:

- Focus item: scale 1.0 (or 1.1–1.2)
- Adjacent left/right: scale ~0.8
- Far left/far right: scale ~0.5

The carousel should feel like a selection wheel where focus locks to center as users nudge left/right.

---

## 3) Content: controls in the Per bank

Use 5 controls for mockups (placeholder naming is fine, but should feel realistic):

1. Hum Type (Warm / Airy / Metallic / Sub)
2. Tone / Pitch
3. Intensity / Gain
4. Movement / Modulation
5. Texture / Noise

Each control should support:

- Primary label
- Secondary value/mode readout

Examples:

- **Tone** → `A2` or `112 Hz`
- **Intensity** → `68%`
- **Modulation** → `Slow ↑` / `Fast ↑` / `Pulse`

Do not overdesign internal widgets yet. Priority is focus hierarchy and legibility.

---

## 4) Interaction language: gesture intent

The UI needs to express **simple action** vs **intentful action**.

Examples:

- Index finger up = increase (general/step)
- Index finger up + upward hand movement = increase with intensity
- Slow movement = gentle change
- Fast movement = aggressive change

Design implication:

- System should appear to read both gesture type and motion speed.
- Value changes should communicate energy level.

Visual response ideas:

- Slow change: subtle pulse/glow
- Fast change: stronger burst/glow/trail
- Optional velocity indicator: thin bar, arc, or streak

No need to design gesture detection itself; only communicate that UI is built for it.

---

## 5) Visual style: HUD / AR overlay rules

Must not look like a normal web app.

Keywords:

- HUD / AR overlay
- Controlled neon/glow accents
- Soft blur glass panels
- Gradient fades to dark for readability
- Thin outlines, subtle grid hints, optional scanline hints

Camera feed treatment:

- Live feed remains visible.
- Readability comes from frosted blur and dark gradient scrims at top/bottom.
- Avoid hard black rectangles; use fades.

Focus state:

- Brighter outline/glow
- Higher contrast text
- Slight scale bump
- Animated transitions with glow ramping

Non-focus state:

- Smaller and dimmer
- Less detail
- Still readable

---

## 6) Layout behavior: mobile-first + desktop/TV scaling

Target platforms:

- Mobile (portrait + landscape)
- Desktop/laptop
- TV-like large displays

Mobile-first assumptions:

- UI uses minimal vertical space.
- Controls stay readable at arm's length.
- Bottom carousel remains large and clear; focused control is unmistakable.

Desktop/TV adaptation:

- Same logic with more breathing room
- Larger focus control
- Increased bank spacing
- Optional concept: 7 controls visible instead of 5

---

## 7) Required mockup deliverables

1. **Mobile primary frame:**
   - Full-screen camera view
   - Top banks strip
   - Bottom Per-control carousel
   - One focused control with value
   - Blur/gradient scrims and glow focus treatment
2. **Mobile focus-change frame:**
   - Focus moved one step
   - Demonstrates scaling/transition intent
3. **Desktop/TV variant:**
   - Same UI scaled up
   - More space and larger focus element
   - Avoid cramped composition

Optional but useful:

- Style tile (fonts, glow intensity, panel material, icon style)

---

## 8) Constraints / don'ts

- Do not design as a dense knob-heavy music app.
- Do not rely on tiny text or complex sliders.
- Do not use solid black bars; use fades/blur overlays.
- Do not make it resemble website header/footer layout.

---

## 9) Implementation reality notes

Likely implementation stack:

- HTML/CSS overlays above a full-screen `<video>` camera element
- CSS transitions for glow/scale/fade
- Radial or pseudo-radial carousel driven by gesture state

Design for buildability with consistent, reusable components.

---

## 10) Amendment: Gesture Control System (Banks vs Controls)

### Gesture architecture overview

The gesture model mirrors the two-tier UI hierarchy:

- Top Tier → Banks
- Bottom Tier → Controls

Rule:

- **Two hands** = high-level control (banks)
- **One hand** = local control (controls within bank)

This separation should feel obvious and deliberate.

### Bank switching (top tier)

Gesture:

- Two open hands visible
- Swipe left/right

Result:

- Switch active bank (Per / Percussion / General)

Design requirements:

- When two hands are detected, top bank strip subtly reacts.
- UI acknowledges dual-hand mode.
- Active bank transitions with smooth emphasis handoff.

Visual feedback ideas:

- Activation glow along top strip
- Thin horizontal tracking line tied to swipe
- Subtle grid/scan highlight behind bank row

Intended feel: **manipulating system mode**, not flipping tabs.

### Control focus switching (bottom tier)

Gesture:

- One open hand visible
- Swipe left/right

Result:

- Move focus across controls in active bank

Example path in Per:

- Hum Type → Tone → Intensity → Modulation → Texture

Focused control behavior:

- Enlarges
- Brightens
- Gains stronger glow
- Shows value readout

Adjacent controls:

- Scale down
- Reduced contrast
- Hide detailed values

Design requirements:

- One-hand detection subtly activates bottom carousel area.
- Focused control locks into center.
- Motion feels smooth and weighted (not twitchy).

Intended feel: **selecting a parameter**, not scrolling a menu.

### Clear visual mode separation

Users should immediately distinguish gesture mode:

| Gesture Mode | Visual Reinforcement |
| --- | --- |
| Two hands | Top banks feel active |
| One hand | Bottom controls feel active |

Possible techniques:

- Subtle color temperature shifts
- Glow emphasis shifts between top and bottom regions
- Minimal hand-count indicator (polished, non-debug)

### Gesture hierarchy principles

The UI should communicate:

- Two hands = larger structural change
- One hand = fine-grained selection

Bank changes must feel heavier/more global than control focus changes.

### Additional constraints

- No cluttered gesture hints
- No cartoon hand icons
- No tutorial overlays in primary state
- Preserve cinematic HUD aesthetic

**Note:** Existing start/stop controls, index-finger pointing gestures, and motion-combination gestures for increasing/decreasing active control values must continue to work.
