"""
Shared taxonomy helpers for questions and lessons.
"""

import re


def normalize_learning_key(value: str | None) -> str:
    """
    Convert topic/category text into one canonical key.
    """
    if value is None:
        return "general"

    collapsed = re.sub(r"\s+", " ", value.strip().lower())
    if not collapsed:
        return "general"

    canonical = re.sub(r"[^a-z0-9 ]+", "", collapsed)
    canonical = canonical.strip()
    return canonical or "general"


def question_learning_key(topic: str | None, category: str | None) -> str:
    """
    Use a single source-of-truth key for question classification.
    """
    if topic and topic.strip():
        return normalize_learning_key(topic)
    if category and category.strip():
        return normalize_learning_key(category)
    return "general"


def lesson_learning_keys(topic: str | None, section: str | None) -> set[str]:
    """
    Build lesson matching keys from topic and section.
    """
    keys = {
        normalize_learning_key(topic),
        normalize_learning_key(section),
    }
    keys.discard("")
    return keys or {"general"}
