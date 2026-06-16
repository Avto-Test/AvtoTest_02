import asyncio
import hashlib
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from core.security import get_password_hash
from models.analytics_event import AnalyticsEvent
from models.answer_option import AnswerOption
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.driving_instructor import DrivingInstructor
from models.driving_school import DrivingSchool
from models.question import Question
from models.question_category import QuestionCategory
from models.review_queue import ReviewQueue
from models.subscription import Subscription
from models.test import Test
from models.user import User
from models.user_adaptive_profile import UserAdaptiveProfile
from models.user_notification import UserNotification
from models.user_question_history import UserQuestionHistory
from models.user_skill import UserSkill
from models.user_topic_stats import UserTopicStats
from seed_demo_catalog_content import (
    REVIEWER_PASSWORD,
    ensure_assets,
    ensure_reviewers,
    upsert_instructors,
    upsert_lessons,
    upsert_schools,
)
from services.learning.progress_tracking import LearningAnswerRecord, apply_learning_progress_updates


DEMO_PASSWORD = "AutotestDemo!2026"
DEMO_TEST_PREFIX = "Demo:"
ADAPTIVE_TEST_TITLE = "Adaptive Practice Mode"
LEARNING_TEST_TITLE = "Learning Review Session"
NOW_UTC = datetime.now(timezone.utc)

DEMO_USERS = [
    ("demo.student@example.com", "Aziza Karimova", "premium", False, 120),
    ("demo.free@example.com", "Jasur Rahimov", "free", False, 65),
    ("demo.admin@example.com", "Dilshod Admin", "premium", True, 220),
    ("demo.school.owner@example.com", "Madina School Owner", "premium", False, 155),
    ("demo.instructor.owner@example.com", "Rustam Instructor Owner", "premium", False, 140),
]

DEMO_CATEGORIES = [
    "Yo'l belgilari",
    "Chorrahalar",
    "Yo'l chiziqlari",
    "Haydovchi madaniyati",
    "Yo'l harakati qoidalari",
]

TOPIC_SEEDS: dict[str, dict[str, Any]] = {
    "Yo'l belgilari": {
        "asset": "/demo/lessons/road-signs.svg",
        "contexts": ["Sergeli halqa yo'lida", "Chilonzor ichki ko'chasida", "Samarqand markazida", "Jizzax yangi yo'lida", "maktab oldi hududida"],
        "prompts": [
            "ogohlantiruvchi belgi ko'ringanda eng to'g'ri yondashuv qaysi",
            "taqiqlovchi belgi mavjud bo'lsa qaysi qaror xavfsiz",
            "vaqtinchalik belgi qo'yilganda nimaga amal qilinadi",
        ],
        "correct": "Belgida ko'rsatilgan cheklovga amal qilib, tezlik va qatorni moslashtirish",
        "wrongs": [
            "Yo'l bo'sh bo'lsa belgini e'tiborsiz qoldirish",
            "Faqat orqa oynaga qarab harakatni davom ettirish",
            "Signal chalib tezlikni oshirish",
        ],
    },
    "Chorrahalar": {
        "asset": "/demo/lessons/intersection.svg",
        "contexts": ["svetofor ishlamay qolgan chorrahada", "teng huquqli kesishmada", "metro chiqishidagi oqimda", "yomg'irli kechqurun markazda", "mahalla ichidagi tor kesishmada"],
        "prompts": [
            "ustuvorlikni aniqlash uchun birinchi navbatda nima qilinadi",
            "chapga burilishda qaysi nazorat ustun bo'ladi",
            "murakkab oqimga xavfsiz kirish qaysi qaror bilan boshlanadi",
        ],
        "correct": "Belgilar, piyodalar va qarama-qarshi oqimni to'liq kuzatib, bo'sh oraliqda harakat qilish",
        "wrongs": [
            "Kim tezroq kirsa o'sha o'tadi deb hisoblash",
            "Faqat signal bilan boshqalarni to'xtatishga urinish",
            "Piyodalar yo'qligini ko'rib tezlikni oshirish",
        ],
    },
    "Yo'l chiziqlari": {
        "asset": "/demo/lessons/parking.svg",
        "contexts": ["ko'p qatorli magistralda", "ko'prik ustida", "parkovka maydoni yonida", "aylanmaga yaqinlashganda", "qor tushgan tongda"],
        "prompts": [
            "uzluksiz chiziq oldida qaysi harakat to'g'ri",
            "to'xtash chizig'iga yaqinlashganda nimaga e'tibor beriladi",
            "yo'naltiruvchi chiziqlar ko'rsatilganda qaysi tayyorgarlik zarur",
        ],
        "correct": "Chiziq va yo'naltirishlarga amal qilib, qatorni oldindan to'g'ri tanlash",
        "wrongs": [
            "Yo'l bo'sh bo'lsa chiziqni bosib o'tish",
            "Faqat chap tomondagi oqimga qarab qatorni keskin almashtirish",
            "Belgini faqat kechasi hisobga olish",
        ],
    },
    "Haydovchi madaniyati": {
        "asset": "/demo/lessons/safety.svg",
        "contexts": ["tirbandlik paytida", "piyodalar yo'lagi oldida", "yangi haydovchi bilan yonma-yon", "shifoxona yaqinida", "yomg'irli chekka ko'chada"],
        "prompts": [
            "madaniyatli haydovchi qaysi yo'lni tanlaydi",
            "piyodaga nisbatan eng to'g'ri muomala qaysi",
            "boshqa haydovchi xato qilsa qanday yondashuv xavfsiz",
        ],
        "correct": "Masofani saqlab, konfliktga kirmasdan xavfsiz va oldindan signal bilan harakat qilish",
        "wrongs": [
            "Dars berish uchun keskin tormozlash",
            "Piyoda yo'lagidan aylanib o'tish",
            "Doimiy signal bilan bosim qilish",
        ],
    },
    "Yo'l harakati qoidalari": {
        "asset": "/demo/lessons/safety.svg",
        "contexts": ["60 km/soat zonada", "yomg'irli trassada", "tun payti aylana yo'lda", "ta'mirlash hududida", "maktab oldi cheklangan zonada"],
        "prompts": [
            "tezlikni tanlashda asosiy mezon nima",
            "xavfsiz masofa qaysi usul bilan saqlanadi",
            "ko'rinish pasayganda qaysi qaror to'g'ri bo'ladi",
        ],
        "correct": "Belgilangan limit va real ko'rinish sharoitiga mos xavfsiz tezlik hamda masofani tanlash",
        "wrongs": [
            "Faqat avtomobil quvvatiga suyanish",
            "Oldingi mashina tezligini ko'r-ko'rona takrorlash",
            "Yo'l bo'sh bo'lsa limitni inkor etish",
        ],
    },
}

DEMO_TESTS = [
    ("Demo: Belgilar Sprint", "Yo'l belgilariga fokuslangan 20 savol.", "easy", False, 25, 20, ["Yo'l belgilari"], False),
    ("Demo: Chorrahalar Lab", "Chorrahalar va ustuvorlik bo'yicha 20 savol.", "medium", False, 25, 20, ["Chorrahalar"], False),
    ("Demo: Yo'l Chiziqlari Fokus", "Yo'l chiziqlari va qatorlashish bo'yicha 20 savol.", "medium", False, 25, 20, ["Yo'l chiziqlari"], False),
    ("Demo: Haydovchi Madaniyati", "Etika va xavfsiz muomala bo'yicha 20 savol.", "easy", False, 25, 20, ["Haydovchi madaniyati"], False),
    ("Demo: YHQ Asoslari", "Umumiy YHQ bo'yicha 20 savol.", "medium", False, 25, 20, ["Yo'l harakati qoidalari"], False),
    ("Demo: Yakuniy Aralash Imtihon", "Barcha mavzulardan 50 savollik aralash imtihon.", "medium", False, 62, 50, DEMO_CATEGORIES, False),
    ("Demo: Premium Murakkab Vaziyatlar", "Bosim ostidagi 30 savollik premium test.", "hard", True, 38, 30, DEMO_CATEGORIES, True),
]

USER_ACCURACY = {
    "demo.student@example.com": {"Yo'l belgilari": 0.82, "Chorrahalar": 0.56, "Yo'l chiziqlari": 0.61, "Haydovchi madaniyati": 0.78, "Yo'l harakati qoidalari": 0.71},
    "demo.free@example.com": {"Yo'l belgilari": 0.6, "Chorrahalar": 0.44, "Yo'l chiziqlari": 0.51, "Haydovchi madaniyati": 0.62, "Yo'l harakati qoidalari": 0.55},
    "demo.admin@example.com": {"Yo'l belgilari": 0.94, "Chorrahalar": 0.9, "Yo'l chiziqlari": 0.91, "Haydovchi madaniyati": 0.95, "Yo'l harakati qoidalari": 0.92},
    "demo.school.owner@example.com": {"Yo'l belgilari": 0.72, "Chorrahalar": 0.63, "Yo'l chiziqlari": 0.66, "Haydovchi madaniyati": 0.74, "Yo'l harakati qoidalari": 0.69},
    "demo.instructor.owner@example.com": {"Yo'l belgilari": 0.84, "Chorrahalar": 0.79, "Yo'l chiziqlari": 0.8, "Haydovchi madaniyati": 0.88, "Yo'l harakati qoidalari": 0.82},
}

USER_SKILLS = {
    "demo.student@example.com": [("Yo'l belgilari", 0.82, 0.84, 7), ("Ustuvorlik", 0.56, 0.52, -1), ("Manevr", 0.61, 0.57, 1), ("Xavfsiz haydash", 0.74, 0.72, 5), ("Yo'l harakati qoidalari", 0.69, 0.67, 4)],
    "demo.free@example.com": [("Yo'l belgilari", 0.58, 0.55, 1), ("Ustuvorlik", 0.43, 0.39, -1), ("Manevr", 0.47, 0.44, 1), ("Xavfsiz haydash", 0.62, 0.6, 2), ("Yo'l harakati qoidalari", 0.52, 0.49, 1)],
    "demo.admin@example.com": [("Yo'l belgilari", 0.93, 0.95, 10), ("Ustuvorlik", 0.88, 0.9, 9), ("Manevr", 0.86, 0.88, 8), ("Xavfsiz haydash", 0.91, 0.92, 10), ("Yo'l harakati qoidalari", 0.9, 0.91, 10)],
    "demo.school.owner@example.com": [("Yo'l belgilari", 0.66, 0.68, 5), ("Ustuvorlik", 0.61, 0.59, 2), ("Manevr", 0.64, 0.62, 3), ("Xavfsiz haydash", 0.72, 0.74, 6), ("Yo'l harakati qoidalari", 0.69, 0.67, 4)],
    "demo.instructor.owner@example.com": [("Yo'l belgilari", 0.78, 0.8, 7), ("Ustuvorlik", 0.73, 0.76, 6), ("Manevr", 0.81, 0.83, 7), ("Xavfsiz haydash", 0.84, 0.86, 8), ("Yo'l harakati qoidalari", 0.79, 0.81, 7)],
}

USER_TARGETS = {
    "demo.student@example.com": 46,
    "demo.free@example.com": 61,
    "demo.admin@example.com": 34,
    "demo.school.owner@example.com": 52,
    "demo.instructor.owner@example.com": 42,
}

ATTEMPT_PLANS = [
    ("demo.student@example.com", "Demo: Belgilar Sprint", "standard", 20, False, 13),
    ("demo.student@example.com", "Demo: Chorrahalar Lab", "standard", 20, False, 12),
    ("demo.student@example.com", "Demo: Yo'l Chiziqlari Fokus", "standard", 20, False, 11),
    ("demo.student@example.com", "Demo: Haydovchi Madaniyati", "standard", 20, False, 10),
    ("demo.student@example.com", "Demo: YHQ Asoslari", "standard", 20, False, 9),
    ("demo.student@example.com", "Demo: Yakuniy Aralash Imtihon", "standard", 30, False, 8),
    ("demo.student@example.com", "Demo: Premium Murakkab Vaziyatlar", "adaptive", 30, True, 6),
    ("demo.student@example.com", "Demo: Yakuniy Aralash Imtihon", "adaptive", 40, True, 4),
    ("demo.student@example.com", "learning-session", "learning", 20, False, 2),
    ("demo.student@example.com", "Demo: Yakuniy Aralash Imtihon", "standard", 20, False, 0),
    ("demo.free@example.com", "Demo: Belgilar Sprint", "standard", 20, False, 8),
    ("demo.free@example.com", "Demo: Chorrahalar Lab", "standard", 20, False, 6),
    ("demo.free@example.com", "Demo: YHQ Asoslari", "standard", 20, False, 3),
    ("demo.admin@example.com", "Demo: Premium Murakkab Vaziyatlar", "adaptive", 30, True, 7),
    ("demo.admin@example.com", "Demo: Yakuniy Aralash Imtihon", "standard", 30, False, 1),
    ("demo.school.owner@example.com", "Demo: Haydovchi Madaniyati", "standard", 20, False, 5),
    ("demo.school.owner@example.com", "Demo: YHQ Asoslari", "standard", 20, False, 1),
    ("demo.instructor.owner@example.com", "Demo: Yo'l Chiziqlari Fokus", "standard", 20, False, 4),
    ("demo.instructor.owner@example.com", "Demo: Premium Murakkab Vaziyatlar", "adaptive", 30, True, 1),
]

USER_NOTIFICATIONS = {
    "demo.student@example.com": [("coach", "Bugungi fokus", "Chorrahalar bo'yicha xatolar ko'paygan, learning session oching.", False, 2), ("achievement", "7 kunlik streak", "Ketma-ket 7 kun mashq qilganingiz uchun streak saqlandi.", False, 26), ("simulation", "Simulation tayyor", "Pass probability 72% ga chiqdi, simulyatsiya topshirib ko'ring.", True, 52)],
    "demo.free@example.com": [("reminder", "Mashqni davom ettiring", "Bugun kamida bitta practice session oching.", False, 6), ("upgrade", "Premium signal", "Adaptive simulation va cheksiz practice premium bilan ochiladi.", True, 48)],
    "demo.admin@example.com": [("review", "Demo seed tayyor", "Frontend demo foydalanuvchilari va katalog kontenti yangilandi.", False, 3)],
    "demo.school.owner@example.com": [("schools", "Katalog profilingiz faol", "Toshkent Rul Markazi demo katalogda ko'rinmoqda.", False, 24), ("lead", "Yangi so'rov", "Kurs kartalari uchun demo lead oqimi tayyorlandi.", True, 72)],
    "demo.instructor.owner@example.com": [("instructors", "Profil ko'rildi", "So'nggi 24 soatda demo profilingizga ko'rishlar qo'shildi.", False, 10), ("review", "Yangi sharh", "Instruktor profilingiz uchun demo sharh qo'shildi.", True, 50)],
}


def stable_percent(*parts: object) -> int:
    payload = "|".join(str(part) for part in parts)
    return int(hashlib.sha256(payload.encode("utf-8")).hexdigest()[:8], 16) % 100


def difficulty_values(index: int, advanced: bool) -> tuple[str, int]:
    if advanced:
        cycle = [("medium", 55), ("hard", 35), ("hard", 28)]
    else:
        cycle = [("easy", 74), ("medium", 56), ("hard", 36)]
    return cycle[index % len(cycle)]


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def question_payload(topic: str, index: int, advanced: bool) -> dict[str, Any]:
    seed = TOPIC_SEEDS[topic]
    difficulty, difficulty_percent = difficulty_values(index, advanced)
    prompt = seed["prompts"][index % len(seed["prompts"])]
    context = seed["contexts"][index % len(seed["contexts"])]
    correct_index = index % 4
    options = list(seed["wrongs"])
    options.insert(correct_index, seed["correct"])
    return {
        "text": f"{context} demo-vaziyat {index + 1}: {prompt.capitalize()}?",
        "topic": topic,
        "difficulty": difficulty,
        "difficulty_percent": difficulty_percent,
        "media_type": "image" if index % 5 == 0 else "text",
        "image_url": seed["asset"] if index % 5 == 0 else None,
        "options": options,
        "correct_index": correct_index,
    }


async def ensure_demo_users(session) -> dict[str, User]:
    hashed_password = get_password_hash(DEMO_PASSWORD)
    users: dict[str, User] = {}
    for email, full_name, plan, is_admin, age_days in DEMO_USERS:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                email=email,
                hashed_password=hashed_password,
                full_name=full_name,
                is_active=True,
                is_verified=True,
                is_admin=is_admin,
                created_at=NOW_UTC - timedelta(days=age_days),
            )
            session.add(user)
            await session.flush()
        else:
            user.hashed_password = hashed_password
            user.full_name = full_name
            user.is_active = True
            user.is_verified = True
            user.is_admin = is_admin

        sub_result = await session.execute(select(Subscription).where(Subscription.user_id == user.id))
        subscription = sub_result.scalar_one_or_none() or Subscription(user_id=user.id)
        session.add(subscription)
        subscription.plan = plan
        subscription.status = "active" if plan == "premium" else "inactive"
        subscription.provider = "demo-seed"
        subscription.provider_subscription_id = f"demo-{email}" if plan == "premium" else None
        subscription.starts_at = NOW_UTC - timedelta(days=30)
        subscription.expires_at = NOW_UTC + timedelta(days=365)
        users[email] = user
    return users


async def ensure_categories(session) -> dict[str, QuestionCategory]:
    categories: dict[str, QuestionCategory] = {}
    for name in DEMO_CATEGORIES:
        result = await session.execute(select(QuestionCategory).where(QuestionCategory.name == name))
        category = result.scalar_one_or_none()
        if category is None:
            category = QuestionCategory(name=name, description=f"{name} uchun demo savollar banki.", is_active=True)
            session.add(category)
            await session.flush()
        else:
            category.is_active = True
            category.description = f"{name} uchun demo savollar banki."
        categories[name] = category
    return categories


async def cleanup_demo_data(session, user_ids: list[UUID]) -> None:
    await session.execute(delete(Attempt).where(Attempt.user_id.in_(user_ids)))
    await session.execute(delete(UserNotification).where(UserNotification.user_id.in_(user_ids)))
    await session.execute(delete(UserSkill).where(UserSkill.user_id.in_(user_ids)))
    await session.execute(delete(UserAdaptiveProfile).where(UserAdaptiveProfile.user_id.in_(user_ids)))
    await session.execute(delete(UserQuestionHistory).where(UserQuestionHistory.user_id.in_(user_ids)))
    await session.execute(delete(UserTopicStats).where(UserTopicStats.user_id.in_(user_ids)))
    await session.execute(delete(ReviewQueue).where(ReviewQueue.user_id.in_(user_ids)))
    await session.execute(delete(AnalyticsEvent).where(AnalyticsEvent.user_id.in_(user_ids)))
    demo_tests = (await session.execute(select(Test).where(Test.title.like(f"{DEMO_TEST_PREFIX}%")))).scalars().all()
    for test in demo_tests:
        await session.delete(test)


async def ensure_special_tests(session) -> dict[str, Test]:
    payloads = [
        (ADAPTIVE_TEST_TITLE, "Adaptive demo shell.", "Adaptive", 38, True),
        (LEARNING_TEST_TITLE, "Learning session demo shell.", "Learning", 25, False),
    ]
    tests: dict[str, Test] = {}
    for title, description, difficulty, duration, is_premium in payloads:
        result = await session.execute(select(Test).where(Test.title == title))
        test = result.scalar_one_or_none()
        if test is None:
            test = Test(title=title, description=description, difficulty=difficulty, duration=duration, is_active=True, is_premium=is_premium)
            session.add(test)
            await session.flush()
        else:
            test.description = description
            test.difficulty = difficulty
            test.duration = duration
            test.is_active = True
            test.is_premium = is_premium
        tests[title] = test
    return tests


async def create_demo_tests(session, categories: dict[str, QuestionCategory]) -> tuple[dict[str, Test], dict[str, list[Question]]]:
    tests: dict[str, Test] = {}
    questions_by_test: dict[str, list[Question]] = {}
    for title, description, difficulty, is_premium, duration, question_count, topics, advanced in DEMO_TESTS:
        test = Test(title=title, description=description, difficulty=difficulty, duration=duration, is_active=True, is_premium=is_premium)
        session.add(test)
        await session.flush()
        tests[title] = test
        questions_by_test[title] = []
        topic_indices = defaultdict(int)
        for index in range(question_count):
            topic = topics[index % len(topics)]
            payload = question_payload(topic, topic_indices[topic], advanced)
            topic_indices[topic] += 1
            question = Question(
                test_id=test.id,
                category_id=categories[topic].id,
                text=payload["text"],
                image_url=payload["image_url"],
                media_type=payload["media_type"],
                topic=topic,
                category=topic,
                difficulty=payload["difficulty"],
                difficulty_percent=payload["difficulty_percent"],
            )
            session.add(question)
            await session.flush()
            for option_index, option_text in enumerate(payload["options"]):
                session.add(AnswerOption(question_id=question.id, text=option_text, is_correct=option_index == payload["correct_index"]))
            questions_by_test[title].append(question)
    await session.flush()
    for title, test in tests.items():
        questions = (
            await session.execute(
                select(Question)
                .options(selectinload(Question.answer_options))
                .where(Question.test_id == test.id)
                .order_by(Question.created_at.asc())
            )
        ).scalars().all()
        questions_by_test[title] = list(questions)
    return tests, questions_by_test


def pick_questions(mode: str, title: str, count: int, questions_by_test: dict[str, list[Question]]) -> list[Question]:
    if mode == "learning":
        return (questions_by_test["Demo: Chorrahalar Lab"][:10] + questions_by_test["Demo: Yo'l Chiziqlari Fokus"][:10])[:count]
    return questions_by_test[title][:count]


def choose_option(question: Question, email: str, attempt_index: int) -> tuple[AnswerOption, bool]:
    correct = next(option for option in question.answer_options if option.is_correct)
    wrongs = [option for option in question.answer_options if not option.is_correct]
    accuracy = USER_ACCURACY[email].get(question.category or question.topic or "Yo'l harakati qoidalari", 0.55)
    is_correct = stable_percent(email, question.id, attempt_index) < int(accuracy * 100)
    if is_correct:
        return correct, True
    return wrongs[stable_percent("wrong", email, question.id, attempt_index) % len(wrongs)], False


async def seed_attempts(session, users: dict[str, User], standard_tests: dict[str, Test], special_tests: dict[str, Test], questions_by_test: dict[str, list[Question]]) -> tuple[dict[UUID, list[LearningAnswerRecord]], dict[UUID, dict[UUID, dict[str, Any]]], dict[UUID, dict[str, int]]]:
    answer_records: dict[UUID, list[LearningAnswerRecord]] = defaultdict(list)
    histories: dict[UUID, dict[UUID, dict[str, Any]]] = defaultdict(dict)
    question_stats: dict[UUID, dict[str, int]] = defaultdict(lambda: {"attempts": 0, "correct": 0})
    for attempt_index, (email, title, mode, count, pressure_mode, day_offset) in enumerate(ATTEMPT_PLANS):
        user = users[email]
        questions = pick_questions(mode, title, count, questions_by_test)
        started_at = NOW_UTC - timedelta(days=day_offset, minutes=90 + attempt_index * 2)
        finished_at = started_at + timedelta(minutes=max(18, int(count * 1.2)))
        test_id = special_tests[ADAPTIVE_TEST_TITLE].id if mode == "adaptive" else special_tests[LEARNING_TEST_TITLE].id if mode == "learning" else standard_tests[title].id
        attempt = Attempt(
            user_id=user.id,
            test_id=test_id,
            score=0,
            started_at=started_at,
            finished_at=finished_at,
            mode=mode,
            training_level="advanced" if email == "demo.admin@example.com" else "intermediate",
            avg_response_time=round(22 + count / 10 + (attempt_index % 4), 2),
            response_time_variance=round((7 + (attempt_index % 3)) ** 2, 2),
            pressure_mode=pressure_mode,
            pressure_score_modifier=0.85 if pressure_mode else 1.0,
            question_ids=[str(question.id) for question in questions],
            question_count=len(questions),
            time_limit_seconds=max(25, len(questions)) * 75,
        )
        session.add(attempt)
        await session.flush()
        correct_count = 0
        for question in questions:
            option, is_correct = choose_option(question, email, attempt_index)
            session.add(AttemptAnswer(attempt_id=attempt.id, question_id=question.id, selected_option_id=option.id, is_correct=is_correct))
            answer_records[user.id].append(LearningAnswerRecord(question_id=question.id, topic_id=question.category_id, is_correct=is_correct, occurred_at=finished_at))
            state = histories[user.id].setdefault(question.id, {"attempt_count": 0, "correct_count": 0, "last_seen_at": None, "last_correct_at": None})
            state["attempt_count"] += 1
            state["last_seen_at"] = finished_at
            if is_correct:
                state["correct_count"] += 1
                state["last_correct_at"] = finished_at
                correct_count += 1
            question_stats[question.id]["attempts"] += 1
            if is_correct:
                question_stats[question.id]["correct"] += 1
        attempt.score = int(correct_count * attempt.pressure_score_modifier)
    return answer_records, histories, question_stats


async def apply_history_and_question_stats(session, histories: dict[UUID, dict[UUID, dict[str, Any]]], question_stats: dict[UUID, dict[str, int]]) -> None:
    for user_id, question_map in histories.items():
        for question_id, values in question_map.items():
            session.add(UserQuestionHistory(user_id=user_id, question_id=question_id, attempt_count=values["attempt_count"], correct_count=values["correct_count"], last_seen_at=values["last_seen_at"], last_correct_at=values["last_correct_at"]))
    questions = (await session.execute(select(Question))).scalars().all()
    for question in questions:
        stats = question_stats.get(question.id, {"attempts": 0, "correct": 0})
        question.total_attempts = stats["attempts"]
        question.total_correct = stats["correct"]
        question.dynamic_difficulty_score = clamp(1 - (stats["correct"] / stats["attempts"]) if stats["attempts"] else 0.5, 0.05, 0.95)


async def seed_skills_and_notifications(session, users: dict[str, User]) -> None:
    for email, user in users.items():
        for topic, skill_score, bkt, next_review_offset in USER_SKILLS[email]:
            session.add(
                UserSkill(
                    user_id=user.id,
                    topic=topic,
                    skill_score=skill_score,
                    bkt_knowledge_prob=bkt,
                    total_attempts=18,
                    bkt_attempts=18,
                    last_practice_at=NOW_UTC - timedelta(days=2),
                    retention_score=1.0,
                    repetition_count=3,
                    interval_days=6,
                    ease_factor=2.3,
                    next_review_at=NOW_UTC + timedelta(days=next_review_offset),
                    last_updated=NOW_UTC,
                )
            )
        session.add(UserAdaptiveProfile(user_id=user.id, target_difficulty_percent=USER_TARGETS[email]))
        for notification_type, title, message, is_read, hours_ago in USER_NOTIFICATIONS[email]:
            session.add(
                UserNotification(
                    user_id=user.id,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    payload={"source": "demo-seed"},
                    is_read=is_read,
                    created_at=NOW_UTC - timedelta(hours=hours_ago),
                )
            )


async def assign_catalog_owners(session, users: dict[str, User]) -> None:
    school = (await session.execute(select(DrivingSchool).where(DrivingSchool.slug == "demo-toshkent-rul-markazi"))).scalar_one_or_none()
    if school is not None:
        school.owner_user_id = users["demo.school.owner@example.com"].id
    instructor = (await session.execute(select(DrivingInstructor).where(DrivingInstructor.slug == "demo-azizbek-nazarov"))).scalar_one_or_none()
    if instructor is not None:
        instructor.user_id = users["demo.instructor.owner@example.com"].id


async def main() -> None:
    ensure_assets()
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        reviewers = await ensure_reviewers(session)
        await upsert_lessons(session)
        await upsert_schools(session, reviewers)
        await upsert_instructors(session, reviewers)
        users = await ensure_demo_users(session)
        await cleanup_demo_data(session, [user.id for user in users.values()])
        categories = await ensure_categories(session)
        special_tests = await ensure_special_tests(session)
        standard_tests, questions_by_test = await create_demo_tests(session, categories)
        await assign_catalog_owners(session, users)
        answer_records, histories, question_stats = await seed_attempts(session, users, standard_tests, special_tests, questions_by_test)
        await apply_history_and_question_stats(session, histories, question_stats)
        for user_id, records in answer_records.items():
            records.sort(key=lambda item: item.occurred_at)
            await apply_learning_progress_updates(db=session, user_id=user_id, answer_records=records)
        await seed_skills_and_notifications(session, users)
        await session.commit()
    await engine.dispose()
    print("Demo seed completed.")
    print(f"Password: {DEMO_PASSWORD}")
    for email, full_name, plan, _, _ in DEMO_USERS:
        print(f"- {email} ({full_name}, {plan})")
    print(f"Reviewer password: {REVIEWER_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
