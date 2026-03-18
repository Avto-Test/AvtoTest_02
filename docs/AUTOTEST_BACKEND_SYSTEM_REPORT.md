# AUTOTEST Backend and System Report

Last updated: March 15, 2026

This report documents the current AUTOTEST backend so a UI design or frontend planning system can understand what the platform really supports, what data exists, and which interfaces can be built without guessing.

Important scope notes:

- This report is based on the current codebase in `main.py`, `api/*`, `models/*`, `services/*`, `analytics/*`, and related schemas.
- Canonical API routes are mounted under `/api`.
- Many routers are also mounted as legacy compatibility mirrors without the `/api` prefix in `main.py`.
- Payments and promocode routes already use explicit `/api/...` paths in their own router definitions.

---

## SECTION 1 - SYSTEM OVERVIEW

### 1.1 Core Platform Purpose

AUTOTEST is a driving exam preparation platform focused on:

- adaptive practice from a shared question bank
- weak-topic detection and recovery
- spaced repetition and review scheduling
- exam simulation with readiness gating and cooldown
- premium subscription and promo-based monetization
- gamification with XP, coins, achievements, streaks, and leaderboard
- marketplace discovery for driving schools and driving instructors

The product is not just a static test catalog. Its backend is designed to behave like a learning system that tracks user performance over time and uses that data to recommend the next useful action.

### 1.2 Main Subsystems

| Subsystem | What it does | Main backend areas |
| --- | --- | --- |
| Authentication | Registration, verification, login, refresh sessions, password reset | `api/auth`, `models/user`, `models/verification_token`, `models/refresh_session`, `models/pending_registration` |
| Practice and attempts | Starts standard, adaptive, free-random, learning, guest, and simulation attempts | `api/tests`, `api/attempts`, `models/attempt`, `models/attempt_answer` |
| Learning engine | Detects weak topics, builds adaptive sessions, tracks topic mastery and review queue | `services/learning/*`, `models/user_skill`, `models/user_topic_stats`, `models/review_queue`, `models/user_question_history` |
| Analytics | Builds dashboard intelligence, pass probability, readiness, history, review summaries | `api/analytics/*`, `analytics/pass_probability.py`, `models/inference_snapshot`, `models/analytics_event` |
| Simulation engine | Dedicated exam simulation entity, lock rules, cooldown, history | `api/simulation`, `models/exam_simulation_attempt`, `services/learning/simulation_service.py` |
| Gamification | XP, coins, streaks, achievements, leaderboard | `api/users`, `api/leaderboard`, `services/gamification/rewards.py`, `models/xp_wallet`, `models/coin_wallet`, `models/user_streak` |
| Economy mechanics | Coin spending for cooldown reduction, XP boost, focus pack | `api/economy`, `services/gamification/economy.py`, `models/xp_boost`, `models/coin_transaction` |
| Payments | Subscription plans, checkout sessions, quotes, promo redemption, provider webhooks | `api/payments`, `models/subscription`, `models/payment`, `models/subscription_plan`, `models/promo_code` |
| Notifications | In-app notifications and read state | `api/notifications`, `models/user_notification` |
| Marketplace | Driving schools, instructors, leads, reviews, complaints, referrals, promo stats | `api/driving_schools`, `api/driving_instructors`, related models |
| Admin and RBAC | Admin CRUD, moderation, analytics, role-based school access | `api/admin`, `api/analytics/admin`, `api/school_router.py`, `core/rbac.py` |
| Feedback and moderation | User feedback capture, violation logs, admin review | `api/feedback`, `api/violations`, `models/feedback`, `models/violation_log` |

### 1.3 Architecture Style

AUTOTEST uses a monolithic but modular backend architecture:

- **Framework:** FastAPI
- **Persistence:** async SQLAlchemy ORM + Alembic migrations
- **Routing style:** domain-organized routers under `api/*`
- **Contracts:** Pydantic schemas per domain
- **Business logic:** service modules under `services/*`
- **Analytics logic:** rule-based analytics + optional ML blending
- **Background behavior:** startup task refreshes leaderboard snapshots every 5 minutes
- **Access control:** direct `is_admin` flag plus RBAC role/permission system for school contexts

### 1.4 Architectural Characteristics That Matter for UI

- The backend is **stateful**. UI should not assume static content; many screens depend on user-specific calculated state.
- Learning state is currently split between two systems:
  - legacy topic model: `UserSkill`
  - newer normalized model: `UserTopicStats` + `ReviewQueue`
- Simulation is now a **dedicated entity** (`ExamSimulationAttempt`), but still reuses the generic `Attempt` table for question delivery and scoring.
- The dashboard is the main intelligence surface. Most of the product-level recommendations come from one contract: `DashboardResponse`.
- Several features are premium-gated:
  - adaptive practice
  - simulation mode
  - some lessons
  - some answer review behavior

---

## SECTION 2 - DATABASE STRUCTURE

This section lists the major data models that shape product behavior. Supporting models are included where they materially affect UI behavior or flow design.

### 2.1 Identity and Access Models

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `User` | `id`, `email`, `hashed_password`, `full_name`, `is_active`, `is_verified`, `is_admin`, `created_at` | Core identity, auth state, premium/admin visibility, owner-role detection |
| `VerificationToken` | verification and reset codes, token type, expiry, usage state | Email verification and password reset flows |
| `RefreshSession` | hashed refresh token family, device metadata, expiry | Session rotation, logout, multi-session safety |
| `PendingRegistration` | email, hashed password, registration verification code, expiry | Registration before email verification is completed |
| `Role` | RBAC role names | Admin, school, instructor, student role handling |
| `Permission` | permission identifiers | Used by RBAC-protected school/admin routes |
| `RolePermission` | role-to-permission mapping | Supports permission inheritance |
| `UserRole` | direct user-to-role assignments | Supports super admin and staff access |
| `SchoolMembership` | user membership inside a school, group membership, role | Powers school dashboard/group pages |

### 2.2 Learning Content Models

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `Test` | `title`, `description`, `difficulty`, `is_active`, `is_premium`, `duration` | Standard test listing, synthetic adaptive/learning/simulation shells |
| `QuestionCategory` | `name`, `description`, `is_active` | Canonical topic/category grouping for admin and analytics |
| `Question` | text, media URLs, topic/category text, `category_id`, difficulty, `difficulty_percent`, aggregate counters | Practice content, filters, weak-topic mapping, media rendering |
| `AnswerOption` | answer text, correctness flag | Shown in all test and simulation sessions |
| `Lesson` | title, description, content type, URL, topic, section, premium flag, sort order | Lesson feed, recommendations, premium gating |

### 2.3 Attempt and Session Models

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `Attempt` | `user_id`, `test_id`, `score`, `started_at`, `finished_at`, `mode`, `training_level`, `pressure_mode`, `question_ids`, `question_count`, `time_limit_seconds`, response-time metrics | Core practice/simulation session record |
| `AttemptAnswer` | selected option per question per attempt, correctness | Result review and per-question feedback |
| `GuestAttempt` | guest test attempts before registration | Guest onboarding/test trial |
| `GuestAttemptAnswer` | per-question guest answers | Guest scoring |
| `ViolationLog` | user/guest/test/attempt, event type, details, timestamps | Proctoring and anti-cheat UI, admin moderation |

### 2.4 Personalization, Analytics, and Learning State

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `UserAdaptiveProfile` | target difficulty percent and adaptation state | Controls adaptive practice difficulty tuning |
| `UserSkill` | per-topic `skill_score`, `bkt_knowledge_prob`, `retention_score`, repetition counters, review schedule | Legacy but still active source for review queue, topic decay, and analytics |
| `UserTopicStats` | per user + question category: attempts, correct/wrong counts, `accuracy_rate`, `last_attempt_at` | Newer weak-topic and mastery signal source |
| `UserQuestionHistory` | per user + question: attempts, correct count, last seen/correct timestamps | Prevents over-repetition and drives mastery-aware selection |
| `QuestionDifficulty` | per question attempt counts, wrong/correct counts, rolling `difficulty_score` | Difficulty visualization and adaptive selection tuning |
| `ReviewQueue` | per user + question due date, interval, last result | Spaced repetition and review practice |
| `InferenceSnapshot` | per attempt ML/rule inference outputs, confidence, drift, readiness | Analytics history and intelligence timeline |
| `AnalyticsEvent` | event name, optional user, metadata JSON, timestamp | Funnel tracking, marketplace views, learning events, simulation events |
| `UserTrainingHistory` | historical training records | Present in schema but currently less central than `Attempt`/analytics views |

### 2.5 Simulation Model

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `ExamSimulationAttempt` | `id`, `user_id`, `scheduled_at`, `started_at`, `finished_at`, `cooldown_started_at`, `next_available_at`, `readiness_snapshot`, `pass_probability_snapshot`, `question_count`, `pressure_mode`, `mistake_count`, `timeout`, `passed`, `cooldown_reduction_days_used` | Dedicated simulation history, cooldown, pass/fail display, readiness snapshot at launch |

### 2.6 Gamification and Economy Models

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `XPWallet` | `total_xp`, `level`, `last_updated` | Topbar progress, profile progression, reward screen |
| `XPEvent` | immutable XP ledger: `source`, `xp_amount`, timestamp | Reward history, leaderboard aggregation, auditability |
| `CoinWallet` | current coin balance | Coin economy UI |
| `CoinTransaction` | immutable coin credits/debits: `amount`, `type`, `source`, timestamp | Spend history, balance validation |
| `XPBoost` | temporary multiplier window, source, activation, expiry | Economy UI and reward amplification |
| `UserStreak` | `current_streak`, `longest_streak`, `last_activity_date` | Daily retention messaging and reward feedback |
| `AchievementDefinition` | catalog of achievements: name, description, icon, trigger rule | Achievement library UI |
| `UserAchievement` | unlocked achievement with awarded timestamp | Reward unlock toasts, profile achievements |
| `LeaderboardSnapshot` | rank, period, XP earned, capture time | Leaderboard page, rank preview, competition surfaces |

### 2.7 Monetization Models

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `SubscriptionPlan` | plan code, name, description, price, duration, sort order | Pricing and checkout page |
| `Subscription` | user plan, status, provider, validity window | Premium gating and account status |
| `Payment` | checkout/provider transaction data | Payment tracking and status polling |
| `PromoCode` | code, discount type/value, validity, limits, school/group linkage | Checkout promo UX, marketplace referrals |
| `PromoCodePlan` | which plans a promo applies to | Quote/redeem eligibility |
| `PromoRedemption` | which user redeemed which promo | Promo stats, school/instructor growth analysis |

### 2.8 Marketplace Models - Driving Schools

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `DrivingSchool` | public profile, contact info, location, map, owner, referral code, promo code, active status | School catalog/detail pages |
| `DrivingSchoolCourse` | category code, duration, price, installments, description | Pricing cards and catalog metadata |
| `DrivingSchoolMedia` | gallery/media items | Visual detail pages |
| `DrivingSchoolLead` | lead contact info, requested category, status, source | Conversion tracking, owner dashboard |
| `DrivingSchoolReview` | rating, comment, visibility | Social proof and moderation |
| `DrivingSchoolPartnerApplication` | potential partner school application | Partner onboarding workflow |

### 2.9 Marketplace Models - Driving Instructors

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `DrivingInstructor` | public profile, city, bio, car, transmission, hourly price, image, verification flags, promo/referral codes | Instructor catalog and detail pages |
| `DrivingInstructorMedia` | gallery/media items | Visual profile content |
| `DrivingInstructorLead` | student lead contact, requested transmission, status | Conversion tracking and owner dashboard |
| `DrivingInstructorReview` | rating, comment, visibility | Reviews UI |
| `DrivingInstructorApplication` | instructor onboarding application and status | Apply flow and admin moderation |
| `DrivingInstructorComplaint` | complaint records against instructor | Complaint reporting and moderation |
| `DrivingInstructorRegistrationSetting` | campaign/pricing settings for instructor onboarding | Instructor registration marketing UI |

### 2.10 Engagement and Support Models

| Model | Stores | Why UI cares |
| --- | --- | --- |
| `UserNotification` | notification type, title, message, payload, read state | Bell icon, reminders, alerts |
| `Feedback` | user rating, category, comment, suggestion, admin note, status | Feedback forms and admin review |

---

## SECTION 3 - API ENDPOINTS

### 3.1 Route Notes

- All paths below are shown in canonical form under `/api`.
- In `main.py`, most routers are also mounted as legacy mirrors without `/api`.
- Payment and promocode routes already define explicit `/api/...` paths inside their router files.

### 3.2 Authentication Endpoints

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/auth/register` | POST | Create pending registration and send verification code | `UserCreate { email, password }` | `MessageResponse { message }` | Register |
| `/api/auth/login` | POST | Authenticate user and issue access + refresh tokens | `UserLogin { email, password }` | `Token { access_token, refresh_token, token_type, access_token_expires_in, refresh_token_expires_in }` | Login |
| `/api/auth/refresh` | POST | Rotate refresh session and issue fresh tokens | refresh token context | `Token` | Session refresh / auth bootstrap |
| `/api/auth/logout` | POST | Revoke refresh session | auth context | `MessageResponse` | Logout |
| `/api/auth/me` | GET | Return authenticated user profile and trigger daily login reward | bearer token | `UserMeResponse` | Auth bootstrap, topbar session, protected layout |
| `/api/auth/verify` | POST | Verify email and complete registration | `VerifyEmail { email, code }` | `Token` | Verify email |
| `/api/auth/resend-verification` | POST | Resend email verification code | `ResendVerificationRequest { email }` | `MessageResponse` | Verify email |
| `/api/auth/forgot-password` | POST | Create password reset code | `ForgotPasswordRequest { email }` | `MessageResponse` | Forgot password |
| `/api/auth/reset-password` | POST | Confirm password reset by code | `ResetPasswordRequest { email, code, new_password }` | `MessageResponse` | Reset password |

### 3.3 User, Gamification, Economy, and Leaderboard Endpoints

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/users/me` | GET | Current profile and owner flags | auth | `UserMeResponse` | Profile, settings, sidebar visibility |
| `/api/users/me/xp` | GET | XP summary only | auth | `XPSummaryResponse` | Progress widgets, post-test rewards |
| `/api/users/me/coins` | GET | Coin balance only | auth | `CoinBalanceResponse` | Topbar, economy spend UI |
| `/api/users/me/streak` | GET | Streak state only | auth | `StreakResponse` | Topbar, retention messaging |
| `/api/users/me/achievements` | GET | Full unlocked achievements | auth | `AchievementListResponse` | Profile achievements, reward history |
| `/api/users/me/gamification` | GET | Combined gamification snapshot | auth | `GamificationSummaryResponse` | Topbar, reward refresh, profile summary |
| `/api/leaderboard` | GET | Leaderboard by period | query: `period=daily|weekly|monthly`, `limit` | `LeaderboardResponse` | Leaderboard page, dashboard preview |
| `/api/leaderboard/me` | GET | Current user's leaderboard position | query: `period` | `MyLeaderboardResponse` | Profile rank, dashboard competition copy |
| `/api/economy/overview` | GET | Coin economy offers and active XP boost | auth | `EconomyOverviewResponse` | Practice economy UI, simulation center, profile |
| `/api/economy/simulation/reduce-cooldown` | POST | Spend coins to reduce simulation cooldown | `CooldownReductionRequest { days }` | `CooldownReductionResponse` | Simulation center |
| `/api/economy/xp-boost/activate` | POST | Spend coins on 30-minute XP boost | auth | `XPBoostActivationResponse` | Practice page, topbar boost state |
| `/api/economy/focus-pack` | POST | Spend coins for topic-focused learning session | `FocusPackRequest { topic, question_count }` | `FocusPackResponse { session_id, topic, question_count, coin_balance, coins_spent, questions[] }` | Practice page |

### 3.4 Test Discovery and Attempt Endpoints

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/tests` | GET | List active non-adaptive tests | query: `skip`, `limit` | `list[PublicTestList]` | Practice page, standard tests |
| `/api/tests/free-status` | GET | Show free-plan daily attempt usage | auth | `FreeTestStatus` | Dashboard and practice gating |
| `/api/tests/adaptive/start` | POST | Start premium adaptive practice | `AdaptiveStartRequest { question_count, pressure_mode }` | `AdaptiveStartResponse` | Centralized practice launch |
| `/api/tests/free-random` | GET | Start free random practice | auth | `AdaptiveStartResponse` with usage counters | Free fallback when premium unavailable |
| `/api/tests/{test_id}` | GET | Return one test with questions | path `test_id` | `PublicTestDetail` | Standard test detail/start |
| `/api/attempts/start` | POST | Start standard fixed test attempt | `StartAttempt { test_id, pressure_mode, question_count? }` | `StartAttemptResponse` | Standard practice |
| `/api/attempts/answer` | POST | Save one answer incrementally | `SubmitAnswer { attempt_id, question_id, selected_option_id }` | `AnswerResponse` | Test player |
| `/api/attempts/finish` | POST | Finish attempt and return simple score | `FinishAttempt { attempt_id }` | `ScoreResponse` | Legacy test flow |
| `/api/attempts/submit` | POST | Main rich submission endpoint | `BulkSubmit { attempt_id, answers, response_times[] }` | `BulkSubmitResponse` | Main assessment result page |
| `/api/attempts/guest/start` | POST | Start guest attempt | `GuestStartAttempt { test_id }` | `AttemptResponse` | Guest try-before-register |
| `/api/attempts/guest/answer` | POST | Save guest answer | `GuestSubmitAnswer` | `AnswerResponse` | Guest player |
| `/api/attempts/guest/finish` | POST | Finish guest attempt | `GuestFinishAttempt` | `ScoreResponse` | Guest result |

### 3.5 Analytics, Learning, Lessons, and Simulation Endpoints

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/analytics/me/summary` | GET | Overall performance summary | auth | `UserAnalyticsSummary` | Analytics page, quick profile summary |
| `/api/analytics/me/tests` | GET | Per-test performance analytics | auth | `list[UserTestAnalytics]` | Analytics page |
| `/api/analytics/me/review-queue` | GET | Topics due for spaced repetition | auth | `ReviewQueueResponse` | Dashboard, review practice, learning path |
| `/api/analytics/me/dashboard` | GET | Main learning intelligence payload | auth | `DashboardResponse` | Dashboard, learning path, simulation center |
| `/api/analytics/me/intelligence-history` | GET | Historical inference snapshots | auth | `list[IntelligenceSnapshot]` | Analytics page |
| `/api/analytics/summary` | GET | Legacy mirror of summary | auth | `UserAnalyticsSummary` | Compatibility only |
| `/api/analytics/dashboard` | GET | Legacy mirror of dashboard | auth | `DashboardResponse` | Compatibility only |
| `/api/analytics/track` | POST | Persist analytics/funnel event | `TrackEventRequest { event, metadata }` | `204 No Content` | Upgrade funnel tracking, other instrumentation |
| `/api/analytics/funnel` | GET | Aggregated conversion funnel | query `period=today|yesterday|7d|30d` | counts + CTR + conversion rate | Admin analytics |
| `/api/learning/session` | POST | Create backend-generated learning session | `CreateLearningSessionRequest { question_count }` | `LearningSessionResponse { session_id, questions[] }` | Dashboard / practice “Mashqni boshlash” |
| `/api/lessons` | GET | Authenticated lesson feed and sections | auth | `LessonsFeedResponse` | Lessons page, dashboard lesson suggestions |
| `/api/simulation/start` | POST | Start or resume simulation | auth, premium/admin, launch readiness required | `SimulationStartResponse` | Simulation page |
| `/api/simulation/history` | GET | Recent simulation history | auth | `SimulationHistoryResponse` | Simulation page |

### 3.6 Notifications, Feedback, Violations, and School RBAC Endpoints

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/notifications` | GET | List notifications | query: `unread_only`, `limit` | `list[NotificationResponse]` | Topbar bell, notification panel |
| `/api/notifications/{notification_id}/read` | POST | Mark one notification as read | path param | `204 No Content` | Notification panel |
| `/api/notifications/read-all` | POST | Mark all notifications as read | auth | `204 No Content` | Notification panel |
| `/api/feedback` | POST | Submit user feedback | `FeedbackCreate` | `FeedbackResponse` | Feedback form / settings |
| `/api/feedback/me` | GET | Current user feedback history | auth | `list[FeedbackResponse]` | Profile/settings feedback history |
| `/api/feedback/admin` | GET | Admin list of feedback | query `status`, `limit` | `list[FeedbackResponse]` | Admin feedback moderation |
| `/api/feedback/admin/{feedback_id}` | PUT | Admin update feedback status/note | `FeedbackAdminUpdate` | `FeedbackResponse` | Admin feedback moderation |
| `/api/violations/log` | POST | Log proctoring/violation event | free-form JSON with `event_type`, optional `test_id`, `attempt_id`, `details` | `{ success: true }` | Test player anti-cheat hooks |
| `/api/school/dashboard` | GET | RBAC-protected school summary | query optional `school_id` | `SchoolDashboardResponse` | School staff dashboard |
| `/api/school/groups/{group_id}` | GET | School group membership detail | path `group_id`, query optional `school_id` | `SchoolGroupResponse` | School admin group view |

### 3.7 Payments and Promocode Endpoints

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/payments/plans` | GET | List public subscription plans | none | `list[PublicSubscriptionPlanResponse]` | Pricing, upgrade |
| `/api/payments/quote` | POST | Quote checkout amount for plan + promo | quote payload by plan and optional promo | `CheckoutQuoteResponse` | Upgrade |
| `/api/payments/create-session` | POST | Start external checkout | `CreateSessionRequest { plan_id, promo_code, success_url, cancel_url }` | `CreateSessionResponse { checkout_url, session_id, provider }` | Upgrade |
| `/api/payments/redeem-promo` | POST | Instantly redeem fully discounted promo | `RedeemPromoRequest { plan_id, promo_code }` | `RedeemPromoResponse` | Upgrade / promo redemption |
| `/api/payments/transactions/{cheque_id}` | GET | Poll payment transaction state | path `cheque_id` | `TransactionStatusResponse` | Payment success/pending screens |
| `/api/payments/webhook` | POST | Provider webhook endpoint | provider payload | `WebhookResponse` | No direct UI; payment provider |
| `/api/payments/webhook/tspay` | POST | TsPay-specific webhook endpoint | provider payload | `WebhookResponse` | No direct UI; payment provider |
| `/payments/checkout` | POST | Hidden legacy checkout route | legacy payload | `CheckoutResponse` | Legacy compatibility only |
| `/payments/webhook` | POST | Hidden legacy webhook route | provider payload | `WebhookResponse` | Legacy compatibility only |
| `/payments/webhook/tspay` | POST | Hidden legacy TsPay webhook | provider payload | `WebhookResponse` | Legacy compatibility only |
| `/api/promocode/apply` | POST | Link/apply a driving school promo code to current user | `ApplyPromocodeRequest { code }` | `ApplyPromocodeResponse { success, discount_percent, school_linked, group_assigned }` | Profile, school referral flows |

### 3.8 Driving School Public and Owner Endpoints

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/driving-schools` | GET | Search and list schools | query: `q`, `city`, `region`, `category`, `price_min_cents`, `price_max_cents`, `rating_min`, `duration_max_weeks`, `sort_by`, `limit`, `offset` | `DrivingSchoolCatalogResponse` | Schools catalog |
| `/api/driving-schools/meta` | GET | Filter metadata | none | `DrivingSchoolMetaResponse` | Schools filters |
| `/api/driving-schools/{school_slug}` | GET | School detail | path `school_slug` | `DrivingSchoolDetailResponse` | School detail modal/page |
| `/api/driving-schools/{school_slug}/leads` | POST | Submit school lead | `DrivingSchoolLeadCreate` | `DrivingSchoolLeadResponse` | School CTA form |
| `/api/driving-schools/{school_slug}/reviews` | GET | List school reviews | path `school_slug` | `list[DrivingSchoolReviewResponse]` | School detail |
| `/api/driving-schools/{school_slug}/reviews` | POST | Submit school review | `DrivingSchoolReviewCreate` | `DrivingSchoolReviewResponse` | School detail |
| `/api/driving-schools/partner-applications` | POST | Apply as partner school | `DrivingSchoolPartnerApplicationCreate` | `DrivingSchoolPartnerApplicationResponse` | Partner apply page |
| `/api/driving-schools/ref/{referral_code}` | GET | Resolve referral code to school detail | path `referral_code` | school detail payload | Referral landing |
| `/api/driving-schools/me/summary` | GET | Current user's owner summary | auth | `{ school, latest_application }` | School owner dashboard |
| `/api/driving-schools/me/profile` | PUT | Update own school profile | `DrivingSchoolUpdate` | `DrivingSchoolAdminResponse` | School owner dashboard |
| `/api/driving-schools/me/media/upload` | POST | Upload owner media file | multipart `file` | `{ url, filename }` | School owner dashboard |
| `/api/driving-schools/me/media` | POST | Create media item | `DrivingSchoolMediaCreate` | `DrivingSchoolMediaResponse` | School owner dashboard |
| `/api/driving-schools/me/media/{media_id}` | PUT | Update media item | `DrivingSchoolMediaUpdate` | `DrivingSchoolMediaResponse` | School owner dashboard |
| `/api/driving-schools/me/media/{media_id}` | DELETE | Delete media item | path `media_id` | `204 No Content` | School owner dashboard |
| `/api/driving-schools/me/leads` | GET | Owner lead list | auth | `list[DrivingSchoolLeadResponse]` | School owner dashboard |
| `/api/driving-schools/me/reviews` | GET | Owner review list | auth | `list[DrivingSchoolReviewResponse]` | School owner dashboard |

### 3.9 Driving School Admin Endpoints

Prefix: `/api/admin/driving-schools`

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/admin/driving-schools/media/upload` | POST | Upload school media file | multipart `file` | upload URL payload | Admin -> Schools |
| `/api/admin/driving-schools` | GET | List schools | filters from router, if any | `list[DrivingSchoolAdminResponse]` | Admin -> Schools |
| `/api/admin/driving-schools` | POST | Create school | `DrivingSchoolCreate` | `DrivingSchoolAdminResponse` | Admin -> Schools |
| `/api/admin/driving-schools/{school_id}` | PUT | Update school | `DrivingSchoolUpdate` | `DrivingSchoolAdminResponse` | Admin -> Schools |
| `/api/admin/driving-schools/{school_id}` | DELETE | Delete school | path param | `204 No Content` | Admin -> Schools |
| `/api/admin/driving-schools/{school_id}/courses` | POST | Add course | `DrivingSchoolCourseCreate` | `DrivingSchoolCourseResponse` | Admin -> Schools |
| `/api/admin/driving-schools/courses/{course_id}` | PUT | Update course | `DrivingSchoolCourseUpdate` | `DrivingSchoolCourseResponse` | Admin -> Schools |
| `/api/admin/driving-schools/courses/{course_id}` | DELETE | Delete course | path param | `204 No Content` | Admin -> Schools |
| `/api/admin/driving-schools/{school_id}/media` | POST | Add media item | `DrivingSchoolMediaCreate` | `DrivingSchoolMediaResponse` | Admin -> Schools |
| `/api/admin/driving-schools/media/{media_id}` | PUT | Update media item | `DrivingSchoolMediaUpdate` | `DrivingSchoolMediaResponse` | Admin -> Schools |
| `/api/admin/driving-schools/media/{media_id}` | DELETE | Delete media item | path param | `204 No Content` | Admin -> Schools |
| `/api/admin/driving-schools/leads` | GET | List all school leads | query filters | `list[DrivingSchoolLeadResponse]` | Admin -> Schools leads |
| `/api/admin/driving-schools/leads/{lead_id}` | PUT | Update lead status | `DrivingSchoolLeadUpdate` | `DrivingSchoolLeadResponse` | Admin -> Schools leads |
| `/api/admin/driving-schools/partner-applications` | GET | List partner applications | none | `list[DrivingSchoolPartnerApplicationResponse]` | Admin -> School partner applications |
| `/api/admin/driving-schools/partner-applications/{application_id}` | PUT | Update partner application status | `DrivingSchoolPartnerApplicationUpdate` | `DrivingSchoolPartnerApplicationResponse` | Admin -> School partner applications |
| `/api/admin/driving-schools/reviews` | GET | List reviews | query filters | `list[DrivingSchoolReviewResponse]` | Admin -> School reviews |
| `/api/admin/driving-schools/reviews/{review_id}` | PUT | Update review visibility/content | `DrivingSchoolReviewAdminUpdate` | `DrivingSchoolReviewResponse` | Admin -> School reviews |
| `/api/admin/driving-schools/reviews/{review_id}` | DELETE | Delete review | path param | `204 No Content` | Admin -> School reviews |
| `/api/admin/driving-schools/promo-stats` | GET | Promo/referral conversion stats by school | none | `DrivingSchoolPromoStatsResponse` | Admin -> Schools marketing |

### 3.10 Driving Instructor Public and Owner Endpoints

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/driving-instructors` | GET | Search and list instructors | query: `q`, `city`, `region`, `transmission`, `price_min_cents`, `price_max_cents`, `rating_min`, `experience_min_years`, `gender`, `sort_by`, `limit`, `offset` | `DrivingInstructorCatalogResponse` | Instructors catalog |
| `/api/driving-instructors/meta` | GET | Filter metadata | none | `DrivingInstructorMetaResponse` | Instructor filters |
| `/api/driving-instructors/registration-settings` | GET | Public/current registration campaign settings | none | `DrivingInstructorRegistrationSettingsResponse` | Instructor apply page |
| `/api/driving-instructors/media/upload` | POST | Upload instructor media | multipart `file` | upload URL payload | Instructor apply / owner |
| `/api/driving-instructors/{instructor_slug}` | GET | Instructor detail | path `instructor_slug` | `DrivingInstructorDetailResponse` | Instructor detail |
| `/api/driving-instructors/{instructor_slug}/leads` | POST | Submit instructor lead | `DrivingInstructorLeadCreate` | `DrivingInstructorLeadResponse` | Instructor CTA form |
| `/api/driving-instructors/{instructor_slug}/reviews` | GET | List instructor reviews | path `slug` | `list[DrivingInstructorReviewResponse]` | Instructor detail |
| `/api/driving-instructors/{instructor_slug}/reviews` | POST | Submit instructor review | `DrivingInstructorReviewCreate` | `DrivingInstructorReviewResponse` | Instructor detail |
| `/api/driving-instructors/{instructor_slug}/complaints` | POST | Submit complaint | `DrivingInstructorComplaintCreate` | `DrivingInstructorComplaintResponse` | Instructor detail |
| `/api/driving-instructors/applications` | POST | Apply as instructor | `DrivingInstructorApplicationCreate` | `DrivingInstructorApplicationResponse` | Instructor apply page |
| `/api/driving-instructors/ref/{referral_code}` | GET | Resolve instructor referral code | path param | instructor detail payload | Referral landing |
| `/api/driving-instructors/me/summary` | GET | Current user's instructor summary | auth | `{ instructor, latest_application, trend }` | Instructor owner dashboard |
| `/api/driving-instructors/me/leads` | GET | Owner lead list | auth | `list[DrivingInstructorLeadResponse]` | Instructor owner dashboard |
| `/api/driving-instructors/me/reviews` | GET | Owner review list | auth | `list[DrivingInstructorReviewResponse]` | Instructor owner dashboard |
| `/api/driving-instructors/me/profile` | PUT | Update own profile | `DrivingInstructorUpdate` | `DrivingInstructorAdminResponse` | Instructor owner dashboard |
| `/api/driving-instructors/me/media` | POST | Create media item | `DrivingInstructorMediaCreate` | `DrivingInstructorMediaResponse` | Instructor owner dashboard |
| `/api/driving-instructors/me/media/{media_id}` | PUT | Update media item | `DrivingInstructorMediaUpdate` | `DrivingInstructorMediaResponse` | Instructor owner dashboard |
| `/api/driving-instructors/me/media/{media_id}` | DELETE | Delete media item | path param | `204 No Content` | Instructor owner dashboard |
| `/api/driving-instructors/me/media/upload` | POST | Upload owner media file | multipart `file` | `{ url, filename }` | Instructor owner dashboard |

### 3.11 Driving Instructor Admin Endpoints

Prefix: `/api/admin/driving-instructors`

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/admin/driving-instructors/media/upload` | POST | Upload media file | multipart `file` | upload URL payload | Admin -> Instructors |
| `/api/admin/driving-instructors` | GET | List instructors | filters from router, if any | `list[DrivingInstructorAdminResponse]` | Admin -> Instructors |
| `/api/admin/driving-instructors` | POST | Create instructor | `DrivingInstructorCreate` | `DrivingInstructorAdminResponse` | Admin -> Instructors |
| `/api/admin/driving-instructors/{instructor_id}` | PUT | Update instructor | `DrivingInstructorUpdate` | `DrivingInstructorAdminResponse` | Admin -> Instructors |
| `/api/admin/driving-instructors/{instructor_id}` | DELETE | Delete instructor | path param | `204 No Content` | Admin -> Instructors |
| `/api/admin/driving-instructors/{instructor_id}/media` | POST | Add media item | `DrivingInstructorMediaCreate` | `DrivingInstructorMediaResponse` | Admin -> Instructors |
| `/api/admin/driving-instructors/media/{media_id}` | PUT | Update media item | `DrivingInstructorMediaUpdate` | `DrivingInstructorMediaResponse` | Admin -> Instructors |
| `/api/admin/driving-instructors/media/{media_id}` | DELETE | Delete media item | path param | `204 No Content` | Admin -> Instructors |
| `/api/admin/driving-instructors/promo-stats` | GET | Promo/referral conversion stats | none | `DrivingInstructorPromoStatsResponse` | Admin -> Instructors marketing |
| `/api/admin/driving-instructors/applications` | GET | List instructor applications | none | `list[DrivingInstructorApplicationResponse]` | Admin -> Instructor applications |
| `/api/admin/driving-instructors/applications/{application_id}` | PUT | Approve/reject application | `DrivingInstructorApplicationUpdate` | `DrivingInstructorApplicationResponse` | Admin -> Instructor applications |
| `/api/admin/driving-instructors/leads` | GET | List instructor leads | filters from router | `list[DrivingInstructorLeadResponse]` | Admin -> Instructor leads |
| `/api/admin/driving-instructors/leads/{lead_id}` | PUT | Update lead status | `DrivingInstructorLeadUpdate` | `DrivingInstructorLeadResponse` | Admin -> Instructor leads |
| `/api/admin/driving-instructors/reviews` | GET | List instructor reviews | filters from router | `list[DrivingInstructorReviewResponse]` | Admin -> Instructor reviews |
| `/api/admin/driving-instructors/reviews/{review_id}` | PUT | Update review | `DrivingInstructorReviewAdminUpdate` | `DrivingInstructorReviewResponse` | Admin -> Instructor reviews |
| `/api/admin/driving-instructors/reviews/{review_id}` | DELETE | Delete review | path param | `204 No Content` | Admin -> Instructor reviews |
| `/api/admin/driving-instructors/complaints` | GET | List complaints | filters from router | `list[DrivingInstructorComplaintResponse]` | Admin -> Instructor complaints |
| `/api/admin/driving-instructors/complaints/{complaint_id}` | PUT | Update complaint status | `DrivingInstructorComplaintUpdate` | `DrivingInstructorComplaintResponse` | Admin -> Instructor complaints |
| `/api/admin/driving-instructors/registration-settings` | GET | Get campaign settings | none | `DrivingInstructorRegistrationSettingsResponse` | Admin -> Instructor settings |
| `/api/admin/driving-instructors/registration-settings` | PUT | Update campaign settings | `DrivingInstructorRegistrationSettingsUpdate` | `DrivingInstructorRegistrationSettingsResponse` | Admin -> Instructor settings |

### 3.12 Core Admin and Moderation Endpoints

Prefix: `/api/admin`

| Path | Method | Purpose | Request parameters | Response structure | UI page(s) |
| --- | --- | --- | --- | --- | --- |
| `/api/admin/media/image` | POST | Upload question image | multipart `file` | `ImageUploadResponse { url, filename }` | Admin -> Question bank |
| `/api/admin/media/lesson` | POST | Upload lesson file/media | multipart `file` | `LessonUploadResponse { url, filename, content_type, size_bytes }` | Admin -> Lessons |
| `/api/admin/tests` | POST | Create test | `TestCreate` | `TestResponse` | Admin -> Content |
| `/api/admin/tests` | GET | List tests | none | `list[TestResponse]` | Admin -> Content |
| `/api/admin/tests/{test_id}` | GET | Test detail with nested questions/options | path param | `AdminTestDetailResponse` | Admin -> Content |
| `/api/admin/tests/{test_id}` | PUT | Update test | `TestUpdate` | `TestResponse` | Admin -> Content |
| `/api/admin/tests/{test_id}` | DELETE | Delete test | path param | `204 No Content` | Admin -> Content |
| `/api/admin/lessons` | POST | Create lesson | `LessonCreate` | `LessonResponse` | Admin -> Lessons |
| `/api/admin/lessons` | GET | List lessons | none | `list[LessonResponse]` | Admin -> Lessons |
| `/api/admin/lessons/{lesson_id}` | GET | Get lesson | path param | `LessonResponse` | Admin -> Lessons |
| `/api/admin/lessons/{lesson_id}` | PUT | Update lesson | `LessonUpdate` | `LessonResponse` | Admin -> Lessons |
| `/api/admin/lessons/{lesson_id}` | DELETE | Delete lesson | path param | `204 No Content` | Admin -> Lessons |
| `/api/admin/question-categories` | POST | Create question category | `QuestionCategoryCreate` | `QuestionCategoryResponse` | Admin -> Question bank |
| `/api/admin/question-categories` | GET | List categories | none | `list[QuestionCategoryResponse]` | Admin -> Question bank |
| `/api/admin/question-categories/{category_id}` | PUT | Update category | `QuestionCategoryUpdate` | `QuestionCategoryResponse` | Admin -> Question bank |
| `/api/admin/question-categories/{category_id}` | DELETE | Delete category | path param | `204 No Content` | Admin -> Question bank |
| `/api/admin/questions` | GET | List question bank | query: `category_id`, `skip`, `limit` | `list[AdminQuestionWithOptionsResponse]` | Admin -> Question bank |
| `/api/admin/questions` | POST | Create question in standalone bank | `QuestionCreate` | `QuestionResponse` | Admin -> Question bank |
| `/api/admin/tests/{test_id}/questions` | POST | Legacy question creation under specific test | `QuestionCreate` | `QuestionResponse` | Legacy admin clients |
| `/api/admin/questions/{question_id}` | PUT | Update question | `QuestionUpdate` | `QuestionResponse` | Admin -> Question bank |
| `/api/admin/questions/{question_id}` | DELETE | Delete question | path param | `204 No Content` | Admin -> Question bank |
| `/api/admin/questions/{question_id}/options` | POST | Create answer option | `AnswerOptionCreate` | `AnswerOptionResponse` | Admin -> Question bank |
| `/api/admin/options/{option_id}` | PUT | Update option | `AnswerOptionUpdate` | `AnswerOptionResponse` | Admin -> Question bank |
| `/api/admin/options/{option_id}` | DELETE | Delete option | path param | `204 No Content` | Admin -> Question bank |
| `/api/admin/users` | GET | List users with subscription info | none | `list[AdminUserResponse]` | Admin -> Users |
| `/api/admin/users/{user_id}` | PUT | Update user admin flags | `AdminUserUpdate` | `AdminUserResponse` | Admin -> Users |
| `/api/admin/users/{user_id}/subscription` | PUT | Grant/revoke user subscription | `AdminUserSubscriptionUpdate` | `AdminUserResponse` | Admin -> Users |
| `/api/admin/plans` | GET | List subscription plans | none | `list[SubscriptionPlanResponse]` | Admin -> Billing |
| `/api/admin/plans` | POST | Create subscription plan | `SubscriptionPlanCreate` | `SubscriptionPlanResponse` | Admin -> Billing |
| `/api/admin/plans/{plan_id}` | GET | Get one plan | path param | `SubscriptionPlanResponse` | Admin -> Billing |
| `/api/admin/plans/{plan_id}` | PUT | Update plan | `SubscriptionPlanUpdate` | `SubscriptionPlanResponse` | Admin -> Billing |
| `/api/admin/plans/{plan_id}` | DELETE | Delete plan | path param | `204 No Content` | Admin -> Billing |
| `/api/admin/promos` | GET | List promo codes | none | `list[PromoCodeResponse]` | Admin -> Billing/promos |
| `/api/admin/promos` | POST | Create promo code | `PromoCodeCreate` | `PromoCodeResponse` | Admin -> Billing/promos |
| `/api/admin/promos/{promo_id}` | GET | Get one promo | path param | `PromoCodeResponse` | Admin -> Billing/promos |
| `/api/admin/promos/{promo_id}` | PUT | Update promo | `PromoCodeUpdate` | `PromoCodeResponse` | Admin -> Billing/promos |
| `/api/admin/promos/{promo_id}` | DELETE | Delete promo | path param | `204 No Content` | Admin -> Billing/promos |
| `/api/admin/violations` | GET | List violation logs | none | `list[ViolationLogResponse]` | Admin -> Violations |
| `/api/analytics/admin/summary` | GET | Platform-level counts | none | `AdminAnalyticsSummary` | Admin -> Dashboard |
| `/api/analytics/admin/top-tests` | GET | Top tests by attempt count | query `limit` | `list[TopTestAnalytics]` | Admin -> Analytics |

---

## SECTION 4 - LEARNING SYSTEM

### 4.1 Practice Modes That Actually Exist

The backend supports these real session types:

- **standard**: fixed test from `Test`
- **adaptive**: premium intelligent practice from the question bank
- **free random**: free fallback with daily attempt limit
- **learning**: backend-generated adaptive learning session
- **simulation**: dedicated exam simulation entity + attempt
- **guest**: limited try-before-register mode

### 4.2 Adaptive Practice Logic

Adaptive practice is started via `POST /api/tests/adaptive/start`.

Important behavior:

- only premium or admin users can start adaptive mode
- allowed session sizes: `20`, `30`, `40`, `50`
- duration is derived from question count:
  - `20 -> 25 min`
  - `30 -> 38 min`
  - `40 -> 50 min`
  - `50 -> 62 min`
- if `pressure_mode=true`, time is reduced by 20%

Adaptive selection combines:

- weak topics
- stale topics / review urgency
- medium difficulty coverage
- unseen question preference
- repeat avoidance from `UserQuestionHistory`
- difficulty balancing from `QuestionDifficulty`
- user-specific target difficulty from `UserAdaptiveProfile.target_difficulty_percent`

### 4.3 Weak Topic Detection

Weak topics come from two overlapping engines.

#### A. `UserTopicStats`-based weak topics

This is the newer normalized topic engine:

- one row per `user_id + question_category`
- tracks:
  - `total_attempts`
  - `correct_answers`
  - `wrong_answers`
  - `accuracy_rate`
  - `last_attempt_at`

Current weak-topic rule in `services/learning/topic_analysis.py`:

- topic becomes weak if:
  - `accuracy_rate < 0.65`
  - `total_attempts >= 10`
- ordering priority:
  - lowest accuracy first
  - then highest volume

#### B. `UserSkill`-based weak topics

This is the older BKT + retention system:

- tracks `skill_score`
- tracks `bkt_knowledge_prob`
- tracks `retention_score`
- tracks next spaced-repetition time

It is still used by:

- dashboard review queue
- focus-topic prioritization
- decay and fading-topic messages

### 4.4 Review Queue Logic

Review queue uses per-question records in `ReviewQueue`.

Rules from `services/learning/progress_tracking.py`:

- each user-question pair has:
  - `next_review_at`
  - `interval_days`
  - `last_result`
- review intervals escalate along:
  - `1 -> 3 -> 7 -> 14 -> 30 days`
- wrong answer:
  - resets interval to `1 day`
- correct answer:
  - moves to next interval bucket

There are two review-facing surfaces:

- `GET /api/analytics/me/review-queue`: topic-level summary for UI
- `ReviewQueue` table: question-level scheduling for the engine

### 4.5 Learning Session Generation

Learning sessions are created via `POST /api/learning/session`.

Behavior:

- payload controls `question_count` from `10` to `50`
- backend calls `generate_adaptive_session(...)`
- session is stored as an `Attempt(mode="learning")`
- analytics events are emitted:
  - `learning_session_started`
  - `weak_topic_detected` when weak topics exist

The frontend does not need to invent its own learning session logic. The backend already returns a fully prepared question set.

### 4.6 What Learning Data Is Available to Display

From `DashboardResponse` and related contracts, the UI can show:

- next recommended topic
- weak topics
- lesson recommendations
- recent score trend
- test activity trend
- review queue due count
- skill vector
- knowledge mastery probabilities
- retention vector
- question bank mastery totals
- pass probability and readiness

---

## SECTION 5 - SIMULATION SYSTEM

### 5.1 Simulation Is a Dedicated Product Entity

Simulation is no longer only inferred from a generic attempt. It now has a dedicated model:

- `ExamSimulationAttempt`

This model stores:

- readiness snapshot at start
- pass probability snapshot at start
- simulation timing lifecycle
- cooldown start time
- next available time
- mistake count
- timeout state
- pass/fail state

Each simulation is also linked to a normal `Attempt` row for question delivery and scoring.

### 5.2 Simulation Availability Logic

Simulation readiness is exposed inside `DashboardResponse.simulation_status`.

Important fields:

- `cooldown_days`
- `cooldown_progress`
- `cooldown_remaining_seconds`
- `next_available_at`
- `last_simulation_at`
- `readiness_gate_score`
- `readiness_ready`
- `cooldown_ready`
- `launch_ready`
- `recommended_question_count`
- `recommended_pressure_mode`
- `label`
- `readiness_threshold`
- `pass_threshold`
- `lock_reasons`

### 5.3 Readiness Rules

Current thresholds in `services/learning/simulation_service.py`:

- readiness threshold: `70.0`
- pass probability threshold: `65.0`
- cooldown: `14 days`

Simulation can start only if:

- user is premium or admin
- `simulation_status.launch_ready == true`

### 5.4 Simulation Start Rules

`POST /api/simulation/start`:

- resumes existing unfinished simulation if one exists
- otherwise:
  - asks dashboard analytics for current simulation status
  - blocks if `launch_ready == false`
  - creates or reuses a synthetic `Test` titled `"Exam Simulation"`
  - creates:
    - `Attempt(mode="simulation", training_level="simulation")`
    - matching `ExamSimulationAttempt`

### 5.5 Simulation Exam Format

Current default simulation format:

- question count: `40`
- pressure mode: `true`
- base duration for 40 questions: `50 minutes`
- pressure-mode duration: `40 minutes`
- mistake limit:
  - pressure mode: `1`
  - normal mode: `2`
- timeout = automatic fail

### 5.6 Cooldown Logic

Cooldown is tied to the dedicated simulation entity, not heuristic attempts anymore.

When a simulation is submitted:

- `Attempt` is finished through `/api/attempts/submit`
- `_sync_simulation_completion(...)` calls `finalize_exam_simulation(...)`
- simulation record gets:
  - `finished_at`
  - `cooldown_started_at`
  - `next_available_at = finished_at + 14 days`
  - `mistake_count`
  - `timeout`
  - `passed`

### 5.7 Simulation History

`GET /api/simulation/history` returns:

- `attempt_id`
- `date`
- `score`
- `mistakes`
- `pass_probability_snapshot`
- `passed`

Important detail:

- `score` in history is returned as a percentage of the question count, not raw correct answers.

### 5.8 What the UI Can Display

The simulation page can safely display:

- readiness label
- cooldown remaining time
- whether launch is allowed
- reasons simulation is locked
- recommended question count
- pass probability snapshot
- pass/fail history
- mistake counts
- timeout outcome

---

## SECTION 6 - GAMIFICATION SYSTEM

### 6.1 XP System

Persistent models:

- `XPWallet`
- `XPEvent`

XP rules live in `services/gamification/rewards.py`.

Reward rule table:

| Trigger | XP | Coins |
| --- | --- | --- |
| `attempt_completed` | 12 | 3 |
| `learning_sprint_finished` | 10 | 2 |
| `weak_topic_recovered` | 18 | 4 |
| `review_queue_cleared` | 14 | 3 |
| `simulation_passed` | 40 | 10 |
| `daily_login` | 5 | 1 |

XP level formula:

- `xp_required_for_level(level) = 75 * (level - 1) * level`

Level summary exposes:

- total XP
- current level
- XP inside current level
- XP required to next level
- percentage progress

### 6.2 Coin System

Persistent models:

- `CoinWallet`
- `CoinTransaction`

Coins are granted by the same reward engine as XP. They are not cosmetic only; they power the economy layer.

### 6.3 Achievements

Persistent models:

- `AchievementDefinition`
- `UserAchievement`

Seeded achievement rules:

- first completed attempt
- first learning sprint finish
- first weak-topic recovery
- review queue cleared
- simulation passed
- 7-day streak
- level 5 reached

Each achievement has:

- `name`
- `description`
- `icon`
- `trigger_rule`

### 6.4 Streaks

Persistent model:

- `UserStreak`

Stored values:

- `current_streak`
- `longest_streak`
- `last_activity_date`

Streak updates are triggered by reward activity and daily login behavior.

### 6.5 Leaderboard

Persistent model:

- `LeaderboardSnapshot`

Supported periods:

- `daily`
- `weekly`
- `monthly`

Each snapshot stores:

- user
- XP earned in period
- rank
- capture time

Background refresh:

- scheduler loop runs every `300 seconds` (5 minutes)
- startup also refreshes snapshots once

### 6.6 Economy Mechanics

Coin spending service lives in `services/gamification/economy.py`.

Current mechanics:

- simulation cooldown reduction
  - `40 coins per day`
  - max `5 days`
- XP boost
  - cost `50 coins`
  - multiplier `1.2x`
  - duration `30 minutes`
- focus pack
  - cost `35 coins`
  - question count default `20`
  - topic-focused learning session

### 6.7 What the UI Can Display

Gamification APIs already support:

- topbar XP summary
- level progress
- current coin balance
- current streak
- active XP boost remaining time
- recent achievements
- leaderboard rank and participants
- reward delta after session completion

---

## SECTION 7 - MARKETPLACE SYSTEM

### 7.1 Driving School Marketplace

Public school system supports:

- searchable school catalog
- city/region/category filters
- pricing metadata
- rating metadata
- detail page with:
  - description
  - contact channels
  - map embed
  - course list
  - gallery
  - reviews
  - referral code
  - promo code

School conversion tools:

- lead submission
- review submission
- partner applications
- referral code resolution

Owner tools:

- profile update
- media upload/manage
- lead inbox
- review inbox
- summary of owned school and latest application

Admin tools:

- full school CRUD
- course/media CRUD
- lead moderation
- partner application moderation
- review moderation
- promo/referral statistics

### 7.2 Driving Instructor Marketplace

Public instructor system supports:

- searchable instructor catalog
- city/region/transmission/price/rating/experience/gender filters
- detailed instructor page with:
  - bio
  - service areas
  - car details
  - hourly pricing
  - contact info
  - media gallery
  - reviews
  - disclaimer
  - view/lead counts
  - referral/promo info

Instructor conversion tools:

- lead submission
- review submission
- complaint submission
- onboarding application
- referral code resolution

Owner tools:

- profile update
- media upload/manage
- lead list
- review list
- summary page with latest application and 7-day trend

Admin tools:

- instructor CRUD
- media CRUD
- application moderation
- lead moderation
- review moderation
- complaint moderation
- registration campaign settings
- promo/referral statistics

### 7.3 Marketplace Data Available for UI

For schools, UI can display:

- price starting point
- categories taught
- duration
- rating count and average
- gallery items
- partner promo/referral identity

For instructors, UI can display:

- hourly price
- years of experience
- transmission
- car model/year/features
- review distribution
- view/lead counts
- top-rated / most-selected flags

---

## SECTION 8 - ADMIN SYSTEM

### 8.1 Admin Roles and Access Layers

There are two admin mechanisms:

1. **Direct admin flag**
   - `User.is_admin`
   - used by classic admin routes

2. **RBAC roles and permissions**
   - role names:
     - `SuperAdmin`
     - `SchoolAdmin`
     - `Instructor`
     - `Student`
   - permission examples:
     - `admin.users.read`
     - `admin.schools.create`
     - `school.view_dashboard`
     - `school.view_groups`
     - `school.manage_members`

### 8.2 What Admin Can Manage

Core admin routes support:

- tests
- lessons
- question categories
- question bank
- answer options
- users
- subscription plans
- promo codes
- violations
- top-level analytics

Marketplace admin routes support:

- driving schools
- school courses
- school media
- school leads
- school partner applications
- school reviews
- school promo stats
- instructors
- instructor media
- instructor applications
- instructor leads
- instructor reviews
- instructor complaints
- instructor registration settings
- instructor promo stats

### 8.3 Analytics Available to Admin

Admin analytics endpoints provide:

- total users
- premium user count
- free user count
- total tests
- total attempts
- top tests by attempt volume
- funnel metrics from event tracking:
  - premium block views
  - upgrade clicks
  - upgrade page views
  - upgrade success
  - click-through rate
  - conversion rate

### 8.4 UI Implications for Admin

An admin UI can safely build:

- content management console
- billing and promo console
- user moderation console
- violation review page
- marketplace moderation console
- platform analytics dashboard

---

## SECTION 9 - DATA FLOWS

### 9.1 Practice Session Flow

1. User starts a practice session through one of:
   - `/api/tests/adaptive/start`
   - `/api/tests/free-random`
   - `/api/learning/session`
   - `/api/attempts/start`
   - `/api/economy/focus-pack`
2. Backend creates an `Attempt`.
3. Backend returns ordered questions without correctness flags.
4. User answers questions in the frontend.
5. Frontend submits all answers to `/api/attempts/submit`.
6. Backend:
   - writes `AttemptAnswer`
   - computes score and pass/fail
   - updates `UserTopicStats`
   - updates `UserSkill`
   - updates `ReviewQueue`
   - updates `UserQuestionHistory`
   - updates `QuestionDifficulty`
   - writes `InferenceSnapshot` when available
   - grants XP/coins/achievements where applicable
7. Backend returns `BulkSubmitResponse` with:
   - score
   - answer review (if unlocked)
   - topic feedback
   - cognitive profile
   - reward summary

### 9.2 Simulation Flow

1. Frontend loads `/api/analytics/me/dashboard`.
2. Reads `simulation_status`.
3. If `launch_ready == true`, frontend can call `/api/simulation/start`.
4. Backend creates:
   - a simulation `Attempt`
   - an `ExamSimulationAttempt`
5. User completes simulation and frontend submits through `/api/attempts/submit`.
6. Backend finalizes both attempt and simulation entity.
7. Cooldown starts and becomes visible through the next dashboard/simulation read.
8. History becomes available from `/api/simulation/history`.

### 9.3 Lesson Recommendation Flow

1. Dashboard analytics computes weak/focus topics.
2. Topic keys are normalized through `services/learning/taxonomy.py`.
3. Lessons are matched by learning key from `Lesson.topic` / `Lesson.section`.
4. Matched lessons are returned in `DashboardResponse.lesson_recommendations`.
5. `/api/lessons` returns the broader authenticated lesson feed and premium sections.

### 9.4 Weak Topic Recovery Flow

1. Completed attempts update `UserTopicStats` and `UserSkill`.
2. Backend identifies weak topics using low accuracy and review urgency.
3. Adaptive engine uses weak topics to bias question selection.
4. Learning session generator may emit `weak_topic_detected` analytics events.
5. As user improves:
   - `accuracy_rate` rises
   - `bkt_knowledge_prob` rises
   - weak topic leaves the top-priority set
   - review queue burden may shrink

### 9.5 Daily Retention Flow

1. User opens authenticated app via `/api/auth/me`.
2. Backend grants daily login reward if not already granted for that day.
3. Streak state updates.
4. Notifications and dashboard can then encourage “today’s practice”.

### 9.6 Upgrade and Promo Flow

1. Frontend loads `/api/payments/plans`.
2. Optional promo quote via `/api/payments/quote`.
3. If promo is fully discounted, frontend can call `/api/payments/redeem-promo`.
4. Otherwise frontend calls `/api/payments/create-session`.
5. Provider redirects user externally.
6. Provider webhook updates backend payment/subscription state.
7. Frontend polls `/api/payments/transactions/{cheque_id}`.

---

## SECTION 10 - UI DATA CONTRACTS

These are the most important backend responses for UI design.

### 10.1 `DashboardResponse`

Primary dashboard intelligence contract.

Fields:

- `overview: AnalyticsOverview`
  - `total_attempts`
  - `average_score`
  - `best_score`
  - `improvement_delta`
  - `improvement_direction`
  - `current_training_level`
  - `readiness_score`
  - `pass_probability`
  - `pass_prediction_label`
  - `adaptive_intelligence_strength`
  - `total_due`
  - `avg_response_time`
  - `cognitive_stability`
  - `pressure_resilience`
  - `pass_probability_ml`
  - `pass_probability_rule`
  - `pass_probability_final`
  - `confidence_score`
  - `model_version`
  - `ml_status`
- `recommendation: Recommendation`
  - `topic`
  - `accuracy`
  - `action_label`
- `recent_scores: list[int]`
- `topic_breakdown: list[TopicAccuracy]`
- `skill_vector: list[TopicSkill]`
- `knowledge_mastery: list[KnowledgeMastery]`
- `retention_vector: list[TopicRetention]`
- `lesson_recommendations: list[LessonRecommendation]`
- `progress_trend: list[TrendPoint]`
- `test_activity: list[ActivityPoint]`
- `question_bank_mastery: TestBankMastery`
- `simulation_status: SimulationStatus | null`
- `pass_probability_breakdown: PassProbabilityBreakdown | null`

Use this contract for:

- dashboard
- learning path
- simulation readiness view
- lesson recommendation strip
- progress overview

### 10.2 `SimulationStatus`

Nested inside dashboard.

Fields:

- `cooldown_days`
- `cooldown_progress`
- `cooldown_remaining_seconds`
- `next_available_at`
- `last_simulation_at`
- `readiness_gate_score`
- `readiness_ready`
- `cooldown_ready`
- `launch_ready`
- `recommended_question_count`
- `recommended_pressure_mode`
- `label`
- `readiness_threshold`
- `pass_threshold`
- `lock_reasons`

Use this for:

- simulation center hero state
- lock messaging
- cooldown timer
- “start simulation” vs “improve readiness” button logic

### 10.3 `ReviewQueueResponse`

Fields:

- `total_due`
- `due_topics: list[DueTopic]`
  - `topic`
  - `next_review_at`
  - `retention_score`
  - `bkt_prob`

Use this for:

- dashboard due-review widget
- review queue panel
- urgency badges

### 10.4 `BulkSubmitResponse`

Main post-attempt result contract.

Fields:

- `score`
- `total`
- `correct_count`
- `mistakes_count`
- `passed`
- `finished_at`
- `answers`
- `answers_unlocked`
- `unlock_reason`
- `is_adaptive`
- `training_level`
- `pass_prediction_label`
- `skill_messages`
- `fading_topics`
- `topic_stability`
- `avg_response_time`
- `cognitive_profile`
- `pressure_mode`
- `reward_summary`
  - `xp_awarded`
  - `coins_awarded`
  - `achievements[]`

Use this for:

- result page
- reward modal
- review UI
- post-attempt lesson suggestion logic

### 10.5 `GamificationSummaryResponse`

Fields:

- `xp`
  - `total_xp`
  - `level`
  - `current_level_xp`
  - `next_level_xp`
  - `xp_to_next_level`
  - `progress_percent`
- `coins`
  - `balance`
  - `last_updated`
- `streak`
  - `current_streak`
  - `longest_streak`
  - `last_activity_date`
- `active_xp_boost`
- `recent_achievements`

Use this for:

- topbar
- profile
- reward feedback

### 10.6 `EconomyOverviewResponse`

Fields:

- `coin_balance`
- `active_xp_boost`
- `xp_boost_offer`
  - `cost`
  - `multiplier`
  - `duration_minutes`
  - `active`
- `simulation_cooldown_offer`
  - `cost_per_day`
  - `max_days`
  - `available_days`
  - `days_used`
  - `cooldown_remaining_seconds`
  - `next_available_at`
- `focus_pack_offer`
  - `cost`
  - `question_count`

Use this for:

- economy shop
- simulation cooldown spend UI
- practice spend UI

### 10.7 `LearningSessionResponse`

Fields:

- `session_id`
- `questions: list[PublicQuestion]`

Use this for:

- centralized “start practice” flow
- weak-topic recovery session
- learning sprint

### 10.8 `LessonsFeedResponse`

Fields:

- `is_premium_user`
- `lessons: list[LessonItemResponse]`
- `sections: list[LessonSectionResponse]`

Each lesson exposes:

- `id`
- `title`
- `description`
- `content_type`
- `content_url`
- `thumbnail_url`
- `topic`
- `section`
- `is_premium`
- `sort_order`
- `created_at`

Use this for:

- lessons page
- topic lesson carousels
- weak-topic recovery pages

### 10.9 `SimulationStartResponse`

Fields:

- `id`
- `question_count`
- `duration_minutes`
- `questions`
- `scheduled_at`
- `started_at`
- `attempt_mode = "simulation"`

Use this for:

- simulation player bootstrap

### 10.10 `SimulationHistoryResponse`

Fields:

- `items[]`
  - `attempt_id`
  - `date`
  - `score`
  - `mistakes`
  - `pass_probability_snapshot`
  - `passed`

Use this for:

- simulation history cards
- exam progress timeline

### 10.11 Marketplace Contracts

Key school contracts:

- `DrivingSchoolCatalogResponse`
- `DrivingSchoolDetailResponse`
- `DrivingSchoolLeadResponse`
- `DrivingSchoolReviewResponse`
- `DrivingSchoolAdminResponse`

Key instructor contracts:

- `DrivingInstructorCatalogResponse`
- `DrivingInstructorDetailResponse`
- `DrivingInstructorLeadResponse`
- `DrivingInstructorReviewResponse`
- `DrivingInstructorApplicationResponse`
- `DrivingInstructorAdminResponse`

These contain all data required to build:

- public cards
- detail pages
- lead forms
- owner dashboards
- moderation dashboards

---

## FINAL DESIGN NOTES FOR UI SYSTEMS

If a UI design AI is using this report to plan screens, these are the safest assumptions:

1. The single richest student-facing contract is `GET /api/analytics/me/dashboard`.
2. Practice should be centered around backend-generated sessions, not frontend-generated modes.
3. Simulation is a premium, dedicated exam event with its own cooldown and history.
4. Gamification is real and persistent; it is not decorative.
5. Marketplace is a secondary but fully developed subsystem with owner and admin tooling.
6. Canonical route usage should prefer `/api/...` even though legacy mirrors still exist.
7. Topic and review intelligence comes from both `UserSkill` and `UserTopicStats`; UI should use returned contracts rather than re-derive logic client-side.

This backend is already rich enough to support:

- a learning-first dashboard
- a focused practice flow
- a serious simulation center
- reward-heavy post-attempt feedback
- competition and growth surfaces
- marketplace conversion funnels
- a broad admin control surface
