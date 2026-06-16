# AUTOTEST — MASTER ROADMAP

> Revision: 2026-03-10 — Strategic Pivot: Driving Exam Intelligence Platform  
> Authority: This document is the single source of truth for AUTOTEST development.

Rules:
- Phases are executed sequentially. No phase is skipped.
- Features not listed here are not implemented.
- Every week `WEEKLY_CHECKPOINT.md` is updated.
- Completed tasks change `[ ]` → `[x]`.

---

# PHASE 0 — PROJECT CONTROL

Duration: 1 day  
Goal: Establish project navigation and development discipline.

Tasks:
[x] Create ROADMAP.md  
[x] Create PROJECT_STATUS.md  
[x] Create WEEKLY_CHECKPOINT.md  
[x] Setup Git workflow and branch strategy (main / dev)

Agents:
Any → documentation

Output:
Project navigation is clear  
All work is traceable

---

# PHASE 1 — PLATFORM STABILIZATION

Duration: 2 weeks  
Goal: Production safety, payment reliability, authentication stability.

Tasks:
[x] Database backup system  
[x] Production restore test  
[x] Payment worker (background job)  
[x] Monitoring system (Sentry)  
[x] Auth cleanup (token / cookie strategy)  
[x] Phase 1 security hardening complete  

Payment reliability hardening:
[x] Stripe webhook signature verification  
[x] DB-level unique constraint to prevent duplicate activations  
[x] Background reconciliation loop for missed webhooks  
[x] Centralized payment activation function (`activate_subscription`)

Agents:
Codex → backend implementation  
DeepSeek → code audit

Output:
Production environment safe  
Payments race-condition proof  
Auth system stable

---

# PHASE 2 — CORE LEARNING ENGINE

Duration: 3 weeks  
Goal: Implement the adaptive learning foundation.

Tasks:
[x] Core Learning Engine architecture started  
[x] `user_topic_stats` table — per-topic accuracy tracking  
[x] `question_difficulty` system — dynamic difficulty scoring  
[x] `review_queue` — SM-2 spaced repetition scheduling  
[x] Adaptive engine — Bayesian Knowledge Tracing mastery model  
[x] Memory decay / retention scoring (Ebbinghaus curve)  
[x] Pass probability rule engine (`analytics/pass_probability.py`)  
[x] Dashboard probability endpoint `GET /analytics/me/dashboard`  
[x] Weak topic detection and recommendations  
[x] Review queue API `GET /analytics/me/review-queue`

Agents:
Codex → algorithm implementation  
ChatGPT → learning model logic

Output:
Adaptive learning system operational  
Rule-based probability prediction active  
Learning engine tables operational  
Prediction snapshot system implemented

---

# PHASE 2.5 — INTELLIGENCE INTEGRATION

Duration: 2 weeks  
Goal: Integrate the Learning Engine with the ML prediction pipeline.

Audit Finding:
ML infrastructure exists but still reads from the legacy `UserSkill` table instead of the new learning engine tables.

Current state:
`ml_status="rule_only"`

This phase enables real ML predictions.

---

## ML Feature Migration

Tasks:

[ ] Replace ML features that read from `UserSkill`  
[ ] Integrate `ml/features.py` with `user_topic_stats`  
[ ] Integrate `ml/features.py` with `question_difficulty`  
[ ] Integrate `ml/features.py` with `review_queue`  
[ ] Bump `FEATURE_VERSION` after migration  
[ ] Remove all debug prints from ML feature code  

ML dataset validation pipeline:

[ ] Feature sanity checks  
[ ] Label leakage detection  
[ ] Class balance verification  
[ ] Training dataset integrity validation  

---

## Training Pipeline Completion

Tasks:

[ ] Fix incomplete `ml/train_pass_model.py` implementation  
[ ] Ensure training queries join learning engine tables correctly  
[ ] Validate minimum training thresholds:

Minimum data requirements:

- ≥ 30 attempts
- ≥ 5 unique users

[ ] Implement label generation:

pass = score ≥ passing threshold

[ ] ML model evaluation metrics:

- AUC
- Precision
- Recall
- F1 score
- Probability calibration

[ ] Generate first production ML model artifact (`.joblib`) into `ml_models/`

---

## Model Serving

Tasks:

[ ] Implement model artifact loading via `ModelRegistry`  
[ ] Verify `InferenceEngine` singleton loads the model correctly  
[ ] Confirm `safe_ml_inference` fallback logic  

---

## Dashboard ML Integration

Tasks:

Decide dashboard inference strategy:

Option A — Live ML inference per dashboard request  
Option B — Snapshot-based inference (recommended)

[ ] Unify prediction scale across system (0.0 → 1.0)  
[ ] Integrate ML predictions into `GET /analytics/me/dashboard`  
[ ] Update `ml_status`:

rule_only → ml_active

[ ] Store prediction snapshots on every attempt completion

---

## Scheduler

Tasks:

[ ] Enable `retrain_scheduler`

Trigger retraining when:

- AUC < 0.65
- OR ≥ 50 new attempts since last training

---

Agents:

Codex → feature migration & training pipeline  
DeepSeek → code audit & scale consistency  
ChatGPT → ML architecture design

Output:

ML features read only from learning engine tables  
First production model artifact generated  
Dashboard returns ML predictions  
Rule engine kept as fallback  
Prediction scale unified (0.0–1.0)

---

# PHASE 3 — UI SYSTEM

Duration: 2 weeks  
Goal: Professional SaaS interface.

Tasks:

[x] Design system created (shadcn/ui + Tailwind)  
[x] Dashboard architecture built (4-zone layout)  
[x] Test interface polished  
[x] Mobile responsiveness  

Post-ML integration tasks:

[ ] Dashboard redesign reflecting ML engine state  
[ ] SystemStatusBar updated for ML state  
[ ] Visual indicator:

ml_status="rule_only"  
ml_status="ml_active"

Agents:

Claude → UI / UX design  
Codex → frontend implementation

Output:

Professional SaaS UI  
ML state visible in dashboard

---

# PHASE 4 — PLATFORM HARDENING

Duration: 2 weeks  
Goal: Production-grade multi-tenancy core and system observability.

Tasks:
[ ] Multi-tenant RBAC system (Fine-grained roles: SuperAdmin, SchoolAdmin, Instructor, Student)  
[ ] Promocode Linking System (Discount + School Join + Group Assignment)  
[ ] Standardized Error Handling (Error codes + Request IDs)  
[ ] Centralized JSON Logging & Monitoring Integration  
[ ] Rate Limiting hardening for multi-tenant isolation  
[ ] Media pipeline security audit (S3/Local storage hardening)

Agents:
Codex → backend  
DeepSeek → audit

Output:
Stable, observable core ready for B2B and Gamification layers.

---

# PHASE 4.5 — ENGAGEMENT ENGINE (GAMIFICATION)

Duration: 3 weeks  
Goal: Increasing student retention and Exam Simulation responsibility via XP, Coins, and Cooldowns.

**1. Exam Simulation System**
[ ] High-fidelity exam format simulation (Real rules, strict timing)  
[ ] Attempt cooldown mechanic (2–3 weeks refresh period)  
[ ] Visual cooldown indicator (Radial timer on dashboard)  
[ ] Post-simulation AI performance tahlil (Initial baseline)  

**2. XP Progression System**
[ ] XP earning logic (unlocked via practice tests, weak topic mastery, streaks, simulation success)  
[ ] XP spending logic (Cooldown reduction, early simulation unlock)  

**3. Coin Economy**
[ ] Centralized Wallet system (Coins earned or purchased)  
[ ] Coin utility (Instant simulation unlock, bypass cooldown, advanced analytics access)  

**4. Leaderboard & Rewards**
[ ] Dynamic Leaderboards (Daily / Weekly / Monthly)  
[ ] Automated Reward Trigger (e.g., Weekly #1 → 1 Month Premium)  
[ ] Achievement system (Milestone badges)  

Agents:
Codex → Gamification logic  
Claude → Visual design (Animations, Radial Timers)

Output:
Students are driven by a sense of progress, responsibility, and reward.

---

# PHASE 5 — AUTOTEST FOR SCHOOLS

Duration: 4 weeks  
Goal: Transforming driving schools into data-driven learning centers.

**1. School & Instructor Management**
[ ] School entity management (Profiles, Logos, Settings)  
[ ] Instructor accounts with group-level oversight permissions  
[ ] School Admin dashboard for staff management  

**2. Linking & Group Structure**
[ ] Multi-functional Promocode logic (Code = {Discount, School, Group})  
[ ] School Join via Invite Links / QR Codes  
[ ] School → Group → Student hierarchy implementation  

**3. Instructor Oversight (Intelligence Layer)**
[ ] Instructor dashboard (Monitor real-time Student Readiness, Weak Topics, Pass Probability)  
[ ] Aggregate weak topic analytics per Group  
[ ] Activity tracking & Practice streak monitoring  

**4. Learning Nudge System (B2B Messaging)**
[ ] Instructor-to-Student "Learning Nudges" (One-way guidance messages)  
[ ] Student UI integration (Chat-style notification bubbles)  
[ ] School branding (Logo) applied to messages and dashboards  

**5. School Analytics (B2B Reporting)**
[ ] School-wide pass rate performance  
[ ] Instructor performance tracking (Student success rate per instructor)  
[ ] Student readiness distribution reports  

Agents:
Codex → B2B Backend + Dashboards  
Claude → B2B UX/UI

Output:
A powerful learning monitoring layer for schools (Non-ERP focus).

---

# PHASE 6 — ML INTELLIGENCE ACTIVATION

Duration: 2 weeks  
Goal: Activating the high-accuracy prediction system.

Tasks:
[ ] Transition from `rule_only` to `ml_active` status  
[ ] Deploy XGBoost/LightGBM ensemble for Pass Probability  
[ ] Drift detection & Automated safety fallback implementation  
[ ] Advanced surfacing of AI probability signals (Stability score, Readiness date)  

Agents:
Codex → ML engineering  
DeepSeek → model audit

Output:
AI-driven confidence for students and schools.

---

# PHASE 7 — NATIONAL LEARNING DATA

Duration: 2 weeks  
Goal: Leveraging Big Data for national learning insights.

Tasks:
[ ] Aggregated National Analytics (Most failed topics, regional heatmaps)  
[ ] Learning benchmarks (National vs Regional performance)  
[ ] Public-facing learning trend reports  

Agents:
Codex → Data engineering  
ChatGPT → Analysis logic

Output:
AUTOTEST becomes the national authority on driving exam data.

---

# PHASE 8 — MARKETPLACE & SCHOOL RANKING

Duration: 3 weeks  
Goal: Empowering user choice via objective performance data.

Tasks:
[ ] School Ranking system based on objective Student Readiness & Pass Rates  
[ ] Public School & Instructor intelligence profiles  
[ ] Lead generation system for top-performing schools  

Agents:
Codex → Marketplace logic  
Claude → SEO & Marketplace UX

Output:
Full circular economy: Learn → Pass → Rank → Marketplace.

---

# DEVELOPMENT RULES

Rule 1 — Phase order  
0 → 1 → 2 → 2.5 → 3 → 4 → 4.5 → 5 → 6 → 7 → 8

Rule 2 — Multi-tenancy Isolation  
School Students see school branding and instructor nudges; Regular Students see the standard engagement layer.

Rule 3 — Intelligence Layer Boundary  
AUTOTEST provides intelligence/insights; it does not handle school operations (ERP duties).

Rule 4 — Prediction Scale  
All probabilities use scale 0.0 → 1.0 internally.

Rule 5 — Gamification Integrity  
XP and Coins must be earnable via actual learning progress to maintain product value.

---

# TOTAL TIMELINE

Phase | Duration
--- | ---
Phase 0 | 1 day
Phase 1 | 2 weeks
Phase 2 | 3 weeks
Phase 2.5 | 2 weeks
Phase 3 | 2 weeks
Phase 4 | 2 weeks
Phase 4.5 | 3 weeks
Phase 5 | 4 weeks
Phase 6 | 2 weeks
Phase 7 | 2 weeks
Phase 8 | 3 weeks

Total: ≈ 25 weeks (≈ 6 months)

---

# PROJECT GOAL

AUTOTEST: The Driving Exam Intelligence Platform.

Student Engagement (XP/Coins/Simulation)  
+  
AI Learning Engine (Probability/Weak Topics)  
+  
School Layer (B2B Oversight/Nudges)  
+  
National Data Insights