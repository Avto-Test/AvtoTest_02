# Phase 3 Simulation Report

Last updated: March 13, 2026

## Scope

Phase 3 converted simulation from an inferred attempt pattern into a dedicated exam system backed by its own model and endpoints.

## New Backend Models

### `ExamSimulationAttempt`

Added a dedicated simulation entity with lifecycle and cooldown state:

- `id`
- `user_id`
- `scheduled_at`
- `started_at`
- `finished_at`
- `cooldown_started_at`
- `next_available_at`
- `readiness_snapshot`
- `pass_probability_snapshot`
- `question_count`
- `pressure_mode`
- `mistake_count`
- `timeout`
- `passed`

Implementation files:

- `models/exam_simulation_attempt.py`
- `alembic/versions/20260313_170000_0045_create_exam_simulation_attempts.py`

## New Endpoints

### `POST /api/simulation/start`

Creates or resumes a dedicated simulation session.

Rules:

- premium/admin only
- simulation starts only if `SimulationStatus.launch_ready == true`
- existing unfinished simulation is resumed instead of creating duplicates

Behavior:

- creates dedicated `Attempt(mode="simulation")`
- creates matching `ExamSimulationAttempt`
- stores readiness/pass-probability snapshots at launch
- uses a dedicated synthetic test shell: `Exam Simulation`

### `GET /api/simulation/history`

Returns simulation-only history from the dedicated entity.

Response fields:

- `attempt_id`
- `date`
- `score`
- `mistakes`
- `pass_probability_snapshot`
- `passed`

## Cooldown Logic

Cooldown is no longer inferred from pressure-mode or high-question attempts.

New behavior:

- cooldown starts only when a dedicated simulation finishes
- cooldown is stored in:
  - `cooldown_started_at`
  - `next_available_at`
- analytics dashboard simulation state now reads from `ExamSimulationAttempt`

Shared logic was centralized in:

- `services/learning/simulation_service.py`

## Attempt Finish Integration

Simulation completion is now synchronized inside the attempt submission flow.

Updated files:

- `api/attempts/router.py`

On simulation submit/finish:

- `finished_at` is persisted to the simulation entity
- `mistake_count` is stored
- `timeout` is stored
- `passed` is stored
- `next_available_at` is materialized

## Analytics Changes

Dashboard simulation state no longer uses heuristic attempt detection.

Updated file:

- `api/analytics/user_router.py`

`SimulationStatus` now also includes:

- `readiness_threshold`
- `pass_threshold`
- `lock_reasons`

This allows frontend to explain why simulation is locked and what still needs improvement.

## Frontend Simulation Center

The `/simulation` route now uses the dedicated backend simulation system.

Frontend additions:

- `frontend/api/simulation.ts`
- `frontend/types/simulation.ts`
- `frontend/features/simulation/simulation-page.tsx`

The simulation center now displays:

- readiness score
- pass probability
- cooldown state and timer
- readiness explanation
- metrics that still need improvement
- simulation history
- start simulation button using `POST /api/simulation/start`

## Files Updated

### Backend

- `models/attempt.py`
- `models/user.py`
- `models/__init__.py`
- `api/analytics/schemas.py`
- `api/analytics/user_router.py`
- `api/attempts/router.py`
- `main.py`

### Frontend

- `frontend/types/analytics.ts`
- `frontend/features/simulation/simulation-page.tsx`

## Verification

- `python -m py_compile` on updated backend files
- `npm exec tsc -- --noEmit`
- `npm run build`

## Remaining Gap

- Simulation still uses the existing question bank and attempt execution engine under the hood, but lifecycle, cooldown, and history are now dedicated and no longer inferred heuristically.
