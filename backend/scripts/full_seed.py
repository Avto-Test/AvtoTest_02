from __future__ import annotations

import asyncio
import os
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable
from uuid import UUID, uuid5

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


def _bootstrap_env() -> None:
    os.environ.setdefault("ENVIRONMENT", "development")
    os.environ.setdefault("DEBUG", "true")
    os.environ.setdefault("SECRET_KEY", "full-seed-script-secret-key")
    database_url = os.getenv("DATABASE_URL", "").strip()
    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    if database_url and environment in {"production", "prod"} and not os.getenv("EXPECTED_DATABASE_NAME"):
        parsed = make_url(database_url)
        if parsed.database:
            os.environ["EXPECTED_DATABASE_NAME"] = parsed.database


_bootstrap_env()

from core.rbac import (  # noqa: E402
    ADMIN_SCHOOLS_CREATE,
    ADMIN_USERS_READ,
    DEFAULT_ROLE_PERMISSIONS,
    INSTRUCTOR_ROLE,
    SCHOOL_ADMIN_ROLE,
    SCHOOL_MANAGE_MEMBERS,
    SCHOOL_VIEW_DASHBOARD,
    SCHOOL_VIEW_GROUPS,
    STUDENT_ROLE,
    SUPER_ADMIN_ROLE,
)
from core.admin_statuses import (  # noqa: E402
    DrivingInstructorApplicationStatus,
    DrivingInstructorComplaintStatus,
    DrivingInstructorLeadStatus,
    DrivingSchoolLeadStatus,
    DrivingSchoolPartnerApplicationStatus,
)
from core.security import get_password_hash  # noqa: E402
from models.analytics_event import AnalyticsEvent  # noqa: E402
from models.answer_option import AnswerOption  # noqa: E402
from models.attempt import Attempt  # noqa: E402
from models.attempt_answer import AttemptAnswer  # noqa: E402
from models.coin_transaction import CoinTransaction  # noqa: E402
from models.driving_instructor import DrivingInstructor  # noqa: E402
from models.driving_instructor_application import DrivingInstructorApplication  # noqa: E402
from models.driving_instructor_complaint import DrivingInstructorComplaint  # noqa: E402
from models.driving_instructor_lead import DrivingInstructorLead  # noqa: E402
from models.driving_instructor_media import DrivingInstructorMedia  # noqa: E402
from models.driving_instructor_registration_setting import DrivingInstructorRegistrationSetting  # noqa: E402
from models.driving_instructor_review import DrivingInstructorReview  # noqa: E402
from models.driving_school import DrivingSchool  # noqa: E402
from models.driving_school_course import DrivingSchoolCourse  # noqa: E402
from models.driving_school_lead import DrivingSchoolLead  # noqa: E402
from models.driving_school_media import DrivingSchoolMedia  # noqa: E402
from models.driving_school_partner_application import DrivingSchoolPartnerApplication  # noqa: E402
from models.driving_school_review import DrivingSchoolReview  # noqa: E402
from models.exam_simulation_attempt import ExamSimulationAttempt  # noqa: E402
from models.inference_snapshot import InferenceSnapshot  # noqa: E402
from models.lesson import Lesson  # noqa: E402
from models.leaderboard_snapshot import LeaderboardSnapshot  # noqa: E402
from models.permission import Permission  # noqa: E402
from models.question import Question  # noqa: E402
from models.question_category import QuestionCategory  # noqa: E402
from models.review_queue import ReviewQueue  # noqa: E402
from models.role import Role  # noqa: E402
from models.role_permission import RolePermission  # noqa: E402
from models.school_membership import SchoolMembership  # noqa: E402
from models.subscription import Subscription  # noqa: E402
from models.test import Test  # noqa: E402
from models.user import User  # noqa: E402
from models.user_adaptive_profile import UserAdaptiveProfile  # noqa: E402
from models.user_notification import UserNotification  # noqa: E402
from models.user_question_history import UserQuestionHistory  # noqa: E402
from models.user_role import UserRole  # noqa: E402
from models.user_skill import UserSkill  # noqa: E402
from models.user_topic_stats import UserTopicStats  # noqa: E402
from models.user_training_history import UserTrainingHistory  # noqa: E402
from models.xp_boost import XPBoost  # noqa: E402
from models.xp_event import XPEvent  # noqa: E402
from services.gamification.economy import (  # noqa: E402
    CoinSpendService,
    XP_BOOST_COST,
    XP_BOOST_DURATION_MINUTES,
    XP_BOOST_MULTIPLIER,
)
from services.gamification.rewards import (  # noqa: E402
    award_attempt_completion_rewards,
    award_custom_reward,
    award_daily_login,
    ensure_default_achievement_definitions,
)
from services.learning.progress_tracking import LearningAnswerRecord, apply_learning_progress_updates  # noqa: E402
from services.learning.simulation_service import get_or_create_simulation_exam_settings  # noqa: E402
from services.learning.taxonomy import CANONICAL_LEARNING_TOPIC_LABELS, canonical_learning_label  # noqa: E402


SEED_NAMESPACE = UUID("5b35b7b7-2df9-4c7e-b7f1-b7f1f22ecfb8")
SEED_VERSION = "full_seed_v1"
SEED_PASSWORD = "AutotestSeed!2026"
UTC = timezone.utc

LESSON_THUMBNAILS = {
    "Yo'l belgilari": "/demo/lessons/road-signs.svg",
    "Chorrahalar": "/demo/lessons/intersection.svg",
    "Yo'l chiziqlari": "/demo/lessons/parking.svg",
    "Transport boshqaruvi": "/demo/lessons/parking.svg",
    "Yo'l xavfsizligi": "/demo/lessons/safety.svg",
    "Yo'l harakati qoidalari": "/demo/lessons/safety.svg",
}

LESSON_MARKDOWN_PATHS = (
    "/demo/lessons/road-signs-checklist.md",
    "/demo/lessons/intersection-scenarios.md",
    "/demo/lessons/parking-checklist.md",
    "/demo/lessons/safety-plan.md",
    "/demo/category-lessons/yol-belgilari-1.md",
    "/demo/category-lessons/yol-belgilari-2.md",
    "/demo/category-lessons/yol-belgilari-3.md",
    "/demo/category-lessons/yol-chiziqlari-1.md",
    "/demo/category-lessons/yol-chiziqlari-2.md",
    "/demo/category-lessons/chorrahalar-1.md",
    "/demo/category-lessons/chorrahalar-2.md",
    "/demo/category-lessons/chorrahalar-3.md",
    "/demo/category-lessons/transport-boshqaruvi-1.md",
    "/demo/category-lessons/transport-boshqaruvi-2.md",
    "/demo/category-lessons/transport-boshqaruvi-3.md",
    "/demo/category-lessons/yol-xavfsizligi-1.md",
    "/demo/category-lessons/yol-xavfsizligi-2.md",
    "/demo/category-lessons/yol-xavfsizligi-3.md",
    "/demo/category-lessons/yol-harakati-qoidalari-1.md",
    "/demo/category-lessons/yol-harakati-qoidalari-2.md",
    "/demo/category-lessons/yol-harakati-qoidalari-3.md",
    "/demo/category-lessons/haydovchi-madaniyati-1.md",
    "/demo/category-lessons/haydovchi-madaniyati-2.md",
    "/demo/category-lessons/haydovchi-madaniyati-3.md",
)

SCHOOL_GALLERY = (
    "/demo/schools/gallery-classroom.svg",
    "/demo/schools/gallery-track.svg",
    "/demo/schools/gallery-evening.svg",
)

INSTRUCTOR_PROFILES = (
    "/demo/instructors/profile-1.svg",
    "/demo/instructors/profile-2.svg",
    "/demo/instructors/profile-3.svg",
    "/demo/instructors/profile-4.svg",
)

INSTRUCTOR_GALLERY = (
    "/demo/instructors/gallery-city.svg",
    "/demo/instructors/gallery-night.svg",
    "/demo/instructors/gallery-parking.svg",
)

ROLE_DEFINITIONS: tuple[tuple[str, str], ...] = (
    (SUPER_ADMIN_ROLE, "Platform level administrator"),
    (SCHOOL_ADMIN_ROLE, "Driving school owner or manager"),
    (INSTRUCTOR_ROLE, "Listed driving instructor"),
    (STUDENT_ROLE, "Learning user"),
)

PERMISSION_DESCRIPTIONS: dict[str, str] = {
    ADMIN_SCHOOLS_CREATE: "Create and administer driving school records.",
    ADMIN_USERS_READ: "Read and audit platform user records.",
    SCHOOL_VIEW_DASHBOARD: "Access school dashboard analytics and summaries.",
    SCHOOL_VIEW_GROUPS: "View school group rosters and classroom data.",
    SCHOOL_MANAGE_MEMBERS: "Manage school staff and member assignments.",
}


@dataclass(frozen=True)
class UserSeed:
    full_name: str
    email: str
    city: str
    region: str
    level: str
    weak_topics: tuple[str, str]
    strong_topics: tuple[str, str]
    attempt_count: int
    streak_days: int
    bonus_xp: int
    bonus_coins: int
    is_admin: bool = False
    premium: bool = False
    school_slug: str | None = None
    instructor_slug: str | None = None


@dataclass(frozen=True)
class SchoolSeed:
    slug: str
    name: str
    city: str
    region: str
    address: str
    landmark: str
    phone: str
    telegram: str
    website: str
    work_hours: str
    license_info: str
    years_active: int
    short_description: str
    full_description: str
    logo_url: str
    referral_code: str
    owner_email: str
    course_rows: tuple[tuple[str, int, int, bool], ...]


@dataclass(frozen=True)
class InstructorSeed:
    slug: str
    full_name: str
    city: str
    region: str
    school_slug: str
    gender: str
    years_experience: int
    transmission: str
    car_model: str
    car_year: int
    hourly_price_cents: int
    phone: str
    telegram: str
    referral_code: str
    short_bio: str
    teaching_style: str
    service_areas: str
    car_features: str
    special_services: str
    min_lesson_minutes: int
    is_top_rated: bool = False
    user_email: str | None = None


@dataclass(frozen=True)
class CategorySeed:
    name: str
    canonical_topic: str
    contexts: tuple[str, ...]
    prompts: tuple[str, ...]
    correct_option: str
    wrong_options: tuple[str, str, str]
    asset: str


@dataclass(frozen=True)
class TestSeed:
    key: str
    title: str
    description: str
    difficulty: str
    duration: int
    is_premium: bool
    categories: tuple[str, ...]
    question_count: int


@dataclass(frozen=True)
class AttemptTemplate:
    mode: str
    source: str
    question_count: int
    target_accuracy: float
    pressure_mode: bool = False


USER_SEEDS: tuple[UserSeed, ...] = (
    UserSeed("Aziza Karimova", "aziza.karimova@demo.autotest.uz", "Toshkent", "Toshkent shahri", "advanced", ("Chorrahalar", "Favqulodda vaziyat"), ("Yo'l belgilari", "Xavfsiz haydash"), 10, 15, 1750, 320, True, True, "toshkent-rul-akademiyasi"),
    UserSeed("Jahongir Rasulov", "jahongir.rasulov@demo.autotest.uz", "Samarqand", "Samarqand viloyati", "advanced", ("Parkovka", "Yo'l chiziqlari"), ("Yo'l harakati qoidalari", "Ustuvorlik"), 10, 13, 1600, 280, False, True, "samarkand-avto-maktab"),
    UserSeed("Nilufar Sobirova", "nilufar.sobirova@demo.autotest.uz", "Jizzax", "Jizzax viloyati", "advanced", ("Tezlik rejimi", "Favqulodda vaziyat"), ("Yo'l belgilari", "Chorrahalar"), 10, 12, 1520, 260, False, True, "jizzax-navigator"),
    UserSeed("Sardor Tursunov", "sardor.tursunov@demo.autotest.uz", "Andijon", "Andijon viloyati", "intermediate", ("Ogohlantiruvchi belgilar", "Ustuvorlik"), ("Xavfsiz haydash", "Yo'l harakati qoidalari"), 8, 9, 980, 210, False, True, "andijon-ustoz-rul"),
    UserSeed("Madina Qodirova", "madina.qodirova@demo.autotest.uz", "Farg'ona", "Farg'ona viloyati", "intermediate", ("Chorrahalar", "Parkovka"), ("Taqiqlovchi belgilar", "Xavfsiz haydash"), 8, 8, 920, 190, False, True, "fargona-start-drive"),
    UserSeed("Bekzod Ergashev", "bekzod.ergashev@demo.autotest.uz", "Namangan", "Namangan viloyati", "intermediate", ("Manevr va burilish", "Tezlik rejimi"), ("Yo'l chiziqlari", "Yo'l harakati qoidalari"), 8, 7, 900, 180, False, True, "namangan-signal"),
    UserSeed("Diyorbek Aliyev", "diyorbek.aliyev@demo.autotest.uz", "Toshkent", "Toshkent shahri", "advanced", ("Parkovka", "Favqulodda vaziyat"), ("Xavfsiz haydash", "Yo'l belgilari"), 10, 14, 1500, 260, False, True, None, "diyorbek-aliyev"),
    UserSeed("Mohira Raximova", "mohira.raximova@demo.autotest.uz", "Samarqand", "Samarqand viloyati", "advanced", ("Ustuvorlik", "Tezlik rejimi"), ("Ogohlantiruvchi belgilar", "Chorrahalar"), 10, 12, 1420, 240, False, True, None, "mohira-raximova"),
    UserSeed("Shaxzod Nurmatov", "shaxzod.nurmatov@demo.autotest.uz", "Andijon", "Andijon viloyati", "intermediate", ("Parkovka", "Yo'l chiziqlari"), ("Yo'l harakati qoidalari", "Xavfsiz haydash"), 8, 9, 980, 190, False, True, None, "shaxzod-nurmatov"),
    UserSeed("Feruza Ismoilova", "feruza.ismoilova@demo.autotest.uz", "Farg'ona", "Farg'ona viloyati", "intermediate", ("Taqiqlovchi belgilar", "Manevr va burilish"), ("Parkovka", "Yo'l chiziqlari"), 8, 7, 940, 185, False, True, None, "feruza-ismoilova"),
    UserSeed("Abror Yuldashev", "abror.yuldashev@demo.autotest.uz", "Namangan", "Namangan viloyati", "intermediate", ("Favqulodda vaziyat", "Chorrahalar"), ("Yo'l belgilari", "Xavfsiz haydash"), 8, 8, 1010, 200, False, True, None, "abror-yuldashev"),
    UserSeed("Kamola Usmonova", "kamola.usmonova@demo.autotest.uz", "Jizzax", "Jizzax viloyati", "intermediate", ("Tezlik rejimi", "Ogohlantiruvchi belgilar"), ("Yo'l harakati qoidalari", "Manevr va burilish"), 8, 6, 900, 170, False, True, None, "kamola-usmonova"),
    UserSeed("Umidjon Oripov", "umidjon.oripov@demo.autotest.uz", "Toshkent", "Toshkent shahri", "beginner", ("Chorrahalar", "Ustuvorlik"), ("Yo'l belgilari", "Parkovka"), 6, 5, 420, 85, False, False),
    UserSeed("Laylo Mamatova", "laylo.mamatova@demo.autotest.uz", "Toshkent", "Toshkent shahri", "beginner", ("Yo'l chiziqlari", "Manevr va burilish"), ("Ogohlantiruvchi belgilar", "Yo'l belgilari"), 6, 4, 390, 80, False, False),
    UserSeed("Sherzod Qodirov", "sherzod.qodirov@demo.autotest.uz", "Samarqand", "Samarqand viloyati", "beginner", ("Parkovka", "Favqulodda vaziyat"), ("Yo'l harakati qoidalari", "Tezlik rejimi"), 6, 4, 410, 78, False, False),
    UserSeed("Ziyoda Asqarova", "ziyoda.asqarova@demo.autotest.uz", "Andijon", "Andijon viloyati", "beginner", ("Chorrahalar", "Tezlik rejimi"), ("Yo'l belgilari", "Xavfsiz haydash"), 6, 3, 380, 72, False, False),
    UserSeed("Otabek Po'latov", "otabek.pulatov@demo.autotest.uz", "Farg'ona", "Farg'ona viloyati", "beginner", ("Ustuvorlik", "Taqiqlovchi belgilar"), ("Parkovka", "Yo'l chiziqlari"), 6, 5, 430, 82, False, False),
    UserSeed("Malika Fayzullayeva", "malika.fayzullayeva@demo.autotest.uz", "Namangan", "Namangan viloyati", "beginner", ("Manevr va burilish", "Favqulodda vaziyat"), ("Yo'l harakati qoidalari", "Ogohlantiruvchi belgilar"), 6, 4, 395, 76, False, False),
    UserSeed("Eldor Xolmatov", "eldor.xolmatov@demo.autotest.uz", "Jizzax", "Jizzax viloyati", "intermediate", ("Parkovka", "Chorrahalar"), ("Yo'l belgilari", "Tezlik rejimi"), 8, 7, 870, 165, False, False),
    UserSeed("Gulnoza Ruzmatova", "gulnoza.ruzmatova@demo.autotest.uz", "Samarqand", "Samarqand viloyati", "intermediate", ("Ogohlantiruvchi belgilar", "Yo'l chiziqlari"), ("Xavfsiz haydash", "Yo'l harakati qoidalari"), 8, 6, 860, 160, False, False),
    UserSeed("Nodira Xamidova", "nodira.xamidova@demo.autotest.uz", "Andijon", "Andijon viloyati", "beginner", ("Ustuvorlik", "Tezlik rejimi"), ("Yo'l belgilari", "Parkovka"), 6, 3, 360, 70, False, False),
    UserSeed("Alisher Isroilov", "alisher.isroilov@demo.autotest.uz", "Farg'ona", "Farg'ona viloyati", "intermediate", ("Favqulodda vaziyat", "Manevr va burilish"), ("Taqiqlovchi belgilar", "Yo'l chiziqlari"), 8, 6, 880, 168, False, False),
    UserSeed("Sevara Nematova", "sevara.nematova@demo.autotest.uz", "Toshkent", "Toshkent shahri", "advanced", ("Parkovka", "Favqulodda vaziyat"), ("Yo'l belgilari", "Yo'l harakati qoidalari"), 10, 11, 1380, 225, False, True),
    UserSeed("Murodjon Sattorov", "murodjon.sattorov@demo.autotest.uz", "Namangan", "Namangan viloyati", "beginner", ("Chorrahalar", "Yo'l chiziqlari"), ("Ogohlantiruvchi belgilar", "Yo'l belgilari"), 6, 4, 370, 74, False, False),
)

SCHOOL_SEEDS: tuple[SchoolSeed, ...] = (
    SchoolSeed("toshkent-rul-akademiyasi", "Toshkent Rul Akademiyasi", "Toshkent", "Toshkent shahri", "Yakkasaroy tumani, Shota Rustaveli ko'chasi 45", "Grand Mir mehmonxonasi yonida", "+998901102030", "@toshkentrul", "https://toshkentrul.uz", "Dush-Shan 09:00-20:00", "AA-2024-014", 12, "Nazariya va amaliyot uyg'unlashgan, shaharda va yopiq maydonda mashq beradigan avtomaktab.", "Toshkent Rul Akademiyasi yangi boshlovchilar uchun bosqichma-bosqich dastur, haftalik mock-testlar va kechki guruhlar bilan ishlaydi.", "/demo/schools/logo-tashkent.svg", "TRA001", "aziza.karimova@demo.autotest.uz", (("B", 6, 7_800_000, True), ("BC", 9, 12_500_000, True))),
    SchoolSeed("samarkand-avto-maktab", "Samarkand Avto Maktab", "Samarqand", "Samarqand viloyati", "Universitet xiyoboni 18", "Registonga olib boruvchi katta yo'l bo'yida", "+998933334455", "@samarkandavto", "https://samarkandavto.uz", "Dush-Shan 08:30-19:30", "AA-2023-117", 9, "Imtihon strategiyasi va chorrahalar bo'yicha kuchli dastur bilan tanilgan avtomaktab.", "Samarkand Avto Maktab chorrahalar, ustuvorlik va real shahar marshrutlari bo'yicha kuchli murabbiylar jamoasi bilan ishlaydi.", "/demo/schools/logo-samarkand.svg", "SAM002", "jahongir.rasulov@demo.autotest.uz", (("B", 7, 7_500_000, True), ("C", 8, 9_600_000, False))),
    SchoolSeed("jizzax-navigator", "Jizzax Navigator", "Jizzax", "Jizzax viloyati", "Sharof Rashidov ko'chasi 23", "Markaziy stadion qarshisida", "+998991144556", "@jizzaxnavigator", "https://jizzaxnavigator.uz", "Dush-Shan 09:00-19:00", "AA-2022-208", 8, "Shahar ichidagi amaliyot va xavfsiz parkovka mashqlariga urg'u beradigan o'quv markazi.", "Jizzax Navigator mashg'ulotlarni kichik guruhlarda olib boradi va har bir talaba uchun alohida progress kartasini yuritadi.", "/demo/schools/logo-jizzakh.svg", "JIZ003", "nilufar.sobirova@demo.autotest.uz", (("B", 6, 7_200_000, False), ("BC", 10, 11_900_000, True))),
    SchoolSeed("andijon-ustoz-rul", "Andijon Ustoz Rul", "Andijon", "Andijon viloyati", "Bobur shoh ko'chasi 12", "Yoshlar markazi yonida", "+998974403322", "@andijonrul", "https://andijonrul.uz", "Dush-Shan 08:00-18:30", "AA-2021-305", 7, "Boshlovchilar uchun tinch uslubdagi nazariya va amaliyot kurslari bilan mashhur avtomaktab.", "Andijon Ustoz Rul haftalik qayta ko'rish darslari, ichki mentorlik va motivatsion support bilan ishlaydi.", "/demo/schools/logo-samarkand.svg", "AND004", "sardor.tursunov@demo.autotest.uz", (("B", 7, 6_900_000, True), ("C", 8, 9_100_000, False))),
    SchoolSeed("fargona-start-drive", "Farg'ona Start Drive", "Farg'ona", "Farg'ona viloyati", "Al-Farg'oniy ko'chasi 40", "Istiqlol stadioniga kirish qismida", "+998913558877", "@fargonastart", "https://fargonastart.uz", "Dush-Shan 09:00-19:30", "AA-2024-052", 6, "Tez moslashuvchan jadval va ayol instruktorlar ulushi yuqori bo'lgan o'quv markazi.", "Farg'ona Start Drive ish kunidan keyin ham dars taklif qiladi va haftalik progress xabarlarini yuboradi.", "/demo/schools/logo-tashkent.svg", "FAR005", "madina.qodirova@demo.autotest.uz", (("B", 6, 7_100_000, True), ("BC", 9, 11_700_000, True))),
    SchoolSeed("namangan-signal", "Namangan Signal", "Namangan", "Namangan viloyati", "Kosonsoy ko'chasi 9", "Eski avtovokzal yaqinida", "+998902229966", "@namangansignal", "https://namangansignal.uz", "Dush-Shan 08:30-19:00", "AA-2020-188", 10, "Murakkab chorrahalar va tezlik nazorati bo'yicha kuchli tayyorlov tizimiga ega avtomaktab.", "Namangan Signal yakuniy imtihon oldidan to'liq simulyatsiya hafta dasturlarini ham o'tkazadi.", "/demo/schools/logo-jizzakh.svg", "NAM006", "bekzod.ergashev@demo.autotest.uz", (("B", 6, 7_400_000, False), ("C", 8, 9_800_000, True))),
)

INSTRUCTOR_SEEDS: tuple[InstructorSeed, ...] = (
    InstructorSeed("diyorbek-aliyev", "Diyorbek Aliyev", "Toshkent", "Toshkent shahri", "toshkent-rul-akademiyasi", "male", 11, "automatic", "Chevrolet Cobalt", 2023, 15_500_000, "+998901112201", "@diyorbekdrive", "INS001", "Yangi haydovchilar bilan bosqichma-bosqich ishlaydi, xavotirni kamaytirishga alohida e'tibor beradi.", "Har bir darsda bitta asosiy ko'nikma va bitta imtihon senariysini mustahkamlaydi.", "Sergeli, Chilonzor, Yakkasaroy", "Dual pedal, orqa kamera, ABS", "Erta tong mashg'ulotlari, kechki darslar", 90, True, "diyorbek.aliyev@demo.autotest.uz"),
    InstructorSeed("mohira-raximova", "Mohira Raximova", "Samarqand", "Samarqand viloyati", "samarkand-avto-maktab", "female", 9, "manual", "Chevrolet Gentra", 2022, 14_800_000, "+998901112202", "@mohiraustoz", "INS002", "Chorrahalar va ustuvorlikda xatolarni tez topib, sodda tilda tushuntiradi.", "Video-tahlil va qayta yurish usuli bilan xatoni mustahkam to'g'rilaydi.", "Registon, Siyob, Universitet hududi", "Sensorlar, qo'shimcha oyna, dual pedal", "Ayol talabalar uchun alohida marshrutlar", 90, True, "mohira.raximova@demo.autotest.uz"),
    InstructorSeed("shaxzod-nurmatov", "Shaxzod Nurmatov", "Andijon", "Andijon viloyati", "andijon-ustoz-rul", "male", 8, "automatic", "Chevrolet Onix", 2024, 14_200_000, "+998901112203", "@shaxzodauto", "INS003", "Boshlovchilar bilan sokin, tizimli usulda ishlaydi va parkovka qo'rquvini kamaytiradi.", "Manevrlarni maydonda ko'p takrorlab, keyin real oqimga olib chiqadi.", "Markaz, Bobur ko'chasi, Yangi bozor", "Kamera, ABS, dual pedal", "Hafta oxiri intensiv bloklar", 80, False, "shaxzod.nurmatov@demo.autotest.uz"),
    InstructorSeed("feruza-ismoilova", "Feruza Ismoilova", "Farg'ona", "Farg'ona viloyati", "fargona-start-drive", "female", 7, "automatic", "Chevrolet Tracker", 2023, 15_200_000, "+998901112204", "@feruzadrive", "INS004", "Shahar markazidagi tig'iz oqimda tinch qaror qabul qilishga o'rgatadi.", "Nazariya savolini shu zahoti amaliy vaziyat bilan bog'laydi.", "Farg'ona markazi, Marg'ilon yo'nalishi", "Kamera, sensor, dual pedal", "Ayollar uchun qulay dars vaqtlari", 90, True, "feruza.ismoilova@demo.autotest.uz"),
    InstructorSeed("abror-yuldashev", "Abror Yuldashev", "Namangan", "Namangan viloyati", "namangan-signal", "male", 10, "manual", "Chevrolet Lacetti", 2021, 13_900_000, "+998901112205", "@abrorqoidalar", "INS005", "Nazariya va mashq o'rtasidagi bog'liqlikni yaxshi ko'rsatadi, imtihon savollarini tez tahlil qiladi.", "Avval belgi va chiziqni o'qitib, keyin ko'z-harakat koordinatsiyasini mashq qildiradi.", "Namangan markazi, Chortoq yo'li", "Dual pedal, ABS", "Imtihon oldi qayta tayyorlov", 80, False, "abror.yuldashev@demo.autotest.uz"),
    InstructorSeed("kamola-usmonova", "Kamola Usmonova", "Jizzax", "Jizzax viloyati", "jizzax-navigator", "female", 6, "automatic", "Chevrolet Spark", 2022, 13_600_000, "+998901112206", "@kamolasafe", "INS006", "Yo'l chiziqlari va parkovkada ko'p xato qiladigan talabalar bilan ehtiyotkor ishlaydi.", "Qisqa bloklar va tez-tez feedback usulini qo'llaydi.", "Jizzax markazi, Sharof Rashidov ko'chasi", "Kamera, dual pedal", "Boshlovchilar uchun kichik guruh darslari", 75, False, "kamola.usmonova@demo.autotest.uz"),
    InstructorSeed("saidakbar-xolov", "Saidakbar Xolov", "Toshkent", "Toshkent shahri", "toshkent-rul-akademiyasi", "male", 12, "automatic", "Kia K5", 2024, 17_800_000, "+998901112207", "@saidakbarpro", "INS007", "Yakuniy imtihon simulyatsiyalarini ko'p o'tkazadi va bosim ostida xotirjamlikni saqlashga o'rgatadi.", "Murakkab chorrahalarda qaror qabul qilish tezligini oshirishga urg'u beradi.", "Mirobod, Mirzo Ulug'bek, Yashnobod", "Kruiz, kamera, dual pedal", "Premium simulyatsiya mashg'ulotlari", 90, True, None),
    InstructorSeed("gulbahor-juraeva", "Gulbahor Jo'raeva", "Samarqand", "Samarqand viloyati", "samarkand-avto-maktab", "female", 5, "automatic", "Chevrolet Cobalt", 2023, 14_100_000, "+998901112208", "@gulbahordrive", "INS008", "Ayol haydovchilar bilan ishlash tajribasi kuchli, yo'lga chiqishdagi qo'rquvni kamaytiradi.", "Nazariy savolni amaliy marshrut bilan juftlab boradi.", "Registon, Kattaqo'rg'on ko'chasi", "Kamera, dual pedal", "Ayollar uchun alohida bloklar", 80, False, None),
    InstructorSeed("odilbek-azimov", "Odilbek Azimov", "Namangan", "Namangan viloyati", "namangan-signal", "male", 13, "automatic", "Hyundai Elantra", 2024, 18_500_000, "+998901112209", "@odilbektop", "INS009", "Tezlik nazorati va xavfsiz masofani saqlash bo'yicha juda talabchan instruktor.", "Har bir darsdan keyin qisqa yozma tahlil beradi.", "Namangan markazi, Uychi yo'nalishi", "ABS, kamera, dual pedal", "Imtihon oldi intensiv kurs", 90, True, None),
    InstructorSeed("dilfuza-mirzaeva", "Dilfuza Mirzaeva", "Farg'ona", "Farg'ona viloyati", "fargona-start-drive", "female", 6, "manual", "Chevrolet Cobalt", 2021, 14_000_000, "+998901112210", "@dilfuzaqadam", "INS010", "Manevr va burilishlarda tartibli mashq qilishga o'rgatadi.", "Talabaning xatolarini toifalab, keyingi dars rejasi bilan ishlaydi.", "Farg'ona markazi, Quva yo'nalishi", "Dual pedal, qo'shimcha oyna", "Kechki manual darslar", 80, False, None),
    InstructorSeed("jamshid-tursunov", "Jamshid Tursunov", "Andijon", "Andijon viloyati", "andijon-ustoz-rul", "male", 9, "manual", "Chevrolet Nexia 3", 2020, 13_700_000, "+998901112211", "@jamshidmanevr", "INS011", "Parkovka va orqaga yurish mashqlarida puxta mashq qildiradi.", "Qisqa, ammo takroriy bloklar bilan ko'nikmani mustahkamlaydi.", "Andijon markazi, Shahrixon yo'li", "Dual pedal", "Amaliy maydon bloklari", 75, False, None),
    InstructorSeed("nargiza-sattorova", "Nargiza Sattorova", "Jizzax", "Jizzax viloyati", "jizzax-navigator", "female", 7, "automatic", "Chevrolet Onix", 2024, 14_400_000, "+998901112212", "@nargizaflow", "INS012", "Yo'lga ishonchsiz chiqayotgan talabalar bilan yumshoq uslubda ishlaydi.", "Shahar ichidagi real oqimga sekin-asta olib kiradi.", "Jizzax markazi, yangi halqa yo'li", "Kamera, sensor, dual pedal", "Shaharda moslashuv kurslari", 80, False, None),
)

CATEGORY_SEEDS: tuple[CategorySeed, ...] = (
    CategorySeed("Yo'l belgilari", "Yo'l belgilari", ("Sergeli halqa yo'lida yangi belgi o'rnatilgan uchastkaga yaqinlashdingiz", "Maktab oldi hududida vaqtinchalik cheklov belgisi ko'rindi", "Ko'p qavatli turar joy oldidagi tor ko'chada ustun belgi turibdi", "Shahar markaziga kirishda belgilash o'zgargan yo'lakka chiqdingiz", "Ta'mirlash ishlari ketayotgan yo'lda vaqtinchalik belgilar paydo bo'ldi"), ("haydovchi birinchi bo'lib qaysi qarorni tanlashi kerak", "eng xavfsiz harakat qaysi bo'ladi", "qaysi yondashuv imtihon talabiga mos keladi", "tez qaror qabul qilish kerak bo'lsa nima to'g'ri bo'ladi"), "Belgidagi cheklovga mos ravishda tezlik va yo'nalishni oldindan moslaydi", ("Faqat orqa oynaga qarab belgi talabini e'tiborsiz qoldiradi", "Yo'l bo'sh bo'lsa belgini sharoitga qarab bekor deb hisoblaydi", "Signal berib tezlikni oshirib, keyin qaror qiladi"), "/demo/lessons/road-signs.svg"),
    CategorySeed("Taqiqlovchi belgilar", "Yo'l belgilari", ("Bir tomonlama yo'lga kirish qismida taqiqlovchi belgi turibdi", "Ta'mirlash hududida yuk mashinalariga cheklov belgisi qo'yilgan", "Turar joy ko'chasida to'xtash taqiqlangan belgi ko'rindi", "Markaziy ko'chada quvib o'tish taqiqlangan uchastkaga yetdingiz", "Tor ko'prik oldida transport turi bo'yicha cheklov belgisi bor"), ("bu belgida qaysi xatti-harakat to'g'ri", "nazorat qiluvchi eng muhim qadam qaysi", "qanday harakat jarimani va xavfni kamaytiradi", "imtihonda to'g'ri baholanadigan javob qaysi"), "Taqiq amal qilayotgan zonada manevrni to'xtatib, qonuniy yo'nalishni tanlaydi", ("Boshqa mashinalar o'tayotgan bo'lsa taqiqni vaqtincha e'tiborsiz qoldiradi", "Faqat tezlikni kamaytirib, cheklangan harakatni davom ettiradi", "Qisqa signal bilan boshqa qatnovchilardan ustunlik kutadi"), "/demo/lessons/road-signs.svg"),
    CategorySeed("Ogohlantiruvchi belgilar", "Yo'l belgilari", ("Keskin burilish oldidan ogohlantiruvchi belgi ko'rindi", "Sirpanchiq yo'l haqidagi belgi yomg'irli havoda chiqdi", "Piyodalar ko'p o'tadigan hududga yaqinlashdingiz", "Yo'lda notekislik haqida ogohlantirish belgisi turibdi", "Temiryo'l kesishmasi yaqinida ogohlantiruvchi belgi paydo bo'ldi"), ("qaysi tayyorgarlik eng to'g'ri bo'ladi", "haydovchi nimani oldindan baholashi kerak", "qanday harakat xavfni kamaytiradi", "qaysi qaror amaliyotda eng maqbul"), "Ko'rinish va xavf manbaiga qarab tezlikni pasaytirib, nazoratni kuchaytiradi", ("Belgini eslab qolib, lekin harakatni o'zgartirmasdan davom etadi", "Faqat oldindagi mashina reaksiyasiga qarab qaror qiladi", "Yo'l bo'sh bo'lsa xavf haqida o'ylamasdan tezlikni ushlab qoladi"), "/demo/lessons/road-signs.svg"),
    CategorySeed("Chorrahalar", "Chorrahalar", ("Svetofor ishlamay qolgan chorrahaga yaqinlashdingiz", "Teng huquqli ikki ko'cha kesishmasida navbatga keldingiz", "Tirbandlik ichidagi chorrahada chapga burilmoqchisiz", "Qorong'i paytda piyodalar yo'lagi yaqinidagi chorrahaga yetdingiz", "Aylana chorrahaga kirishdan oldin oqim zichlashdi"), ("ustuvorlikni aniqlash uchun nima qilish kerak", "eng xavfsiz qaror qaysi bo'ladi", "imtihonda to'g'ri baholanadigan yondashuv qaysi", "konfliktni oldini oladigan harakat qaysi"), "Belgilar, o'ng tomondagi transport va piyodalarni to'liq kuzatib, bo'sh oraliqda kiradi", ("Faqat chap tomonga qarab chorrahaga tez kiradi", "Signal bilan boshqa mashinalarni to'xtatishga urinadi", "Birinchi bo'lib kirgan yutadi deb hisoblab tezlikni oshiradi"), "/demo/lessons/intersection.svg"),
    CategorySeed("Ustuvorlik", "Chorrahalar", ("Asosiy yo'l belgisi va yon ko'cha bir joyda kesishmoqda", "Siz burilayotgan yo'lda piyoda va velosiped yo'lagi kesishmoqda", "Tashqi halqa yo'lidan ichki ko'chaga o'tish kerak bo'ldi", "Qarama-qarshi oqim chapga burilayotgan paytda siz ham chorrahadasiz", "Avtobus bekati oldidagi tor kesishmada ustunlik masalasi tug'ildi"), ("birinchi navbat kimga beriladi", "to'g'ri navbatni aniqlash uchun nimaga qaraladi", "xavfsiz o'tishning asosi qaysi", "qaysi qaror ustuvorlik qoidalariga mos"), "Asosiy yo'l va himoyasiz qatnashchilarni inobatga olib, ustuvor transportni o'tkazadi", ("Faqat o'z yo'nalishi qulay bo'lsa darhol harakat qiladi", "Signal chalib ustuvorlikni o'zi belgilaydi", "Qarama-qarshi oqim to'xtashini taxmin qilib oldinga chiqadi"), "/demo/lessons/intersection.svg"),
    CategorySeed("Yo'l chiziqlari", "Yo'l chiziqlari", ("Uzluksiz chiziq bilan ajratilgan ikki yo'nalishli yo'ldasiz", "To'xtash chizig'i oldida svetofor sariqga almashdi", "Ko'p qatorli yo'lda yo'naltiruvchi strelkalar chizilgan", "Qor aralash tongda chiziqlar qisman ko'rinib turibdi", "Aylana yo'lga kirishda qator chiziqlari zichlashdi"), ("qaysi harakat chiziq talabi bilan mos", "to'g'ri tayyorgarlik qaysi bo'ladi", "yo'l belgilanishini to'g'ri o'qish uchun nima zarur", "imtihonda xato hisoblanmaydigan qaror qaysi"), "Chiziqlarni oldindan o'qib, qatorni keskin emas, bosqichma-bosqich moslashtiradi", ("Yo'l bo'sh ko'rinsa uzluksiz chiziqni kesib o'tadi", "Faqat yon oynaga qarab qatorni birdan o'zgartiradi", "Chiziqni faqat kechasi ahamiyatli deb hisoblaydi"), "/demo/lessons/parking.svg"),
    CategorySeed("Manevr va burilish", "Transport boshqaruvi", ("Tor ko'chada orqaga yurib chiqish kerak bo'ldi", "Chapga burilish uchun o'rta qatordan tayyorgarlik ko'ryapsiz", "Tirkama yo'lakdan asosiy yo'lga qo'shilishingiz kerak", "Aylana oldidan qatordan chiqib ketmasdan manevr qilmoqchisiz", "Qator almashtirish uchun o'ng tomondagi bo'shliqni kutyapsiz"), ("eng to'g'ri manevr qaysi", "xavfsiz burilish qanday boshlanadi", "imtihonda maqbul baholanadigan yondashuv qaysi", "qaysi harakat boshqa qatnashchilar uchun tushunarli"), "Signalni oldindan yoqib, oyna va ko'r joyni tekshirib, silliq manevr bajaradi", ("Oldin burilib, keyin signal berishni afzal ko'radi", "Faqat orqa oynaga qarab tez manevr qiladi", "Bo'shliqni ko'rishi bilan keskin rul buradi"), "/demo/lessons/parking.svg"),
    CategorySeed("Parkovka", "Transport boshqaruvi", ("Parallel parkovka uchun tor joy bo'shadi", "Orqaga kirib turiladigan joyga yaqinlashdingiz", "Savdo markazi yonida diagonal parkovka chiziqlari chizilgan", "Yomg'irli kunda chekka yo'lakda to'xtash kerak bo'ldi", "Pastga qiyalikdagi ko'chada mashinani qoldirmoqchisiz"), ("qaysi ketma-ketlik to'g'ri", "eng xavfsiz parkovka qarori qaysi", "imtihonda xato bo'lmaydigan yondashuv qaysi", "qanday tayyorgarlik to'qnashuv xavfini kamaytiradi"), "Joy o'lchamini baholab, signal bilan sekin kirib, yakunda mashinani to'liq nazorat ostida to'xtatadi", ("Bo'sh joyni ko'rishi bilan tezlikni saqlab kiradi", "Faqat old oynaga qarab orqaga yuradi", "Masofa kam bo'lsa ham rulni keskin burib joyga tiqadi"), "/demo/lessons/parking.svg"),
    CategorySeed("Xavfsiz haydash", "Yo'l xavfsizligi", ("Yomg'irli kunda magistralda harakatlanyapsiz", "Tun payti qarama-qarshi chiroqlar ko'zni qamashtirdi", "Oldingi mashina keskin tormoz berdi", "Tuman tushgan yo'lda ko'rinish keskin kamaydi", "Piyodalar ko'p bo'lgan tor ko'chadan o'tyapsiz"), ("xavfsiz qaror qaysi bo'ladi", "masofani boshqarish uchun nima to'g'ri", "nazoratni saqlashning eng yaxshi usuli qaysi", "imtihon mezoniga mos harakat qaysi"), "Ko'rinish va sirpanish xavfiga mos tezlikni pasaytirib, xavfsiz masofani oshiradi", ("Faqat oldingi mashina tezligiga moslashib ketadi", "Yo'l bo'sh bo'lsa tormoz masofasini hisobga olmaydi", "Qulay ko'rinsa tezlikni vaqtincha oshirib oladi"), "/demo/lessons/safety.svg"),
    CategorySeed("Tezlik rejimi", "Yo'l xavfsizligi", ("60 km/soat cheklovli hududga endi kirdingiz", "Aholi yashash punktidan chiqish oldida oqim tezlashdi", "Yomg'irli trassada tezlikni qayta baholash kerak bo'ldi", "Maktab oldi hududidan o'tayotgan payt chiziqlar paydo bo'ldi", "Qorli tongda ko'prik ustiga chiqdingiz"), ("tezlikni tanlashda qaysi tamoyil to'g'ri", "qanday qaror xavfsizlikni oshiradi", "imtihonda to'g'ri yondashuv qaysi", "cheklov va real sharoit o'rtasida nima ustun turadi"), "Belgilangan limitni va real ko'rinishni birga hisobga olib, xavfsiz tezlikni tanlaydi", ("Faqat mashina quvvatiga qarab limitdan oshadi", "Oldingi mashina ketgan tezlikni ko'r-ko'rona takrorlaydi", "Yo'l bo'sh ko'rinsa limitni vaqtincha bekor deb hisoblaydi"), "/demo/lessons/safety.svg"),
    CategorySeed("Favqulodda vaziyat", "Yo'l xavfsizligi", ("Shina bosimi pasayganini harakat vaqtida sezdingiz", "Oldinda to'siq paydo bo'lib, qochish manevri kerak bo'ldi", "Yo'l chetida avariya sodir bo'lgan joyga yaqinlashdingiz", "Tormoz masofasi uzayganini yomg'irda his qildingiz", "Qarama-qarshi yo'ldan boshqaruvni yo'qotgan mashina chiqib keldi"), ("eng xavfsiz javob qaysi bo'ladi", "birinchi navbatda nima qilish kerak", "qaysi qaror oqibatni kamaytiradi", "imtihon nuqtai nazaridan to'g'ri harakat qaysi"), "Vaziyatni baholab, tezlikni tushiradi, xavf signalini yoqadi va xavfsiz chiqish yo'lini tanlaydi", ("Bir lahzada keskin rul burib, keyin vaziyatni o'ylaydi", "Faqat signal chalib to'siq o'zi chekinishini kutadi", "Tezlikni ushlab qolib, vaziyat o'zgarishini kutadi"), "/demo/lessons/safety.svg"),
    CategorySeed("Yo'l harakati qoidalari", "Yo'l harakati qoidalari", ("Inspektor ishorasi bilan svetofor ko'rsatmasi farq qilayotgan vaziyatga keldingiz", "Piyodalar yo'lagi oldida transport va piyoda oqimi kesishdi", "Aholi yashash punktida to'xtash va turish qoidasi masalasi chiqdi", "Velosipedchi va avtomobil bir yo'lakda harakatlanayotgan uchastkadasiz", "Avtobus yo'lagi belgilangan ko'chada burilishga tayyorlanyapsiz"), ("qaysi qoida ustun bo'ladi", "to'g'ri huquqiy qaror qaysi bo'ladi", "imtihonda to'g'ri javob sifatida qaysi holat tanlanadi", "xato bo'lmaydigan yondashuv qaysi"), "Qoidalar ierarxiyasini saqlab, ishora, belgi va yo'l belgilanishini to'g'ri tartibda qo'llaydi", ("Faqat odatdagi oqimga qarab qoidani o'zi talqin qiladi", "Boshqalar qilayotgan harakatni avtomatik takrorlaydi", "Noaniq vaziyatda tezroq o'tishni asosiy maqsad deb oladi"), "/demo/lessons/safety.svg"),
)

BANK_TESTS: tuple[TestSeed, ...] = tuple([TestSeed(key=f"category:{seed.name}", title=f"{seed.name} - amaliy test", description=f"{seed.name} bo'yicha 20 ta real imtihon uslubidagi savol.", difficulty="medium" if seed.name not in {"Yo'l belgilari", "Parkovka"} else "easy", duration=25, is_premium=False, categories=(seed.name,), question_count=20) for seed in CATEGORY_SEEDS] + [TestSeed(key="mixed:city", title="Shahar sharoitlari challenge", description="Ko'p mavzuni birlashtirgan, oqim va manevrga urg'u beruvchi 20 savollik challenge.", difficulty="hard", duration=30, is_premium=True, categories=("Chorrahalar", "Ustuvorlik", "Manevr va burilish", "Parkovka", "Yo'l chiziqlari"), question_count=20), TestSeed(key="mixed:final", title="Yakuniy aralash imtihon", description="Barcha asosiy mavzularni qamrab olgan 40 savollik yakuniy tayyorgarlik testi.", difficulty="medium", duration=40, is_premium=True, categories=tuple(seed.name for seed in CATEGORY_SEEDS), question_count=40)])

SPECIAL_TESTS: tuple[TestSeed, ...] = (
    TestSeed("special:adaptive", "Adaptive Practice Mode", "Adaptiv qiyinchilik bilan practice sessiya.", "Adaptive", 30, True, tuple(), 0),
    TestSeed("special:learning", "Learning Path Session", "Zaif mavzular uchun learning sprint sessiyasi.", "Learning", 20, False, tuple(), 0),
    TestSeed("special:simulation", "Exam Simulation", "40 savollik simulyatsiya imtihoni.", "Simulation", 40, True, tuple(), 0),
)

ATTEMPT_TEMPLATES: dict[str, tuple[AttemptTemplate, ...]] = {
    "beginner": (AttemptTemplate("standard", "weak_1", 20, 0.48), AttemptTemplate("standard", "strong_1", 20, 0.55), AttemptTemplate("learning", "weak_pair", 12, 0.62), AttemptTemplate("standard", "weak_2", 20, 0.60), AttemptTemplate("adaptive", "mixed", 20, 0.66, True), AttemptTemplate("simulation", "simulation", 40, 0.58, True)),
    "intermediate": (AttemptTemplate("standard", "weak_1", 20, 0.59), AttemptTemplate("standard", "strong_1", 20, 0.66), AttemptTemplate("learning", "weak_pair", 12, 0.72), AttemptTemplate("standard", "mixed", 20, 0.69), AttemptTemplate("adaptive", "mixed", 20, 0.75, True), AttemptTemplate("standard", "weak_2", 20, 0.78), AttemptTemplate("simulation", "simulation", 40, 0.71, True), AttemptTemplate("standard", "final", 20, 0.82)),
    "advanced": (AttemptTemplate("standard", "strong_1", 20, 0.75), AttemptTemplate("standard", "weak_1", 20, 0.78), AttemptTemplate("learning", "weak_pair", 12, 0.83), AttemptTemplate("adaptive", "mixed", 20, 0.86, True), AttemptTemplate("standard", "mixed", 20, 0.88), AttemptTemplate("standard", "strong_2", 20, 0.90), AttemptTemplate("simulation", "simulation", 40, 0.83, True), AttemptTemplate("adaptive", "mixed", 20, 0.91, True), AttemptTemplate("standard", "final", 20, 0.93), AttemptTemplate("standard", "challenge", 20, 0.95, True)),
}


def stable_uuid(*parts: object) -> UUID:
    return uuid5(SEED_NAMESPACE, "::".join(str(part) for part in (SEED_VERSION, *parts)))


def utcnow() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def stable_percent(*parts: object) -> int:
    return stable_uuid("percent", *parts).int % 100


def slugify(value: str) -> str:
    lowered = value.lower().replace("'", "").replace("`", "")
    lowered = re.sub(r"[^a-z0-9]+", "-", lowered)
    return lowered.strip("-")


def build_lesson_specs() -> list[tuple[str, str, str, bool]]:
    canonical_topics = list(CANONICAL_LEARNING_TOPIC_LABELS)
    specs: list[tuple[str, str, str, bool]] = []
    for index, _content_url in enumerate(LESSON_MARKDOWN_PATHS[:24]):
        topic = canonical_topics[index % len(canonical_topics)]
        section = "Asosiy tushunchalar" if index % 3 == 0 else "Amaliy vaziyatlar" if index % 3 == 1 else "Qayta ko'rish checklisti"
        title = f"{topic}: {section} {1 + (index // len(canonical_topics))}"
        specs.append((title, topic, section, index % 5 == 0))
    return specs


def category_seed_by_name(name: str) -> CategorySeed:
    for seed in CATEGORY_SEEDS:
        if seed.name == name:
            return seed
    raise KeyError(name)


async def execute_no_autoflush(session: AsyncSession, statement):
    with session.no_autoflush:
        return await session.execute(statement)


async def get_no_autoflush(session: AsyncSession, model, ident):
    with session.no_autoflush:
        return await session.get(model, ident)


async def ensure_roles(session: AsyncSession, summary: Counter) -> dict[str, Role]:
    role_names = [role_name for role_name, _description in ROLE_DEFINITIONS]
    existing_roles = (
        await execute_no_autoflush(session, select(Role).where(Role.name.in_(role_names)))
    ).scalars().all()
    existing_by_name = {role.name: role for role in existing_roles}

    missing_roles = [
        {"id": stable_uuid("role", role_name), "name": role_name, "description": description}
        for role_name, description in ROLE_DEFINITIONS
        if role_name not in existing_by_name
    ]
    if missing_roles:
        inserted_roles = (
            await execute_no_autoflush(
                session,
                pg_insert(Role)
                .values(missing_roles)
                .on_conflict_do_nothing(index_elements=[Role.name])
                .returning(Role.name),
            )
        ).scalars().all()
        summary["roles"] += len(inserted_roles)

    role_rows = (
        await execute_no_autoflush(session, select(Role).where(Role.name.in_(role_names)))
    ).scalars().all()
    role_map = {role.name: role for role in role_rows}
    missing_role_names = sorted(set(role_names) - set(role_map))
    if missing_role_names:
        raise RuntimeError(f"Failed to ensure roles: {', '.join(missing_role_names)}")
    return role_map


async def ensure_permissions(session: AsyncSession, summary: Counter) -> dict[str, Permission]:
    permission_names = sorted({permission_name for permissions in DEFAULT_ROLE_PERMISSIONS.values() for permission_name in permissions})
    existing_permissions = (
        await execute_no_autoflush(session, select(Permission).where(Permission.name.in_(permission_names)))
    ).scalars().all()
    existing_by_name = {permission.name: permission for permission in existing_permissions}

    missing_permissions = [
        {
            "id": stable_uuid("permission", permission_name),
            "name": permission_name,
            "description": PERMISSION_DESCRIPTIONS.get(permission_name, f"Seeded permission {permission_name}"),
        }
        for permission_name in permission_names
        if permission_name not in existing_by_name
    ]
    if missing_permissions:
        inserted_permissions = (
            await execute_no_autoflush(
                session,
                pg_insert(Permission)
                .values(missing_permissions)
                .on_conflict_do_nothing(index_elements=[Permission.name])
                .returning(Permission.name),
            )
        ).scalars().all()
        summary["permissions"] += len(inserted_permissions)

    permission_rows = (
        await execute_no_autoflush(session, select(Permission).where(Permission.name.in_(permission_names)))
    ).scalars().all()
    permission_map = {permission.name: permission for permission in permission_rows}
    missing_permission_names = sorted(set(permission_names) - set(permission_map))
    if missing_permission_names:
        raise RuntimeError(f"Failed to ensure permissions: {', '.join(missing_permission_names)}")
    return permission_map


async def ensure_role_permissions(
    session: AsyncSession,
    roles: dict[str, Role],
    permissions: dict[str, Permission],
    summary: Counter,
) -> None:
    mappings = [
        {"role_id": roles[role_name].id, "permission_id": permissions[permission_name].id}
        for role_name, permission_names in DEFAULT_ROLE_PERMISSIONS.items()
        for permission_name in permission_names
    ]
    if not mappings:
        return

    inserted_mappings = (
        await execute_no_autoflush(
            session,
            pg_insert(RolePermission)
            .values(mappings)
            .on_conflict_do_nothing(index_elements=[RolePermission.role_id, RolePermission.permission_id])
            .returning(RolePermission.role_id, RolePermission.permission_id),
        )
    ).all()
    summary["role_permissions"] += len(inserted_mappings)


async def ensure_users(session: AsyncSession, summary: Counter) -> tuple[dict[str, User], dict[str, UserSeed]]:
    hashed_password = get_password_hash(SEED_PASSWORD)
    users: dict[str, User] = {}
    user_seed_map = {seed.email: seed for seed in USER_SEEDS}
    now_utc = utcnow()

    for index, seed in enumerate(USER_SEEDS):
        user_id = stable_uuid("user", seed.email)
        user = await session.get(User, user_id)
        if user is None:
            user = User(
                id=user_id,
                email=seed.email,
                hashed_password=hashed_password,
                full_name=seed.full_name,
                is_active=True,
                is_verified=True,
                is_admin=seed.is_admin,
                created_at=now_utc - timedelta(days=120 - (index * 2)),
            )
            session.add(user)
            summary["users"] += 1
        users[seed.email] = user

    await session.flush()

    for seed in USER_SEEDS:
        user = users[seed.email]
        sub_result = await session.execute(select(Subscription).where(Subscription.user_id == user.id))
        subscription = sub_result.scalar_one_or_none()
        if subscription is None:
            session.add(
                Subscription(
                    id=stable_uuid("subscription", user.id),
                    user_id=user.id,
                    plan="premium" if seed.premium else "free",
                    status="active" if seed.premium else "inactive",
                    provider="seed",
                    provider_subscription_id=f"seed-{slugify(seed.full_name)}" if seed.premium else None,
                    starts_at=now_utc - timedelta(days=35),
                    expires_at=now_utc + timedelta(days=330),
                    cancel_at_period_end=False,
                    created_at=now_utc - timedelta(days=35),
                    updated_at=now_utc - timedelta(days=1),
                )
            )
            summary["subscriptions"] += 1

    return users, user_seed_map


async def ensure_student_roles(session: AsyncSession, users: dict[str, User], roles: dict[str, Role], summary: Counter) -> None:
    created_at = utcnow() - timedelta(days=100)
    for user in users.values():
        exists = await execute_no_autoflush(session, select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == roles[STUDENT_ROLE].id, UserRole.school_id.is_(None)))
        if exists.scalar_one_or_none() is None:
            session.add(UserRole(id=stable_uuid("user-role", user.id, roles[STUDENT_ROLE].id, "global"), user_id=user.id, role_id=roles[STUDENT_ROLE].id, school_id=None, created_at=created_at))
            summary["user_roles"] += 1

    admin_seed = next(seed for seed in USER_SEEDS if seed.is_admin)
    admin_user = users[admin_seed.email]
    exists = await execute_no_autoflush(session, select(UserRole).where(UserRole.user_id == admin_user.id, UserRole.role_id == roles[SUPER_ADMIN_ROLE].id, UserRole.school_id.is_(None)))
    if exists.scalar_one_or_none() is None:
        session.add(UserRole(id=stable_uuid("user-role", admin_user.id, roles[SUPER_ADMIN_ROLE].id, "global"), user_id=admin_user.id, role_id=roles[SUPER_ADMIN_ROLE].id, school_id=None, created_at=utcnow() - timedelta(days=95)))
        summary["user_roles"] += 1


async def ensure_schools(session: AsyncSession, users: dict[str, User], roles: dict[str, Role], summary: Counter) -> dict[str, DrivingSchool]:
    schools: dict[str, DrivingSchool] = {}
    now_utc = utcnow()
    for index, seed in enumerate(SCHOOL_SEEDS):
        school_id = stable_uuid("school", seed.slug)
        school = await get_no_autoflush(session, DrivingSchool, school_id)
        if school is None:
            school = DrivingSchool(id=school_id, slug=seed.slug, name=seed.name, short_description=seed.short_description, full_description=seed.full_description, city=seed.city, region=seed.region, address=seed.address, landmark=seed.landmark, phone=seed.phone, telegram=seed.telegram, website=seed.website, work_hours=seed.work_hours, license_info=seed.license_info, years_active=seed.years_active, logo_url=seed.logo_url, map_embed_url=f"https://maps.google.com/maps?q={slugify(seed.city)}&z=13&output=embed", referral_code=seed.referral_code, owner_user_id=users[seed.owner_email].id, is_active=True, created_at=now_utc - timedelta(days=90 - (index * 5)), updated_at=now_utc - timedelta(days=2))
            session.add(school)
            summary["driving_schools"] += 1
        schools[seed.slug] = school

    await session.flush()

    for seed in SCHOOL_SEEDS:
        school = schools[seed.slug]
        for order, (category_code, duration_weeks, price_cents, installment_available) in enumerate(seed.course_rows):
            course_id = stable_uuid("school-course", school.id, category_code)
            course = await get_no_autoflush(session, DrivingSchoolCourse, course_id)
            if course is None:
                session.add(DrivingSchoolCourse(id=course_id, school_id=school.id, category_code=category_code, duration_weeks=duration_weeks, price_cents=price_cents, currency="UZS", installment_available=installment_available, description=f"{category_code} toifasi uchun {duration_weeks} haftalik amaliy va nazariy tayyorlov.", is_active=True, sort_order=order, created_at=now_utc - timedelta(days=30 - order), updated_at=now_utc - timedelta(days=3)))
                summary["driving_school_courses"] += 1

        for order, media_url in enumerate(SCHOOL_GALLERY):
            media_id = stable_uuid("school-media", school.id, order)
            media = await get_no_autoflush(session, DrivingSchoolMedia, media_id)
            if media is None:
                session.add(DrivingSchoolMedia(id=media_id, school_id=school.id, media_type="image", url=media_url, caption=f"{school.name} muhitidan lavha {order + 1}", sort_order=order, is_active=True, created_at=now_utc - timedelta(days=14 - order), updated_at=now_utc - timedelta(days=2)))
                summary["driving_school_media"] += 1

        owner = users[seed.owner_email]
        membership_exists = await execute_no_autoflush(session, select(SchoolMembership).where(SchoolMembership.user_id == owner.id, SchoolMembership.school_id == school.id, SchoolMembership.role_id == roles[SCHOOL_ADMIN_ROLE].id))
        if membership_exists.scalar_one_or_none() is None:
            session.add(SchoolMembership(id=stable_uuid("school-membership", school.id, owner.id, SCHOOL_ADMIN_ROLE), user_id=owner.id, school_id=school.id, role_id=roles[SCHOOL_ADMIN_ROLE].id, joined_at=now_utc - timedelta(days=70)))
            summary["school_memberships"] += 1

        user_role_exists = await execute_no_autoflush(session, select(UserRole).where(UserRole.user_id == owner.id, UserRole.role_id == roles[SCHOOL_ADMIN_ROLE].id, UserRole.school_id == school.id))
        if user_role_exists.scalar_one_or_none() is None:
            session.add(UserRole(id=stable_uuid("user-role", owner.id, roles[SCHOOL_ADMIN_ROLE].id, school.id), user_id=owner.id, role_id=roles[SCHOOL_ADMIN_ROLE].id, school_id=school.id, created_at=now_utc - timedelta(days=70)))
            summary["user_roles"] += 1

    return schools


async def ensure_instructors(session: AsyncSession, users: dict[str, User], schools: dict[str, DrivingSchool], roles: dict[str, Role], summary: Counter) -> dict[str, DrivingInstructor]:
    instructors: dict[str, DrivingInstructor] = {}
    now_utc = utcnow()
    settings_row = await get_no_autoflush(session, DrivingInstructorRegistrationSetting, 1)
    if settings_row is None:
        session.add(DrivingInstructorRegistrationSetting(id=1, is_paid_enabled=True, price_cents=2_500_000, currency="UZS", validity_days=45, discount_percent=20, campaign_title="Bahorgi onboarding paketi", campaign_description="Yangi instruktorlar uchun 45 kunlik reklama va profil paket.", free_banner_enabled=True, countdown_enabled=False, created_at=now_utc - timedelta(days=20), updated_at=now_utc - timedelta(days=2)))
        summary["driving_instructor_registration_settings"] += 1

    for index, seed in enumerate(INSTRUCTOR_SEEDS):
        instructor_id = stable_uuid("instructor", seed.slug)
        linked_user_id = users[seed.user_email].id if seed.user_email else None
        school = schools[seed.school_slug]
        instructor = await get_no_autoflush(session, DrivingInstructor, instructor_id)
        if instructor is None:
            instructor = DrivingInstructor(id=instructor_id, user_id=linked_user_id, slug=seed.slug, full_name=seed.full_name, gender=seed.gender, years_experience=seed.years_experience, short_bio=seed.short_bio, teaching_style=f"{seed.teaching_style} {school.name} bilan hamkor marshrutlardan foydalanadi.", city=seed.city, region=seed.region, service_areas=seed.service_areas, transmission=seed.transmission, car_model=seed.car_model, car_year=seed.car_year, car_features=seed.car_features, hourly_price_cents=seed.hourly_price_cents, currency="UZS", min_lesson_minutes=seed.min_lesson_minutes, special_services=seed.special_services, phone=seed.phone, telegram=seed.telegram, profile_image_url=INSTRUCTOR_PROFILES[index % len(INSTRUCTOR_PROFILES)], map_embed_url=f"https://maps.google.com/maps?q={slugify(seed.city)}&z=12&output=embed", referral_code=seed.referral_code, is_verified=True, is_active=True, is_blocked=False, is_top_rated=seed.is_top_rated, view_count=35 + (index * 7), created_at=now_utc - timedelta(days=60 - index), updated_at=now_utc - timedelta(days=1), approved_at=now_utc - timedelta(days=58 - index))
            session.add(instructor)
            summary["driving_instructors"] += 1
        instructors[seed.slug] = instructor

    await session.flush()

    for index, seed in enumerate(INSTRUCTOR_SEEDS):
        instructor = instructors[seed.slug]
        school = schools[seed.school_slug]
        for order, media_url in enumerate(INSTRUCTOR_GALLERY):
            media_id = stable_uuid("instructor-media", instructor.id, order)
            media = await get_no_autoflush(session, DrivingInstructorMedia, media_id)
            if media is None:
                session.add(DrivingInstructorMedia(id=media_id, instructor_id=instructor.id, media_type="image", url=media_url, caption=f"{seed.full_name} mashg'ulotidan lavha {order + 1}", sort_order=order, is_active=True, created_at=utcnow() - timedelta(days=10 - order), updated_at=utcnow() - timedelta(days=1)))
                summary["driving_instructor_media"] += 1

        if seed.user_email is not None:
            linked_user = users[seed.user_email]
            membership_exists = await execute_no_autoflush(session, select(SchoolMembership).where(SchoolMembership.user_id == linked_user.id, SchoolMembership.school_id == school.id, SchoolMembership.role_id == roles[INSTRUCTOR_ROLE].id))
            if membership_exists.scalar_one_or_none() is None:
                session.add(SchoolMembership(id=stable_uuid("school-membership", school.id, linked_user.id, INSTRUCTOR_ROLE), user_id=linked_user.id, school_id=school.id, role_id=roles[INSTRUCTOR_ROLE].id, joined_at=utcnow() - timedelta(days=45 - index)))
                summary["school_memberships"] += 1

            user_role_exists = await execute_no_autoflush(session, select(UserRole).where(UserRole.user_id == linked_user.id, UserRole.role_id == roles[INSTRUCTOR_ROLE].id, UserRole.school_id == school.id))
            if user_role_exists.scalar_one_or_none() is None:
                session.add(UserRole(id=stable_uuid("user-role", linked_user.id, roles[INSTRUCTOR_ROLE].id, school.id), user_id=linked_user.id, role_id=roles[INSTRUCTOR_ROLE].id, school_id=school.id, created_at=utcnow() - timedelta(days=45 - index)))
                summary["user_roles"] += 1

    return instructors


async def ensure_lessons(session: AsyncSession, summary: Counter) -> None:
    now_utc = utcnow()
    for index, (title, topic, section, is_premium) in enumerate(build_lesson_specs()):
        lesson_id = stable_uuid("lesson", title)
        lesson = await session.get(Lesson, lesson_id)
        if lesson is None:
            session.add(Lesson(id=lesson_id, title=title, description=f"{topic} bo'yicha qisqa, amaliy va imtihon yo'naltirilgan kontent bloki.", content_type="markdown", content_url=LESSON_MARKDOWN_PATHS[index], thumbnail_url=LESSON_THUMBNAILS.get(topic, "/demo/lessons/safety.svg"), topic=topic, section=section, is_active=True, is_premium=is_premium, sort_order=index, created_at=now_utc - timedelta(days=20 - (index % 7)), updated_at=now_utc - timedelta(days=index % 5)))
            summary["lessons"] += 1


async def ensure_question_bank(session: AsyncSession, summary: Counter) -> tuple[dict[str, Test], dict[str, QuestionCategory]]:
    tests: dict[str, Test] = {}
    categories: dict[str, QuestionCategory] = {}
    now_utc = utcnow()

    for seed in CATEGORY_SEEDS:
        category_id = stable_uuid("question-category", seed.name)
        category = await session.get(QuestionCategory, category_id)
        if category is None:
            category = QuestionCategory(id=category_id, name=seed.name, description=f"{seed.canonical_topic} bo'yicha amaliy savollar guruhi.", is_active=True, created_at=now_utc - timedelta(days=60), updated_at=now_utc - timedelta(days=1))
            session.add(category)
            summary["question_categories"] += 1
        categories[seed.name] = category

    await session.flush()

    for test_seed in (*BANK_TESTS, *SPECIAL_TESTS):
        test_id = stable_uuid("test", test_seed.key)
        test = await session.get(Test, test_id)
        if test is None:
            test = Test(id=test_id, title=test_seed.title, description=test_seed.description, difficulty=test_seed.difficulty, is_active=True, is_premium=test_seed.is_premium, duration=test_seed.duration, created_at=now_utc - timedelta(days=50))
            session.add(test)
            summary["tests"] += 1
        tests[test_seed.key] = test

    await session.flush()

    difficulty_cycle = (("easy", 78), ("medium", 61), ("medium", 56), ("hard", 39), ("hard", 33))
    for test_seed in BANK_TESTS:
        test = tests[test_seed.key]
        for index in range(test_seed.question_count):
            category_name = test_seed.categories[index % len(test_seed.categories)]
            category_seed = category_seed_by_name(category_name)
            difficulty, difficulty_percent = difficulty_cycle[index % len(difficulty_cycle)]
            question_id = stable_uuid("question", test_seed.key, index)
            question = await session.get(Question, question_id)
            if question is None:
                context = category_seed.contexts[index % len(category_seed.contexts)]
                prompt = category_seed.prompts[(index // len(category_seed.contexts)) % len(category_seed.prompts)]
                prefix = "Yakuniy holat" if test_seed.key == "mixed:final" else "Shahar holati" if test_seed.key == "mixed:city" else category_seed.name
                question = Question(id=question_id, test_id=test.id, category_id=categories[category_name].id, text=f"{prefix} {index + 1}: {context}. {prompt.capitalize()}?", image_url=category_seed.asset if index % 5 == 0 else None, media_type="image" if index % 5 == 0 else "text", topic=category_seed.canonical_topic, category=category_seed.name, difficulty=difficulty, difficulty_percent=difficulty_percent, total_attempts=0, total_correct=0, dynamic_difficulty_score=0.5, created_at=now_utc - timedelta(days=35 - (index % 12)))
                session.add(question)
                summary["questions"] += 1

            correct_index = (index + len(category_seed.name)) % 4
            option_texts = list(category_seed.wrong_options)
            option_texts.insert(correct_index, category_seed.correct_option)
            for option_index, option_text in enumerate(option_texts):
                option_id = stable_uuid("answer-option", question_id, option_index)
                option = await session.get(AnswerOption, option_id)
                if option is None:
                    session.add(AnswerOption(id=option_id, question_id=question_id, text=option_text, is_correct=option_index == correct_index))
                    summary["answer_options"] += 1

    return tests, categories


async def load_questions_by_test(session: AsyncSession) -> dict[str, list[Question]]:
    test_rows = (await session.execute(select(Test).where(Test.id.in_([stable_uuid("test", seed.key) for seed in (*BANK_TESTS, *SPECIAL_TESTS)])).options(selectinload(Test.questions).selectinload(Question.answer_options)))).scalars().all()
    return {test.title: sorted(list(test.questions), key=lambda question: question.text) for test in test_rows}


def attempt_day_offsets(level: str) -> list[int]:
    if level == "advanced":
        return [45, 40, 35, 29, 24, 18, 12, 8, 4, 1]
    if level == "intermediate":
        return [40, 34, 28, 22, 17, 12, 6, 2]
    return [28, 23, 18, 13, 7, 2]


def profile_offset(user_seed: UserSeed) -> float:
    return ((stable_percent(user_seed.email, "offset") % 9) - 4) / 100.0


def attempt_test_title(user_seed: UserSeed, template: AttemptTemplate) -> str:
    if template.mode == "learning":
        return "Learning Path Session"
    if template.mode == "adaptive":
        return "Adaptive Practice Mode"
    if template.mode == "simulation":
        return "Exam Simulation"
    if template.source == "weak_1":
        return f"{user_seed.weak_topics[0]} - amaliy test"
    if template.source == "weak_2":
        return f"{user_seed.weak_topics[1]} - amaliy test"
    if template.source == "strong_1":
        return f"{user_seed.strong_topics[0]} - amaliy test"
    if template.source == "strong_2":
        return f"{user_seed.strong_topics[1]} - amaliy test"
    if template.source == "challenge":
        return "Shahar sharoitlari challenge"
    return "Yakuniy aralash imtihon"


def select_attempt_questions(user_seed: UserSeed, template: AttemptTemplate, questions_by_test: dict[str, list[Question]], questions_by_category: dict[str, list[Question]], attempt_index: int) -> list[Question]:
    if template.mode == "learning":
        first = questions_by_category[user_seed.weak_topics[0]][: template.question_count // 2]
        second = questions_by_category[user_seed.weak_topics[1]][: template.question_count - len(first)]
        return list(first + second)
    if template.mode == "simulation":
        return list(questions_by_test["Yakuniy aralash imtihon"][: template.question_count])
    if template.source == "weak_1":
        return list(questions_by_category[user_seed.weak_topics[0]][: template.question_count])
    if template.source == "weak_2":
        return list(questions_by_category[user_seed.weak_topics[1]][: template.question_count])
    if template.source == "strong_1":
        return list(questions_by_category[user_seed.strong_topics[0]][: template.question_count])
    if template.source == "strong_2":
        return list(questions_by_category[user_seed.strong_topics[1]][: template.question_count])
    if template.source == "challenge":
        return list(questions_by_test["Shahar sharoitlari challenge"][: template.question_count])
    mixed_questions = questions_by_test["Yakuniy aralash imtihon"]
    rotate = stable_percent(user_seed.email, attempt_index, "mix") % max(1, len(mixed_questions))
    return list((mixed_questions[rotate:] + mixed_questions[:rotate])[: template.question_count])


def accuracy_target(user_seed: UserSeed, template: AttemptTemplate, attempt_index: int) -> float:
    progress_boost = min(0.05, attempt_index * 0.004)
    offset = profile_offset(user_seed)
    pressure_penalty = 0.04 if template.pressure_mode else 0.0
    return clamp(template.target_accuracy + progress_boost + offset - pressure_penalty, 0.40, 0.95)


def response_time_profile(user_seed: UserSeed, attempt_index: int, pressure_mode: bool) -> tuple[float, float]:
    if user_seed.level == "advanced":
        avg = 19.0 + max(0, 6 - attempt_index) * 1.3
        variance = 18.0 + max(0, 5 - attempt_index) * 3.0
    elif user_seed.level == "intermediate":
        avg = 24.0 + max(0, 6 - attempt_index) * 1.8
        variance = 24.0 + max(0, 6 - attempt_index) * 4.0
    else:
        avg = 29.0 + max(0, 5 - attempt_index) * 2.3
        variance = 30.0 + max(0, 5 - attempt_index) * 5.0
    if pressure_mode:
        avg += 2.5
        variance += 12.0
    return round(avg, 2), round(variance, 2)


def wrong_bias(user_seed: UserSeed, question: Question, attempt_index: int) -> float:
    bias = 0.0
    category = question.category or ""
    topic = question.topic or ""
    if category in user_seed.weak_topics:
        bias += 0.18
    if category in user_seed.strong_topics:
        bias -= 0.14
    if topic == "Yo'l xavfsizligi" and user_seed.level == "beginner":
        bias += 0.06
    if question.difficulty == "hard":
        bias += 0.10
    elif question.difficulty == "easy":
        bias -= 0.06
    bias += (stable_percent(user_seed.email, question.id, attempt_index) % 11) / 100.0
    return bias


def choose_answer_options(user_seed: UserSeed, questions: list[Question], attempt_index: int, target_accuracy_value: float) -> list[tuple[Question, AnswerOption, bool]]:
    target_correct = int(round(len(questions) * target_accuracy_value))
    target_correct = max(0, min(len(questions), target_correct))
    wrong_count = len(questions) - target_correct
    scored_questions = sorted(questions, key=lambda question: wrong_bias(user_seed, question, attempt_index), reverse=True)
    wrong_ids = {question.id for question in scored_questions[:wrong_count]}
    selections: list[tuple[Question, AnswerOption, bool]] = []
    for question in questions:
        correct_option = next(option for option in question.answer_options if option.is_correct)
        wrong_options = [option for option in question.answer_options if not option.is_correct]
        if question.id not in wrong_ids:
            selections.append((question, correct_option, True))
            continue
        wrong_option = wrong_options[stable_percent("wrong", user_seed.email, question.id, attempt_index) % len(wrong_options)]
        selections.append((question, wrong_option, False))
    return selections


def training_level_sequence(level: str) -> list[tuple[str | None, str]]:
    if level == "advanced":
        return [(None, "beginner"), ("beginner", "intermediate"), ("intermediate", "advanced")]
    if level == "intermediate":
        return [(None, "beginner"), ("beginner", "intermediate")]
    return [(None, "beginner")]


async def ensure_training_profiles(session: AsyncSession, users: dict[str, User], user_seed_map: dict[str, UserSeed], summary: Counter) -> None:
    now_utc = utcnow()
    for email, user in users.items():
        seed = user_seed_map[email]
        profile = await session.get(UserAdaptiveProfile, user.id)
        if profile is None:
            target = 38 if seed.level == "advanced" else 52 if seed.level == "intermediate" else 68
            session.add(UserAdaptiveProfile(user_id=user.id, target_difficulty_percent=target, updated_at=now_utc - timedelta(days=1)))
            summary["user_adaptive_profiles"] += 1
        for index, (previous, new) in enumerate(training_level_sequence(seed.level)):
            history_id = stable_uuid("training-history", user.id, index)
            history = await session.get(UserTrainingHistory, history_id)
            if history is None:
                session.add(UserTrainingHistory(id=history_id, user_id=user.id, previous_level=previous, new_level=new, changed_at=now_utc - timedelta(days=50 - (index * 20))))
                summary["user_training_history"] += 1


async def seed_social_catalog_data(session: AsyncSession, users: dict[str, User], schools: dict[str, DrivingSchool], instructors: dict[str, DrivingInstructor], summary: Counter) -> None:
    now_utc = utcnow()
    general_users = [seed for seed in USER_SEEDS if seed.school_slug is None]
    reviewer_users = [users[seed.email] for seed in general_users]
    admin_user = users[next(seed.email for seed in USER_SEEDS if seed.is_admin)]

    for school_index, school_seed in enumerate(SCHOOL_SEEDS):
        school = schools[school_seed.slug]
        for offset in range(4):
            reviewer = reviewer_users[(school_index * 3 + offset) % len(reviewer_users)]
            review_exists = await execute_no_autoflush(session, select(DrivingSchoolReview).where(DrivingSchoolReview.school_id == school.id, DrivingSchoolReview.user_id == reviewer.id))
            if review_exists.scalar_one_or_none() is None:
                rating = 5 if offset < 3 else 4
                comment = "Instruktorlar tinch tushuntiradi va ichki testlar foydali." if rating == 5 else "Parkovka maydoni va mock testlari ayniqsa qo'l keldi."
                session.add(DrivingSchoolReview(id=stable_uuid("school-review", school.id, reviewer.id), school_id=school.id, user_id=reviewer.id, rating=rating, comment=comment, is_visible=True, created_at=now_utc - timedelta(days=12 - offset), updated_at=now_utc - timedelta(days=12 - offset)))
                summary["driving_school_reviews"] += 1

        for lead_index in range(2):
            lead_id = stable_uuid("school-lead", school.id, lead_index)
            if await get_no_autoflush(session, DrivingSchoolLead, lead_id) is None:
                user = reviewer_users[(school_index + lead_index) % len(reviewer_users)]
                session.add(DrivingSchoolLead(id=lead_id, school_id=school.id, user_id=user.id, full_name=user.full_name or user.email, phone=f"+99890{school_index + 1}{lead_index + 4}7788", requested_category="B" if lead_index == 0 else "BC", comment="Kechki guruhlar va mock imtihon jadvali qiziqtiryapti.", source="seed", status=DrivingSchoolLeadStatus.NEW.value if lead_index == 0 else DrivingSchoolLeadStatus.CONTACTED.value, created_at=now_utc - timedelta(days=4 - lead_index), updated_at=now_utc - timedelta(days=3 - lead_index)))
                summary["driving_school_leads"] += 1

        application_id = stable_uuid("school-application", school.id)
        if await get_no_autoflush(session, DrivingSchoolPartnerApplication, application_id) is None:
            owner_user = users[school_seed.owner_email]
            session.add(DrivingSchoolPartnerApplication(id=application_id, user_id=owner_user.id, linked_school_id=school.id, school_name=school.name, city=school.city, responsible_person=owner_user.full_name or school.name, phone=school.phone, email=owner_user.email, note="Profil va kurs kartalari tasdiqlandi, reklama paketi yoqilgan.", status=DrivingSchoolPartnerApplicationStatus.APPROVED.value, reviewed_by_id=admin_user.id, reviewed_at=now_utc - timedelta(days=40), created_at=now_utc - timedelta(days=46), updated_at=now_utc - timedelta(days=40)))
            summary["driving_school_partner_applications"] += 1

    for instructor_index, instructor_seed in enumerate(INSTRUCTOR_SEEDS):
        instructor = instructors[instructor_seed.slug]
        for offset in range(3):
            reviewer = reviewer_users[(instructor_index * 2 + offset) % len(reviewer_users)]
            review_exists = await execute_no_autoflush(session, select(DrivingInstructorReview).where(DrivingInstructorReview.instructor_id == instructor.id, DrivingInstructorReview.user_id == reviewer.id))
            if review_exists.scalar_one_or_none() is None:
                rating = 5 if offset != 2 else 4
                comment = "Murakkab chorrahalarni aniq tahlil qilib berdi." if offset == 0 else "Parkovka va nazariya bog'liqligini yaxshi tushuntiradi." if offset == 1 else "Tinch uslubda o'rgatadi, jadval moslashuvchan."
                session.add(DrivingInstructorReview(id=stable_uuid("instructor-review", instructor.id, reviewer.id), instructor_id=instructor.id, user_id=reviewer.id, rating=rating, comment=comment, is_visible=True, created_at=now_utc - timedelta(days=8 - offset), updated_at=now_utc - timedelta(days=8 - offset)))
                summary["driving_instructor_reviews"] += 1

        for lead_index in range(2):
            lead_id = stable_uuid("instructor-lead", instructor.id, lead_index)
            if await get_no_autoflush(session, DrivingInstructorLead, lead_id) is None:
                user = reviewer_users[(instructor_index + lead_index + 2) % len(reviewer_users)]
                session.add(DrivingInstructorLead(id=lead_id, instructor_id=instructor.id, user_id=user.id, full_name=user.full_name or user.email, phone=f"+99893{instructor_index + 1}{lead_index + 6}2211", requested_transmission=instructor.transmission, comment="Imtihon oldi 3 ta amaliy dars kerak.", source="seed", status=DrivingInstructorLeadStatus.NEW.value if lead_index == 0 else DrivingInstructorLeadStatus.CONTACTED.value, created_at=now_utc - timedelta(days=3 - lead_index), updated_at=now_utc - timedelta(days=2 - lead_index)))
                summary["driving_instructor_leads"] += 1

        if instructor_seed.user_email:
            linked_user = users[instructor_seed.user_email]
            application_id = stable_uuid("instructor-application", linked_user.id)
            if await get_no_autoflush(session, DrivingInstructorApplication, application_id) is None:
                session.add(DrivingInstructorApplication(id=application_id, user_id=linked_user.id, linked_instructor_id=instructor.id, full_name=instructor.full_name, phone=instructor.phone, city=instructor.city, region=instructor.region, gender=instructor.gender, years_experience=instructor.years_experience, transmission=instructor.transmission, car_model=instructor.car_model, hourly_price_cents=instructor.hourly_price_cents, currency=instructor.currency, short_bio=instructor.short_bio, profile_image_url=instructor.profile_image_url, extra_images_json="[]", status=DrivingInstructorApplicationStatus.APPROVED.value, reviewed_by_id=admin_user.id, reviewed_at=now_utc - timedelta(days=35), submitted_from="seed", created_at=now_utc - timedelta(days=41), updated_at=now_utc - timedelta(days=35)))
                summary["driving_instructor_applications"] += 1

        if instructor_index % 4 == 0:
            complaint_id = stable_uuid("instructor-complaint", instructor.id)
            if await get_no_autoflush(session, DrivingInstructorComplaint, complaint_id) is None:
                complainant = reviewer_users[(instructor_index + 4) % len(reviewer_users)]
                session.add(DrivingInstructorComplaint(id=complaint_id, instructor_id=instructor.id, user_id=complainant.id, full_name=complainant.full_name or complainant.email, phone="+998977770011", reason="Dars vaqti ikki marta ko'chirildi", comment="Keyinroq jadval bo'yicha kelishib olindi, ammo support ticket ochilgan.", status=DrivingInstructorComplaintStatus.RESOLVED.value, created_at=now_utc - timedelta(days=14), updated_at=now_utc - timedelta(days=12)))
                summary["driving_instructor_complaints"] += 1

    for instructor_seed in INSTRUCTOR_SEEDS:
        instructor = instructors[instructor_seed.slug]
        for view_index in range(7):
            viewer = reviewer_users[(view_index + len(instructor.slug)) % len(reviewer_users)]
            event_id = stable_uuid("analytics", "instructor-view", instructor.id, view_index)
            if await get_no_autoflush(session, AnalyticsEvent, event_id) is None:
                session.add(AnalyticsEvent(id=event_id, user_id=viewer.id, event_name="driving_instructor_profile_view", metadata_json={"instructor_id": str(instructor.id), "instructor_slug": instructor.slug, "source": "seed"}, created_at=now_utc - timedelta(days=6 - view_index, hours=view_index)))
                summary["analytics_events"] += 1


async def ensure_attempts_and_progress(session: AsyncSession, users: dict[str, User], user_seed_map: dict[str, UserSeed], test_map: dict[str, Test], summary: Counter) -> None:
    questions_by_test = await load_questions_by_test(session)
    questions_by_category = {seed.name: list(questions_by_test[f"{seed.name} - amaliy test"]) for seed in CATEGORY_SEEDS}
    now_utc = utcnow()

    for user_email, user in users.items():
        user_seed = user_seed_map[user_email]
        templates = ATTEMPT_TEMPLATES[user_seed.level][: user_seed.attempt_count]

        login_start = now_utc - timedelta(days=user_seed.streak_days - 1)
        for day_index in range(user_seed.streak_days):
            await award_daily_login(session, user.id, occurred_at=login_start + timedelta(days=day_index, hours=6))

        await award_custom_reward(session, user.id, xp_amount=user_seed.bonus_xp, coins_amount=user_seed.bonus_coins, source=f"seed_bonus:{user.id}", occurred_at=now_utc - timedelta(days=11))

        day_offsets = attempt_day_offsets(user_seed.level)
        for attempt_index, template in enumerate(templates):
            attempt_id = stable_uuid("attempt", user.id, attempt_index)
            if await session.get(Attempt, attempt_id) is not None:
                continue

            questions = select_attempt_questions(user_seed, template, questions_by_test, questions_by_category, attempt_index)
            target = accuracy_target(user_seed, template, attempt_index)
            selections = choose_answer_options(user_seed, questions, attempt_index, target)
            correct_count = sum(1 for _, _, is_correct in selections if is_correct)
            score_modifier = 0.94 if template.pressure_mode and template.mode != "simulation" else 1.0
            avg_response_time, response_time_variance = response_time_profile(user_seed, attempt_index, template.pressure_mode)
            started_at = now_utc - timedelta(days=day_offsets[attempt_index], hours=1 + (attempt_index % 4))
            finished_at = started_at + timedelta(minutes=14 + (len(questions) // 3) + attempt_index)
            test_title = attempt_test_title(user_seed, template)
            test_obj = next(test for test in test_map.values() if test.title == test_title)
            topic_ids = {question.category_id for question in questions if question.category_id is not None}
            pre_topic_rows = (await session.execute(select(UserTopicStats).where(UserTopicStats.user_id == user.id, UserTopicStats.topic_id.in_(topic_ids)))).scalars().all() if topic_ids else []
            pre_topic_state = {row.topic_id: (int(row.total_attempts), float(row.accuracy_rate)) for row in pre_topic_rows}
            due_review_count_before = int(((await session.execute(select(func.count(ReviewQueue.id)).where(ReviewQueue.user_id == user.id, ReviewQueue.next_review_at <= finished_at))).scalar_one()) or 0)

            attempt = Attempt(id=attempt_id, user_id=user.id, test_id=test_obj.id, score=int(round(correct_count * score_modifier)), started_at=started_at, finished_at=finished_at, mode=template.mode, training_level=user_seed.level if template.mode != "simulation" else "simulation", avg_response_time=avg_response_time, response_time_variance=response_time_variance, pressure_mode=template.pressure_mode, pressure_score_modifier=score_modifier, question_ids=[str(question.id) for question in questions], question_count=len(questions), time_limit_seconds=(40 * 60 if template.mode == "simulation" else 25 * 60))
            session.add(attempt)
            summary["attempts"] += 1

            answer_records: list[LearningAnswerRecord] = []
            mistake_count = 0
            for question, selected_option, is_correct in selections:
                session.add(AttemptAnswer(id=stable_uuid("attempt-answer", attempt.id, question.id), attempt_id=attempt.id, question_id=question.id, selected_option_id=selected_option.id, is_correct=is_correct))
                summary["attempt_answers"] += 1
                answer_records.append(LearningAnswerRecord(question_id=question.id, topic_id=question.category_id, is_correct=is_correct, occurred_at=finished_at))
                if not is_correct:
                    mistake_count += 1

            await session.flush()
            await apply_learning_progress_updates(db=session, user_id=user.id, answer_records=answer_records)
            await award_attempt_completion_rewards(session, user.id, attempt_id=attempt.id, mode=template.mode, passed=(mistake_count <= 3) if template.mode == "simulation" else (correct_count / max(1, len(questions))) >= 0.65, score_percent=(correct_count / max(1, len(questions))) * 100.0, occurred_at=finished_at, topic_ids=topic_ids, pre_topic_state=pre_topic_state, due_review_count_before=due_review_count_before)

            if template.mode == "simulation":
                session.add(ExamSimulationAttempt(id=attempt.id, user_id=user.id, scheduled_at=started_at, started_at=started_at, finished_at=finished_at, cooldown_started_at=finished_at, next_available_at=finished_at + timedelta(days=14), readiness_snapshot=round(clamp(target * 100 + 8, 45.0, 99.0), 1), pass_probability_snapshot=round(clamp(target * 100 + 4, 35.0, 97.0), 1), question_count=len(questions), pressure_mode=True, mistake_count=mistake_count, mistake_limit=3, violation_limit=2, violation_count=1 if user_seed.level == "beginner" and stable_percent(user.id, attempt.id) % 4 == 0 else 0, disqualified=False, timeout=False, passed=mistake_count <= 3, cooldown_reduction_days_used=0))
                summary["exam_simulation_attempts"] += 1

            inference_id = stable_uuid("inference", attempt.id)
            if await session.get(InferenceSnapshot, inference_id) is None:
                session.add(InferenceSnapshot(id=inference_id, attempt_id=attempt.id, pass_probability=round(clamp(target * 100 + 4, 35.0, 97.0), 1), probability_source="rule", confidence=round(clamp(0.45 + (attempt_index * 0.04), 0.45, 0.92), 2), readiness_score=round(clamp(target * 100 + 6, 40.0, 99.0), 1), cognitive_stability=round(clamp(100 - response_time_variance, 48.0, 92.0), 1), retention_score=round(clamp(0.45 + (attempt_index * 0.03), 0.35, 0.93), 2), drift_state="stable", model_version="v2-transparent", inference_latency_ms=round(18.0 + attempt_index * 1.2, 2), created_at=finished_at))
                summary["inference_snapshots"] += 1

            for suffix, event_name, event_time in (("start", f"{template.mode}_started" if template.mode != "standard" else "test_started", started_at), ("finish", "simulation_completed" if template.mode == "simulation" else "learning_session_completed" if template.mode == "learning" else "test_completed", finished_at)):
                event_id = stable_uuid("analytics", attempt.id, suffix)
                if await session.get(AnalyticsEvent, event_id) is None:
                    session.add(AnalyticsEvent(id=event_id, user_id=user.id, event_name=event_name, metadata_json={"attempt_id": str(attempt.id), "mode": template.mode, "question_count": len(questions), "score": attempt.score, "source": "full_seed"}, created_at=event_time))
                    summary["analytics_events"] += 1

        dashboard_event = stable_uuid("analytics", user.id, "dashboard-opened")
        if await session.get(AnalyticsEvent, dashboard_event) is None:
            session.add(AnalyticsEvent(id=dashboard_event, user_id=user.id, event_name="dashboard_opened", metadata_json={"source": "seed", "level": user_seed.level}, created_at=now_utc - timedelta(hours=2)))
            summary["analytics_events"] += 1

        lesson_event = stable_uuid("analytics", user.id, "lesson-view")
        if await session.get(AnalyticsEvent, lesson_event) is None:
            session.add(AnalyticsEvent(id=lesson_event, user_id=user.id, event_name="lesson_opened", metadata_json={"topic": user_seed.weak_topics[0], "source": "seed"}, created_at=now_utc - timedelta(days=1, hours=1)))
            summary["analytics_events"] += 1

        await session.commit()

    question_history_accumulator: dict[tuple[UUID, UUID], dict[str, object]] = defaultdict(lambda: {"attempt_count": 0, "correct_count": 0, "last_seen_at": None, "last_correct_at": None})
    seeded_user_ids = [user.id for user in users.values()]
    history_rows = (
        await session.execute(
            select(Attempt.user_id, Attempt.finished_at, AttemptAnswer.question_id, AttemptAnswer.is_correct)
            .join(Attempt, Attempt.id == AttemptAnswer.attempt_id)
            .where(Attempt.user_id.in_(seeded_user_ids))
        )
    ).all()
    for user_id, finished_at, question_id, is_correct in history_rows:
        key = (user_id, question_id)
        question_history_accumulator[key]["attempt_count"] = int(question_history_accumulator[key]["attempt_count"]) + 1
        if finished_at is not None:
            last_seen = question_history_accumulator[key]["last_seen_at"]
            if last_seen is None or finished_at > last_seen:
                question_history_accumulator[key]["last_seen_at"] = finished_at
        if is_correct:
            question_history_accumulator[key]["correct_count"] = int(question_history_accumulator[key]["correct_count"]) + 1
            if finished_at is not None:
                last_correct = question_history_accumulator[key]["last_correct_at"]
                if last_correct is None or finished_at > last_correct:
                    question_history_accumulator[key]["last_correct_at"] = finished_at

    for (user_id, question_id), payload in question_history_accumulator.items():
        history_id = stable_uuid("user-question-history", user_id, question_id)
        if await session.get(UserQuestionHistory, history_id) is None:
            session.add(UserQuestionHistory(id=history_id, user_id=user_id, question_id=question_id, correct_count=int(payload["correct_count"]), attempt_count=int(payload["attempt_count"]), last_seen_at=payload["last_seen_at"], last_correct_at=payload["last_correct_at"], created_at=payload["last_seen_at"] or now_utc, updated_at=payload["last_seen_at"] or now_utc))
            summary["user_question_history"] += 1


async def ensure_user_skills_and_notifications(session: AsyncSession, users: dict[str, User], user_seed_map: dict[str, UserSeed], summary: Counter) -> None:
    now_utc = utcnow()
    for email, user in users.items():
        seed = user_seed_map[email]
        stats_rows = (await session.execute(select(UserTopicStats, QuestionCategory).join(QuestionCategory, QuestionCategory.id == UserTopicStats.topic_id).where(UserTopicStats.user_id == user.id))).all()
        grouped: dict[str, dict[str, float | datetime | int]] = {}
        for stats_row, category in stats_rows:
            label = canonical_learning_label(category.name)
            bucket = grouped.setdefault(label, {"attempts": 0, "correct": 0, "accuracy_sum": 0.0, "last_attempt_at": stats_row.last_attempt_at})
            bucket["attempts"] = int(bucket["attempts"]) + int(stats_row.total_attempts)
            bucket["correct"] = int(bucket["correct"]) + int(stats_row.correct_answers)
            bucket["accuracy_sum"] = float(bucket["accuracy_sum"]) + float(stats_row.accuracy_rate)
            if stats_row.last_attempt_at and (bucket["last_attempt_at"] is None or stats_row.last_attempt_at > bucket["last_attempt_at"]):
                bucket["last_attempt_at"] = stats_row.last_attempt_at

        for label in CANONICAL_LEARNING_TOPIC_LABELS:
            bucket = grouped.get(label, {"attempts": 0, "correct": 0, "accuracy_sum": 0.0, "last_attempt_at": now_utc - timedelta(days=14)})
            attempts = max(1, int(bucket["attempts"]))
            accuracy = int(bucket["correct"]) / attempts if attempts else 0.0
            weak_topic = label in {canonical_learning_label(seed.weak_topics[0]), canonical_learning_label(seed.weak_topics[1])}
            exists = await session.execute(select(UserSkill).where(UserSkill.user_id == user.id, UserSkill.topic == label))
            if exists.scalar_one_or_none() is None:
                session.add(UserSkill(id=stable_uuid("user-skill", user.id, label), user_id=user.id, topic=label, skill_score=round(clamp(accuracy * (0.9 if weak_topic else 1.0), 0.25, 0.97), 3), bkt_knowledge_prob=round(clamp(accuracy * (0.88 if weak_topic else 0.96), 0.20, 0.95), 3), total_attempts=attempts, bkt_attempts=attempts, last_practice_at=bucket["last_attempt_at"] or now_utc - timedelta(days=5), retention_score=round(clamp((0.55 if weak_topic else 0.78) + accuracy * 0.12, 0.35, 0.96), 3), repetition_count=max(1, min(6, attempts // 4)), interval_days=2 if weak_topic else 6, ease_factor=round(2.1 + (accuracy * 0.35), 2), next_review_at=(now_utc - timedelta(days=1) if weak_topic else now_utc + timedelta(days=4)), last_updated=now_utc - timedelta(hours=2)))
                summary["user_skills"] += 1

        weak_labels = sorted(grouped.items(), key=lambda item: (float(item[1]["accuracy_sum"]) / max(1, int(item[1]["attempts"])), int(item[1]["attempts"])))
        primary_weak = weak_labels[0][0] if weak_labels else canonical_learning_label(seed.weak_topics[0])
        notification_specs = (("progress_alert", "Bugungi fokus", f"{primary_weak} bo'yicha xatolar hali ko'p. 10 daqiqalik qayta ko'rish foyda beradi.", False), ("streak", "Streak saqlandi", f"Sizning amaldagi streak: {seed.streak_days} kun. Bir dars bilan ritmni davom ettiring.", True), ("simulation", "Simulyatsiya holati", "So'nggi simulyatsiya natijasi analytics kartasida tayyor. Xatolarni ko'rib chiqing.", False))
        for notification_type, title, message, is_read in notification_specs:
            notification_id = stable_uuid("notification", user.id, notification_type)
            if await session.get(UserNotification, notification_id) is None:
                session.add(UserNotification(id=notification_id, user_id=user.id, notification_type=notification_type, title=title, message=message, payload={"source": "full_seed", "topic": primary_weak}, is_read=is_read, created_at=now_utc - timedelta(hours=1)))
                summary["user_notifications"] += 1


async def seed_economy_activity(session: AsyncSession, users: dict[str, User], user_seed_map: dict[str, UserSeed], summary: Counter) -> None:
    now_utc = utcnow()
    for email, user in users.items():
        seed = user_seed_map[email]
        if seed.level == "advanced":
            source = f"seed_xp_boost_purchase:{user.id}"
            existing = await session.execute(select(CoinTransaction).where(CoinTransaction.user_id == user.id, CoinTransaction.type == "debit", CoinTransaction.source == source))
            if existing.scalar_one_or_none() is None:
                try:
                    await CoinSpendService(session).spend_coins(user.id, XP_BOOST_COST, source, occurred_at=now_utc - timedelta(minutes=20))
                    summary["coin_transactions"] += 1
                except Exception:
                    pass
            boost_id = stable_uuid("xp-boost", user.id)
            if await session.get(XPBoost, boost_id) is None:
                session.add(XPBoost(id=boost_id, user_id=user.id, multiplier=XP_BOOST_MULTIPLIER, source="coin_boost", activated_at=now_utc - timedelta(minutes=20), expires_at=now_utc + timedelta(minutes=XP_BOOST_DURATION_MINUTES), created_at=now_utc - timedelta(minutes=20)))
                summary["xp_boosts"] += 1

        if seed.level == "beginner":
            source = f"simulation_fast_unlock:seed:{user.id}"
            existing = await session.execute(select(CoinTransaction).where(CoinTransaction.user_id == user.id, CoinTransaction.type == "debit", CoinTransaction.source == source))
            if existing.scalar_one_or_none() is None:
                try:
                    await CoinSpendService(session).spend_coins(user.id, 120, source, occurred_at=now_utc - timedelta(hours=4))
                    summary["coin_transactions"] += 1
                except Exception:
                    pass


async def ensure_leaderboard_snapshots(session: AsyncSession, summary: Counter) -> None:
    now_utc = utcnow()
    period_windows = {"daily": now_utc.replace(hour=0, minute=0, second=0, microsecond=0), "weekly": (now_utc - timedelta(days=now_utc.weekday())).replace(hour=0, minute=0, second=0, microsecond=0), "monthly": now_utc.replace(day=1, hour=0, minute=0, second=0, microsecond=0)}
    for period, start_at in period_windows.items():
        existing_rows = await session.execute(select(func.count(LeaderboardSnapshot.id)).where(LeaderboardSnapshot.period == period))
        if int(existing_rows.scalar_one() or 0) > 0:
            continue
        rows = (await session.execute(select(XPEvent.user_id, func.coalesce(func.sum(XPEvent.xp_amount), 0).label("xp_total")).where(XPEvent.created_at >= start_at).group_by(XPEvent.user_id).order_by(func.coalesce(func.sum(XPEvent.xp_amount), 0).desc(), XPEvent.user_id.asc()))).all()
        for rank, row in enumerate(rows, start=1):
            session.add(LeaderboardSnapshot(id=stable_uuid("leaderboard", period, row.user_id), user_id=row.user_id, xp=int(row.xp_total or 0), period=period, rank=rank, captured_at=now_utc))
            summary["leaderboard_snapshots"] += 1


async def verify_endpoints(session_factory) -> dict[str, object]:
    from api.analytics.user_router import get_dashboard
    from api.leaderboard.router import get_leaderboard
    from api.simulation.router import get_simulation_history
    from api.users.router import get_my_gamification_summary

    async with session_factory() as session:
        showcase_user = (await session.execute(select(User).where(User.email == "sevara.nematova@demo.autotest.uz"))).scalar_one()
        dashboard = await get_dashboard(current_user=showcase_user, db=session)
        history = await get_simulation_history(current_user=showcase_user, db=session)
        leaderboard = await get_leaderboard(period="weekly", limit=20, current_user=showcase_user, db=session)
        gamification = await get_my_gamification_summary(current_user=showcase_user, db=session)
        if dashboard.overview.total_attempts <= 0:
            raise RuntimeError("/api/analytics/me/dashboard returned no attempts")
        if len(history.items) <= 0:
            raise RuntimeError("/api/simulation/history returned no items")
        if len(leaderboard.users) <= 0:
            raise RuntimeError("/api/leaderboard returned no rows")
        if gamification.xp.total_xp <= 0:
            raise RuntimeError("/api/users/me/gamification returned empty XP data")
        return {"dashboard_attempts": dashboard.overview.total_attempts, "dashboard_pass_probability": dashboard.overview.pass_probability, "simulation_history": len(history.items), "leaderboard_rows": len(leaderboard.users), "gamification_level": gamification.xp.level, "gamification_xp": gamification.xp.total_xp}


async def collect_seed_totals(session: AsyncSession) -> dict[str, int]:
    lesson_ids = [stable_uuid("lesson", title) for title, _topic, _section, _premium in build_lesson_specs()]
    return {
        "users": len((await session.execute(select(User.id).where(User.id.in_([stable_uuid("user", seed.email) for seed in USER_SEEDS])))).scalars().all()),
        "schools": len((await session.execute(select(DrivingSchool.id).where(DrivingSchool.id.in_([stable_uuid("school", seed.slug) for seed in SCHOOL_SEEDS])))).scalars().all()),
        "instructors": len((await session.execute(select(DrivingInstructor.id).where(DrivingInstructor.id.in_([stable_uuid("instructor", seed.slug) for seed in INSTRUCTOR_SEEDS])))).scalars().all()),
        "lessons": len((await session.execute(select(Lesson.id).where(Lesson.id.in_(lesson_ids)))).scalars().all()),
        "tests": len((await session.execute(select(Test.id).where(Test.id.in_([stable_uuid("test", seed.key) for seed in (*BANK_TESTS, *SPECIAL_TESTS)])))).scalars().all()),
        "questions": len((await session.execute(select(Question.id).where(Question.test_id.in_([stable_uuid("test", seed.key) for seed in BANK_TESTS])))).scalars().all()),
        "attempts": len((await session.execute(select(Attempt.id).where(Attempt.id.in_([stable_uuid("attempt", stable_uuid("user", seed.email), attempt_index) for seed in USER_SEEDS for attempt_index in range(seed.attempt_count)])))).scalars().all()),
        "simulation_attempts": len((await session.execute(select(ExamSimulationAttempt.id).where(ExamSimulationAttempt.id.in_([stable_uuid("attempt", stable_uuid("user", seed.email), attempt_index) for seed in USER_SEEDS for attempt_index, template in enumerate(ATTEMPT_TEMPLATES[seed.level][: seed.attempt_count]) if template.mode == "simulation"])))).scalars().all()),
        "notifications": len((await session.execute(select(UserNotification.id).where(UserNotification.id.in_([stable_uuid("notification", stable_uuid("user", seed.email), notification_type) for seed in USER_SEEDS for notification_type in ("progress_alert", "streak", "simulation")])))).scalars().all()),
        "leaderboard_rows": int(((await session.execute(select(func.count(LeaderboardSnapshot.id)))).scalar_one()) or 0),
    }


async def seed_data(session: AsyncSession, summary: Counter) -> dict[str, int]:
    await ensure_default_achievement_definitions(session)
    await get_or_create_simulation_exam_settings(session)
    roles = await ensure_roles(session, summary)
    permissions = await ensure_permissions(session, summary)
    await ensure_role_permissions(session, roles, permissions, summary)
    users, user_seed_map = await ensure_users(session, summary)
    await ensure_student_roles(session, users, roles, summary)
    schools = await ensure_schools(session, users, roles, summary)
    instructors = await ensure_instructors(session, users, schools, roles, summary)
    await ensure_lessons(session, summary)
    tests, _ = await ensure_question_bank(session, summary)
    await ensure_training_profiles(session, users, user_seed_map, summary)
    await seed_social_catalog_data(session, users, schools, instructors, summary)
    await session.commit()
    await ensure_attempts_and_progress(session, users, user_seed_map, tests, summary)
    await ensure_user_skills_and_notifications(session, users, user_seed_map, summary)
    await seed_economy_activity(session, users, user_seed_map, summary)
    await ensure_leaderboard_snapshots(session, summary)
    await session.commit()
    return await collect_seed_totals(session)


async def main() -> None:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set. Export the provided DATABASE_URL and rerun the seed.")

    engine = create_async_engine(database_url, echo=False, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    summary = Counter()

    async with session_factory() as session:
        totals = await seed_data(session, summary)

    endpoint_summary = await verify_endpoints(session_factory)
    await engine.dispose()

    print("Full seed completed.")
    print("Run command: python scripts/full_seed.py")
    print(f"Shared password: {SEED_PASSWORD}")
    print("")
    print("Created this run:")
    for key in sorted(summary):
        print(f"  - {key}: {summary[key]}")
    print("")
    print("Seed scope totals:")
    for key in ("users", "schools", "instructors", "lessons", "tests", "questions", "attempts", "simulation_attempts", "notifications", "leaderboard_rows"):
        print(f"  - {key}: {totals[key]}")
    print("")
    print("Endpoint checks:")
    print(f"  - /api/analytics/me/dashboard: attempts={endpoint_summary['dashboard_attempts']}, pass_probability={endpoint_summary['dashboard_pass_probability']}")
    print(f"  - /api/simulation/history: items={endpoint_summary['simulation_history']}")
    print(f"  - /api/leaderboard: rows={endpoint_summary['leaderboard_rows']}")
    print(f"  - /api/users/me/gamification: level={endpoint_summary['gamification_level']}, total_xp={endpoint_summary['gamification_xp']}")


if __name__ == "__main__":
    asyncio.run(main())
