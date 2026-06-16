<!--
SYNC IMPACT REPORT
==================
Version change: N/A (placeholder) → 1.0.0 (initial ratification)
Modified principles: N/A — first-time population of all placeholders
Added sections:
  - Core Principles (6 principles)
  - Technology Constraints
  - Development Workflow
  - Governance
Templates reviewed:
  - .specify/templates/plan-template.md ✅ compatible (Constitution Check section present)
  - .specify/templates/spec-template.md ✅ compatible (no principle-specific refs)
  - .specify/templates/tasks-template.md ✅ compatible (phase structure aligns)
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

## Technology Constraints

- **Framework**: Next.js (App Router) — full-stack, SSR/SSG for SEO
- **Database**: Supabase (PostgreSQL) — free tier to start
- **Hosting**: Vercel — free tier, scales on demand
- **Email**: Resend.com — order notifications to store owner
- **Payments**: JazzCash / Easypaisa / Stripe (Pakistan-compatible)
- **Language**: TypeScript — type safety across frontend and backend
- **Styling**: Tailwind CSS — utility-first, rapid UI development
- **No secrets in code**: All credentials via `.env` files; never committed

## Development Workflow

1. **Spec before code** — every feature starts with a spec (`/sp.specify`)
2. **Smallest viable diff** — implement the minimum to satisfy acceptance criteria
3. **Test on mobile first** — verify every UI change on a 375px viewport
4. **Commit atomically** — one logical change per commit with clear messages
5. **Environment parity** — local dev MUST mirror production config (`.env.example` kept current)
6. **No hardcoded data** — product catalog, categories, and config driven by database or env vars

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

**Version**: 1.0.0 | **Ratified**: 2026-06-07 | **Last Amended**: 2026-06-07
