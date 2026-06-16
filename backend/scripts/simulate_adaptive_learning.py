"""
Adaptive learning simulation for AUTOTEST.

This script stress-tests adaptive test generation behavior with three synthetic user profiles:
  - User A: strong in signs, weak in intersections
  - User B: random/noisy performance
  - User C: improves over time

Outputs include:
  - difficulty progression inside tests
  - category adaptation trend
  - pass-probability trajectory
  - adaptation checks per user profile
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from statistics import fmean, pstdev
import argparse
import math
import random
from typing import Callable


CATEGORIES = [
    "signs",
    "intersections",
    "rules",
    "road_markings",
    "driving_culture",
]


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def difficulty_band(percent: int) -> str:
    # AUTOTEST mapping: higher percent is easier, lower percent is harder.
    if percent >= 67:
        return "easy"
    if percent <= 33:
        return "hard"
    return "medium"


def build_weighted_quotas(
    weights: dict[str, float],
    total_questions: int,
    min_ratio: float = 0.10,
    max_ratio: float = 0.45,
) -> dict[str, int]:
    if not weights:
        return {}
    keys = list(weights.keys())
    n = len(keys)
    if n == 1:
        return {keys[0]: total_questions}

    min_q = int(total_questions * min_ratio)
    max_q = int(total_questions * max_ratio)
    if min_q * n > total_questions:
        min_q = total_questions // n
    if max_q < min_q:
        max_q = min_q
    if max_q * n < total_questions:
        max_q = max(max_q, math.ceil(total_questions / n))

    quotas = {k: min_q for k in keys}
    remaining = total_questions - sum(quotas.values())
    if remaining <= 0:
        return quotas

    total_w = sum(max(0.01, w) for w in weights.values())
    fractions: list[tuple[str, float]] = []
    for key in keys:
        capacity = max(0, max_q - quotas[key])
        ideal = (max(0.01, weights[key]) / total_w) * remaining
        take = min(capacity, int(ideal))
        quotas[key] += take
        fractions.append((key, ideal - int(ideal)))

    left = total_questions - sum(quotas.values())
    fractions.sort(key=lambda x: x[1], reverse=True)
    idx = 0
    guard = 0
    while left > 0 and guard < 5000:
        k = fractions[idx % len(fractions)][0]
        if quotas[k] < max_q:
            quotas[k] += 1
            left -= 1
        idx += 1
        guard += 1
        if all(quotas[k] >= max_q for k in keys):
            richest = max(keys, key=lambda x: weights[x])
            quotas[richest] += left
            left = 0
            break
    return quotas


@dataclass
class Question:
    qid: int
    category: str
    difficulty_percent: int
    total_attempts: int = 0
    total_correct: int = 0
    dynamic_difficulty_score: float = 0.5

    def update_after_answer(self, is_correct: bool) -> None:
        self.total_attempts += 1
        if is_correct:
            self.total_correct += 1
        error_rate = 1.0 - (self.total_correct / self.total_attempts)
        # Smoothed recalibration (robust for simulation stability)
        self.dynamic_difficulty_score = clamp(
            (self.dynamic_difficulty_score * 0.8) + (error_rate * 0.2),
            0.05,
            0.95,
        )


@dataclass
class UserProfile:
    name: str
    base_strength: dict[str, float]
    trend_per_test: float
    noise: float
    extra_rule: Callable[[str, int], float] | None = None

    def probability_correct(self, category: str, difficulty_percent: int, test_idx: int) -> float:
        base = self.base_strength.get(category, 0.5)
        # Lower difficulty_percent = harder question.
        hardness = (60 - difficulty_percent) / 60.0
        difficulty_adjustment = -0.22 * hardness
        trend_adjustment = self.trend_per_test * test_idx
        rule_adjustment = self.extra_rule(category, test_idx) if self.extra_rule else 0.0
        noise_adjustment = random.uniform(-self.noise, self.noise)
        return clamp(
            base + difficulty_adjustment + trend_adjustment + rule_adjustment + noise_adjustment,
            0.05,
            0.97,
        )


@dataclass
class AdaptiveState:
    target_difficulty_percent: int = 50
    category_skill: dict[str, float] = field(default_factory=lambda: {cat: 0.5 for cat in CATEGORIES})
    category_last_seen_test: dict[str, int] = field(default_factory=lambda: {cat: -99 for cat in CATEGORIES})
    seen_questions: set[int] = field(default_factory=set)
    question_seen_frequency: dict[int, int] = field(default_factory=lambda: defaultdict(int))
    needs_review: set[int] = field(default_factory=set)
    mastered_questions: set[int] = field(default_factory=set)
    question_attempt_count: dict[int, int] = field(default_factory=lambda: defaultdict(int))
    question_correct_count: dict[int, int] = field(default_factory=lambda: defaultdict(int))
    question_recent_results: dict[int, list[bool]] = field(default_factory=lambda: defaultdict(list))
    category_recent_results: dict[str, list[int]] = field(default_factory=lambda: defaultdict(list))
    test_scores: list[float] = field(default_factory=list)
    hard_correct_count: int = 0
    hard_attempt_count: int = 0

    def stale_categories(self, current_test: int, min_gap: int = 3) -> set[str]:
        return {
            cat
            for cat, seen_idx in self.category_last_seen_test.items()
            if (current_test - seen_idx) >= min_gap
        }


def build_question_bank(total_questions: int, seed: int) -> list[Question]:
    random.seed(seed)
    per_category = total_questions // len(CATEGORIES)
    remainder = total_questions % len(CATEGORIES)
    qid = 1
    bank: list[Question] = []
    for idx, category in enumerate(CATEGORIES):
        count = per_category + (1 if idx < remainder else 0)
        for _ in range(count):
            diff_percent = int(clamp(random.gauss(50, 22), 0, 100))
            bank.append(
                Question(
                    qid=qid,
                    category=category,
                    difficulty_percent=diff_percent,
                    dynamic_difficulty_score=clamp((100 - diff_percent) / 100.0, 0.05, 0.95),
                )
            )
            qid += 1
    return bank


def _apply_progression_order(questions: list[Question], total_count: int) -> list[Question]:
    easy_pool = sorted([q for q in questions if difficulty_band(q.difficulty_percent) == "easy"], key=lambda q: q.difficulty_percent, reverse=True)
    medium_pool = sorted([q for q in questions if difficulty_band(q.difficulty_percent) == "medium"], key=lambda q: abs(q.difficulty_percent - 50))
    hard_pool = sorted([q for q in questions if difficulty_band(q.difficulty_percent) == "hard"], key=lambda q: q.difficulty_percent)

    easy_need = round(total_count * 0.20)
    medium_need = round(total_count * 0.50)
    hard_need = total_count - easy_need - medium_need

    ordered: list[Question] = []
    ordered.extend(easy_pool[:easy_need])
    ordered.extend(medium_pool[:medium_need])
    ordered.extend(hard_pool[:hard_need])

    selected_ids = {q.qid for q in ordered}
    if len(ordered) < total_count:
        leftovers = [q for q in questions if q.qid not in selected_ids]
        leftovers.sort(key=lambda q: q.difficulty_percent, reverse=True)
        ordered.extend(leftovers[: total_count - len(ordered)])
    return ordered[:total_count]


def generate_adaptive_test(
    bank: list[Question],
    state: AdaptiveState,
    question_count: int,
    test_idx: int,
) -> tuple[list[Question], dict[str, float | int | dict[str, int]]]:
    topic_signals: list[tuple[str, float, float, float]] = []
    for category in CATEGORIES:
        days_since = float(max(0, test_idx - state.category_last_seen_test.get(category, -99)))
        decay_factor = math.exp(-0.05 * days_since)
        effective_skill = clamp(state.category_skill.get(category, 0.5) * decay_factor, 0.0, 1.0)
        weakness_score = ((1.0 - effective_skill) * 0.7) + ((1.0 - decay_factor) * 0.3)
        topic_signals.append((category, weakness_score, decay_factor, days_since))

    topic_signals.sort(key=lambda item: item[1], reverse=True)
    weak_topic_rank = {category: idx for idx, (category, *_rest) in enumerate(topic_signals)}
    weak_cats = {category for category, *_ in topic_signals[:3]}
    stale_cats = {
        category
        for category, _, decay_factor, days_since in topic_signals
        if days_since >= 7 or decay_factor <= 0.70
    }
    adaptive_boost = test_idx >= 4

    weak_multiplier = 1.4 if adaptive_boost else 1.0
    stale_multiplier = 1.2 if adaptive_boost else 1.0

    category_pools: dict[str, list[Question]] = {cat: [] for cat in CATEGORIES}
    for q in bank:
        category_pools[q.category].append(q)

    category_weights: dict[str, float] = {}
    topic_momentum_map: dict[str, float] = {}
    for cat in CATEGORIES:
        weight = 1.0
        if cat in weak_cats:
            weight *= 2.2 * weak_multiplier
            rank = weak_topic_rank.get(cat)
            if rank == 0:
                weight *= 1.2
            elif rank == 1:
                weight *= 1.1
        if cat in stale_cats:
            weight *= 1.5 * stale_multiplier
        recent_values = state.category_recent_results.get(cat, [])
        if recent_values:
            recent_accuracy = sum(recent_values) / len(recent_values)
        else:
            recent_accuracy = state.category_skill.get(cat, 0.5)
        long_term_accuracy = state.category_skill.get(cat, 0.5)
        momentum = recent_accuracy - long_term_accuracy
        momentum_boost = 1.0 + max(0.0, -momentum) * 0.5
        weight *= momentum_boost
        topic_momentum_map[cat] = momentum
        category_weights[cat] = weight

    category_quotas = build_weighted_quotas(category_weights, question_count, min_ratio=0.10, max_ratio=0.45)

    easy_need = max(1, int(round(question_count * 0.20)))
    medium_need = max(1, int(round(question_count * 0.50)))
    hard_need = max(0, question_count - easy_need - medium_need)
    stage_needs = {"easy": easy_need, "medium": medium_need, "hard": hard_need}

    selected: list[Question] = []
    selected_ids: set[int] = set()
    selected_per_category = {cat: 0 for cat in CATEGORIES}
    selected_per_band = {"easy": 0, "medium": 0, "hard": 0}

    def priority_score(question: Question) -> float:
        distance = abs(question.difficulty_percent - state.target_difficulty_percent)
        repeat_penalty = min(3.5, 1.2 ** state.question_seen_frequency.get(question.qid, 0))
        randomness = random.uniform(0.90, 1.10)
        weakness_bonus = 8.0 if question.category in weak_cats else 0.0
        decay_bonus = 5.0 if question.category in stale_cats else 0.0
        mastery_bonus = 8.0 if question.qid in state.mastered_questions else 0.0
        reinforcement_bonus = (
            4.0
            if state.question_seen_frequency.get(question.qid, 0) > 0 and question.qid not in state.mastered_questions
            else 0.0
        )
        return (distance * repeat_penalty * randomness) - weakness_bonus - decay_bonus - mastery_bonus - reinforcement_bonus

    def choose_category_for_stage(stage: str) -> str | None:
        eligible = []
        for cat in CATEGORIES:
            if selected_per_category[cat] >= category_quotas.get(cat, 0):
                continue
            if any(q.qid not in selected_ids and difficulty_band(q.difficulty_percent) == stage for q in category_pools[cat]):
                eligible.append(cat)
        if not eligible:
            return None
        best_category = None
        best_priority = float("-inf")
        for cat in eligible:
            remaining_quota_ratio = (
                (category_quotas.get(cat, 0) - selected_per_category[cat]) / max(1, category_quotas.get(cat, 1))
            )
            noise = random.uniform(0.98, 1.02)
            priority = remaining_quota_ratio * category_weights[cat] * noise
            if priority > best_priority:
                best_priority = priority
                best_category = cat
        return best_category

    for stage in ("easy", "medium", "hard"):
        need = stage_needs[stage]
        while selected_per_band[stage] < need and len(selected) < question_count:
            cat = choose_category_for_stage(stage)
            if not cat:
                break
            candidates = [
                q for q in category_pools[cat]
                if q.qid not in selected_ids and difficulty_band(q.difficulty_percent) == stage
            ]
            if not candidates:
                break
            candidates.sort(key=priority_score)
            q = candidates[0]
            selected.append(q)
            selected_ids.add(q.qid)
            selected_per_category[cat] += 1
            selected_per_band[stage] += 1

    for stage in ("easy", "medium", "hard"):
        deficit = stage_needs[stage] - selected_per_band[stage]
        while deficit > 0 and len(selected) < question_count:
            stage_candidates: list[tuple[str, Question]] = []
            for cat in CATEGORIES:
                if selected_per_category[cat] >= category_quotas.get(cat, 0):
                    continue
                for q in category_pools[cat]:
                    if q.qid in selected_ids:
                        continue
                    if difficulty_band(q.difficulty_percent) != stage:
                        continue
                    stage_candidates.append((cat, q))
            if not stage_candidates:
                break
            stage_candidates.sort(key=lambda item: priority_score(item[1]))
            cat, q = stage_candidates[0]
            selected.append(q)
            selected_ids.add(q.qid)
            selected_per_category[cat] += 1
            selected_per_band[stage] += 1
            deficit -= 1

    if len(selected) < question_count:
        leftovers = [q for q in bank if q.qid not in selected_ids]
        leftovers.sort(key=priority_score)
        for q in leftovers:
            if len(selected) >= question_count:
                break
            if selected_per_category[q.category] >= category_quotas.get(q.category, 0):
                continue
            selected.append(q)
            selected_ids.add(q.qid)
            selected_per_category[q.category] += 1
            selected_per_band[difficulty_band(q.difficulty_percent)] += 1

    if len(selected) < question_count:
        leftovers = [q for q in bank if q.qid not in selected_ids]
        leftovers.sort(key=priority_score)
        for q in leftovers:
            if len(selected) >= question_count:
                break
            if selected_per_category[q.category] >= category_quotas.get(q.category, question_count):
                continue
            selected.append(q)
            selected_ids.add(q.qid)
            selected_per_category[q.category] += 1
            selected_per_band[difficulty_band(q.difficulty_percent)] += 1

    if len(selected) < question_count:
        leftovers = [q for q in bank if q.qid not in selected_ids]
        leftovers.sort(key=priority_score)
        selected.extend(leftovers[: question_count - len(selected)])

    selected = selected[:question_count]
    selected.sort(key=lambda q: {"easy": 0, "medium": 1, "hard": 2}[difficulty_band(q.difficulty_percent)])

    difficulty_counts = Counter(difficulty_band(q.difficulty_percent) for q in selected)
    category_counts = Counter(q.category for q in selected)
    first_chunk = selected[: max(1, int(question_count * 0.25))]
    last_chunk = selected[-max(1, int(question_count * 0.25)) :]

    diagnostics = {
        "selected_questions": len(selected),
        "adaptive_test_index": test_idx,
        "target_difficulty": state.target_difficulty_percent,
        "weak_categories": sorted(weak_cats),
        "stale_categories": sorted(stale_cats),
        "difficulty_distribution": dict(difficulty_counts),
        "category_distribution": dict(category_counts),
        "average_question_difficulty": round(fmean(q.difficulty_percent for q in selected), 2),
        "repeat_penalty_average": round(
            fmean(min(3.5, 1.2 ** state.question_seen_frequency.get(q.qid, 0)) for q in selected), 2
        ),
        "mastered_question_count": sum(1 for q in selected if q.qid in state.mastered_questions),
        "weak_topic_weight_average": round(
            fmean(category_weights[cat] for cat in CATEGORIES if cat in weak_cats) if weak_cats else 0.0,
            2,
        ),
        "first_chunk_avg_difficulty": round(fmean(q.difficulty_percent for q in first_chunk), 2),
        "last_chunk_avg_difficulty": round(fmean(q.difficulty_percent for q in last_chunk), 2),
        "topic_momentum": {cat: round(topic_momentum_map.get(cat, 0.0), 3) for cat in CATEGORIES},
    }
    return selected, diagnostics


def calculate_pass_probability(state: AdaptiveState, bank_size: int) -> float:
    # Logistic pass-probability model (scaled to 0..100 for simulation reporting).
    if not state.test_scores:
        return 5.0

    recent_scores = state.test_scores[-5:]
    recent_accuracy = clamp((fmean(recent_scores) / 100.0), 0.0, 1.0)

    difficulty_performance = 0.0
    if state.hard_attempt_count > 0:
        difficulty_performance = clamp(
            state.hard_correct_count / max(1, state.hard_attempt_count),
            0.0,
            1.0,
        )
    else:
        # Match production behavior: no observed hard-signal yet.
        difficulty_performance = 0.0
    mastery_coverage = clamp(len(state.mastered_questions) / max(1, len(state.seen_questions)), 0.0, 1.0)

    weak_count = sum(1 for value in state.category_skill.values() if value < 0.55)
    weak_topic_ratio = clamp(weak_count / max(1, len(state.category_skill)), 0.0, 1.0)

    learning_trend = 0.0
    if len(state.test_scores) >= 6:
        learning_trend = clamp(
            ((fmean(state.test_scores[-3:]) - fmean(state.test_scores[-6:-3])) / 50.0),
            -1.0,
            1.0,
        )
    elif len(state.test_scores) >= 2:
        learning_trend = clamp(((state.test_scores[-1] - state.test_scores[-2]) / 50.0), -1.0, 1.0)

    z = (
        (0.35 * recent_accuracy)
        + (0.25 * difficulty_performance)
        + (0.20 * mastery_coverage)
        - (0.15 * weak_topic_ratio)
        + (0.05 * learning_trend)
    )
    probability = 1.0 / (1.0 + math.exp(-z))
    probability = clamp(probability, 0.05, 0.95)
    return round(probability * 100.0, 2)


def simulate_user(
    profile: UserProfile,
    tests_count: int,
    question_count: int,
    bank: list[Question],
) -> dict:
    state = AdaptiveState()
    records: list[dict] = []

    for test_idx in range(1, tests_count + 1):
        selected, diagnostics = generate_adaptive_test(bank, state, question_count, test_idx)

        correct_count = 0
        category_correct = defaultdict(int)
        category_total = defaultdict(int)

        for q in selected:
            p = profile.probability_correct(q.category, q.difficulty_percent, test_idx)
            is_correct = random.random() < p

            q.update_after_answer(is_correct=is_correct)
            state.seen_questions.add(q.qid)
            state.question_seen_frequency[q.qid] += 1
            state.category_last_seen_test[q.category] = test_idx
            state.question_attempt_count[q.qid] += 1
            if difficulty_band(q.difficulty_percent) == "hard":
                state.hard_attempt_count += 1

            category_total[q.category] += 1
            if is_correct:
                correct_count += 1
                category_correct[q.category] += 1
                state.question_correct_count[q.qid] += 1
                if difficulty_band(q.difficulty_percent) == "hard":
                    state.hard_correct_count += 1
            recent_cat = state.category_recent_results[q.category]
            recent_cat.append(1 if is_correct else 0)
            if len(recent_cat) > 20:
                recent_cat.pop(0)

            recent_results = state.question_recent_results[q.qid]
            recent_results.append(is_correct)
            if len(recent_results) > 2:
                recent_results.pop(0)

            is_mastered = (
                state.question_correct_count[q.qid] >= 2
                and len(recent_results) >= 2
                and all(recent_results)
            )
            if is_mastered:
                state.mastered_questions.add(q.qid)
                state.needs_review.discard(q.qid)
            else:
                state.mastered_questions.discard(q.qid)
                if not is_correct:
                    state.needs_review.add(q.qid)

            previous_skill = state.category_skill[q.category]
            state.category_skill[q.category] = clamp(
                (previous_skill * 0.7) + ((1.0 if is_correct else 0.0) * 0.3),
                0.01,
                0.99,
            )

        score_pct = (correct_count / question_count) * 100

        # Score-based target adaptation (faster and smoother than per-question +/-1).
        delta = 0
        if score_pct >= 85:
            delta = -4
        elif score_pct >= 70:
            delta = -2
        elif score_pct <= 35:
            delta = +5
        elif score_pct <= 50:
            delta = +3
        if len(state.test_scores) >= 6:
            recent_three = state.test_scores[-3:]
            previous_three = state.test_scores[-6:-3]
            trend = (sum(recent_three) / len(recent_three)) - (sum(previous_three) / len(previous_three))
            if trend > 5.0:
                delta -= 2
            elif trend < -5.0:
                delta += 2
        state.target_difficulty_percent = int(clamp(state.target_difficulty_percent + delta, 0, 100))
        state.test_scores.append(score_pct)

        probability = calculate_pass_probability(state, bank_size=len(bank))

        weak_scored_now: list[tuple[str, float]] = []
        for category in CATEGORIES:
            days_since = float(max(0, test_idx - state.category_last_seen_test.get(category, -99)))
            decay_factor = math.exp(-0.05 * days_since)
            effective_skill = clamp(state.category_skill.get(category, 0.5) * decay_factor, 0.0, 1.0)
            weakness_score = ((1.0 - effective_skill) * 0.7) + ((1.0 - decay_factor) * 0.3)
            weak_scored_now.append((category, weakness_score))
        weak_scored_now.sort(key=lambda item: item[1], reverse=True)
        weak_now = [category for category, _ in weak_scored_now[:2]]

        records.append(
            {
                "test_idx": test_idx,
                "score_pct": round(score_pct, 2),
                "pass_probability": probability,
                "target_difficulty_after": state.target_difficulty_percent,
                "difficulty_distribution": diagnostics["difficulty_distribution"],
                "category_distribution": diagnostics["category_distribution"],
                "first_chunk_avg_difficulty": diagnostics["first_chunk_avg_difficulty"],
                "last_chunk_avg_difficulty": diagnostics["last_chunk_avg_difficulty"],
                "weak_categories_used": diagnostics["weak_categories"],
                "stale_categories_used": diagnostics["stale_categories"],
                "weak_categories_now": weak_now,
            }
        )

    return {
        "profile": profile.name,
        "records": records,
        "final_target_difficulty": state.target_difficulty_percent,
        "final_category_skill": {k: round(v, 3) for k, v in state.category_skill.items()},
        "mastered_questions": len(state.mastered_questions),
        "needs_review": len(state.needs_review),
        "seen_questions": len(state.seen_questions),
    }


def summarize_simulation(sim_data: dict, question_count: int) -> None:
    profile = sim_data["profile"]
    records = sim_data["records"]
    initial_prob = records[0]["pass_probability"]
    final_prob = records[-1]["pass_probability"]
    avg_score = round(fmean(r["score_pct"] for r in records), 2)

    first_d = fmean(r["first_chunk_avg_difficulty"] for r in records)
    last_d = fmean(r["last_chunk_avg_difficulty"] for r in records)
    progression_ok = first_d > last_d  # easy(high%) -> hard(low%)

    category_totals = Counter()
    for r in records:
        category_totals.update(r["category_distribution"])
    total_selected = tests_count = len(records) * question_count
    category_share = {k: round((v / max(1, total_selected)) * 100, 2) for k, v in category_totals.items()}

    print(f"\n=== {profile} ===")
    print(f"Tests: {len(records)} | Avg score: {avg_score}% | Pass probability: {initial_prob}% -> {final_prob}%")
    print(
        "Difficulty progression (easy->hard ordering): "
        f"{'OK' if progression_ok else 'CHECK'} "
        f"(front avg={first_d:.2f}, tail avg={last_d:.2f})"
    )
    print(f"Category share (%): {category_share}")
    print(
        f"Seen={sim_data['seen_questions']} | Mastered={sim_data['mastered_questions']} | Needs review={sim_data['needs_review']}"
    )
    print(f"Final weak skills: {sim_data['final_category_skill']}")

    # Profile-specific adaptation checks
    if profile == "User A":
        inter_share = category_share.get("intersections", 0.0)
        print(
            f"Adaptation check (weak intersections emphasis): "
            f"{'PASS' if inter_share >= 25 else 'WARN'} (intersections={inter_share}%)"
        )
    elif profile == "User B":
        spread = max(category_share.values()) - min(category_share.values())
        print(
            f"Adaptation check (balanced random profile): "
            f"{'PASS' if spread <= 6 else 'WARN'} (share spread={spread:.2f}%)"
        )
    elif profile == "User C":
        gain = final_prob - initial_prob
        print(
            f"Adaptation check (improving probability): "
            f"{'PASS' if gain >= 12 else 'WARN'} (gain={gain:.2f}%)"
        )

    print("Sample trajectory (test: score%, probability%, weak_now):")
    for row in records[:3] + records[-3:]:
        print(
            f"  T{row['test_idx']:02d}: {row['score_pct']:>5.1f}% | "
            f"{row['pass_probability']:>5.1f}% | weak={','.join(row['weak_categories_now'])}"
        )


def build_profiles() -> list[UserProfile]:
    def user_a_rule(category: str, _: int) -> float:
        if category == "intersections":
            return -0.06
        return 0.0

    def user_c_rule(_: str, test_idx: int) -> float:
        # Improvement curve over time, saturates later.
        return min(0.40, test_idx * 0.020)

    return [
        UserProfile(
            name="User A",
            base_strength={
                "signs": 0.88,
                "intersections": 0.44,
                "rules": 0.76,
                "road_markings": 0.72,
                "driving_culture": 0.70,
            },
            trend_per_test=0.002,
            noise=0.05,
            extra_rule=user_a_rule,
        ),
        UserProfile(
            name="User B",
            base_strength={cat: 0.60 for cat in CATEGORIES},
            trend_per_test=0.0,
            noise=0.16,
        ),
        UserProfile(
            name="User C",
            base_strength={
                "signs": 0.33,
                "intersections": 0.28,
                "rules": 0.31,
                "road_markings": 0.34,
                "driving_culture": 0.30,
            },
            trend_per_test=0.025,
            noise=0.06,
            extra_rule=user_c_rule,
        ),
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulate adaptive learning behavior for AUTOTEST.")
    parser.add_argument("--tests", type=int, default=20, help="Number of tests per simulated user.")
    parser.add_argument("--questions", type=int, default=30, help="Questions per generated test.")
    parser.add_argument("--bank-size", type=int, default=1200, help="Total size of synthetic question bank.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility.")
    args = parser.parse_args()

    random.seed(args.seed)
    base_bank = build_question_bank(total_questions=args.bank_size, seed=args.seed)
    profiles = build_profiles()

    print(
        f"Running adaptive simulation: users={len(profiles)}, tests={args.tests}, "
        f"questions_per_test={args.questions}, bank_size={args.bank_size}, seed={args.seed}"
    )

    for profile in profiles:
        # Clone bank per profile to avoid cross-user contamination in difficulty stats.
        bank_clone = [
            Question(
                qid=q.qid,
                category=q.category,
                difficulty_percent=q.difficulty_percent,
                total_attempts=q.total_attempts,
                total_correct=q.total_correct,
                dynamic_difficulty_score=q.dynamic_difficulty_score,
            )
            for q in base_bank
        ]
        sim_data = simulate_user(
            profile=profile,
            tests_count=args.tests,
            question_count=args.questions,
            bank=bank_clone,
        )
        summarize_simulation(sim_data, question_count=args.questions)

    print("\nSimulation completed.")


if __name__ == "__main__":
    main()
