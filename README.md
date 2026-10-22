# KRAFTWERK

**KRAFTWERK LAB** — a single-file brand experience (Three.js + GSAP + Lenis).

- Site: `index.html` (all site HTML, CSS and application JS inline; no build step or audio assets).
- Imagery: `images/trainers/` holds the AI-generated concept portraits used by the coaches page and galleries. All copy, layout and interaction logic still lives in `index.html`.
- Open it directly (`file://`) or serve it: `python3 -m http.server 8000 --bind 0.0.0.0`.
- Runtime CDN dependencies: Three.js r128, GSAP 3.12 + ScrollTrigger, Lenis 1.1, Google Fonts (Orbitron / Exo 2 / JetBrains Mono). If animation libraries/WebGL are unavailable, the content, language controls and sound still work.

## Pages

The experience is split into five navigable views inside the same document — the fixed pill bar under the header switches between them, and every view is linked from the header, the footer, in-page CTAs and deep links (`#page-coaches`, `#page-facility`, `#page-programs`, `#page-visit`).

| View | Content |
| --- | --- |
| **Overview** (`home`) | Hero/intro, identity kit, manifesto, training zones, schedule, four-coach teaser, numbers, "inside the lab" gallery, membership, member voices, trial form |
| **Coaches** (`coaches`) | The full eight-person roster with portraits, remits, credentials, floor hours and languages, plus the four coaching standards |
| **Facility** (`facility`) | Zone-by-zone walkthrough, room gallery and plan diagrams, equipment sheet |
| **Programs** (`programs`) | The six-week block method, four phases, a sample training week and a CTA back to the trial form |
| **Visit** (`visit`) | Address, opening hours, contact, six-question FAQ and CTA |

The controller is `setPage()`; anchor links pointing at a section inside a hidden view switch the view first and then scroll. Scroll-linked animations are refreshed on every switch. `window.KWLAB.setPage()` / `window.KWLAB.page()` are exposed for QA.

## Language

The fixed **EN / DE** buttons switch the entire experience between English and German, including navigation, the intro, training zones, schedule/day names, coach descriptions, statistics, membership/billing, form placeholders/validation/success, cookies, legal dialogs, metadata and accessible labels. Brand names, personal names, standard abbreviations and the native language names remain unchanged.

- First visit: German for a German browser language; English otherwise.
- An explicit selection is remembered as `kw.language.v1` in local storage.
- Switching is instant, without navigation or resetting form entries, schedule filters or billing selection.
- Authored translations live in `I18N`; `CONFIG` uses stable IDs and translation keys. Add matching keys in **both** dictionaries when adding copy. The static HTML is the German no-JavaScript fallback.

## Sound

Sound is **enabled by default**. The page attempts playback on opening. If autoplay is blocked, the control truthfully shows **Sound ready / Ton bereit**, with a click/tap hint; the first mouse click, touch/pen release or keyboard activation starts it. Browser autoplay restrictions are respected, not bypassed. Explicit muting is remembered as `kw.sound.v1` and respected on subsequent visits.

The Web Audio engine synthesizes a low ambient bed, heartbeat pulse, intro impacts/whooshes, spatial bass beats on clicks/taps and softer, throttled ticks on interactive hover. Keyboard button/link activation also gets a beat; typing in text fields does not. Cursor position controls binaural **HRTF** positioning, with shared stereo convolution reverb and a filtered/compressed output. Headphones are recommended. This is **spatial stereo, not certified or encoded Dolby Atmos**.

Audio needs no files, microphone, recordings, third-party audio service or extra permissions. Transient voices are capped and disconnected after use. Muting stops the bed, effects and scheduler; hiding the page suspends audio, and returning resumes it when permitted. Skipping/replaying the intro does not disable subsequent site audio. The mute control remains reachable above the cookie banner, including its expanded mobile settings.

Language, sound and consent storage are best-effort: blocked/unavailable local storage does not break the experience. Nothing is stored for tracking.

## Demo boundaries

- The trial-session form validates locally and **does not transmit** anything; no appointment is booked and no form contents are saved.
- Timetable, capacities, coaches, statistics and prices are illustrative demo content.
- The coach portraits and room imagery are AI-generated concept images, not photographs of real people or real studios; profiles, credentials and hours are fictional (the imprint says so in both languages).
- Cookie consent stores only the visitor's choice; no analytics/marketing scripts are loaded. Saved cookie settings can be reopened from the footer.
- Legal panels are translated demo placeholders — operator data, privacy policy and terms require review before going live. They disclose local preferences, generated audio and external CDN/font requests.

## Browser tests

The npm dependencies are **development-only**; the site still requires no build or install.

```sh
npm ci
npx playwright install chromium
npm test
```

Tests serve the static site and intercept the existing CDN requests with the matching installed libraries, so no external network is needed during a run. They cover both locales, all marked copy/accessibility attributes, preserved UI state, form errors/success, legal/cookie panels, local storage failures, real audio output, autoplay rejection/retry, mute persistence, spatial interactions, bounded polyphony, background suspension, narrow mobile layouts/touch release and the real 3D intro's skip/replay behavior.

For an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when running the tests. The test server binds to `0.0.0.0`; the application uses same-page URLs and does not call a localhost backend.

Debug/integration hooks: `window.KWLAB` exposes `config`, `engine()`, `scroll`, `sound`, `page()` / `setPage(name)` and `language` (`get()`, `set('en' | 'de')`, `translate(key)`, `keys()`). `sound.inspect()` returns read-only in-memory playback/voice/level diagnostics. `?debug` logs the intro timeline duration.
