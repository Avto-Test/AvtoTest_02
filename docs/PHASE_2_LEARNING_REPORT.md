# Phase 2 Learning Report

Last updated: March 13, 2026

## Scope

Phase 2 focused on exposing the existing backend learning engine as a coherent frontend learning loop.

No gamification systems were added.

## New Learning Flows

### Weak Topic Recovery Trainer

- Weak topics are now rendered as recovery cards sourced from `DashboardResponse.topic_breakdown`.
- Each card now exposes:
  - `Recovery sprint` -> launches backend `POST /api/learning/session`
  - `Adaptive practice` -> launches backend `POST /api/tests/adaptive/start` when premium is available
  - `Lesson` -> routes to `/lessons?topic=...`
- Topic cards display mastery states:
  - `Weak`
  - `Improving`
  - `Stable`

### Review Queue Practice Mode

- Review queue visibility now uses `GET /api/analytics/me/review-queue`.
- A dedicated `Review Queue` practice surface was added on the Practice page.
- Flow:
  - review queue panel
  - due topic visibility
  - `Review practice boshlash`
  - backend learning session launch

### Learning Sprint UX

- Added reusable `LearningSprintLauncher`.
- Users can start backend learning sessions with:
  - 10 questions
  - 20 questions
  - 30 questions
  - 40 questions
  - 50 questions
- This launcher is now used in:
  - Practice
  - Learning Path
  - Lessons

### Post-Attempt Guidance

- After attempt submission, the result view now surfaces:
  - weakest topic
  - topic mastery state
  - recovery message from backend attempt feedback
  - recovery sprint CTA
  - lesson CTA

## New Routes

- `/lessons`

## Updated Learning Surfaces

### Dashboard

- Weak topic cards now include mastery state badges.
- Weak topic cards now link to:
  - recovery sprint
  - adaptive practice
  - lessons
- Lesson recommendations now route into the lessons experience instead of remaining isolated content links.

### Practice

- Practice now exposes a clearer learning-first structure:
  - Learning Sprint
  - Review Queue
  - Adaptive practice
  - Free random practice
  - Standard tests
- Weak topic recovery and lesson recommendations are integrated into the same route.
- Query-driven focus support was added:
  - `/practice?mode=review&topic=...`
  - `/practice?mode=adaptive&topic=...`

### Learning Path

- Learning Path now uses the same mastery model as the rest of the learning product.
- Roadmap cards now show:
  - mastery state
  - recovery sprint CTA
  - lessons CTA
- Roadmap launcher now uses the shared learning sprint component.

### Lessons

- Added a dedicated lessons route using `GET /api/lessons`.
- Lessons page now shows:
  - lesson feed
  - premium lesson sections
  - dashboard lesson recommendations
  - topic filtering via query string
  - direct learning sprint launch
  - return path into practice

## Lesson Integration

Lesson recommendations are now surfaced in:

- Dashboard
- Practice
- Lessons
- Learning Path
- Post-attempt guidance

When possible, lesson recommendations are matched by:

1. `lesson_id`
2. `topic`
3. dashboard recommendation fallback

## Weak-Topic Trainer Behavior

- Topic ranking is based on lowest `accuracy` from `topic_breakdown`.
- Mastery state is inferred from analytics signals:
  - low accuracy / low mastery / low retention -> `Weak`
  - strong accuracy with strong mastery/retention -> `Stable`
  - otherwise -> `Improving`
- Post-attempt topic state uses:
  - `topic_stability`
  - `fading_topics`
  - fallback pass/fail outcome

## Files Added

- `frontend/features/learning/learning-sprint-launcher.tsx`
- `frontend/features/lessons/lessons-page.tsx`
- `frontend/app/lessons/page.tsx`
- `frontend/lib/learning.ts`

## Files Updated

- `frontend/widgets/dashboard/dashboard-page.tsx`
- `frontend/features/practice/practice-page.tsx`
- `frontend/features/learning-path/learning-path-page.tsx`
- `frontend/components/assessment-session.tsx`
- `frontend/lib/navigation.ts`
- `frontend/proxy.ts`

## Remaining Gaps

- Backend does not expose a topic-specific adaptive start endpoint, so `Adaptive practice` launched from a weak-topic card still uses the general adaptive engine.
- Backend does not expose a dedicated review-queue-only start endpoint; review queue practice currently launches the general learning session generator.
- Lessons are still external content links rather than deeply tracked in-product lesson sessions.

## Verification

- `npm exec tsc -- --noEmit`
- `npm run build`
