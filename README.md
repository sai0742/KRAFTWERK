# KRAFTWERK

**KRAFTWERK LAB** — a single-file, self-contained brand experience (Three.js + GSAP + Lenis).

- Deliverable: `index.html` (all HTML, CSS and JS inline; no build step, no assets).
- Open it directly (`file://`) or host it as a static page.
- CDN: Three.js r128, GSAP 3.12 + ScrollTrigger, Lenis 1.1, Google Fonts (Orbitron / Exo 2 / JetBrains Mono).

Demo notes (intentional, not production claims):
- The Probetraining form validates locally and **does not transmit** anything; no appointment is booked.
- Timetable, capacities, coaches, statistics and prices are illustrative demo content.
- Cookie consent stores only the visitor's choice; no analytics/marketing scripts are loaded.
- Legal panels are demo placeholders — operator data, privacy policy and terms require review before going live.

Debug hooks: `window.KWLAB` exposes `config`, `engine()`, `scroll`, `sound`; `?debug` logs the intro timeline duration.
