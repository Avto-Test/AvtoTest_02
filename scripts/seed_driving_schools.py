import asyncio
import os
import sys
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from models.driving_school import DrivingSchool
from models.driving_school_course import DrivingSchoolCourse
from models.driving_school_lead import DrivingSchoolLead
from models.driving_school_media import DrivingSchoolMedia
from models.driving_school_partner_application import DrivingSchoolPartnerApplication
from models.driving_school_review import DrivingSchoolReview
from models.promo_code import PromoCode
from models.user import User

SCHOOLS = [
    {
        "slug": "toshkent-driver-pro",
        "name": "Driver Pro Academy",
        "city": "Toshkent",
        "region": "Toshkent sh.",
        "phone": "+998901112233",
        "short_description": "Tajribali instruktorlar bilan tezkor va sifatli tayyorgarlik.",
        "full_description": "Nazariya va amaliyotni birlashtirgan intensiv o'quv dasturi, ichki mock-testlar va individual kuzatuv tizimi.",
        "address": "Chilonzor tumani, Bunyodkor ko'chasi 12",
        "landmark": "Chilonzor metro bekati yaqinida",
        "website": "https://driverpro.uz",
        "telegram": "@driverpro",
        "work_hours": "08:00 - 20:00",
        "license_info": "AA-2024-001",
        "years_active": 8,
        "referral_code": "DRVPRO",
        "logo_url": "https://images.unsplash.com/photo-1511910849309-0dffb8785146?auto=format&fit=crop&w=400&q=80",
    },
    {
        "slug": "samarqand-auto-school",
        "name": "Samarqand Auto School",
        "city": "Samarqand",
        "region": "Samarqand vil.",
        "phone": "+998933334455",
        "short_description": "Amaliy mashg'ulotlarga urg'u berilgan zamonaviy avtomaktab.",
        "full_description": "Yo'l belgilari, xavfsiz haydash va imtihon strategiyalari bo'yicha chuqurlashtirilgan kurslar.",
        "address": "Registon ko'chasi 21",
        "landmark": "Registon maydoni yaqinida",
        "website": "https://samauto.uz",
        "telegram": "@samauto",
        "work_hours": "09:00 - 19:00",
        "license_info": "AA-2023-114",
        "years_active": 6,
        "referral_code": "SAMAUTO",
        "logo_url": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80",
    },
    {
        "slug": "andijon-safe-drive",
        "name": "Safe Drive Andijon",
        "city": "Andijon",
        "region": "Andijon vil.",
        "phone": "+998997776655",
        "short_description": "Bosqichma-bosqich o'qitish va moslashuvchan dars vaqtlari.",
        "full_description": "Yangi boshlovchilar va qayta tayyorlanayotgan haydovchilar uchun moslashtirilgan modul tizimi.",
        "address": "Bobur shoh ko'chasi 6",
        "landmark": "Markaziy bozor orqa tarafida",
        "website": None,
        "telegram": "@safedriveandijon",
        "work_hours": "08:30 - 18:30",
        "license_info": "AA-2022-302",
        "years_active": 5,
        "referral_code": "SAFEAND",
        "logo_url": "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=400&q=80",
    },
]

COURSE_BLUEPRINT = [
    {"category_code": "B", "duration_weeks": 6, "price_cents": 7800000},
    {"category_code": "C", "duration_weeks": 8, "price_cents": 9200000},
    {"category_code": "BC", "duration_weeks": 10, "price_cents": 12500000},
]

MEDIA_SAMPLE = [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
]


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        promo_result = await session.execute(select(PromoCode).where(PromoCode.is_active == True))  # noqa: E712
        promos = list(promo_result.scalars().all())

        await session.execute(delete(DrivingSchoolReview))
        await session.execute(delete(DrivingSchoolLead))
        await session.execute(delete(DrivingSchoolMedia))
        await session.execute(delete(DrivingSchoolCourse))
        await session.execute(delete(DrivingSchool))
        await session.execute(delete(DrivingSchoolPartnerApplication))
        await session.flush()

        user_result = await session.execute(select(User).where(User.is_active == True))  # noqa: E712
        users = list(user_result.scalars().all())

        created_schools = []
        for index, raw in enumerate(SCHOOLS):
            school = DrivingSchool(
                slug=raw["slug"],
                name=raw["name"],
                short_description=raw["short_description"],
                full_description=raw["full_description"],
                city=raw["city"],
                region=raw["region"],
                address=raw["address"],
                landmark=raw["landmark"],
                phone=raw["phone"],
                telegram=raw["telegram"],
                website=raw["website"],
                work_hours=raw["work_hours"],
                license_info=raw["license_info"],
                years_active=raw["years_active"],
                logo_url=raw["logo_url"],
                map_embed_url="https://maps.google.com/maps?q=Tashkent&z=12&output=embed",
                referral_code=raw["referral_code"],
                promo_code_id=promos[index].id if index < len(promos) else None,
                is_active=True,
            )
            session.add(school)
            await session.flush()

            for order, course_raw in enumerate(COURSE_BLUEPRINT):
                session.add(
                    DrivingSchoolCourse(
                        school_id=school.id,
                        category_code=course_raw["category_code"],
                        duration_weeks=course_raw["duration_weeks"],
                        price_cents=course_raw["price_cents"] + (index * 200000),
                        currency="UZS",
                        installment_available=order != 0,
                        description=f"{course_raw['category_code']} toifasi bo'yicha intensiv tayyorgarlik",
                        sort_order=order,
                        is_active=True,
                    )
                )

            for order, media_url in enumerate(MEDIA_SAMPLE):
                session.add(
                    DrivingSchoolMedia(
                        school_id=school.id,
                        media_type="image",
                        url=media_url,
                        caption=f"{raw['name']} media #{order + 1}",
                        sort_order=order,
                        is_active=True,
                    )
                )

            created_schools.append(school)

        for index, school in enumerate(created_schools):
            session.add(
                DrivingSchoolPartnerApplication(
                    school_name=f"{school.name} branch application",
                    city=school.city,
                    responsible_person="Hamkorlik menejeri",
                    phone=school.phone,
                    email=f"partner{index + 1}@autotest.uz",
                    note="Platformaga qo'shilish bo'yicha test ariza.",
                    status="new",
                )
            )

        if users:
            for idx, school in enumerate(created_schools):
                user = users[idx % len(users)]
                session.add(
                    DrivingSchoolReview(
                        school_id=school.id,
                        user_id=user.id,
                        rating=4 + (idx % 2),
                        comment="O'qitish sifati yaxshi, testlar bilan mos ishlaydi.",
                        is_visible=True,
                        created_at=datetime.now(timezone.utc),
                    )
                )

        await session.commit()
        print(f"Seeded {len(created_schools)} driving schools with courses/media/reviews.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
