# DATABASE REPORT

## Database

- Engine: PostgreSQL.
- Local target used: `localhost:5432/autotest`.
- ORM: SQLAlchemy async.
- Driver: `asyncpg`.
- Migration tool: Alembic.
- Current Alembic revision: `0059 (head)`.

## Migrations

Migrations are stored in `alembic/versions/`.

Executed safely against the local database:

```powershell
$env:APP_ENV_FILE='.env'
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Result: success. The backend startup readiness check passes with the migrated schema.

Note: `database/readiness.py` tells operators to run `python scripts/safe_migrate.py`, but that file is not present in this repository. Plain Alembic works for local development.

## Tables

The migrated local database contains 69 tables:

`achievement_definitions`, `admin_status_migration_audit`, `alembic_version`, `analytics_events`, `answer_options`, `attempt_answers`, `attempts`, `coin_transactions`, `coin_wallets`, `driving_instructor_applications`, `driving_instructor_complaints`, `driving_instructor_leads`, `driving_instructor_media`, `driving_instructor_registration_settings`, `driving_instructor_reviews`, `driving_instructors`, `driving_school_courses`, `driving_school_leads`, `driving_school_media`, `driving_school_partner_applications`, `driving_school_reviews`, `driving_schools`, `exam_simulation_attempts`, `experiments`, `features`, `feedbacks`, `guest_attempt_answers`, `guest_attempts`, `inference_snapshots`, `leaderboard_snapshots`, `lessons`, `ml_dataset`, `payments`, `pending_registrations`, `permissions`, `promo_code_plans`, `promo_codes`, `promo_redemptions`, `question_categories`, `question_difficulty`, `questions`, `refresh_sessions`, `review_queue`, `role_permissions`, `roles`, `school_memberships`, `simulation_exam_settings`, `subscription_plans`, `subscriptions`, `tests`, `user_achievements`, `user_adaptive_profiles`, `user_exam_results`, `user_experiments`, `user_notifications`, `user_prediction_snapshots`, `user_question_history`, `user_roles`, `user_sessions`, `user_skills`, `user_streaks`, `user_topic_stats`, `user_training_history`, `users`, `verification_tokens`, `violation_logs`, `xp_boosts`, `xp_events`, `xp_wallets`.

## Main relationships

- Users connect to auth/session tables: `refresh_sessions`, `user_sessions`, `verification_tokens`, `pending_registrations`.
- Users connect to subscription/payment tables: `subscriptions`, `payments`, `promo_redemptions`.
- Tests connect to questions and attempts: `tests -> questions -> answer_options`; `tests -> attempts -> attempt_answers`.
- Guest flow mirrors attempts through `guest_attempts` and `guest_attempt_answers`.
- Analytics/ML tables connect to users, attempts, exam results, and prediction snapshots.
- RBAC uses `roles`, `permissions`, `role_permissions`, `user_roles`, and optional `school_id` scope.
- Driving school marketplace uses `driving_schools`, courses, media, reviews, leads, partner applications, and school memberships.
- Driving instructor marketplace uses `driving_instructors`, media, reviews, leads, complaints, and applications.
- Gamification uses achievements, XP wallets/events/boosts, coin wallets/transactions, streaks, notifications, and leaderboards.

## Seeders

Seed scripts exist in `scripts/`, including:

- `seed_local_test_data.py`
- `seed_full_demo_site.py`
- `seed_driving_schools.py`
- `seed_driving_instructors.py`
- `seed_demo_catalog_content.py`
- `seed_category_lessons.py`
- `seed_50_test_data.py`
- `full_seed.py`
- `reseed_question_bank_100.py`

Executed safely against local database:

```powershell
$env:APP_ENV_FILE='.env'
.\.venv\Scripts\python.exe scripts\seed_local_test_data.py
```

Final local seed counts:

- Users: 27
- Lessons: 82
- Tests: 11
- Questions: 230
- Schools: 6
- Instructors: 16

## Required startup data

The app can start with a migrated schema. Demo/local usage is much more complete after running `scripts/seed_local_test_data.py`, which creates demo users, tests, lessons, schools, instructors, RBAC defaults, and related catalog data.

Demo accounts created by the seed:

- `demo.admin@example.com`
- `demo.student@example.com`
- `demo.free@example.com`
- `demo.school.owner@example.com`
- `demo.instructor.owner@example.com`

Shared demo password printed by the seed:

`AutotestDemo!2026`

## Database warnings

- TsPay token is not configured, so subscription payments fail until owner credentials are supplied.
- Seed scripts originally used legacy lowercase statuses that violated canonical status constraints; this was fixed in the seed scripts only.
