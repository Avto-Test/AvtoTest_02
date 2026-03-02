import asyncio
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from models.driving_instructor import DrivingInstructor
from models.driving_instructor_application import DrivingInstructorApplication
from models.driving_instructor_complaint import DrivingInstructorComplaint
from models.driving_instructor_lead import DrivingInstructorLead
from models.driving_instructor_media import DrivingInstructorMedia
from models.driving_instructor_review import DrivingInstructorReview
from models.promo_code import PromoCode
from models.user import User


INSTRUCTORS = [
    {
        "slug": "ali-rahimov",
        "full_name": "Ali Rahimov",
        "gender": "erkak",
        "years_experience": 9,
        "city": "Toshkent",
        "region": "Toshkent sh.",
        "service_areas": "Chilonzor, Yunusobod, Sergeli",
        "transmission": "automatic",
        "car_model": "Chevrolet Cobalt",
        "car_year": 2022,
        "hourly_price_cents": 1800000,
        "phone": "+998901111001",
        "telegram": "@ali_drive",
        "referral_code": "INSTALI",
    },
    {
        "slug": "mohira-karimova",
        "full_name": "Mohira Karimova",
        "gender": "ayol",
        "years_experience": 7,
        "city": "Toshkent",
        "region": "Toshkent sh.",
        "service_areas": "Mirzo Ulugbek, Mirobod, Yakkasaroy",
        "transmission": "manual",
        "car_model": "Chevrolet Gentra",
        "car_year": 2021,
        "hourly_price_cents": 1700000,
        "phone": "+998901111002",
        "telegram": "@mohira_manual",
        "referral_code": "INSTMOH",
    },
    {
        "slug": "diyor-boboev",
        "full_name": "Diyor Boboev",
        "gender": "erkak",
        "years_experience": 11,
        "city": "Samarqand",
        "region": "Samarqand vil.",
        "service_areas": "Registon, Siyob, Universitet hududi",
        "transmission": "automatic",
        "car_model": "Kia K5",
        "car_year": 2023,
        "hourly_price_cents": 2100000,
        "phone": "+998901111003",
        "telegram": "@diyor_auto",
        "referral_code": "INSTDIY",
    },
    {
        "slug": "shahlo-yakubova",
        "full_name": "Shahlo Yakubova",
        "gender": "ayol",
        "years_experience": 6,
        "city": "Samarqand",
        "region": "Samarqand vil.",
        "service_areas": "Registon, Kattaqorgon shoh kochasi",
        "transmission": "automatic",
        "car_model": "Chevrolet Onix",
        "car_year": 2024,
        "hourly_price_cents": 1850000,
        "phone": "+998901111004",
        "telegram": "@shahlo_safe",
        "referral_code": "INSTSHA",
    },
    {
        "slug": "jamshid-tursunov",
        "full_name": "Jamshid Tursunov",
        "gender": "erkak",
        "years_experience": 8,
        "city": "Andijon",
        "region": "Andijon vil.",
        "service_areas": "Markaz, Bobur kochasi, Eski shahar",
        "transmission": "manual",
        "car_model": "Chevrolet Nexia 3",
        "car_year": 2020,
        "hourly_price_cents": 1500000,
        "phone": "+998901111005",
        "telegram": "@jamshid_drive",
        "referral_code": "INSTJAM",
    },
    {
        "slug": "gulnoza-usmonova",
        "full_name": "Gulnoza Usmonova",
        "gender": "ayol",
        "years_experience": 5,
        "city": "Andijon",
        "region": "Andijon vil.",
        "service_areas": "Shahrixon, Marhamat yonalishi",
        "transmission": "automatic",
        "car_model": "Chevrolet Tracker",
        "car_year": 2023,
        "hourly_price_cents": 1650000,
        "phone": "+998901111006",
        "telegram": "@gulnoza_auto",
        "referral_code": "INSTGUL",
    },
    {
        "slug": "asliddin-saidov",
        "full_name": "Asliddin Saidov",
        "gender": "erkak",
        "years_experience": 10,
        "city": "Buxoro",
        "region": "Buxoro vil.",
        "service_areas": "Markaz, Gijduvon trassasi",
        "transmission": "manual",
        "car_model": "Chevrolet Lacetti",
        "car_year": 2019,
        "hourly_price_cents": 1450000,
        "phone": "+998901111007",
        "telegram": "@asliddin_manual",
        "referral_code": "INSTASL",
    },
    {
        "slug": "nargiza-sattorova",
        "full_name": "Nargiza Sattorova",
        "gender": "ayol",
        "years_experience": 4,
        "city": "Buxoro",
        "region": "Buxoro vil.",
        "service_areas": "Markaz, Kogon, Gijduvon",
        "transmission": "automatic",
        "car_model": "Chevrolet Spark",
        "car_year": 2022,
        "hourly_price_cents": 1400000,
        "phone": "+998901111008",
        "telegram": "@nargiza_dars",
        "referral_code": "INSTNAR",
    },
    {
        "slug": "odilbek-azimov",
        "full_name": "Odilbek Azimov",
        "gender": "erkak",
        "years_experience": 12,
        "city": "Namangan",
        "region": "Namangan vil.",
        "service_areas": "Namangan markaz, Chortoq",
        "transmission": "automatic",
        "car_model": "Hyundai Elantra",
        "car_year": 2024,
        "hourly_price_cents": 2200000,
        "phone": "+998901111009",
        "telegram": "@odilbek_pro",
        "referral_code": "INSTODI",
    },
    {
        "slug": "dilfuza-mirzaeva",
        "full_name": "Dilfuza Mirzaeva",
        "gender": "ayol",
        "years_experience": 6,
        "city": "Namangan",
        "region": "Namangan vil.",
        "service_areas": "Markaz, Uychi, Chust",
        "transmission": "manual",
        "car_model": "Chevrolet Cobalt",
        "car_year": 2021,
        "hourly_price_cents": 1600000,
        "phone": "+998901111010",
        "telegram": "@dilfuza_manual",
        "referral_code": "INSTDIL",
    },
    {
        "slug": "bekzod-kurbanov",
        "full_name": "Bekzod Kurbanov",
        "gender": "erkak",
        "years_experience": 8,
        "city": "Fargona",
        "region": "Fargona vil.",
        "service_areas": "Fargona markaz, Margilon",
        "transmission": "automatic",
        "car_model": "BYD Chazor",
        "car_year": 2025,
        "hourly_price_cents": 2300000,
        "phone": "+998901111011",
        "telegram": "@bekzod_ev",
        "referral_code": "INSTBEK",
    },
    {
        "slug": "madina-raxmatova",
        "full_name": "Madina Raxmatova",
        "gender": "ayol",
        "years_experience": 5,
        "city": "Fargona",
        "region": "Fargona vil.",
        "service_areas": "Fargona markaz, Quva",
        "transmission": "automatic",
        "car_model": "Chevrolet Onix",
        "car_year": 2023,
        "hourly_price_cents": 1750000,
        "phone": "+998901111012",
        "telegram": "@madina_drive",
        "referral_code": "INSTMAD",
    },
]

PROFILE_IMAGES = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
]

MEDIA_POOL = [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80",
]

REVIEW_COMMENTS = [
    "Darslar juda tushunarli va amaliyotga boy bo'ldi.",
    "Xotirjam uslubda o'rgatadi, imtihonga yaxshi tayyorladi.",
    "Yonalish va parkovkada aniq ko'rsatmalar beradi.",
    "Dars jadvali moslashuvchan, muomala ham yaxshi.",
    "Boshlovchilar uchun juda qulay tushuntiradi.",
]

LEAD_NAMES = [
    "Aziza Karimova",
    "Sardor Aliyev",
    "Javohir Qodirov",
    "Shoxista Ergasheva",
    "Doniyor Xasanov",
]

COMPLAINT_REASONS = ["Dars vaqti kechikishi", "Muomala bo'yicha e'tiroz", "Narx bo'yicha kelishmovchilik"]


def _bio(name: str, transmission: str, city: str) -> str:
    mode = "avtomat" if transmission == "automatic" else "mexanika"
    return (
        f"{name} {city} hududida {mode} mashina bo'yicha amaliy haydashni bosqichma-bosqich "
        "o'rgatadi. Darslar xavfsizlik, yo'l belgilari va imtihon oldi tayyorgarlikka yo'naltirilgan."
    )


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        users_result = await session.execute(select(User).where(User.is_active == True))  # noqa: E712
        users = list(users_result.scalars().all())
        promo_result = await session.execute(select(PromoCode).where(PromoCode.is_active == True))  # noqa: E712
        promos = list(promo_result.scalars().all())

        await session.execute(delete(DrivingInstructorReview))
        await session.execute(delete(DrivingInstructorLead))
        await session.execute(delete(DrivingInstructorComplaint))
        await session.execute(delete(DrivingInstructorMedia))
        await session.execute(delete(DrivingInstructor))
        await session.execute(delete(DrivingInstructorApplication))
        await session.flush()

        created: list[DrivingInstructor] = []
        now = datetime.now(timezone.utc)

        for idx, raw in enumerate(INSTRUCTORS):
            profile_url = PROFILE_IMAGES[idx % len(PROFILE_IMAGES)]
            instructor = DrivingInstructor(
                user_id=None,
                slug=raw["slug"],
                full_name=raw["full_name"],
                gender=raw["gender"],
                years_experience=raw["years_experience"],
                short_bio=_bio(raw["full_name"], raw["transmission"], raw["city"]),
                teaching_style="Tinch, izchil va amaliy mashqlar asosida o'qitish.",
                city=raw["city"],
                region=raw["region"],
                service_areas=raw["service_areas"],
                transmission=raw["transmission"],
                car_model=raw["car_model"],
                car_year=raw["car_year"],
                car_features="Qo'shimcha pedal, parkovka sensorlari, kamera.",
                hourly_price_cents=raw["hourly_price_cents"],
                currency="UZS",
                min_lesson_minutes=60,
                special_services="Imtihon oldi tayyorgarlik",
                phone=raw["phone"],
                telegram=raw["telegram"],
                profile_image_url=profile_url,
                map_embed_url=f"https://maps.google.com/maps?q={raw['city']}&z=12&output=embed",
                referral_code=raw["referral_code"],
                promo_code_id=promos[idx].id if idx < len(promos) else None,
                is_verified=True,
                is_active=True,
                is_blocked=False,
                is_top_rated=idx < 3,
                view_count=120 + (idx * 19),
                approved_at=now - timedelta(days=idx + 1),
            )
            session.add(instructor)
            await session.flush()

            session.add(
                DrivingInstructorMedia(
                    instructor_id=instructor.id,
                    media_type="image",
                    url=profile_url,
                    caption="Profil rasmi",
                    sort_order=0,
                    is_active=True,
                )
            )
            for media_order in range(1, 4):
                media_url = MEDIA_POOL[(idx + media_order) % len(MEDIA_POOL)]
                session.add(
                    DrivingInstructorMedia(
                        instructor_id=instructor.id,
                        media_type="image",
                        url=media_url,
                        caption=f"Dars jarayoni #{media_order}",
                        sort_order=media_order,
                        is_active=True,
                    )
                )

            created.append(instructor)

        if users:
            review_count_per_instructor = min(3, len(users))
            for idx, instructor in enumerate(created):
                used_user_ids = set()
                for review_idx in range(review_count_per_instructor):
                    user = users[(idx + review_idx) % len(users)]
                    if user.id in used_user_ids:
                        continue
                    used_user_ids.add(user.id)
                    rating = 5 if review_idx == 0 else 4
                    session.add(
                        DrivingInstructorReview(
                            instructor_id=instructor.id,
                            user_id=user.id,
                            rating=rating,
                            comment=REVIEW_COMMENTS[(idx + review_idx) % len(REVIEW_COMMENTS)],
                            is_visible=True,
                        )
                    )

        for idx, instructor in enumerate(created):
            lead_owner = users[idx % len(users)] if users else None
            session.add(
                DrivingInstructorLead(
                    instructor_id=instructor.id,
                    user_id=lead_owner.id if lead_owner else None,
                    full_name=LEAD_NAMES[idx % len(LEAD_NAMES)],
                    phone=f"+99890{7000000 + idx:07d}",
                    requested_transmission=instructor.transmission,
                    comment="Mos jadval bo'lsa tezroq bog'laning.",
                    source="web",
                    status="new" if idx % 2 == 0 else "contacted",
                )
            )

            if idx % 4 == 0:
                complaint_owner = users[(idx + 1) % len(users)] if users else None
                session.add(
                    DrivingInstructorComplaint(
                        instructor_id=instructor.id,
                        user_id=complaint_owner.id if complaint_owner else None,
                        full_name=LEAD_NAMES[(idx + 2) % len(LEAD_NAMES)],
                        phone=f"+99893{8000000 + idx:07d}",
                        reason=COMPLAINT_REASONS[idx % len(COMPLAINT_REASONS)],
                        comment="Admin tekshirishi uchun test complaint.",
                        status="new",
                    )
                )

        app_statuses = ["pending", "approved", "rejected", "pending", "approved"]
        for idx, status_value in enumerate(app_statuses):
            user = users[idx % len(users)] if users else None
            created_at = now - timedelta(days=idx + 2)
            reviewed_at = created_at + timedelta(hours=5) if status_value != "pending" else None
            session.add(
                DrivingInstructorApplication(
                    user_id=user.id if user else None,
                    full_name=f"Ariza Test {idx + 1}",
                    phone=f"+99897{5000000 + idx:07d}",
                    city=INSTRUCTORS[idx % len(INSTRUCTORS)]["city"],
                    region=INSTRUCTORS[idx % len(INSTRUCTORS)]["region"],
                    gender="erkak" if idx % 2 == 0 else "ayol",
                    years_experience=2 + idx,
                    transmission="automatic" if idx % 2 == 0 else "manual",
                    car_model="Chevrolet Cobalt",
                    hourly_price_cents=1300000 + (idx * 100000),
                    currency="UZS",
                    short_bio="Test ariza uchun to'ldirilgan bio matni. Admin panel sinovi uchun kerak.",
                    profile_image_url=PROFILE_IMAGES[idx % len(PROFILE_IMAGES)],
                    extra_images_json=json.dumps([MEDIA_POOL[idx % len(MEDIA_POOL)]]),
                    status=status_value,
                    rejection_reason="Hujjatlar to'liq emas" if status_value == "rejected" else None,
                    reviewed_by_id=user.id if (status_value != "pending" and user) else None,
                    reviewed_at=reviewed_at,
                    submitted_from="web",
                    created_at=created_at,
                    updated_at=created_at if status_value == "pending" else reviewed_at or created_at,
                )
            )

        await session.commit()
        print(f"Seeded driving instructors: {len(created)}")
        print(f"Seeded applications: {len(app_statuses)}")
        print(f"Users available for linked data: {len(users)}")

    await engine.dispose()


if __name__ == "__main__":
    random.seed(42)
    asyncio.run(seed())
