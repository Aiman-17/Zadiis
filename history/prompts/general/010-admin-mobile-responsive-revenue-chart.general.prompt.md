---
id: "010"
title: Admin Mobile Responsive Revenue Chart Y-Axis
stage: general
date: 2026-06-16
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: aurex707@gmail.com
command: general
labels: ["mobile", "responsive", "admin", "recharts", "dashboard"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/admin/layout.tsx
  - store/src/app/admin/products/page.tsx
  - store/src/components/admin/DashboardCharts.tsx
  - store/src/app/admin/settings/page.tsx
tests:
  - none
---

## Prompt

make admin panel responsive for mobile screens and also in monthly revenue chart add number number starting from 10000 to 1,50,000

## Response snapshot

1. Admin layout rewritten with hamburger drawer pattern for mobile — desktop sidebar hidden on small screens, sticky top bar with Menu icon reveals full-width overlay drawer with X close button. NavContent shared component used for both.
2. Products table wrapped in overflow-x-auto with min-w-[560px] on table element.
3. DashboardCharts.tsx updated — added REVENUE_TICKS array and pkrShort() formatter function, YAxis for revenue BarChart now has domain=[0,150000], ticks at 25k intervals, tickFormatter=pkrShort, width=72.
4. Settings page delivery zones table wrapped in overflow-x-auto with min-w-[360px]; add-city form given flex-wrap for small screens.

## Outcome

- ✅ Impact: Admin panel fully responsive on mobile — hamburger nav, scrollable tables on small screens, PKR-formatted Y-axis ticks on revenue chart (0 / 25,000 / 50,000 / 75,000 / 1,00,000 / 1,25,000 / 1,50,000)
- 🧪 Tests: none
- 📁 Files: layout.tsx, products/page.tsx, DashboardCharts.tsx, settings/page.tsx
- 🔁 Next prompts: deploy to Vercel, configure real WhatsApp number in .env, verify Resend domain
- 🧠 Reflection: Pakistani lakh format needed custom formatter since Intl.NumberFormat uses Western commas

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): test on actual mobile viewport in Vercel preview
