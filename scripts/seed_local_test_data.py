import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.config import settings
from core.security import get_password_hash
from models.driving_instructor import DrivingInstructor
from models.driving_school import DrivingSchool
from models.lesson import Lesson
from models.question import Question
from models.subscription import Subscription
from models.test import Test
from models.user import User
from seed_50_test_data import seed_questions
from seed_category_lessons import seed_lessons as seed_category_lessons
from seed_demo_catalog_content import main as seed_demo_catalog_content
from seed_driving_instructors import seed as seed_driving_instructors
from seed_driving_schools import seed as seed_driving_schools
from seed_full_demo_site import DEMO_PASSWORD, assign_catalog_owners, main as seed_full_demo_site


LOCAL_TEST_USERS = [
    ("qa.student.one@example.com", "Kamola Oripova", "free", False, 18),
    ("qa.student.two@example.com", "Bekzod Sodiqov", "premium", False, 15),
    ("qa.student.three@example.com", "Nilufar Tursunova", "free", False, 12),
    ("qa.student.four@example.com", "Jahongir Xasanov", "premium", False, 10),
    ("qa.school.manager@example.com", "Sherzod School QA", "premium", False, 8),
    ("qa.instructor.manager@example.com", "Malika Instructor QA", "premium", False, 7),
    ("qa.parent.viewer@example.com", "Saodat Parent", "free", False, 5),
]

OWNER_EMAILS = {
    "demo.school.owner@example.com",
    "demo.instructor.owner@example.com",
}


def ensure_local_database() -> None:
    if os.getenv("ALLOW_NON_LOCAL_SEED") == "1":
        return

    database_url = settings.DATABASE_URL.lower()
    local_markers = ("localhost", "127.0.0.1", "sqlite")
    if any(marker in database_url for marker in local_markers):
        return

    raise RuntimeError(
        "Refusing to seed a non-local database. "
        "Set ALLOW_NON_LOCAL_SEED=1 only if you intentionally want that."
    )


async def ensure_local_test_users() -> list[str]:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    created_or_updated: list[str] = []
    hashed_password = get_password_hash(DEMO_PASSWORD)
    now = datetime.now(timezone.utc)

    async with session_factory() as session:
        for email, full_name, plan, is_admin, age_days in LOCAL_TEST_USERS:
            user = (
                await session.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            if user is None:
                user = User(
                    email=email,
                    hashed_password=hashed_password,
                    full_name=full_name,
                    is_active=True,
                    is_verified=True,
                    is_admin=is_admin,
                    created_at=now - timedelta(days=age_days),
                )
                session.add(user)
                await session.flush()
            else:
                user.hashed_password = hashed_password
                user.full_name = full_name
                user.is_active = True
                user.is_verified = True
                user.is_admin = is_admin

            subscription = (
                await session.execute(select(Subscription).where(Subscription.user_id == user.id))
            ).scalar_one_or_none()
            if subscription is None:
                subscription = Subscription(user_id=user.id)
                session.add(subscription)

            subscription.plan = plan
            subscription.status = "active" if plan == "premium" else "inactive"
            subscription.provider = "local-seed"
            subscription.provider_subscription_id = f"local-seed-{email}" if plan == "premium" else None
            subscription.starts_at = now - timedelta(days=30)
            subscription.expires_at = now + timedelta(days=365)
            created_or_updated.append(email)

        owner_result = await session.execute(select(User).where(User.email.in_(OWNER_EMAILS)))
        owner_map = {user.email: user for user in owner_result.scalars().all()}
        if OWNER_EMAILS.issubset(owner_map.keys()):
            await assign_catalog_owners(session, owner_map)

        await session.commit()

    await engine.dispose()
    return created_or_updated


async def collect_counts() -> dict[str, int]:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        counts = {
            "users": int((await session.execute(select(func.count(User.id)))).scalar_one()),
            "lessons": int((await session.execute(select(func.count(Lesson.id)))).scalar_one()),
            "tests": int((await session.execute(select(func.count(Test.id)))).scalar_one()),
            "questions": int((await session.execute(select(func.count(Question.id)))).scalar_one()),
            "schools": int((await session.execute(select(func.count(DrivingSchool.id)))).scalar_one()),
            "instructors": int((await session.execute(select(func.count(DrivingInstructor.id)))).scalar_one()),
        }

    await engine.dispose()
    return counts


async def main() -> None:
    ensure_local_database()

    await seed_full_demo_site()
    extra_users = await ensure_local_test_users()
    await seed_driving_schools()
    await seed_driving_instructors()
    await seed_demo_catalog_content()
    await ensure_local_test_users()
    await seed_category_lessons()
    await seed_questions()

    counts = await collect_counts()

    print("Local test data seed completed.")
    print(f"Shared password: {DEMO_PASSWORD}")
    print("Extra local accounts:")
    for email in extra_users:
        print(f"- {email}")
    print("Final counts:")
    for label, value in counts.items():
        print(f"- {label}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
