import asyncio
import os
import sys
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from models.answer_option import AnswerOption
from models.question import Question
from models.question_category import QuestionCategory
from models.test import Test

QUESTION_BANK_TEST_TITLE = "Question Bank (Internal)"
QUESTION_BANK_TEST_DESCRIPTION = "Internal container for admin-managed question bank."

CATEGORY_NAMES = [
    "Yo'l belgilari",
    "Ustuvorlik",
    "Tezlik rejimi",
    "To'xtash va turish",
    "Burilish qoidalari",
    "Piyodalar xavfsizligi",
    "Temiryo'l kesishmasi",
    "Qorong'ida haydash",
    "Favqulodda vaziyat",
    "Masofa saqlash",
]


def build_question_rows() -> list[dict]:
    rows: list[dict] = []
    for idx in range(1, 101):
        category_name = CATEGORY_NAMES[(idx - 1) % len(CATEGORY_NAMES)]
        difficulty_percent = 20 + ((idx * 7) % 61)  # 20..80
        if difficulty_percent <= 33:
            difficulty = "hard"
        elif difficulty_percent <= 66:
            difficulty = "medium"
        else:
            difficulty = "easy"

        question_text = f"{idx}-savol ({category_name}): to'g'ri harakat variantini tanlang."
        options = [
            "Xavfsiz va qoidalarga mos harakat qilish",
            "Yo'l vaziyatini e'tiborsiz qoldirish",
            "Signal bermasdan keskin yo'nalish o'zgartirish",
            "Masofani saqlamasdan tezlik oshirish",
        ]
        correct_index = 0

        rows.append(
            {
                "text": question_text,
                "topic": category_name,
                "difficulty": difficulty,
                "difficulty_percent": difficulty_percent,
                "category_name": category_name,
                "options": options,
                "correct_index": correct_index,
            }
        )
    return rows


async def reseed_question_bank() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        bank_test_result = await session.execute(
            select(Test).where(Test.title == QUESTION_BANK_TEST_TITLE)
        )
        bank_test = bank_test_result.scalar_one_or_none()
        if bank_test is None:
            bank_test = Test(
                title=QUESTION_BANK_TEST_TITLE,
                description=QUESTION_BANK_TEST_DESCRIPTION,
                difficulty="bank",
                is_active=False,
                is_premium=False,
                duration=62,
                created_at=datetime.now(timezone.utc),
            )
            session.add(bank_test)
            await session.flush()

        await session.execute(delete(AnswerOption))
        await session.execute(delete(Question))
        await session.execute(delete(QuestionCategory))
        await session.flush()

        category_map: dict[str, QuestionCategory] = {}
        for category_name in CATEGORY_NAMES:
            category = QuestionCategory(
                name=category_name,
                description=f"{category_name} bo'yicha savollar",
                is_active=True,
            )
            session.add(category)
            await session.flush()
            category_map[category_name] = category

        question_rows = build_question_rows()
        for row in question_rows:
            category = category_map[row["category_name"]]
            question = Question(
                test_id=bank_test.id,
                category_id=category.id,
                text=row["text"],
                media_type="text",
                topic=row["topic"],
                category=category.name,
                difficulty=row["difficulty"],
                difficulty_percent=row["difficulty_percent"],
                created_at=datetime.now(timezone.utc),
            )
            session.add(question)
            await session.flush()

            for option_index, option_text in enumerate(row["options"]):
                is_correct = option_index == row["correct_index"]
                option_payload = f"{option_text} /t" if is_correct else option_text
                session.add(
                    AnswerOption(
                        question_id=question.id,
                        text=option_payload,
                        is_correct=is_correct,
                    )
                )

        await session.commit()
        print("Question bank reseeded with 100 questions.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(reseed_question_bank())

