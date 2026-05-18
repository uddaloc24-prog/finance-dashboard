# Retirement Planner — Task List

Last refreshed: 2026-05-18. Working tree clean, last commit `144dc37` (phase 7 of the v10 port).

## Current Sprint

*(empty — pick the next feature from the backlog below, or define a new one)*

## Backlog — candidates for next sprint

### A. ~~Adaptive psychometric assessment~~ — DONE 2026-05-18
Full v10 Adaptive Psychometric port shipped across 7 phases (commits `422afb2` → `144dc37`):
- Phase 1 `422afb2` — Foundation (types, 74-item bank, composites)
- Phase 2 `6a8b333` — Static 74-Q UI
- Phase 3 `5974e45` — Goal Discovery preflight (5 blocks · block-3 deferred)
- Phase 4 `1416d05` — Persona + 12-signal inference
- Phase 5 `24094c8` — Adaptive layer (reorder / prefill / rephrase / bridge)
- Phase 6 `d458faf` — Results dashboard (gauges + breakdowns)
- Phase 7 `144dc37` — Wire-up: real capacity inputs, schema migration, cross-tab visibility

Deferred sub-items (small, low-priority):
- Block-3 per-goal interrogation (goal-type-specific probe catalog)
- Audio uploads on Goal Discovery (Groq transcription dependency)
- Goal-library catalog for block-1 in GD form
- Surfacing the persona / signals / bridge sentence in a non-quiz UI (e.g., a "Profile insights" tab)

### B. Module A integration (HIGH — designed but not implemented)
Local docs `MODULE_A_INTEGRATION.md` and `MODULE_A_PROMPT_REFERENCE.md` (May 16) describe a Module A integration not yet in the codebase. Read those docs, then implement.

### C. Mobile-responsive pass
`finance-mobile` and `finance-mobile-prototype` repos exist separately. Decide: fold mobile work into this repo via responsive Tailwind, or keep mobile as a separate codebase. If folding in: audit every tab on `sm:` / `md:` breakpoints, fix the 2-col Plan grid for narrow viewports, make TabNav scroll-snap on mobile.

### D. V2 chat-first shell — promote or retire
V2 (`Shell`, `Interview`, `useInterview`) has been flag-gated since `49325c6`. Either invest in finishing it (V2 ↔ V1 data parity, then ship behind a toggle) or remove the dead code to reduce maintenance surface.

### E. Update CLAUDE.md / tasks/todo.md cadence
The files just refreshed today (2026-05-17) drifted ~6 weeks behind reality. Set a rule: update both whenever a feature lands. Or auto-derive them — but they're hand-written for a reason.

### F. Smaller polish items
- [ ] Tax tab — verify new-regime FY25-26 slabs are current (Budget 2026 may have changed thresholds)
- [ ] Insurance section — MWP Act flag tooltip currently terse; expand
- [ ] PDF export — verify TOC + borders work on the latest plan structure after the May 7 restructure
- [ ] Monte Carlo — surface confidence intervals more clearly in `MonteCarloPanel`
- [ ] AI tab — graceful UI when no Groq key is set (currently silent)

## Open questions for the user

- Mobile strategy: merge `finance-mobile*` back in, or keep separate?
- V2 chat-first: promote to feature, or retire and delete?
- Is the deployed `finance-prototype-roan` still useful as a sandbox, or should it be archived?

## Completed (recent highlights)

- 2026-05-07 — Prototype features merged into production (the big restructure: Welcome + 7-section Plan + Profile redesign + smart insights).
- 2026-05-?? — Profile tab side-by-side Risk Profile + Risk Assessment.
- 2026-05-?? — Plan tab numbered, bordered, drop-down sections in 2-col grid.
- 2026-05-?? — Guide tab with Purpose column + plan-file upload.
- 2026-05-?? — Insights tab + welcome download + consulting-firm PDF styling.
- 2026-05-?? — Explorer tab + 3x3 thick-border welcome + multi-format export.
- 2026-04-?? → 2026-05-?? — 4-bucket cascade (HDFC model), cascade explainer, V2 chat-first interview behind flag, strategies/profiles/tax/summary panels, guided onboarding, multi-frequency schedules, identity capture, downloadable plan PDF, 34 asset classes, Overview tab.

*See `git log --oneline` for the authoritative history.*
