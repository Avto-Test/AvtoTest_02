# Phase 5 Economy Report

Last updated: March 13, 2026

## Scope Implemented

Phase 5 focused on turning coins into real product mechanics and moving leaderboard generation out of request-time logic.

Implemented:

- coin spending service
- simulation cooldown reduction with spend rules
- temporary XP boost mechanic
- focus practice pack unlock flow
- leaderboard background refresh job
- frontend spend UI in simulation and practice flows

## Backend Changes

### New Models / Persistence

- Added [xp_boost.py](c:\Users\user\Desktop\Loyiha_003\models\xp_boost.py)
  - persists temporary XP multipliers
  - stores `user_id`, `multiplier`, `source`, `activated_at`, `expires_at`, `created_at`
- Extended [exam_simulation_attempt.py](c:\Users\user\Desktop\Loyiha_003\models\exam_simulation_attempt.py)
  - added `cooldown_reduction_days_used`

### New Services

- Added [economy.py](c:\Users\user\Desktop\Loyiha_003\services\gamification\economy.py)
  - `CoinSpendService.validate_balance`
  - `CoinSpendService.record_transaction`
  - `CoinSpendService.spend_coins`
  - `activate_xp_boost`
  - `reduce_simulation_cooldown`
  - `build_economy_overview`
- Updated [rewards.py](c:\Users\user\Desktop\Loyiha_003\services\gamification\rewards.py)
  - reward grants now respect an active XP boost
  - gamification summary now returns `active_xp_boost`

### Economy Rules Implemented

- Simulation cooldown reduction
  - `1 day = 40 coins`
  - max reduction per simulation cooldown = `5 days`
  - reduction is tracked on the simulation entity, not heuristically
- XP boost
  - cost = `50 coins`
  - multiplier = `+20% XP`
  - duration = `30 minutes`
  - cannot be stacked while another XP boost is active
- Focus pack
  - cost = `35 coins`
  - unlocks a weak-topic intensive learning session
  - current default size = `20 questions`

### New API Endpoints

- `GET /api/economy/overview`
- `POST /api/economy/simulation/reduce-cooldown`
- `POST /api/economy/xp-boost/activate`
- `POST /api/economy/focus-pack`

Implemented in:

- [router.py](c:\Users\user\Desktop\Loyiha_003\api\economy\router.py)
- [schemas.py](c:\Users\user\Desktop\Loyiha_003\api\economy\schemas.py)

### Learning / Simulation Integration

- Focus pack now uses the learning session engine with a forced weak-topic focus
- Adaptive session generation now accepts focused topic ids
  - [adaptive_engine.py](c:\Users\user\Desktop\Loyiha_003\services\learning\adaptive_engine.py)
- Simulation cooldown reduction now updates the dedicated simulation entity directly

### Leaderboard Background Job

- Added [leaderboard_scheduler.py](c:\Users\user\Desktop\Loyiha_003\services\gamification\leaderboard_scheduler.py)
- snapshots refresh every `5 minutes`
- startup also performs an initial snapshot refresh
- leaderboard endpoints now read persisted snapshots instead of rebuilding on each request

Updated files:

- [main.py](c:\Users\user\Desktop\Loyiha_003\main.py)
- [rewards.py](c:\Users\user\Desktop\Loyiha_003\services\gamification\rewards.py)

## Frontend Changes

### Practice

Updated [practice-page.tsx](c:\Users\user\Desktop\Loyiha_003\frontend\features\practice\practice-page.tsx):

- added `XP Boost` purchase card
- added `Focus Pack` unlock card
- focus pack launches directly into a learning session
- topbar progress is reloaded after coin spending

### Simulation

Updated [simulation-page.tsx](c:\Users\user\Desktop\Loyiha_003\frontend\features\simulation\simulation-page.tsx):

- added cooldown reduction spend UI
- user can choose how many days to reduce
- balance and simulation state refresh after purchase

### Topbar / Progress State

Updated:

- [app-topbar.tsx](c:\Users\user\Desktop\Loyiha_003\frontend\components\app-topbar.tsx)
- [gamification.ts](c:\Users\user\Desktop\Loyiha_003\frontend\types\gamification.ts)
- [economy.ts](c:\Users\user\Desktop\Loyiha_003\frontend\api\economy.ts)
- [economy.ts](c:\Users\user\Desktop\Loyiha_003\frontend\types\economy.ts)

Result:

- topbar now shows active XP boost state
- practice and simulation screens can spend coins without stale topbar balances

## Migration

Added:

- [20260313_203500_0047_add_phase5_economy_tables.py](c:\Users\user\Desktop\Loyiha_003\alembic\versions\20260313_203500_0047_add_phase5_economy_tables.py)

Changes:

- creates `xp_boosts`
- adds `cooldown_reduction_days_used` to `exam_simulation_attempts`

## Verification

Completed:

- `py -3 -m py_compile ...`
- `npm exec tsc -- --noEmit`
- `npm run build` in `frontend`
- `py -3 -m alembic upgrade head`

## Remaining Gaps

- XP boost countdown in topbar currently refreshes on data reload, not on a live second-by-second timer
- focus pack currently uses a fixed intensive learning-session size rather than multiple purchasable pack sizes
- leaderboard refresh uses an in-process background loop; if the app is horizontally scaled later, this should move to a dedicated scheduler/worker
