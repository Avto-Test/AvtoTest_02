# AUTOTEST Product Roadmap

Last updated: March 13, 2026

## Product Overview

AUTOTEST is a driving exam preparation platform built around adaptive practice, exam readiness, and guided improvement. The product should behave like a learning system first, a test catalog second, and a marketplace third.

The target product experience should center on:

- adaptive practice from a single question bank
- visible weak-topic recovery
- spaced repetition and review recovery
- clear simulation readiness and cooldown rules
- premium learning value that is understandable
- trusted analytics that explain progress
- instructor and driving school discovery as a supporting ecosystem

## Current System Analysis

### Backend Systems Already Implemented

- Adaptive practice engine with weighted question selection
- Free random practice with daily attempt limits
- Weak topic detection using `UserSkill` and `UserTopicStats`
- Review queue and spaced repetition scheduling
- Learning session generator
- Lesson recommendation matching
- Dashboard analytics and pass-probability scoring
- Simulation readiness scoring
- Simulation cooldown lock of 14 days
- Attempt-level cognitive metrics and inference snapshots
- Notifications
- Payments, plans, promo flows, and subscriptions
- Driving school marketplace
- Driving instructor marketplace
- Owner and admin marketplace management flows

### Product Systems Missing in Backend

- XP wallet and XP event ledger
- Coin wallet and coin transaction ledger
- Achievement triggers and achievement state
- Streak tracking
- Leaderboard snapshots and ranking APIs
- Dedicated simulation entity and simulation history model

### Frontend/Product Gaps

- Gamification UI is partially decorative and not backed by real state
- Dashboard emphasizes analytics instead of learning actions
- Weak topics and review queue are not central enough
- Simulation is represented as a UI concept, not as a clearly explained rule-based system
- Learning sessions, lessons, and recommendations are not unified into one loop
- Marketplace pages overuse hero sections instead of prioritizing discovery and conversion
- Some frontend assumptions still expect missing backend features such as XP, coins, and leaderboard

## Architecture Overview

### Product Domain Structure

#### Learning Core

- `auth`: identity, refresh sessions, subscription-aware access
- `tests`: public test discovery, adaptive start, free random start
- `attempts`: execution, scoring, cognitive metrics, answer review gating
- `analytics`: dashboard intelligence, readiness, pass probability, review queue, inference history
- `learning`: backend-generated learning sessions
- `lessons`: premium lesson feed and grouped content

#### Retention and Monetization

- `payments`: plans, checkout session creation, promo quotes, zero-cost promo redemption
- `notifications`: reminder, coach, upgrade, simulation and learning prompts
- `analytics_events`: conversion funnel and product event tracking

#### Ecosystem

- `driving_schools`: catalog, detail, leads, reviews, owner management
- `driving_instructors`: catalog, detail, leads, reviews, complaints, owner management
- `school`: RBAC-based school dashboard and group visibility

### Target Frontend Architecture

The frontend should reflect backend reality with a clear product split:

- `app`: route shells and server boundaries
- `features/learning`: adaptive practice, review queue, learning session, lessons
- `features/simulation`: readiness, cooldown, start flow, history
- `features/payments`: upgrade and premium value communication
- `features/marketplace`: schools and instructors
- `features/profile`: identity, rank, subscription, progress
- `widgets/dashboard`: next challenge, weak-topic actions, simulation gauge, recent activity
- `shared/ui`: stable design system, motion primitives, status cards, gauges
- `api`: typed backend clients aligned to real endpoints only

### Core Data Contracts To Respect

- `DashboardResponse` is the main intelligence contract
- `SimulationStatus` is the current source of truth for readiness and cooldown
- `ReviewQueueResponse` is the source of due review work
- `LessonsFeedResponse` and `LessonRecommendation` together define learning content surfacing
- `BulkSubmitResponse` defines post-attempt feedback, adaptive signals, and answer review gating

## Delivery Principles

- Align UI to real backend behavior before adding new systems
- Expose backend intelligence before inventing new front-facing abstractions
- Introduce gamification only after the learning loop is stable
- Keep premium value tied to real capabilities
- Avoid parallel implementation of fake and real systems

## Detailed Phase Roadmap

### Phase 1 - System Alignment

**Goal**

Align the frontend with the backend that already exists, remove fake product assumptions, and make the current learning intelligence visible.

**Problems Solved**

- Fake or placeholder gamification signals confuse users
- Simulation readiness is unclear
- Weak topics and review queue are hidden
- Adaptive learning guidance is not visible at the dashboard level
- Frontend assumes some endpoints that do not exist

**Backend Tasks**

- Freeze and document canonical learning endpoints:
  - `/api/tests/free-status`
  - `/api/tests/free-random`
  - `/api/tests/adaptive/start`
  - `/api/attempts/submit`
  - `/api/analytics/me/dashboard`
  - `/api/analytics/me/review-queue`
  - `/api/learning/session`
  - `/api/lessons`
- Standardize error payloads for:
  - free daily limit reached
  - premium-required adaptive mode
  - simulation cooldown not ready
- Add explicit API documentation for `SimulationStatus` and answer unlock reasons
- Confirm which legacy endpoints remain compatibility-only

**Frontend Tasks**

- Remove fake XP, coin, streak, achievement, and leaderboard dependencies from the main product UI
- Rebuild dashboard around real backend intelligence:
  - next challenge
  - simulation readiness
  - weak topics
  - review queue
  - lesson recommendations
  - recent activity
- Replace any mock simulation logic with `SimulationStatus`
- Surface free attempt state from `/api/tests/free-status`
- Align practice entry points to real backend modes:
  - adaptive
  - free random
  - fixed standard tests
  - learning session

**UX Tasks**

- Make the dashboard communicate:
  - what to do now
  - what is weak
  - what is due
  - whether simulation is available
- Replace technical/backend wording with product wording
- Make simulation cooldown understandable as a user-facing lock state
- Add compact but clear review queue indicators

**Execution Checklist**

- [x] Remove fake topbar gamification state from main user flows
- [x] Map all dashboard cards to real analytics fields
- [x] Add weak-topic cards sourced from `topic_breakdown` and recommendations
- [x] Add due-review UI sourced from `ReviewQueueResponse`
- [x] Show simulation cooldown, readiness, and launch state from `SimulationStatus`
- [x] Align practice CTA logic to free vs premium backend rules
- [x] Remove any frontend calls to non-existent XP/coin/leaderboard endpoints

**Success Criteria**

- No core user-facing dashboard element depends on missing backend systems
- Dashboard actions map directly to current APIs
- Simulation state shown in UI matches backend lock logic
- Weak topics and review queue are visible without entering sub-pages

### Phase 2 - Learning Experience

**Goal**

Expose the backend learning engine as a coherent product loop instead of scattered features.

**Problems Solved**

- Lessons feel disconnected from practice
- Review queue is not a first-class mode
- Learning session value is unclear
- Weak-topic practice is passive instead of actionable

**Backend Tasks**

- Clarify the relationship between legacy `UserSkill` and new learning-engine tables
- Add service-layer documentation for:
  - weak topic detection
  - review queue progression
  - learning session generation
  - lesson recommendation matching
- Add optional summary endpoint if needed later for learning-home aggregation, but only after Phase 1 alignment proves gaps
- Add instrumentation events for:
  - learning session started
  - learning session completed
  - weak-topic recovery started
  - review-queue practice started

**Frontend Tasks**

- Create a dedicated weak-topic trainer flow
- Create review-queue practice mode based on due questions/topics
- Create learning-session launch surface from `/api/learning/session`
- Integrate lesson recommendations into the dashboard and learning path
- Rebuild practice page with explicit entry points:
  - continue learning
  - weak-topic recovery
  - review queue
  - random practice
  - timed practice

**UX Tasks**

- Turn weak topics into training cards, not just analytics bars
- Show topic mastery as a progression state:
  - weak
  - improving
  - stable
- Make lesson recommendations feel like the next step in recovery
- Make review queue feel urgent but lightweight

**Execution Checklist**

- [x] Add weak-topic recovery cards with launch actions
- [x] Add review queue panel and due count visibility
- [x] Add lesson recommendations in learning-focused context
- [x] Build learning session onboarding and completion feedback
- [x] Add topic mastery states using analytics signals
- [x] Clarify the practice page structure around learning intent

**Success Criteria**

- Users can see and start all major learning modes from one clear surface
- Review queue and learning sessions become visible product features
- Weak-topic recovery is measurable and easy to initiate
- Lessons feel connected to actual mistakes and knowledge gaps

### Phase 3 - Simulation System

**Goal**

Turn simulation into a high-stakes premium exam mode with explicit identity, history, and lock semantics.

**Problems Solved**

- Simulation is currently inferred from generic attempts
- Cooldown exists but is not modeled as a dedicated product system
- Users cannot see structured simulation history
- Readiness and cooldown are not communicated as one coherent journey

**Backend Tasks**

- Create a dedicated `exam_simulation_attempt` entity
- Add explicit simulation start endpoint
- Add explicit simulation history endpoint
- Persist simulation metadata:
  - scheduled/opened_at
  - started_at
  - finished_at
  - cooldown_started_at
  - next_available_at
  - readiness snapshot at launch
  - pass probability snapshot at launch
  - pass/fail
  - mistake count
  - timeout result
- Move simulation cooldown logic from inferred attempts to dedicated simulation state
- Preserve existing readiness calculation, but bind it to simulation entity launch

**Frontend Tasks**

- Build a dedicated simulation center
- Show readiness gauge and cooldown fuse/timer clearly
- Show simulation history and latest result
- Enforce launch flow only through real simulation route
- Separate simulation mode from normal practice/adaptive practice

**UX Tasks**

- Make simulation feel premium and high-stakes
- Show:
  - readiness score
  - why the user is or is not ready
  - when the next simulation opens
- Make cooldown feel understandable, not punitive
- Add exam-style entry and result language

**Execution Checklist**

- [x] Add simulation entity and persistence
- [x] Add dedicated simulation start and history APIs
- [x] Bind cooldown to simulation entity instead of heuristic attempts
- [x] Build simulation center and history UI
- [x] Show readiness and unlock reasons in user language
- [x] Add premium positioning around simulation access

**Success Criteria**

- Simulation is no longer an inferred frontend concept
- Cooldown and unlock logic are explicit and traceable
- Users can understand when and why simulation is available
- Simulation history exists as a first-class product record

### Phase 4 - Gamification System

**Goal**

Introduce a real motivation and retention loop backed by persistent backend state.

**Problems Solved**

- UI currently suggests gamification but backend does not support it
- No persistent reward system exists for learning effort
- No reason to return daily besides content itself

**Backend Tasks**

- Create XP wallet and XP event ledger
- Create coin wallet and coin transaction ledger
- Create achievement definitions and user-achievement state
- Create streak state and streak event tracking
- Create leaderboard snapshot tables for daily, weekly, monthly aggregation
- Define reward triggers for:
  - attempt completion
  - passing adaptive sprint
  - recovering weak topic
  - completing learning session
  - completing review queue
  - passing simulation
  - daily return streak
- Define level progression formula from XP

**Frontend Tasks**

- Add real XP and level progress
- Add coin balance and transaction visibility
- Add achievement badges and unlock moments
- Add streak indicators backed by real state
- Add leaderboard UI only after snapshots exist
- Add reward animation system:
  - XP gain
  - coin gain
  - badge unlock
  - streak continuation

**UX Tasks**

- Make rewards feel earned, not cosmetic
- Tie reward feedback to actual learning actions
- Keep gamification secondary to mastery, not a distraction
- Avoid clutter in top navigation and dashboard

**Execution Checklist**

- [ ] Add backend wallet/event models
- [ ] Add reward trigger service layer
- [ ] Add streak calculation and persistence
- [ ] Add achievement trigger engine
- [ ] Add leaderboard snapshot generation job
- [ ] Expose gamification APIs
- [ ] Reintroduce topbar gamification state only after APIs are live
- [ ] Add reward animations and unlock surfaces

**Success Criteria**

- XP, coins, streaks, achievements, and leaderboard all have real backend persistence
- Every visible reward in UI maps to an event in backend state
- Users can understand how and why they earned rewards

### Phase 5 - Economy Mechanics

**Goal**

Make coins useful inside the learning product instead of purely decorative.

**Problems Solved**

- Rewards without utility do not drive long-term engagement
- Premium and free value boundaries need clearer mechanical meaning

**Backend Tasks**

- Define coin sinks and transaction rules
- Add coin spending authorization and audit trail
- Add feature flags for spendable mechanics
- Candidate spend mechanics:
  - reduce simulation cooldown by a bounded amount
  - unlock premium-like focused practice packs for one session
  - retry one failed simulation without waiting full cooldown
  - XP boost for limited time
  - sponsor marketplace perks or referral boosts

**Frontend Tasks**

- Build spend flows with clear confirmation
- Show cost, benefit, and cooldown limits
- Add transaction history
- Explain which mechanics are premium-only, free-only, or coin-based

**UX Tasks**

- Avoid pay-to-win feel
- Keep coins tied to motivation, convenience, and acceleration
- Show scarcity and value clearly
- Ensure coin spending never hides core learning access rules

**Execution Checklist**

- [ ] Define allowed coin sinks and guardrails
- [ ] Add spending APIs and audit logs
- [ ] Build coin-spend UI flows
- [ ] Add transaction history and confirmations
- [ ] Add anti-abuse rules for cooldown reduction

**Success Criteria**

- Coins have at least 2 to 3 meaningful uses
- Coin spending is traceable and reversible where appropriate
- Economy improves engagement without damaging trust

### Phase 6 - Product Polish

**Goal**

Make the platform feel complete, fast, and production-ready across learning, analytics, premium, and marketplace surfaces.

**Problems Solved**

- Layout hierarchy feels rough
- Analytics are harder to read than necessary
- Mobile experience needs stronger prioritization
- Post-test feedback lacks polish
- Marketplace pages compete visually with core learning flows

**Backend Tasks**

- Harden analytics aggregation and query performance
- Add consistent API error envelopes where still missing
- Add rate limiting and abuse controls
- Add background jobs for snapshots, rewards, and maintenance
- Add observability for core learning funnel and simulation funnel

**Frontend Tasks**

- Finalize dashboard hierarchy and visual rhythm
- Improve mobile-first spacing and navigation behavior
- Refine attempt result feedback
- Improve analytics visualization and clarity
- Refine schools/instructors search-first layouts
- Remove duplicate patterns and dead feature paths

**UX Tasks**

- Polish motion, hover states, and empty states
- Make premium upgrade path clear and respectful
- Make analytics understandable in seconds
- Improve after-attempt recovery guidance
- Standardize loading, error, and retry states

**Execution Checklist**

- [ ] Final dashboard polish pass
- [ ] Final mobile layout pass
- [ ] Post-attempt feedback redesign
- [ ] Marketplace hierarchy cleanup
- [ ] Global loading/error pattern pass
- [ ] Performance and accessibility pass

**Success Criteria**

- Product feels cohesive across all major routes
- Mobile and desktop are both first-class
- Analytics, practice, simulation, and marketplace all feel like one platform
- Platform is ready for production rollout and iterative experimentation

## Execution Checklist By System

### Learning Core

- [ ] Align dashboard to `DashboardResponse`
- [ ] Surface review queue
- [ ] Surface lesson recommendations
- [ ] Build learning session flow
- [ ] Reconcile `UserSkill` and `UserTopicStats` usage

### Simulation

- [ ] Preserve current readiness math
- [ ] Separate simulation persistence from generic attempts
- [ ] Add simulation history
- [ ] Add cooldown visibility

### Gamification

- [ ] Add XP
- [ ] Add coins
- [ ] Add streaks
- [ ] Add achievements
- [ ] Add leaderboard

### Marketplace

- [ ] Keep schools/instructors discoverable but secondary to learning
- [ ] Retain lead and review flows
- [ ] Retain owner and admin tooling

### Payments

- [ ] Keep premium checkout stable
- [ ] Align premium messaging to real product value
- [ ] Tie premium to adaptive learning and simulation clearly

## Risk Notes

- The learning system is currently split between legacy `UserSkill` and newer learning-engine tables. If not reconciled, product behavior may remain inconsistent.
- Simulation currently relies on inferred attempt behavior. Without a dedicated entity, cooldown and history can remain ambiguous.
- Introducing gamification before backend persistence exists will recreate the current mismatch.
- Dashboard redesign should not overfit to analytics at the expense of actionability.
- Marketplace expansion can dilute the core exam-prep product if it is not visually subordinate to learning flows.
- Coin mechanics can easily feel exploitative if they affect core fairness too strongly.
- Legacy and canonical API paths coexist. Frontend must standardize on canonical routes.

## Technical Dependencies

### Backend Dependencies

- Stable canonical API contracts for `tests`, `attempts`, `analytics`, `learning`, and `lessons`
- Migration plan for new gamification models
- Background jobs for:
  - leaderboard snapshots
  - streak evaluation
  - achievement triggers
  - simulation cooldown updates if materialized
- Monitoring for:
  - attempt completion
  - simulation launch
  - reward issuance
  - checkout conversion

### Frontend Dependencies

- Typed API clients that match real backend contracts only
- Shared design tokens for dashboard, gauges, rewards, and marketplace cards
- Motion primitives for reward and progress feedback
- Robust loading and error boundaries around analytics-heavy surfaces

### Data Dependencies

- `Attempt`
- `AttemptAnswer`
- `UserQuestionHistory`
- `UserAdaptiveProfile`
- `UserSkill`
- `UserTopicStats`
- `ReviewQueue`
- `QuestionDifficulty`
- `InferenceSnapshot`
- `Subscription`
- `AnalyticsEvent`

## Final Product Direction

AUTOTEST should evolve into a platform where the main loop is:

1. practice adaptively
2. detect weak areas
3. recover through review and lessons
4. build readiness
5. unlock and take simulation
6. receive meaningful rewards
7. return for the next challenge

The roadmap above prioritizes truth before polish: first align the frontend to the backend that already exists, then expand the backend where core product systems are genuinely missing.
