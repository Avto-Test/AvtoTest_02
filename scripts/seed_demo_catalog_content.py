import asyncio
import html
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from core.security import get_password_hash
from models.driving_instructor import DrivingInstructor
from models.driving_instructor_media import DrivingInstructorMedia
from models.driving_instructor_review import DrivingInstructorReview
from models.driving_school import DrivingSchool
from models.driving_school_course import DrivingSchoolCourse
from models.driving_school_media import DrivingSchoolMedia
from models.driving_school_review import DrivingSchoolReview
from models.lesson import Lesson
from models.user import User


REVIEWER_PASSWORD = "DemoSeed!2026Locked"
ASSET_ROOT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "demo"


def _esc(value: str) -> str:
    return html.escape(value, quote=True)


def _svg_card(title: str, subtitle: str, accent: str, badge: str, line1: str, line2: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img">
  <defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#071c2c"/><stop offset="100%" stop-color="{_esc(accent)}"/></linearGradient></defs>
  <rect width="1200" height="800" rx="42" fill="url(#bg)"/>
  <rect x="80" y="84" width="232" height="58" rx="29" fill="rgba(255,255,255,0.12)"/>
  <text x="116" y="122" fill="#f8fafc" font-size="26" font-family="Arial, sans-serif" font-weight="700">{_esc(badge)}</text>
  <text x="92" y="240" fill="#f8fafc" font-size="70" font-family="Arial, sans-serif" font-weight="700">{_esc(title)}</text>
  <text x="96" y="320" fill="#bfdbfe" font-size="34" font-family="Arial, sans-serif">{_esc(subtitle)}</text>
  <text x="96" y="420" fill="#dbeafe" font-size="36" font-family="Arial, sans-serif">{_esc(line1)}</text>
  <text x="96" y="478" fill="#dbeafe" font-size="36" font-family="Arial, sans-serif">{_esc(line2)}</text>
</svg>
"""


def _svg_logo(title: str, accent: str, code: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img">
  <rect width="512" height="512" rx="92" fill="{_esc(accent)}"/>
  <text x="64" y="258" fill="#ffffff" font-size="150" font-family="Arial, sans-serif" font-weight="700">{_esc(code[:2])}</text>
  <text x="66" y="334" fill="#e2e8f0" font-size="34" font-family="Arial, sans-serif">{_esc(title)}</text>
  <text x="66" y="378" fill="#bfdbfe" font-size="22" font-family="Arial, sans-serif">AUTOTEST demo</text>
</svg>
"""


def _svg_avatar(name: str, accent: str, city: str, transmission: str) -> str:
    initials = "".join(part[:1].upper() for part in name.split()[:2]) or "DI"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img">
  <defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="{_esc(accent)}"/></linearGradient></defs>
  <rect width="800" height="800" rx="64" fill="url(#bg)"/>
  <circle cx="400" cy="260" r="84" fill="#e2e8f0"/>
  <path d="M240 520c34-74 93-112 160-112s126 38 160 112v64H240z" fill="#e2e8f0"/>
  <text x="88" y="114" fill="#f8fafc" font-size="22" font-family="Arial, sans-serif" font-weight="700">{_esc(initials)}</text>
  <text x="88" y="646" fill="#f8fafc" font-size="54" font-family="Arial, sans-serif" font-weight="700">{_esc(name)}</text>
  <text x="88" y="704" fill="#cbd5e1" font-size="28" font-family="Arial, sans-serif">{_esc(city)} - {_esc(transmission)}</text>
</svg>
"""


ASSETS = {
    "lessons/road-signs.svg": _svg_card("Yo'l belgilari", "Belgilarni tez ajratish", "#155e75", "LESSON", "Shakl -> rang -> amal", "Belgi ma'nosi -> qaror"),
    "lessons/intersection.svg": _svg_card("Chorraha", "Ustuvorlikni topish", "#1d4ed8", "LESSON", "Piyoda -> oqim -> burilish", "Signal va belgiga qarang"),
    "lessons/parking.svg": _svg_card("Parkovka", "Yonlama va orqaga", "#92400e", "LESSON", "Ko'zgu -> signal -> rul", "To'xtash nuqtasini belgilang"),
    "lessons/safety.svg": _svg_card("Xavfsiz haydash", "Masofa va tezlik", "#0f766e", "LESSON", "Yomg'irda intervalni oshiring", "Ko'r zonada qolmang"),
    "schools/logo-tashkent.svg": _svg_logo("Toshkent Rul Markazi", "#0369a1", "TR"),
    "schools/logo-samarkand.svg": _svg_logo("Registon Auto Akademiya", "#7c3aed", "RA"),
    "schools/logo-jizzakh.svg": _svg_logo("Jizzax Start Drive", "#ca8a04", "JS"),
    "schools/gallery-classroom.svg": _svg_card("Nazariya darsi", "Sinf va test tahlili", "#1e40af", "SCHOOL", "Mock-test tahlili", "Imtihon checklist"),
    "schools/gallery-track.svg": _svg_card("Amaliy maydon", "Start va manevr", "#0f766e", "SCHOOL", "Slalom va parkovka", "Nazorat chizig'i mashqi"),
    "schools/gallery-evening.svg": _svg_card("Kechki dars", "Qorong'ida boshqaruv", "#4338ca", "SCHOOL", "Faralar bilan ishlash", "Masofa nazorati"),
    "instructors/profile-1.svg": _svg_avatar("Azizbek Nazarov", "#0891b2", "Toshkent", "avtomat"),
    "instructors/profile-2.svg": _svg_avatar("Mohira Karimova", "#7c3aed", "Toshkent", "mexanika"),
    "instructors/profile-3.svg": _svg_avatar("Diyor Qodirov", "#0f766e", "Samarqand", "avtomat"),
    "instructors/profile-4.svg": _svg_avatar("Shahlo Abdukarimova", "#ea580c", "Jizzax", "avtomat"),
    "instructors/gallery-city.svg": _svg_card("Shahar marshruti", "Tirbandlik va kesishma", "#0f766e", "INSTRUCTOR", "Signal va masofa nazorati", "Murakkab chorrahalar"),
    "instructors/gallery-night.svg": _svg_card("Kechki dars", "Qorong'ida boshqaruv", "#312e81", "INSTRUCTOR", "Faralar bilan ishlash", "Ko'r zonani nazorat qilish"),
    "instructors/gallery-parking.svg": _svg_card("Parkovka mashqi", "Yonlama va orqaga", "#92400e", "INSTRUCTOR", "Rul burchagi", "To'xtash nuqtasi"),
}


REVIEWERS = [
    {"email": "demo.reviewer.1@example.invalid", "full_name": "Demo Foydalanuvchi 1"},
    {"email": "demo.reviewer.2@example.invalid", "full_name": "Demo Foydalanuvchi 2"},
    {"email": "demo.reviewer.3@example.invalid", "full_name": "Demo Foydalanuvchi 3"},
]


LESSONS = [
    ("Demo: Yo'l belgilari - Tez ajratish", "Yo'l belgilari", "Yo'l belgilari", "image", "/demo/lessons/road-signs.svg", False, 10),
    ("Demo: Yo'l belgilari - Checklist", "Yo'l belgilari", "Yo'l belgilari", "text", "text://demo/road-signs-checklist", True, 11),
    ("Demo: Chorraha - Ustuvorlik", "Ustuvorlik", "Chorraha va ustuvorlik", "image", "/demo/lessons/intersection.svg", False, 20),
    ("Demo: Chorraha - Vaziyatli tahlil", "Ustuvorlik", "Chorraha va ustuvorlik", "text", "text://demo/intersection-scenarios", True, 21),
    ("Demo: Parkovka - Bosqichma-bosqich", "Manevr", "Parkovka va manevr", "image", "/demo/lessons/parking.svg", False, 30),
    ("Demo: Parkovka - Nazorat checklisti", "Manevr", "Parkovka va manevr", "text", "text://demo/parking-checklist", True, 31),
    ("Demo: Xavfsiz haydash - Masofa", "Xavfsiz haydash", "Xavfsiz haydash", "image", "/demo/lessons/safety.svg", False, 40),
    ("Demo: Xavfsiz haydash - Favqulodda reja", "Xavfsiz haydash", "Xavfsiz haydash", "text", "text://demo/safety-plan", True, 41),
]


SCHOOLS = [
    {
        "slug": "demo-toshkent-rul-markazi",
        "referral_code": "DEMOSCHTASH",
        "name": "Toshkent Rul Markazi",
        "short_description": "Sergeli va Chilonzor uchun zamonaviy B hamda BC kurslari.",
        "full_description": "Nazariya, amaliyot, lokatsiya va media bloklari bilan to'ldirilgan demo avtomaktab profili.",
        "city": "Toshkent",
        "region": "Toshkent sh.",
        "address": "Sergeli 5A, Yangi hayot ko'chasi 14",
        "landmark": "Sergeli metro bekatidan 5 daqiqa",
        "phone": "+998900010101",
        "telegram": "@demo_toshkent_rul",
        "website": "https://auto-drive.online/driving-schools",
        "work_hours": "08:00 - 21:00",
        "license_info": "DEMO-AA-001",
        "years_active": 7,
        "logo_url": "/demo/schools/logo-tashkent.svg",
        "map_embed_url": "https://maps.google.com/maps?q=41.2267,69.2154&z=14&output=embed",
        "courses": [("B", 8, 245_000_000, True), ("BC", 10, 328_000_000, True), ("C", 9, 295_000_000, False)],
        "media": [
            ("/demo/schools/gallery-classroom.svg", "Nazariya xonasi", 0),
            ("/demo/schools/gallery-track.svg", "Amaliy maydon", 1),
            ("/demo/schools/gallery-evening.svg", "Kechki mashg'ulot", 2),
        ],
        "reviews": [("demo.reviewer.1@example.invalid", 5, "Nazariya va amaliyot muvozanatli olib borildi."), ("demo.reviewer.2@example.invalid", 4, "Instruktorlar tushuntirishi aniq.")],
    },
    {
        "slug": "demo-registon-auto-akademiya",
        "referral_code": "DEMOSCHSAM",
        "name": "Registon Auto Akademiya",
        "short_description": "Samarqand markazida intensiv darslar va imtihon mock-testlari.",
        "full_description": "Samarqand bozori uchun demo profil. Media, karta va kurs kartalari bilan to'liq.",
        "city": "Samarqand",
        "region": "Samarqand vil.",
        "address": "Universitet xiyoboni 9",
        "landmark": "Registon maydonidan 10 daqiqa",
        "phone": "+998900010202",
        "telegram": "@demo_registon_auto",
        "website": "https://auto-drive.online/driving-schools",
        "work_hours": "09:00 - 20:00",
        "license_info": "DEMO-AA-002",
        "years_active": 5,
        "logo_url": "/demo/schools/logo-samarkand.svg",
        "map_embed_url": "https://maps.google.com/maps?q=39.6542,66.9597&z=14&output=embed",
        "courses": [("B", 7, 238_000_000, True), ("C", 9, 302_000_000, False), ("D", 11, 365_000_000, True)],
        "media": [
            ("/demo/schools/gallery-track.svg", "Ochiq maydon", 0),
            ("/demo/schools/gallery-evening.svg", "Tungi mashg'ulot", 1),
            ("/demo/schools/gallery-classroom.svg", "Nazariya darsi", 2),
        ],
        "reviews": [("demo.reviewer.2@example.invalid", 5, "Mock testlar imtihonga tayyorlanishda yordam berdi."), ("demo.reviewer.3@example.invalid", 4, "Qulay joylashuv va sinov maydoni yaxshi.")],
    },
    {
        "slug": "demo-jizzax-start-drive",
        "referral_code": "DEMOSCHJIZ",
        "name": "Jizzax Start Drive",
        "short_description": "Jizzax shahri uchun moslashuvchan jadval va boshlang'ich paketlar.",
        "full_description": "Katalogdagi Jizzax kartasini sinash uchun yaratilgan demo avtomaktab yozuvi.",
        "city": "Jizzax",
        "region": "Jizzax vil.",
        "address": "Sharof Rashidov ko'chasi 18",
        "landmark": "Markaziy bozor orqasida",
        "phone": "+998900010303",
        "telegram": "@demo_jizzax_drive",
        "website": "https://auto-drive.online/driving-schools",
        "work_hours": "08:30 - 19:30",
        "license_info": "DEMO-AA-003",
        "years_active": 4,
        "logo_url": "/demo/schools/logo-jizzakh.svg",
        "map_embed_url": "https://maps.google.com/maps?q=40.1158,67.8422&z=14&output=embed",
        "courses": [("B", 8, 221_000_000, True), ("A", 5, 168_000_000, False), ("BC", 10, 314_000_000, True)],
        "media": [
            ("/demo/schools/gallery-classroom.svg", "Sinf xonasi", 0),
            ("/demo/schools/gallery-evening.svg", "Kechki dars", 1),
            ("/demo/schools/gallery-track.svg", "Tajriba maydoni", 2),
        ],
        "reviews": [("demo.reviewer.1@example.invalid", 4, "Yangi boshlovchilar uchun yaxshi tushuntirilgan."), ("demo.reviewer.3@example.invalid", 5, "Jadval moslashuvchan, joylashuvi qulay.")],
    },
]


INSTRUCTORS = [
    {
        "slug": "demo-azizbek-nazarov",
        "referral_code": "DEMOINST01",
        "full_name": "Azizbek Nazarov",
        "gender": "erkak",
        "years_experience": 8,
        "short_bio": "Sergeli, Chilonzor va Yakkasaroy hududlarida avtomat darslari beradi.",
        "teaching_style": "Tinch, aniq va bosqichma-bosqich o'qitish uslubi.",
        "city": "Toshkent",
        "region": "Toshkent sh.",
        "service_areas": "Sergeli, Chilonzor, Yakkasaroy",
        "transmission": "automatic",
        "car_model": "Chevrolet Onix",
        "car_year": 2024,
        "car_features": "Kamera, parktronik, yumshoq boshqaruv.",
        "hourly_price_cents": 15_000_000,
        "min_lesson_minutes": 90,
        "special_services": "Imtihon oldi intensiv dars",
        "phone": "+998900020101",
        "telegram": "@demo_azizbek_drive",
        "profile_image_url": "/demo/instructors/profile-1.svg",
        "map_embed_url": "https://maps.google.com/maps?q=41.2856,69.2034&z=13&output=embed",
        "is_top_rated": True,
        "media": [("/demo/instructors/profile-1.svg", "Profil rasmi", 0), ("/demo/instructors/gallery-city.svg", "Shahar marshruti", 1), ("/demo/instructors/gallery-night.svg", "Kechki dars", 2)],
        "reviews": [("demo.reviewer.1@example.invalid", 5, "Murakkab chorrahalarni sodda tushuntiradi."), ("demo.reviewer.2@example.invalid", 4, "Jadvali qulay va muomalasi yaxshi.")],
    },
    {
        "slug": "demo-mohira-karimova",
        "referral_code": "DEMOINST02",
        "full_name": "Mohira Karimova",
        "gender": "ayol",
        "years_experience": 7,
        "short_bio": "Yangi haydovchilar uchun mexanika bo'yicha sabrli va izchil dars beradi.",
        "teaching_style": "Ko'p takrorlash va real vaziyatli mashqlar.",
        "city": "Toshkent",
        "region": "Toshkent sh.",
        "service_areas": "Mirobod, Mirzo Ulug'bek, Yashnobod",
        "transmission": "manual",
        "car_model": "Chevrolet Cobalt",
        "car_year": 2022,
        "car_features": "Qo'shimcha pedal va qulay oyna sozlamalari.",
        "hourly_price_cents": 13_800_000,
        "min_lesson_minutes": 60,
        "special_services": "Parkovka va start-stop mashqlari",
        "phone": "+998900020202",
        "telegram": "@demo_mohira_manual",
        "profile_image_url": "/demo/instructors/profile-2.svg",
        "map_embed_url": "https://maps.google.com/maps?q=41.3111,69.2797&z=13&output=embed",
        "is_top_rated": True,
        "media": [("/demo/instructors/profile-2.svg", "Profil rasmi", 0), ("/demo/instructors/gallery-parking.svg", "Parkovka mashqi", 1), ("/demo/instructors/gallery-city.svg", "Tirbandlikda haydash", 2)],
        "reviews": [("demo.reviewer.2@example.invalid", 5, "Mexanika darslari juda tushunarli bo'ldi."), ("demo.reviewer.3@example.invalid", 4, "Boshlovchilar uchun yaxshi tanlov.")],
    },
    {
        "slug": "demo-diyor-qodirov",
        "referral_code": "DEMOINST03",
        "full_name": "Diyor Qodirov",
        "gender": "erkak",
        "years_experience": 10,
        "short_bio": "Samarqand markazida avtomat mashinada xavfsiz haydash bo'yicha dars beradi.",
        "teaching_style": "Yo'l vaziyatini oldindan o'qishga urg'u beradi.",
        "city": "Samarqand",
        "region": "Samarqand vil.",
        "service_areas": "Registon, Siyob, Universitet hududi",
        "transmission": "automatic",
        "car_model": "Kia K5",
        "car_year": 2023,
        "car_features": "360 kamera va adaptiv sensorlar.",
        "hourly_price_cents": 17_200_000,
        "min_lesson_minutes": 90,
        "special_services": "Imtihon marshruti bo'yicha amaliyot",
        "phone": "+998900020303",
        "telegram": "@demo_diyor_auto",
        "profile_image_url": "/demo/instructors/profile-3.svg",
        "map_embed_url": "https://maps.google.com/maps?q=39.6546,66.9753&z=13&output=embed",
        "is_top_rated": True,
        "media": [("/demo/instructors/profile-3.svg", "Profil rasmi", 0), ("/demo/instructors/gallery-night.svg", "Kechki dars", 1), ("/demo/instructors/gallery-city.svg", "Markaziy marshrut", 2)],
        "reviews": [("demo.reviewer.1@example.invalid", 5, "Imtihon yo'nalishi bo'yicha ayni muddao."), ("demo.reviewer.3@example.invalid", 5, "Xatolarni tez tahlil qilib beradi.")],
    },
    {
        "slug": "demo-shahlo-abdukarimova",
        "referral_code": "DEMOINST04",
        "full_name": "Shahlo Abdukarimova",
        "gender": "ayol",
        "years_experience": 6,
        "short_bio": "Jizzax shahri va yaqin hududlarida avtomat darslar o'tadi.",
        "teaching_style": "Sabrli, takroriy mashqlar bilan o'qitadi.",
        "city": "Jizzax",
        "region": "Jizzax vil.",
        "service_areas": "Markaz, Sharof Rashidov ko'chasi, Yangiobod yo'nalishi",
        "transmission": "automatic",
        "car_model": "Chevrolet Tracker",
        "car_year": 2024,
        "car_features": "Keng salon, kamera va qulay o'rindiq sozlamasi.",
        "hourly_price_cents": 14_500_000,
        "min_lesson_minutes": 60,
        "special_services": "Yangi boshlovchilar uchun start paket",
        "phone": "+998900020404",
        "telegram": "@demo_shahlo_drive",
        "profile_image_url": "/demo/instructors/profile-4.svg",
        "map_embed_url": "https://maps.google.com/maps?q=40.1232,67.8292&z=13&output=embed",
        "is_top_rated": False,
        "media": [("/demo/instructors/profile-4.svg", "Profil rasmi", 0), ("/demo/instructors/gallery-parking.svg", "Manevr darsi", 1), ("/demo/instructors/gallery-city.svg", "Shahar ichida haydash", 2)],
        "reviews": [("demo.reviewer.2@example.invalid", 4, "Yangi boshlovchilar uchun juda qulay."), ("demo.reviewer.3@example.invalid", 5, "Sabr bilan tushuntiradi va qaytaradi.")],
    },
]


def ensure_assets() -> None:
    for relative_path, content in ASSETS.items():
        target_path = ASSET_ROOT / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(content, encoding="utf-8")


async def ensure_reviewers(session) -> dict[str, User]:
    reviewer_map: dict[str, User] = {}
    for payload in REVIEWERS:
        result = await session.execute(select(User).where(User.email == payload["email"]))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                email=payload["email"],
                hashed_password=get_password_hash(REVIEWER_PASSWORD),
                full_name=payload["full_name"],
                is_active=True,
                is_verified=True,
            )
            session.add(user)
            await session.flush()
        else:
            user.full_name = payload["full_name"]
            user.is_active = True
            user.is_verified = True
        reviewer_map[payload["email"]] = user
    return reviewer_map


async def upsert_lessons(session) -> int:
    count = 0
    for title, topic, section, content_type, content_url, is_premium, sort_order in LESSONS:
        result = await session.execute(select(Lesson).where(Lesson.content_url == content_url))
        lesson = result.scalar_one_or_none()
        values = {
            "title": title,
            "description": f"{section} bo'limi uchun demo dars kontenti.",
            "content_type": content_type,
            "content_url": content_url,
            "thumbnail_url": content_url if content_type == "image" else f"/demo/lessons/{content_url.split('/')[-1] if content_url.startswith('/demo/') else 'road-signs.svg'}",
            "topic": topic,
            "section": section,
            "is_active": True,
            "is_premium": is_premium,
            "sort_order": sort_order,
        }
        if lesson is None:
            session.add(Lesson(**values))
        else:
            for key, value in values.items():
                setattr(lesson, key, value)
            lesson.updated_at = datetime.now(timezone.utc)
        count += 1
    return count


async def upsert_schools(session, reviewers: dict[str, User]) -> int:
    count = 0
    for payload in SCHOOLS:
        result = await session.execute(select(DrivingSchool).where(DrivingSchool.slug == payload["slug"]))
        school = result.scalar_one_or_none()
        school_fields = {key: value for key, value in payload.items() if key not in {"courses", "media", "reviews"}}
        if school is None:
            school = DrivingSchool(**school_fields, owner_user_id=None, promo_code_id=None, is_active=True)
            session.add(school)
            await session.flush()
        else:
            for key, value in school_fields.items():
                setattr(school, key, value)
            school.is_active = True
            school.updated_at = datetime.now(timezone.utc)

        for idx, (category_code, duration_weeks, price_cents, installment_available) in enumerate(payload["courses"]):
            course_result = await session.execute(
                select(DrivingSchoolCourse).where(
                    DrivingSchoolCourse.school_id == school.id,
                    DrivingSchoolCourse.category_code == category_code,
                )
            )
            course = course_result.scalar_one_or_none()
            course_values = {
                "school_id": school.id,
                "category_code": category_code,
                "duration_weeks": duration_weeks,
                "price_cents": price_cents,
                "currency": "UZS",
                "installment_available": installment_available,
                "description": f"{category_code} toifasi uchun demo kurs paketi.",
                "sort_order": idx,
                "is_active": True,
            }
            if course is None:
                session.add(DrivingSchoolCourse(**course_values))
            else:
                for key, value in course_values.items():
                    setattr(course, key, value)
                course.updated_at = datetime.now(timezone.utc)

        for url, caption, sort_order in payload["media"]:
            media_result = await session.execute(
                select(DrivingSchoolMedia).where(
                    DrivingSchoolMedia.school_id == school.id,
                    DrivingSchoolMedia.url == url,
                )
            )
            media = media_result.scalar_one_or_none()
            media_values = {
                "school_id": school.id,
                "media_type": "image",
                "url": url,
                "caption": caption,
                "sort_order": sort_order,
                "is_active": True,
            }
            if media is None:
                session.add(DrivingSchoolMedia(**media_values))
            else:
                for key, value in media_values.items():
                    setattr(media, key, value)
                media.updated_at = datetime.now(timezone.utc)

        for email, rating, comment in payload["reviews"]:
            reviewer = reviewers[email]
            review_result = await session.execute(
                select(DrivingSchoolReview).where(
                    DrivingSchoolReview.school_id == school.id,
                    DrivingSchoolReview.user_id == reviewer.id,
                )
            )
            review = review_result.scalar_one_or_none()
            review_values = {
                "school_id": school.id,
                "user_id": reviewer.id,
                "rating": rating,
                "comment": comment,
                "is_visible": True,
            }
            if review is None:
                session.add(DrivingSchoolReview(**review_values))
            else:
                for key, value in review_values.items():
                    setattr(review, key, value)
                review.updated_at = datetime.now(timezone.utc)

        count += 1
    return count


async def upsert_instructors(session, reviewers: dict[str, User]) -> int:
    count = 0
    for idx, payload in enumerate(INSTRUCTORS):
        result = await session.execute(select(DrivingInstructor).where(DrivingInstructor.slug == payload["slug"]))
        instructor = result.scalar_one_or_none()
        instructor_fields = {key: value for key, value in payload.items() if key not in {"media", "reviews"}}
        if instructor is None:
            instructor = DrivingInstructor(
                **instructor_fields,
                user_id=None,
                promo_code_id=None,
                currency="UZS",
                is_verified=True,
                is_active=True,
                is_blocked=False,
                view_count=80 + idx * 14,
                approved_at=datetime.now(timezone.utc) - timedelta(days=idx + 1),
            )
            session.add(instructor)
            await session.flush()
        else:
            for key, value in instructor_fields.items():
                setattr(instructor, key, value)
            instructor.currency = "UZS"
            instructor.is_verified = True
            instructor.is_active = True
            instructor.is_blocked = False
            instructor.approved_at = instructor.approved_at or (datetime.now(timezone.utc) - timedelta(days=idx + 1))
            if instructor.view_count < 80:
                instructor.view_count = 80 + idx * 14
            instructor.updated_at = datetime.now(timezone.utc)

        for url, caption, sort_order in payload["media"]:
            media_result = await session.execute(
                select(DrivingInstructorMedia).where(
                    DrivingInstructorMedia.instructor_id == instructor.id,
                    DrivingInstructorMedia.url == url,
                )
            )
            media = media_result.scalar_one_or_none()
            media_values = {
                "instructor_id": instructor.id,
                "media_type": "image",
                "url": url,
                "caption": caption,
                "sort_order": sort_order,
                "is_active": True,
            }
            if media is None:
                session.add(DrivingInstructorMedia(**media_values))
            else:
                for key, value in media_values.items():
                    setattr(media, key, value)
                media.updated_at = datetime.now(timezone.utc)

        for email, rating, comment in payload["reviews"]:
            reviewer = reviewers[email]
            review_result = await session.execute(
                select(DrivingInstructorReview).where(
                    DrivingInstructorReview.instructor_id == instructor.id,
                    DrivingInstructorReview.user_id == reviewer.id,
                )
            )
            review = review_result.scalar_one_or_none()
            review_values = {
                "instructor_id": instructor.id,
                "user_id": reviewer.id,
                "rating": rating,
                "comment": comment,
                "is_visible": True,
            }
            if review is None:
                session.add(DrivingInstructorReview(**review_values))
            else:
                for key, value in review_values.items():
                    setattr(review, key, value)
                review.updated_at = datetime.now(timezone.utc)

        count += 1
    return count


async def main() -> None:
    ensure_assets()

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        reviewers = await ensure_reviewers(session)
        lesson_count = await upsert_lessons(session)
        school_count = await upsert_schools(session, reviewers)
        instructor_count = await upsert_instructors(session, reviewers)
        await session.commit()

    await engine.dispose()
    print(f"Demo lessons ready: {lesson_count}")
    print(f"Demo schools ready: {school_count}")
    print(f"Demo instructors ready: {instructor_count}")
    print(f"Demo assets root: {ASSET_ROOT}")


if __name__ == "__main__":
    asyncio.run(main())
