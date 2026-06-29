---
id: 010
title: Admin order notification badge with 30s polling
stage: general
date: 2026-06-20
surface: agent
model: haiku-4.5
feature: admin-orders-notifications
branch: main
user: Aiman-17
command: Add new-order notification badge to admin layout
labels: ["admin", "notifications", "polling", "sprint2-task8"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/admin/layout.tsx
tests:
  - npm run build (TypeScript validation passed)
---

## Prompt

Task 8: Add new-order notification badge to admin layout. Implement 30-second polling to check for new orders on the /api/admin/orders endpoint and display a red notification badge on the Orders nav link. The badge should show the count of *new* orders since the admin last visited the Orders page. Clear notifications when the Orders link is clicked.

Specific implementation requirements:
1. Add useEffect, useRef to imports
2. Add state: const [newOrders, setNewOrders] = useState(0)
3. Add lastCountRef = useRef<number | null>(null)
4. Add polling effect that runs on mount, every 30 seconds
5. Add clearNotifications function
6. Move NAV array inside component (was module-level const)
7. Add badge field to NAV items
8. Update NavContent to show badges and call clearNotifications on Orders nav click
9. Update mobile top bar to show new order count

## Response snapshot

All 8 changes successfully implemented:
- Imports updated to include useEffect, useRef
- State variables and ref added
- NAV moved to component and badge property added
- useEffect polling effect implemented with 30s interval
- clearNotifications function created
- NavContent updated to display badges and clear on Orders click
- Mobile top bar updated with new order count display
- Build completed successfully with no TypeScript errors
- Commit created: e36ba8f "feat: admin order notification badge with 30s polling"

## Outcome

- ✅ Impact: Admin users now receive real-time visual feedback (every 30 seconds) of new orders via notification badge on Orders nav link; notifications cleared on Orders page visit
- 🧪 Tests: npm run build passed with zero TypeScript errors and all routes compiled successfully
- 📁 Files: store/src/app/admin/layout.tsx (61 insertions, 14 deletions)
- 🔁 Next prompts: Test notifications in running app; verify polling behavior; consider persisting notification state across refreshes if needed
- 🧠 Reflection: Clean implementation using React hooks and existing API. Badge uses brand-standard red (#EF4444) for alarm/notification. Mobile display shows notification text badge for better mobile UX.

## Evaluation notes (flywheel)

- Failure modes observed: None—all steps executed as specified
- Graders run and results (PASS/FAIL): Build validation PASS
- Prompt variant (if applicable): null
- Next experiment: Monitor actual polling behavior and notification accuracy in staging environment
