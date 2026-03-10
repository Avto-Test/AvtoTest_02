# AUTOTEST Learning Engine

## Overview

Phase 2 introduces a backend-only adaptive learning foundation. The frontend does not choose topics, difficulty, or question order. It only requests a learning session and renders the returned question payload.

## Topic stats

`user_topic_stats` stores per-user performance by `question.category_id`:

- `total_attempts`
- `correct_answers`
- `wrong_answers`
- `accuracy_rate`
- `last_attempt_at`

Weak topics are detected when:

- `accuracy_rate < 0.65`
- `total_attempts >= 10`

## Question difficulty

`question_difficulty` tracks question hardness from real submissions:

- `attempts`
- `correct_count`
- `wrong_count`
- `difficulty_score = wrong_count / attempts`

Interpretation:

- `0.0` = very easy
- `1.0` = very hard

## Review queue

`review_queue` stores spaced-repetition items for wrong or previously missed questions.

Intervals:

- 1 day
- 3 days
- 7 days
- 14 days
- 30 days

Rules:

- wrong answer: create or reset the queue item to 1 day
- correct answer on queued item: advance to the next interval

## Adaptive session flow

`POST /learning/session`

Flow:

1. detect weak topics
2. select approximately 60% questions from weak topics
3. select approximately 30% medium-difficulty questions
4. select approximately 10% random unseen questions
5. avoid recently seen questions using `user_question_history`
6. create an `attempt` with mode `learning`
7. return `session_id` and randomized question payload

## Submission flow

When an attempt is finished:

- `user_topic_stats` is updated inside the submission transaction
- `question_difficulty` is updated
- `review_queue` is updated
- analytics events are emitted for learning sessions

## Analytics events

The learning engine emits:

- `learning_session_started`
- `learning_session_completed`
- `weak_topic_detected`
