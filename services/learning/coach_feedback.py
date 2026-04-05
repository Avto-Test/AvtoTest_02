"""Shared rule-based coach feedback for answered questions."""

from __future__ import annotations

from typing import TypedDict

from models.answer_option import AnswerOption
from models.question import Question


class AiCoachFeedbackPayload(TypedDict):
    tip: str
    mistake_analysis: str
    recommendation: str


class QuestionFeedbackPayload(TypedDict):
    correct_answer: str
    explanation: str
    ai_coach: AiCoachFeedbackPayload
    recommendations: list[str]


def sanitize_option_text(text_value: str) -> str:
    text = text_value.strip()
    if text.lower().endswith("/t"):
        return text[:-2].rstrip()
    return text


def topic_label(question: Question) -> str:
    return (question.topic or question.category or "this traffic rule").strip() or "this traffic rule"


def pick_driving_tip(question: Question) -> str:
    haystack = f"{question.text} {question.topic or ''} {question.category or ''}".lower()
    keyword_tips = (
        (("distance", "interval", "following"), "Keep a full safety gap and increase it whenever speed or stopping distance grows."),
        (("rain", "wet", "fog", "visibility"), "When visibility drops, slow down early and leave extra room for braking."),
        (("intersection", "yield", "priority", "right of way", "chorraha"), "At intersections, scan early and confirm right-of-way before you commit."),
        (("speed", "curve", "brake"), "Choose a safe speed before the hazard, not after you enter it."),
        (("sign", "marking", "belgi", "chiziq"), "Road signs and lane markings usually settle the safest answer first."),
    )
    for keywords, tip in keyword_tips:
        if any(keyword in haystack for keyword in keywords):
            return tip
    return "Look for visibility, distance, and right-of-way clues before making your final choice."


def build_recommendation(*, is_correct: bool, question: Question) -> str:
    label = topic_label(question).lower()
    if is_correct:
        return f"Good job. Reuse the same scan order next time: sign, right-of-way, then safe {label} spacing."
    return f"Almost there. Slow the decision down and check the safest {label} clue before matching familiar wording."


def build_mistake_analysis(
    *,
    is_correct: bool,
    question: Question,
    selected_option: AnswerOption,
    correct_option: AnswerOption,
) -> str:
    topic = topic_label(question).lower()
    selected_text = sanitize_option_text(selected_option.text)
    correct_text = sanitize_option_text(correct_option.text)
    if is_correct:
        return f'You chose "{selected_text}" and followed the main safety rule for {topic}.'
    return (
        f'You chose "{selected_text}" instead of "{correct_text}". '
        f"That usually happens when the wording feels familiar, but the safest {topic} rule points somewhere else."
    )


def build_question_feedback(
    *,
    question: Question,
    selected_option: AnswerOption,
    correct_option: AnswerOption,
    is_correct: bool,
) -> QuestionFeedbackPayload:
    label = topic_label(question)
    correct_text = sanitize_option_text(correct_option.text)
    ai_coach: AiCoachFeedbackPayload = {
        "tip": pick_driving_tip(question),
        "mistake_analysis": build_mistake_analysis(
            is_correct=is_correct,
            question=question,
            selected_option=selected_option,
            correct_option=correct_option,
        ),
        "recommendation": build_recommendation(is_correct=is_correct, question=question),
    }
    return {
        "correct_answer": correct_text,
        "explanation": (
            f'The correct answer is "{correct_text}" because it matches the safest rule for {label.lower()}. '
            "Focus on the rule that protects visibility, space, and right-of-way first."
        ),
        "ai_coach": ai_coach,
        "recommendations": [ai_coach["recommendation"], ai_coach["tip"]],
    }

