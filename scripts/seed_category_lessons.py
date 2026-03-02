import asyncio
import os
import re
import sys

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from models.lesson import Lesson
from models.question_category import QuestionCategory

LESSONS_PER_CATEGORY = 5
AUTOGEN_URL_PREFIX = "text://category-autogen/"

LESSON_BLUEPRINTS = [
    {
        "title": "Asosiy tushunchalar",
        "body": (
            "Ushbu dars mavzuning bazaviy qoidalarini sodda tilda tushuntiradi. "
            "Avvalo atamalarni aniq yodlab oling, keyin ularni real vaziyatga bog'lang. "
            "Savolda kalit so'zlarni topish odatini shakllantiring."
        ),
    },
    {
        "title": "Ko'p uchraydigan xatolar",
        "body": (
            "Bu bo'limda imtihonda eng ko'p takrorlanadigan xatolar tahlil qilinadi. "
            "Nima uchun xato bo'layotganini sabab bilan ajrating: shoshilish, noto'g'ri talqin, yoki e'tiborsizlik. "
            "Har bir xatoga qarshi bitta amaliy qoida yozib boring."
        ),
    },
    {
        "title": "Vaziyatli tahlil",
        "body": (
            "Mavzuni faqat yodlash emas, vaziyatni tahlil qilish orqali mustahkamlang. "
            "Har bir scenario uchun: xavf manbasi, to'g'ri qaror va uning natijasini ketma-ket yozing. "
            "Bu usul savol murakkablashganda ham to'g'ri tanlov qilishga yordam beradi."
        ),
    },
    {
        "title": "Tezkor eslab qolish",
        "body": (
            "Qisqa takrorlash bloklari bilan xotirani mustahkamlang: 10 daqiqa o'qish, 3 daqiqa qaytarish. "
            "Qoidalarni kichik kartochkalarga bo'lib chiqing va kun davomida bir necha marta ko'zdan kechiring. "
            "Qaysi qoidalar aralashayotganini alohida belgilab chiqing."
        ),
    },
    {
        "title": "Nazorat checklisti",
        "body": (
            "Testga kirishdan oldin shu mavzu uchun mini-checklist ishlating. "
            "Savolni o'qib bo'lgach: 1) kalit qoidani aniqlang, 2) xavfsiz variantni toping, 3) qarama-qarshi variantni rad eting. "
            "Checklist barqarorlikni oshiradi va tasodifiy xatolarni kamaytiradi."
        ),
    },
]


def slugify(value: str) -> str:
    normalized = value.lower().strip().replace("'", "")
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    return normalized or "category"


def build_description(category_name: str, body: str) -> str:
    return (
        f"Mavzu: {category_name}\n\n"
        f"{body}\n\n"
        "Amaliy tavsiya: 5 ta savol yeching va xato qilgan variantlarni qayta tahlil qiling."
    )


async def seed_lessons() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        category_result = await session.execute(
            select(QuestionCategory).where(QuestionCategory.is_active == True).order_by(QuestionCategory.name.asc())
        )
        categories = list(category_result.scalars().all())
        if not categories:
            print("No active question categories found. Nothing to seed.")
            await engine.dispose()
            return

        await session.execute(
            delete(Lesson).where(Lesson.content_url.like(f"{AUTOGEN_URL_PREFIX}%"))
        )

        created = 0
        sort_order = 0
        for category in categories:
            category_name = category.name.strip()
            category_slug = slugify(category_name)

            for idx in range(LESSONS_PER_CATEGORY):
                blueprint = LESSON_BLUEPRINTS[idx]
                lesson = Lesson(
                    title=f"{category_name} — Dars {idx + 1}: {blueprint['title']}",
                    description=build_description(category_name, blueprint["body"]),
                    content_type="text",
                    content_url=f"{AUTOGEN_URL_PREFIX}{category_slug}/{idx + 1}",
                    thumbnail_url=None,
                    topic=category_name,
                    section=category_name,
                    is_active=True,
                    is_premium=True,
                    sort_order=sort_order,
                )
                session.add(lesson)
                sort_order += 1
                created += 1

        await session.commit()
        print(
            f"Seeded {created} lessons across {len(categories)} categories "
            f"({LESSONS_PER_CATEGORY} per category)."
        )

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_lessons())

