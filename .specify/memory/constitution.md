<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.2.0 (MINOR: Quality Guardian Engineering Review Process added as new section)
Modified principles: none changed or removed
Added sections:
  - Quality Guardian Mission
  - Quality Guardian Core Principles (10)
  - Engineering Review Process (Stages 1–19)
  - Bug Reporting Standard
  - Review Output Requirements
  - Final Verdict Criteria
Removed sections: none
Scope: applies to both store (customer site) and admin site
Templates reviewed:
  - .specify/templates/plan-template.md ✅ compatible
  - .specify/templates/spec-template.md ✅ compatible
  - .specify/templates/tasks-template.md ✅ compatible
Deferred TODOs:
  - TODO(PROJECT_NAME): Brand name not yet decided by owner — update when finalized
-->

# TODO(PROJECT_NAME): Pakistani Women's Fashion Store Constitution

## Core Principles

### I. Customer Journey First

Every feature MUST serve the core purchase flow: browse → product detail →
add to cart → checkout → payment → order confirmation. No feature may
block, complicate, or slow down this journey. If a feature does not
directly support or enhance the customer journey, it MUST be deferred.

**Rationale**: Paid ads (Instagram/Facebook) drive cold traffic directly
to the store. A frictionless path to purchase is the single most
important conversion factor.

### II. Mobile-First Development

All UI components MUST be designed and tested on mobile viewports first
(375px minimum). Desktop is a progressive enhancement. Performance
budgets apply on mobile network conditions (3G/4G).

**Rationale**: Pakistan's ecommerce traffic is overwhelmingly mobile.
Customers clicking ads on Instagram or Facebook land on mobile browsers.

### III. Lean MVP — Scalable by Design

The initial release MUST cover women's clothing only. The codebase MUST
be architected so that adding new categories (abayas, perfumes, etc.)
requires only data/config changes, not structural rewrites. No feature
for future categories should be built before it is needed (YAGNI).

**Rationale**: Owner wants first sales validated before expanding.
Budget is limited; speculative features waste runway.

### IV. Secure & Local Payments

All payment integrations MUST support Pakistani gateways (JazzCash,
Easypaisa) and/or card payments via a PCI-compliant provider. No payment
credentials or tokens may be stored in application code or version
control. COD (Cash on Delivery) MUST be supported as an option.

**Rationale**: Pakistani customers expect local payment methods.
COD remains the dominant payment mode in the market.

### V. Performance for Conversions

Every page MUST load in under 3 seconds on a 4G mobile connection.
Core Web Vitals (LCP, CLS, FID) MUST meet Google's "Good" thresholds.
Images MUST be optimized and served in modern formats (WebP). Product
listing pages MUST not block on non-critical data.

**Rationale**: Ad spend is wasted if the landing page is slow.
Each second of load time directly reduces conversion rate.

### VI. Brand Consistency

All visual elements (colors, typography, spacing, tone of copy) MUST
follow the brand identity once defined. No ad-hoc styling decisions may
deviate from the design system. The brand name and visual identity MUST
be finalized before any customer-facing UI is shipped.

**Rationale**: Trust is built through consistency. Customers from social
ads form brand impressions in seconds — inconsistency kills credibility.

### VII. End-to-End Testing Mandate

Every critical user journey MUST be covered by at least one Playwright
E2E test before it is considered shippable. The two test surfaces are:

- **store** (`tests/store/**/*.spec.ts`) — customer-facing journeys:
  browse, product detail, add-to-cart, checkout, OTP verification,
  order confirmation, COD flow.
- **admin** (`tests/admin/**/*.spec.ts`) — operator journeys:
  login, product CRUD, order management, payments, analytics.

E2E tests MUST run against a real (local or staging) Next.js server
via the `webServer` hook in `playwright.config.ts`. Mocking network
responses is prohibited for happy-path flows; use Supabase test data
or fixtures. Tests MUST NOT depend on production data.

A feature branch MUST NOT be merged if its E2E tests are failing or
missing for the journeys it touches.

**Rationale**: The store has no unit-test coverage. E2E tests are the
single regression gate before ad-spend-driven traffic hits the store.
A broken checkout or login discovered in production costs real revenue.

## Technology Constraints

- **Framework**: Next.js (App Router) — full-stack, SSR/SSG for SEO
- **Database**: Supabase (PostgreSQL) — free tier to start
- **Hosting**: Vercel — free tier, scales on demand
- **Email**: Resend.com — order notifications to store owner
- **Payments**: JazzCash / Easypaisa / Stripe (Pakistan-compatible)
- **Language**: TypeScript — type safety across frontend and backend
- **Styling**: Tailwind CSS — utility-first, rapid UI development
- **E2E Testing**: Playwright (`@playwright/test`) — store + admin projects
- **No secrets in code**: All credentials via `.env` files; never committed

## Development Workflow

1. **Spec before code** — every feature starts with a spec (`/sp.specify`)
2. **Smallest viable diff** — implement the minimum to satisfy acceptance criteria
3. **Test on mobile first** — verify every UI change on a 375px viewport
4. **Commit atomically** — one logical change per commit with clear messages
5. **Environment parity** — local dev MUST mirror production config (`.env.example` kept current)
6. **No hardcoded data** — product catalog, categories, and config driven by database or env vars
7. **E2E gate before merge** — every PR touching a critical journey MUST include or update
   the corresponding Playwright spec; `npm run test:e2e` MUST pass locally before pushing

## Governance

This constitution is the authoritative source for all development decisions
on this project. It MUST be consulted before beginning any new feature or
making architectural decisions.

**Amendment procedure**: Propose change → document reasoning → update
version → propagate to templates. All amendments require explicit owner
approval.

**Versioning policy** (semantic):
- MAJOR: Backward-incompatible principle removal or redefinition
- MINOR: New principle or section added
- PATCH: Clarifications, wording fixes

**Compliance**: All pull requests and implementation plans MUST include a
Constitution Check confirming no principles are violated.

**Version**: 1.2.0 | **Ratified**: 2026-06-07 | **Last Amended**: 2026-07-01

---

## Quality Guardian Engineering Review Process

> **Scope**: This process applies to all features on both the store (customer site)
> and the admin site. Every feature MUST be validated through this process before
> implementation approval or release sign-off.

### Mission

Act as a cross-functional reviewer covering engineering, product, design,
operations, finance, compliance, security, and merchant business workflows.
Perspectives included: technical specialists, domain experts, QA leads, CFO,
solution architects, product managers, and operational experts.

**Never assume a feature is correct because it compiles or appears to work.**
Every feature MUST be validated from the perspectives of architecture,
engineering, business logic, user experience, security, scalability, and
operations.

### Quality Guardian Core Principles

1. Think before coding.
2. Understand the complete feature before making changes.
3. Validate business requirements first.
4. Never skip edge cases.
5. Every feature MUST be testable.
6. Every bug MUST include a root cause.
7. Every recommendation MUST include reasoning.
8. Prevent technical debt whenever possible.
9. Optimize for maintainability and scalability.
10. Production quality is the minimum standard.

### Stage 1 — Requirement Analysis

Review:
- Functional requirements
- Non-functional requirements
- Business rules
- Acceptance criteria
- Assumptions
- Dependencies
- Constraints

Identify:
- Missing requirements
- Ambiguities
- Conflicting requirements
- Undefined behaviors

### Stage 2 — User Story Validation

Generate and validate stories for every actor: Customer, Guest, Registered User,
Administrator, Manager, Finance, Marketing, Owner, Developer, System,
Third-party integrations.

For each story identify:
- Goal
- Preconditions
- Happy path
- Alternative paths
- Failure paths
- Expected outcome

### Stage 3 — Functional Test Cases

Generate comprehensive test cases covering:
- Happy path
- Negative testing
- Boundary testing
- Validation testing
- Error handling
- Permission testing
- State transition testing
- Workflow testing
- Regression scenarios

For each test define: ID, Description, Preconditions, Steps, Expected Result,
Priority, Severity.

### Stage 4 — Edge Case Analysis

Identify edge cases including: empty data, null values, duplicate data, maximum
and minimum limits, large datasets, concurrent actions, expired sessions, network
failures, browser refresh, back button, multiple tabs, slow API, offline mode,
unexpected input, special characters, Unicode, timezone differences, leap years,
DST, currency rounding, race conditions, rollback failures, partial failures.

### Stage 5 — UI Review

Review: visual consistency, typography, spacing, alignment, colors, contrast,
responsiveness, loading states, empty states, error states, success states,
animations, icons, design system compliance, accessibility, cross-browser
compatibility.

### Stage 6 — UX Review

Evaluate: navigation, information hierarchy, task completion, user flow,
discoverability, feedback, micro-interactions, accessibility, error recovery,
searchability, filtering, sorting, responsiveness, perceived performance,
cognitive load, consistency.

### Stage 7 — API Testing

Verify: endpoints, authentication, authorization, validation, headers, status
codes, pagination, sorting, filtering, rate limiting, retries, timeouts, error
responses, idempotency.

### Stage 8 — Database Testing

Review: schema, relationships, indexes, constraints, foreign keys, transactions,
rollback, data integrity, duplicate prevention, migration safety, performance,
query efficiency.

### Stage 9 — Integration Testing

Validate integration between: frontend, backend, database, authentication,
storage, payments, email, notifications, analytics, inventory, shipping,
external APIs, background jobs, queues.

### Stage 10 — End-to-End Testing

Validate complete workflows: Registration, Login, Password Reset, Browse Products,
Search, Filtering, Wishlist, Cart, Checkout, Payment, Order Confirmation, Invoice,
Shipment, Delivery, Return, Refund, Cancellation, Notifications, Admin updates,
Inventory synchronization, Reporting.

### Stage 11 — Admin Workflow Testing

Validate: Dashboard, Product Management, Inventory, Categories, Orders, Customers,
Coupons, Discounts, Payments, Refunds, Returns, Shipping, Analytics, Reports,
Settings, Roles, Permissions, Audit Logs.

### Stage 12 — Customer Workflow Testing

Validate: Homepage, Navigation, Authentication, Product Discovery, Search,
Filters, Collections, Product Details, Cart, Checkout, Payment, Order Tracking,
Returns, Profile, Wishlist, Reviews, Support, Notifications.

### Stage 13 — Security Testing

Review: Authentication, Authorization, RBAC, Session handling, CSRF, XSS,
SQL Injection, SSRF, Secrets, Encryption, File uploads, Input validation,
Output encoding, Audit logs, Rate limiting, Security headers, RLS policies.

### Stage 14 — Performance Testing

Measure: Page load, TTFB, Core Web Vitals, API latency, Database latency,
Rendering, Bundle size, Memory, CPU, Caching, Lazy loading, Image optimization,
Query count.

### Stage 15 — Scalability Testing

Assume growth to 100 / 1,000 / 10,000 / 100,000 / 1,000,000 users. Review:
Database, API, Storage, Caching, Queues, Workers, Rendering, Concurrency,
Resource usage.

### Stage 16 — Accessibility Testing

Validate: Keyboard navigation, Screen readers, Focus order, Semantic HTML,
ARIA, Color contrast, Alt text, Form labels, Reduced motion, Zoom support,
WCAG compliance.

### Stage 17 — Regression Testing

Ensure new changes do not break: Authentication, Orders, Payments, Inventory,
Analytics, Reports, Notifications, Search, Dashboard, Settings.

### Stage 18 — Production Readiness

Verify: Logging, Monitoring, Alerts, Error reporting, Feature flags, Rollback
strategy, Backup strategy, Disaster recovery, Documentation, Deployment
readiness, Environment configuration, Secrets, Health checks.

### Stage 19 — SEO

Verdicts:
- ❌ Reject — Critical SEO issues block indexing, visibility, or discoverability.
- ⚠️ Conditionally Approve — SEO is functional but requires improvements before release.
- ✅ Approve — SEO meets production standards for metadata, structure, and discoverability.
- 🏆 Enterprise Grade — SEO is highly optimized across technical, content, and performance dimensions.

### Bug Reporting Standard

Every issue MUST include:
- Title
- Severity
- Priority
- Category
- Component
- Environment
- Preconditions
- Steps to Reproduce
- Expected Result
- Actual Result
- Root Cause
- Business Impact
- Technical Impact
- Recommended Fix
- Regression Risk

### Review Output Requirements

Every review MUST produce:

1. Executive Summary
2. Requirements Review
3. Architecture Review
4. User Story Review
5. Functional Review
6. UI Review
7. UX Review
8. Security Review
9. Performance Review
10. Database Review
11. API Review
12. Integration Review
13. End-to-End Review
14. Accessibility Review
15. Scalability Review
16. Production Readiness Review
17. Risk Assessment
18. Missing Test Coverage
19. Critical Defects
20. High Priority Improvements
21. Medium Priority Improvements
22. Low Priority Improvements
23. Final Release Recommendation

### Final Verdict

Every review MUST conclude with one of:

- ❌ **Reject** — Critical issues prevent release.
- ⚠️ **Conditionally Approve** — Release only after specified blockers are resolved.
- ✅ **Approve** — Meets production quality standards.
- 🏆 **Enterprise Grade** — Exceeds production standards and demonstrates exceptional
  engineering quality.

Always justify the verdict with objective evidence. Never approve software solely
because it appears functional. Evaluate correctness, resilience, maintainability,
security, performance, user experience, and operational readiness as a complete system.
