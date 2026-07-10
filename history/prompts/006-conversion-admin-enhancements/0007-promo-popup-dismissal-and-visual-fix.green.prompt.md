---
id: 0007
title: Promo popup outside-dismiss, redesign, and transparent-background fix
stage: green
date: 2026-07-10
surface: agent
model: claude-sonnet-5
feature: 006-conversion-admin-enhancements
branch: 006-conversion-admin-enhancements
user: Aiman-17
command: none
labels: ["storefront", "promo-popup", "conversion", "playwright", "bugfix"]
links:
  spec: specs/006-conversion-admin-enhancements/spec.md
  ticket: null
  adr: null
  pr: 7
files:
 - store/src/components/store/PromoPopup.tsx
tests:
 - npx tsc --noEmit — pass
 - npm run build — pass (production build)
 - npx playwright test promo-popups --project=store — 2 passed
---

## Prompt

> "one last thing the pop card test it on customer side has a bug. card remains until the customer clicks on start shopping btn or a dismisscross sign."

> (clarification after the first read was wrong) "I did not mean it the last one line is changing of my intent , in reeality it does not stays when I click on somewhere else so people ignore without seeing. It is not grabbing people attentions not branding colors icon etc for visually attracting"

> "what about backgorund color do it is transparent>"

> "save pr and phr I am clearing the window"

## Response snapshot

Initial reading of the report was backwards — investigated it as "popup won't close except via X/CTA" (a stuck-popup bug) and could not reproduce that via Playwright across desktop click, product-card click, nav-link click, and mobile touch emulation; every one of those correctly dismissed the popup already. The user's clarification reversed the intent: the popup was dismissing *too easily* — Radix's default non-modal behavior closes on any outside pointer interaction, so a customer's very first natural action (tapping a product, scrolling, tapping nav) killed it before they'd registered it existed. Confirmed the actual behavior with isolated fresh-context Playwright scenarios (`popup-check2.mjs`, `popup-check-mobile.mjs`) before writing any fix, matching this session's established practice of reproducing before patching.

Two fixes to `PromoPopup.tsx`:
1. Added `onPointerDownOutside`/`onInteractOutside` prevention on the shared `DialogPrimitive.Content` so only the ✕ and the CTA link dismiss it — Escape left untouched for keyboard accessibility. Re-verified with the same isolated scenarios: outside clicks, product-card clicks, and nav-link clicks (desktop + mobile touch) all now leave the popup open while navigation still proceeds normally.
2. Redesigned both variants for visual presence per "not grabbing attention... branding colors icon etc": replaced the small inline icon pill with a large glowing circular icon badge (red Sparkles / green Truck), added a soft ambient brand-gold glow around the whole card (`box-shadow`, matching the visual language from today's admin chart-glow work), bigger Playfair headline, bolder CTA button with its own glow.

A follow-up question ("what about background color, is it transparent?") caught a real bug the redesign pass had missed: the shared `DialogPrimitive.Content` never had an explicit background at all — the sale variant only looked solid because it wraps its own content in a div with a full-bleed gradient background, but the free-delivery variant has no such wrapper and was genuinely transparent, letting page content show through behind the text. Fixed by adding an explicit `backgroundColor: '#FFFFFF'` at the shared wrapper level so every variant is guaranteed opaque, rather than depending on each child to self-supply one.

Verified the whole batch with a real rebuild + fresh screenshots (desktop and mobile, both variants) and confirmed `promo-popups.spec.ts` still passes unchanged (that test only ever closes via the X button, so it was never exercising outside-dismiss behavior).

## Outcome

- ✅ Impact: promo popup now stays visible until the customer deliberately closes it (fixing an actual missed-impression problem, not a cosmetic one), reads as noticeably more premium/attention-grabbing, and no longer has a genuinely transparent background on one of its two variants.
- 🧪 Tests: `tsc --noEmit` clean; `npm run build` clean; `promo-popups.spec.ts` 2/2 passed.
- 📁 Files: `store/src/components/store/PromoPopup.tsx`.
- 🔁 Next prompts: none currently planned; user is clearing the session — this PHR plus the earlier PR #7 commit are the durable record.
- 🧠 Reflection: the first version of this bug report was answered as literally stated and turned out backwards — investigating it anyway (rather than assuming and jumping straight to a fix) meant the "I couldn't reproduce this" finding was already in hand the moment the real clarification arrived, which made the actual fix fast instead of requiring a second investigation cycle.

## Evaluation notes (flywheel)

- Failure modes observed: initially planned an AskUserQuestion clarification based on a plausible-but-wrong reading of "card remains until X" as a stuck-popup complaint; the user had to explicitly say "that changed my intent" to correct course. The investigation done under the wrong hypothesis wasn't wasted (it ruled out several real candidate bugs) but the framing was inverted.
- Graders run and results (PASS/FAIL): isolated-context Playwright reproduction — PASS (confirmed both the original too-easy-dismiss behavior and the fix); visual screenshot check — PASS (2 iterations: redesign, then background fix); E2E — PASS (2/2).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): when a bug report's literal wording produces a hypothesis that can't be reproduced after real investigation, surface the "couldn't reproduce X, here's what I found instead" summary *before* reaching for a clarifying-question tool — it took a rejected AskUserQuestion call to prompt that transparency here, when leading with the negative-result summary directly would likely have gotten the same correction with one less round-trip.
