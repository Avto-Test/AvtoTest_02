"""
Shared taxonomy helpers for questions, lessons, analytics, and learning-path topics.
"""

from __future__ import annotations

import re


def normalize_learning_key(value: str | None) -> str:
    """
    Convert topic/category text into one normalized key.
    """
    if value is None:
        return "general"

    collapsed = re.sub(r"\s+", " ", value.strip().lower())
    if not collapsed:
        return "general"

    canonical = re.sub(r"[^a-z0-9 ]+", "", collapsed)
    canonical = canonical.strip()
    return canonical or "general"


_CANONICAL_LEARNING_TOPIC_DEFINITIONS = (
    (
        "Yo'l belgilari",
        {
            "yol belgilari",
            "belgilar",
            "belgi",
            "road signs",
            "signs",
            "sign",
        },
    ),
    (
        "Chorrahalar",
        {
            "chorrahalar",
            "chorraha",
            "yol ustuvorligi",
            "ustuvorlik",
            "intersection",
            "priority",
        },
    ),
    (
        "Yo'l chiziqlari",
        {
            "yol chiziqlari",
            "chiziqlar",
            "chiziq",
            "line",
            "lines",
            "marking",
            "markings",
        },
    ),
    (
        "Haydovchi madaniyati",
        {
            "haydovchi madaniyati",
            "madaniyat",
            "culture",
            "etika",
            "xulq",
        },
    ),
    (
        "Transport boshqaruvi",
        {
            "transport boshqaruvi",
            "transport",
            "boshqaruv",
            "manevr",
            "parkovka",
            "burilish qoidalari",
            "burilish",
        },
    ),
    (
        "Yo'l xavfsizligi",
        {
            "yol xavfsizligi",
            "xavfsiz haydash",
            "xavfsizlik",
            "masofa saqlash",
            "tezlik rejimi",
            "qorongida haydash",
            "favqulodda vaziyat",
            "masofa",
            "tezlik",
        },
    ),
    (
        "Yo'l harakati qoidalari",
        {
            "yol harakati qoidalari",
            "yol qoidalari",
            "qoidalar",
            "qoida",
            "traffic",
            "rule",
            "rules",
        },
    ),
)

_CANONICAL_TOPIC_INDEX = [
    (
        label,
        normalize_learning_key(label),
        {normalize_learning_key(alias) for alias in aliases},
    )
    for label, aliases in _CANONICAL_LEARNING_TOPIC_DEFINITIONS
]

CANONICAL_LEARNING_TOPIC_LABELS = tuple(label for label, _ in _CANONICAL_LEARNING_TOPIC_DEFINITIONS)


def _matches_learning_alias(normalized_value: str, alias_space: set[str]) -> bool:
    if normalized_value in alias_space:
        return True

    for alias in alias_space:
        if alias == "general":
            continue
        if normalized_value in alias or alias in normalized_value:
            return True
    return False


def learning_topic_aliases(value: str | None) -> set[str]:
    """
    Return normalized aliases for a topic in a single place.
    """
    normalized = normalize_learning_key(value)
    if normalized == "general":
        return {"general"}

    for _, canonical_key, aliases in _CANONICAL_TOPIC_INDEX:
        alias_space = {canonical_key, *aliases}
        if _matches_learning_alias(normalized, alias_space):
            return alias_space

    return {normalized}


def canonical_learning_key(value: str | None) -> str:
    """
    Map raw topic/category text onto a canonical normalized key.
    """
    normalized = normalize_learning_key(value)
    if normalized == "general":
        return "general"

    for _, canonical_key, aliases in _CANONICAL_TOPIC_INDEX:
        alias_space = {canonical_key, *aliases}
        if _matches_learning_alias(normalized, alias_space):
            return canonical_key

    return normalized


def canonical_learning_label(value: str | None) -> str:
    """
    Human-friendly canonical label for analytics and UI groupings.
    """
    canonical_key = canonical_learning_key(value)
    if canonical_key == "general":
        return "Umumiy"

    for label, indexed_key, _ in _CANONICAL_TOPIC_INDEX:
        if indexed_key == canonical_key:
            return label

    return str(value).strip() if value and str(value).strip() else "Umumiy"


def learning_topics_match(left: str | None, right: str | None) -> bool:
    """
    Compare two topic labels using the shared alias map.
    """
    left_aliases = learning_topic_aliases(left)
    right_aliases = learning_topic_aliases(right)

    if left_aliases == {"general"} or right_aliases == {"general"}:
        return False

    if left_aliases & right_aliases:
        return True

    return any(
        left_alias in right_alias or right_alias in left_alias
        for left_alias in left_aliases
        for right_alias in right_aliases
    )


def question_learning_key(topic: str | None, category: str | None) -> str:
    """
    Use a single source-of-truth key for question classification.
    """
    if topic and topic.strip():
        return canonical_learning_key(topic)
    if category and category.strip():
        return canonical_learning_key(category)
    return "general"


def lesson_learning_keys(topic: str | None, section: str | None) -> set[str]:
    """
    Build lesson matching keys from topic and section.
    """
    keys = set()
    for value in (topic, section):
        keys.update(learning_topic_aliases(value))
    keys.discard("")
    return keys or {"general"}
