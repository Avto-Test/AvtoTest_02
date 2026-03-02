import asyncio
import os
import sys
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from models.answer_option import AnswerOption
from models.question import Question
from models.test import Test


SEED_TEST_TITLE = "Seed: 50 ta demo savol"
SEED_TEST_DESCRIPTION = "Auto-generated demo savollar (admin test data)."

TOPICS = [
    "Yo'l belgilari",
    "Yo'l ustuvorligi",
    "Tezlik rejimi",
    "To'xtash va turish",
    "Xavfsizlik",
    "Piyodalar",
    "Burilish qoidalari",
    "Qorong'ida haydash",
    "Favqulodda vaziyat",
    "Masofa saqlash",
]

CATEGORIES = ["B toifa", "Shahar", "Trassa", "Aralash"]
DIFFICULTIES = ["easy", "medium", "hard"]


def build_question_bank() -> list[dict]:
    bank: list[dict] = []
    for i in range(1, 51):
        topic = TOPICS[(i - 1) % len(TOPICS)]
        category = CATEGORIES[(i - 1) % len(CATEGORIES)]
        difficulty = DIFFICULTIES[(i - 1) % len(DIFFICULTIES)]

        if i % 5 == 1:
            question_text = (
                f"{i}-savol ({topic}): chorrahaga yaqinlashganda birinchi navbatda nima qilinadi?"
            )
            options = [
                "Vaziyatni baholab, belgi/chiroq talabini bajarish",
                "Signaldan qat'i nazar tezlikni oshirish",
                "Faqat orqa oynaga qarab harakat qilish",
                "To'xtamasdan chapga burilish",
            ]
            correct_index = 0
        elif i % 5 == 2:
            question_text = (
                f"{i}-savol ({topic}): noqulay ob-havo sharoitida eng to'g'ri harakat qaysi?"
            )
            options = [
                "Masofani kamaytirib oldingi mashinaga yaqin yurish",
                "Tezlikni moslashtirish va xavfsiz masofani oshirish",
                "Faqat uzoq chiroq bilan yurish",
                "Tormozni keskin bosib tez-tez to'xtash",
            ]
            correct_index = 1
        elif i % 5 == 3:
            question_text = (
                f"{i}-savol ({topic}): piyodalar o'tish joyiga yaqinlashganda qaysi amal to'g'ri?"
            )
            options = [
                "Piyoda yo'qligiga ishonch hosil qilmasdan davom etish",
                "Faqat signal berib o'tib ketish",
                "Tezlikni pasaytirib, zarur bo'lsa to'xtash",
                "Chap qatordan o'ngga keskin o'tish",
            ]
            correct_index = 2
        elif i % 5 == 4:
            question_text = (
                f"{i}-savol ({topic}): xavfli vaziyatda tormozlashning eng xavfsiz usuli qaysi?"
            )
            options = [
                "Rulni bo'shatib, ko'zni yumib tormozlash",
                "Keskin burib, gazni bosish",
                "Faqat qo'l tormozidan foydalanish",
                "Rulni nazoratda ushlab, bosqichma-bosqich tormozlash",
            ]
            correct_index = 3
        else:
            question_text = (
                f"{i}-savol ({topic}): yo'lda xavfsizlikni oshirish uchun eng muhim odat qaysi?"
            )
            options = [
                "Telefonni qo'lda ushlab gaplashish",
                "Harakatda bo'lganda oynalarga qaramaslik",
                "Burilish oldidan signal bermaslik",
                "Doimiy kuzatuv va qoidalarga mos harakat",
            ]
            correct_index = 3

        bank.append(
            {
                "text": question_text,
                "topic": topic,
                "category": category,
                "difficulty": difficulty,
                "options": options,
                "correct_index": correct_index,
            }
        )
    return bank


async def seed_questions() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    question_bank = build_question_bank()

    async with session_factory() as session:
        result = await session.execute(
            select(Test)
            .where(Test.title == SEED_TEST_TITLE)
            .options(selectinload(Test.questions).selectinload(Question.answer_options))
        )
        test = result.scalar_one_or_none()

        if test is None:
            test = Test(
                title=SEED_TEST_TITLE,
                description=SEED_TEST_DESCRIPTION,
                difficulty="medium",
                is_active=True,
                is_premium=False,
                duration=62,
                created_at=datetime.now(timezone.utc),
            )
            session.add(test)
            await session.flush()
            existing_count = 0
            print(f"Created test: {test.title} ({test.id})")
        else:
            existing_count = len(test.questions)
            print(f"Found existing test: {test.title} ({test.id}), current questions: {existing_count}")

        if existing_count >= 50:
            print("Test already has 50 or more questions. Nothing to insert.")
            await session.commit()
            await engine.dispose()
            return

        to_insert = question_bank[existing_count:50]
        for item in to_insert:
            question = Question(
                test_id=test.id,
                text=item["text"],
                media_type="text",
                topic=item["topic"],
                category=item["category"],
                difficulty=item["difficulty"],
                created_at=datetime.now(timezone.utc),
            )
            session.add(question)
            await session.flush()

            for idx, option_text in enumerate(item["options"]):
                is_correct = idx == item["correct_index"]
                text_with_marker = f"{option_text} /t" if is_correct else option_text
                session.add(
                    AnswerOption(
                        question_id=question.id,
                        text=text_with_marker,
                        is_correct=is_correct,
                    )
                )

        await session.commit()
        print(f"Inserted {len(to_insert)} new questions.")

        verify_result = await session.execute(
            select(Test)
            .where(Test.id == test.id)
            .options(selectinload(Test.questions))
        )
        verify_test = verify_result.scalar_one()
        print(f"Final question count: {len(verify_test.questions)}")

    await engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(seed_questions())
    except Exception as exc:
        print(f"ERROR: {exc}")
        raise
