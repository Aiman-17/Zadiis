---
id: 0007
title: BUG-004 stock_quantity variant_stock drift report
stage: general
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: null
labels: ["bug-report", "inventory", "stock-drift", "checkout", "last-chance"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-e2e-test-suite/bugs/BUG-004-stock-quantity-drifts-from-variant-stock.md
tests:
 - none (report only, no code/data change per user's explicit choice)
---

## Prompt

what is the last chance strategy

[followed by:]

yes

[followed by, after being presented three options — file a bug report only, fix code + data now, or just hand over data-fix SQL now:]

File a bug report only

## Response snapshot

Explained Last Chance's current logic (raw `stock_quantity` between 1 and 3,
no scoring, no admin toggle) and flagged a suspected inconsistency: three
other places in the codebase (`scoring.ts::getTotalStock()`,
`ProductCard.tsx::getEffectiveStock()`, `shop/[slug]/page.tsx`'s inline
`totalStock`) already prefer the sum of `variant_stock` over raw
`stock_quantity` for variant-tracked products, while Last Chance's query
does not. User asked to verify against live data (matching this project's
established "verify before implementing" convention).

Queried live Supabase data directly and found 2 of 7 active products with a
real stock_quantity/variant_stock mismatch: "New suit best cotton quality
with printed" (stock_quantity=0, true stock=2) and "CO-ORDS 2pcs set"
(stock_quantity=7, true stock=10). Traced the mechanism: this is stale data
left over from orders placed before the BUG-003 `decrement_stock` fix
(applied 2026-07-03) — the fix corrects the RPC going forward but doesn't
repair rows corrupted under the old buggy version. Confirmed the live
consequence is not cosmetic: `orders/route.ts:59` checks raw
`stock_quantity` before ever consulting `variant_stock`, so "New suit..."
is currently rejected at checkout as sold out despite `ProductCard.tsx`
already showing it in-stock with a "Last Chance" hourglass (its own
variant-aware effective-stock computation says 2). The Last Chance
section/tab query also excludes it for the same raw-field reason.

Presented the finding and offered three paths (bug report only / fix code +
data now / SQL-only now) via AskUserQuestion. User chose bug-report-only.
Filed BUG-004 in specs/001-e2e-test-suite/bugs/ (following the existing
BUG-001/002/003 numbering and 15-field format exactly), documenting root
cause, business/technical impact, recommended fix (one-time data
reconciliation SQL + consolidating the three duplicated effective-stock
helpers into checkout validation and the Last Chance query), and regression
risk. No code or data changed, per the user's explicit choice.

## Outcome

- ✅ Impact: A real, currently-live purchase-blocking bug is now documented with root cause and exact reproduction, ready to prioritize whenever the user wants it fixed — without having made any unrequested code or data changes.
- 🧪 Tests: none — investigation and report only.
- 📁 Files: specs/001-e2e-test-suite/bugs/BUG-004-stock-quantity-drifts-from-variant-stock.md (new).
- 🔁 Next prompts: whenever prioritized — either "give me the data-fix SQL for BUG-004" or "fix BUG-004" (code consolidation + data reconciliation).
- 🧠 Reflection: this surfaced from an ordinary "explain this code" question, not a bug hunt — verifying against live data before answering (rather than trusting the code's apparent intent) is what turned a documentation question into a real, quantified finding. Matches this session's established pattern (BUG-003 was found the same way) of treating "how does X work" as worth a live-data check, not just a code read.

## Evaluation notes (flywheel)

- Failure modes observed: none in this investigation itself — it correctly distinguished "stale data from a since-fixed bug" from "an active, currently-reproducible code bug," which mattered for accurately scoping severity/fix (data reconciliation vs. ongoing logic error).
- Graders run and results (PASS/FAIL): live-data verification — PASS (2 concrete mismatched products identified and confirmed via direct Supabase query, not assumed).
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): none — awaiting user prioritization of the filed bug.
