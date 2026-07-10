---
id: 0002
title: Narrow US1/US2 scope via clarification session
stage: spec
date: 2026-07-08
surface: agent
model: claude-sonnet-5
feature: 004-post-launch-roadmap
branch: 004-post-launch-roadmap
user: Aiman-17
command: plan-mode clarification (no slash command)
labels: ["roadmap", "notifications", "analytics", "yoy", "scope-narrowing", "clarification"]
links:
  spec: specs/004-post-launch-roadmap/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/004-post-launch-roadmap/spec.md
tests:
 - spec quality checklist (checklists/requirements.md): no updates required, still fully passing per its own notes
---

## Prompt

> US1 P1:For now I dont have courier tracking so for now no automation of new deliver status auto change.
> For new orders notification we already have a order page we cen track from their and a KPI on dashboard other status need to maually manages except deliver.
> For deliver need courier tracking number to auto change status and email fire on customer inbox behalf of that, for admin automation only need pie data flow and status changes.
> So we need in notifications only payment recieve cancel return exchange requests(only important notifications, so no need to check inbox every time) except deliver and new order (since we already have order implementation in seperate and for deliver we can do when we have a courier merchant account)
> US2 P2: we need this trend but activate when 1 year complete so we have a data of years(if you create only years revenue trend we cant create a time filter of yearly data because they can apply all analytics tab) What can we do.
>
> For other new implementations I wanted:
> 1. Swipe images on productdetail page(dont need to click every different images, customer can easily swipe with hand gesture and arrows.
> 2.color matching images(add a input in admin upload image with color so the systemn can match that image with color when user click on that color automatically chnage with that color image).
> 3.Enable and disable free delivery option manually by admin settings, so if business goes down I will not offer free delivey flow on 5 orders.
> 4. Popup cards on all pages(check did we have a landing page from ads)for over 5+ orders free delivery and sale with that title full vsiual attractive and premium colors so customers will eagers attention and interest.(tell color strategy both sale and free delivery cards will be different) Salecard has a same title name I add.
> 5.feature section all admin and user ste test. add table in inventory section, also add graphs and charts of performance tab of new arrival and feature sales.(first tell me what we have and what we nothave

> for yoy I choose option 1 but now we donthave a history so it can only activate when 1 year complete, one question raise. If you add a revenue terend in existing trend we need time filter and time filters working across all sections. If you build seperate trend this will reserved all page space?

Follow-up clarifications answered via AskUserQuestion (verbatim answers):
- YoY placement: "in performance we need yoy sales trend and in revenue tab we need revenue yoy since searh on web what are best practices always amke sure visuals and colors and charts graph with tables and pie"
- Color images: "1 the exixting flow remains unchange only when customer clicks a color on product page that matching image filters on screen. Tell me in detail what would you understand" → then confirmed: "Correct — image comes to front, rest of gallery stays browsable"
- Item 5 inventory table: "Something else" → then: "Analytics > Inventory tab — row-level product table"
- Popup scope: "1 but also on productdetail page(beacuse if customer lands from ads on first time they dont know whats going on, they directly land form ads on selected products on productdetail page)"

> we can work with ssd workflow

> I want a vsuals with every analytics section of graph charts remain existing flow data unchanged

> proposed you plan without approving and search dont do anything

## Response snapshot

Ran a multi-round clarification (3 Explore agents mapping existing notification/analytics/gallery/settings/popup infrastructure, then a Plan agent validating the technical design) before narrowing spec 004's two buildable-now stories:

- **US1 (notification center)**: narrowed from 5 event types to 4 — dropped "new order placed" since it already has a dedicated orders page + dashboard KPI; kept payment-received, cancellation, return, exchange only.
- **US2 (YoY trend)**: dropped repeat-customer-rate (never re-raised by the user across clarification); split into two separate metrics living in their natural existing tabs — revenue YoY in the Revenue tab, sales/units YoY in the Performance tab — each with its own fixed trailing-12-month window, explicitly independent of the existing global 7d/30d/90d/12m range filter (resolves the user's "will this conflict with time filters / reserve page space" concern: each collapses to a single line until 12 months of order history exist, ~2027-06 given data starts 2026-06-07, then auto-expands).

Updated `specs/004-post-launch-roadmap/spec.md`: added a `## Clarifications` section (Session 2026-07-08, 3 Q&A entries) following the convention already established in `specs/001-e2e-test-suite/spec.md`; rewrote User Story 1 and User Story 2 (titles, descriptions, Independent Test, Acceptance Scenarios); renumbered FR-001 through FR-010 (added FR-004 for the Performance-tab sales YoY, FR-006 for the additive-only constraint); updated Key Entities and added SC-005 for the additive-only regression guarantee. The five new implementation ideas (swipe gallery, color-image matching, free-delivery toggle, promo popups, additional analytics visuals) were captured in a separate plan file (`jolly-mapping-marble.md`, approved) as input to a forthcoming new spec (`006-conversion-and-admin-enhancements`), not folded into 004 since they're outside its original five-item scope.

## Outcome

- ✅ Impact: US1/US2 are now precisely scoped and unambiguous — no more "figure it out during /sp.plan" gaps — while US3/US4 remain untouched and still deferred.
- 🧪 Tests: spec quality checklist unchanged, still fully passing (its own notes already anticipated no updates needed before `/sp.plan` for US1/US2).
- 📁 Files: specs/004-post-launch-roadmap/spec.md
- 🔁 Next prompts: `/sp.plan` on 004 scoped to US1+US2 → `plan.md`; then `/sp.tasks` → `/sp.implement`; separately `/sp.specify` for `006-conversion-and-admin-enhancements` covering the five new implementation ideas.
- 🧠 Reflection: the YoY "page space" concern the user raised was really an architecture question in disguise (does the widget need to hook into the existing range filter) — answering it required validating against the actual page.tsx data-fetch code (a Plan agent caught that the existing range-scoped fetch would starve a trailing-24-month YoY widget), not just a UI layout decision.

## Evaluation notes (flywheel)

- Failure modes observed: first AskUserQuestion round was rejected by the user wanting to clarify further before answering — should have anticipated the YoY "page space" tension might need pre-resolution rather than presenting it as a flat two-option choice.
- Graders run and results (PASS/FAIL): spec quality checklist — PASS (no changes required)
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): when a clarifying question has a clear resolving architecture answer (like the range-filter/YoY-window conflict), state the resolution proactively before asking, rather than presenting it as an open tradeoff.
