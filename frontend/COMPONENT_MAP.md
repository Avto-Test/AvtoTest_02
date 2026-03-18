# AUTOTEST Frontend Component Map

This map was extracted from `exemple_frontend` and used as the migration guide for the production frontend under `frontend/`.

## Route Inventory

| Prototype route | Production route | Notes |
| --- | --- | --- |
| `/` | `/dashboard` | Dashboard became the main app landing page. |
| `/analytics` | `/analytics` | Rebuilt with real analytics endpoints. |
| `/practice` | `/practice` | Rebuilt with real `/tests`, `/learning/session`, `/attempts/*`. |
| `/tests` + `/tests/[id]` | `/practice` + reusable `AssessmentSession` | Prototype test list/detail flow was consolidated into one production feature. |
| `/schools` | `/schools` | Rebuilt against `/driving-schools` catalog and detail endpoints. |
| `/instructors` | `/instructors` | Rebuilt against `/driving-instructors` catalog and detail endpoints. |
| `/notifications` | topbar bell + `/settings` | Prototype standalone page collapsed into reusable notification system. |
| `/login` | `/login` | Rebuilt against real auth proxy. |
| `/register` | `/register` | Rebuilt against real auth proxy. |
| `implicit /verify` redirect in prototype | `/verify` | Added because the backend exposes email verification. |
| `/billing` | not migrated | Current backend/API brief does not expose a matching production billing surface here. |

## Layout Primitives

| Prototype source | Production target | Role |
| --- | --- | --- |
| `components/dashboard/sidebar.tsx` | `components/app-sidebar.tsx` | Main navigation, responsive drawer, persisted collapse state. |
| `components/dashboard/header.tsx` | `components/app-topbar.tsx` | Greeting bar, search affordance, notification bell, account actions. |
| page-level wrapper pattern | `components/app-shell.tsx` | Shared authenticated shell for app routes. |

## Dashboard Widgets

| Prototype widget | Production implementation | Data source |
| --- | --- | --- |
| `stats-cards.tsx` | `widgets/dashboard/dashboard-page.tsx` stats section | `/analytics/dashboard`, `/analytics/summary`, optional `/users/me/xp` |
| `progress-chart.tsx` | dashboard weekly activity area chart | `/analytics/dashboard` |
| `readiness-gauge.tsx` | dashboard readiness + pass probability cards | `/analytics/dashboard` |
| `topic-performance.tsx` | dashboard weak topics list + analytics page topic views | `/analytics/dashboard` |
| `recent-activity.tsx` | dashboard recent attempts list | `/analytics/summary` |
| `leaderboard-preview.tsx` | dashboard leaderboard preview | `/leaderboard` when available |
| `ai-coach.tsx` | dashboard AI recommendation card | `/analytics/dashboard` |
| `quick-actions.tsx` | dashboard action tiles | route navigation only |
| `streak-calendar.tsx` | derived streak metric and activity cards | `/analytics/dashboard` |
| `upcoming-events.tsx` | intentionally skipped | no matching backend contract in current scope |

## Feature Surfaces

| Prototype area | Production module | Notes |
| --- | --- | --- |
| Practice page | `features/practice/practice-page.tsx` | Replaced all mock tests with live catalog + attempt start. |
| Simulation page | `features/simulation/simulation-page.tsx` | Uses adaptive endpoint for premium, real-test fallback otherwise. |
| Analytics page | `features/analytics/analytics-page.tsx` | Rebuilt charts using live dashboard + summary data. |
| Schools catalog | `features/schools/schools-page.tsx` | Filters, list cards, modal detail. |
| Instructors catalog | `features/instructors/instructors-page.tsx` | Filters, cards, modal detail. |
| Auth forms | `features/auth/*` | Real login/register/verify flows with backend-compatible payloads. |
| Profile | `features/profile/profile-page.tsx` | User, XP, attempts, notifications. |
| Settings | `features/settings/settings-page.tsx` | Notifications, account state, persisted sidebar preference. |

## Reusable UI Extraction

Prototype `components/ui/*` contained a broad shadcn-style kit with many duplicates and unused variants. The production frontend keeps only the primitives actually needed by current routes:

- `shared/ui/button.tsx`
- `shared/ui/card.tsx`
- `shared/ui/input.tsx`
- `shared/ui/select.tsx`
- `shared/ui/progress.tsx`
- `shared/ui/avatar.tsx`
- `shared/ui/badge.tsx`
- `shared/ui/table.tsx`
- `shared/ui/modal.tsx`
- `shared/ui/skeleton.tsx`
- `shared/ui/empty-state.tsx`
- `shared/ui/error-state.tsx`
- `shared/ui/page-header.tsx`

Everything else in the prototype UI kit was treated as reference only and intentionally not copied verbatim.

## Prototype-Only Elements Not Migrated Blindly

- Mock datasets embedded in every route.
- Temporary auth delays and fake redirects.
- Duplicate dashboard/test components with overlapping responsibilities.
- Prototype-only billing surface without a matching production contract in this rebuild.
- Generic shadcn wrappers that were not required by the rebuilt route set.
