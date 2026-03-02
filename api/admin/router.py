"""
AUTOTEST Admin Router
Admin CRUD endpoints for Tests, Questions, and AnswerOptions
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from api.admin.schemas import (
    AdminQuestionWithOptionsResponse,
    AdminTestDetailResponse,
    SubscriptionPlanCreate,
    SubscriptionPlanResponse,
    SubscriptionPlanUpdate,
    AdminUserResponse,
    AdminUserSubscriptionUpdate,
    AdminUserUpdate,
    PromoCodeCreate,
    PromoCodeResponse,
    PromoCodeUpdate,
    ViolationLogResponse,
    AnswerOptionCreate,
    AnswerOptionResponse,
    AnswerOptionUpdate,
    QuestionCreate,
    QuestionCategoryCreate,
    QuestionCategoryResponse,
    QuestionCategoryUpdate,
    QuestionResponse,
    QuestionUpdate,
    LessonCreate,
    LessonResponse,
    LessonUpdate,
    LessonUploadResponse,
    ImageUploadResponse,
    TestCreate,
    TestResponse,
    TestUpdate,
)
from api.auth.router import get_current_user
from database.session import get_db
from models.answer_option import AnswerOption
from models.question import Question
from models.question_category import QuestionCategory
from models.lesson import Lesson
from models.promo_code import PromoCode
from models.subscription_plan import SubscriptionPlan
from models.subscription import Subscription
from models.test import Test
from models.user import User
from models.user_notification import UserNotification
from models.violation_log import ViolationLog

router = APIRouter(prefix="/admin", tags=["admin"])

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
ADMIN_UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "questions"
ADMIN_LESSON_UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "lessons"

ALLOWED_LESSON_EXTENSIONS = {
    ".mp4",
    ".webm",
    ".mov",
    ".mp3",
    ".wav",
    ".ogg",
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".txt",
    ".md",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
}
MAX_LESSON_FILE_SIZE_BYTES = 200 * 1024 * 1024
QUESTION_BANK_TEST_TITLE = "Question Bank (Internal)"
QUESTION_BANK_TEST_DESCRIPTION = "Internal container for admin-managed question bank."


def _lesson_content_type_from_extension(extension: str) -> str:
    if extension in {".mp4", ".webm", ".mov"}:
        return "video"
    if extension in {".mp3", ".wav", ".ogg"}:
        return "audio"
    if extension in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return "image"
    if extension in {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".md"}:
        return "document"
    return "file"


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to verify the current user is an admin.
    
    Args:
        current_user: The authenticated user
    
    Returns:
        The admin User object
    
    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def _set_promo_applicable_plans(
    promo: PromoCode,
    applicable_plan_ids: list[UUID],
    db: AsyncSession,
) -> None:
    """Assign promo applicability to specific plans."""
    if not applicable_plan_ids:
        promo.applicable_plans = []
        return

    unique_plan_ids = list(dict.fromkeys(applicable_plan_ids))
    result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.id.in_(unique_plan_ids))
    )
    plans = list(result.scalars().all())
    found_plan_ids = {plan.id for plan in plans}
    missing_ids = [plan_id for plan_id in unique_plan_ids if plan_id not in found_plan_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown plan IDs: {', '.join(str(pid) for pid in missing_ids)}",
        )
    promo.applicable_plans = plans


async def _get_or_create_question_bank_test(db: AsyncSession) -> Test:
    """Return the internal test row used as container for standalone question bank."""
    result = await db.execute(select(Test).where(Test.title == QUESTION_BANK_TEST_TITLE))
    test = result.scalar_one_or_none()
    if test is not None:
        return test

    test = Test(
        title=QUESTION_BANK_TEST_TITLE,
        description=QUESTION_BANK_TEST_DESCRIPTION,
        difficulty="bank",
        is_active=False,
        is_premium=False,
        duration=62,
    )
    db.add(test)
    await db.flush()
    return test


@router.post(
    "/media/image",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_question_image(
    request: Request,
    file: UploadFile = File(...),
    _admin: User = Depends(get_current_admin),
) -> ImageUploadResponse:
    """Upload an image for question media and return public URL."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is required",
        )

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Allowed: jpg, jpeg, png, webp, gif",
        )

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image is too large. Max size is 5MB",
        )

    ADMIN_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    saved_path = ADMIN_UPLOADS_DIR / filename
    saved_path.write_bytes(content)

    base_url = str(request.base_url).rstrip("/")
    return ImageUploadResponse(
        url=f"{base_url}/uploads/questions/{filename}",
        filename=filename,
    )


@router.post(
    "/media/lesson",
    response_model=LessonUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_lesson_media(
    request: Request,
    file: UploadFile = File(...),
    _admin: User = Depends(get_current_admin),
) -> LessonUploadResponse:
    """Upload lesson media file and return public URL."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is required",
        )

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_LESSON_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported lesson file format",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if len(content) > MAX_LESSON_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. Max size is 200MB",
        )

    ADMIN_LESSON_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    saved_path = ADMIN_LESSON_UPLOADS_DIR / filename
    saved_path.write_bytes(content)

    base_url = str(request.base_url).rstrip("/")
    return LessonUploadResponse(
        url=f"{base_url}/uploads/lessons/{filename}",
        filename=filename,
        content_type=_lesson_content_type_from_extension(extension),
        size_bytes=len(content),
    )


# ========== Test CRUD ==========

@router.post("/tests", response_model=TestResponse, status_code=status.HTTP_201_CREATED)
async def create_test(
    test_data: TestCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Test:
    """Create a new test."""
    new_test = Test(
        title=test_data.title,
        description=test_data.description,
        difficulty=test_data.difficulty,
        is_active=test_data.is_active,
        is_premium=test_data.is_premium,
        duration=test_data.duration,
    )
    db.add(new_test)
    await db.commit()
    await db.refresh(new_test)
    return new_test


@router.get("/tests", response_model=list[TestResponse])
async def get_tests(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[Test]:
    """Get all tests."""
    result = await db.execute(select(Test).order_by(Test.created_at.desc()))
    return list(result.scalars().all())


@router.get("/tests/{test_id}", response_model=AdminTestDetailResponse)
async def get_test_detail(
    test_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Test:
    """Get one test with nested questions and answer options (admin scope)."""
    result = await db.execute(
        select(Test)
        .where(Test.id == test_id)
        .options(
            selectinload(Test.questions).selectinload(Question.answer_options)
        )
    )
    test = result.scalar_one_or_none()

    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found",
        )

    return test


@router.put("/tests/{test_id}", response_model=TestResponse)
async def update_test(
    test_id: UUID,
    test_data: TestUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Test:
    """Update a test."""
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    
    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found",
        )
    
    if test_data.title is not None:
        test.title = test_data.title
    if test_data.description is not None:
        test.description = test_data.description
    if test_data.difficulty is not None:
        test.difficulty = test_data.difficulty
    if test_data.is_active is not None:
        test.is_active = test_data.is_active
    if test_data.is_premium is not None:
        test.is_premium = test_data.is_premium
    if test_data.duration is not None:
        test.duration = test_data.duration
    
    await db.commit()
    await db.refresh(test)
    return test


@router.delete("/tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(
    test_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    """Delete a test (cascades to questions and options)."""
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    
    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found",
        )
    
    await db.delete(test)
    await db.commit()


# ========== Lesson CRUD ==========

@router.post("/lessons", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    payload: LessonCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Lesson:
    lesson = Lesson(
        title=payload.title.strip(),
        description=payload.description,
        content_type=payload.content_type.strip().lower(),
        content_url=payload.content_url.strip(),
        thumbnail_url=payload.thumbnail_url.strip() if payload.thumbnail_url else None,
        topic=payload.topic.strip() if payload.topic else None,
        section=payload.section.strip() if payload.section else None,
        is_active=payload.is_active,
        is_premium=payload.is_premium,
        sort_order=payload.sort_order,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.get("/lessons", response_model=list[LessonResponse])
async def list_lessons(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[Lesson]:
    result = await db.execute(
        select(Lesson).order_by(
            Lesson.sort_order.asc(),
            Lesson.created_at.desc(),
        )
    )
    return list(result.scalars().all())


@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Lesson:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )
    return lesson


@router.put("/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: UUID,
    payload: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Lesson:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    fields_set = payload.model_fields_set
    if "title" in fields_set and payload.title is not None:
        lesson.title = payload.title.strip()
    if "description" in fields_set:
        lesson.description = payload.description
    if "content_type" in fields_set and payload.content_type is not None:
        lesson.content_type = payload.content_type.strip().lower()
    if "content_url" in fields_set and payload.content_url is not None:
        lesson.content_url = payload.content_url.strip()
    if "thumbnail_url" in fields_set:
        lesson.thumbnail_url = payload.thumbnail_url.strip() if payload.thumbnail_url else None
    if "topic" in fields_set:
        lesson.topic = payload.topic.strip() if payload.topic else None
    if "section" in fields_set:
        lesson.section = payload.section.strip() if payload.section else None
    if "is_active" in fields_set and payload.is_active is not None:
        lesson.is_active = payload.is_active
    if "is_premium" in fields_set and payload.is_premium is not None:
        lesson.is_premium = payload.is_premium
    if "sort_order" in fields_set and payload.sort_order is not None:
        lesson.sort_order = payload.sort_order

    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )
    await db.delete(lesson)
    await db.commit()


# ========== Question CRUD ==========

@router.post(
    "/question-categories",
    response_model=QuestionCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_question_category(
    payload: QuestionCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> QuestionCategory:
    """Create a new question category."""
    normalized_name = payload.name.strip()
    if not normalized_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category name is required")

    existing = await db.execute(
        select(QuestionCategory).where(func.lower(QuestionCategory.name) == normalized_name.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category name already exists")

    category = QuestionCategory(
        name=normalized_name,
        description=payload.description.strip() if payload.description else None,
        is_active=payload.is_active,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.get("/question-categories", response_model=list[QuestionCategoryResponse])
async def list_question_categories(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[QuestionCategory]:
    """List question categories."""
    result = await db.execute(
        select(QuestionCategory).order_by(QuestionCategory.name.asc())
    )
    return list(result.scalars().all())


@router.put("/question-categories/{category_id}", response_model=QuestionCategoryResponse)
async def update_question_category(
    category_id: UUID,
    payload: QuestionCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> QuestionCategory:
    """Update question category."""
    result = await db.execute(select(QuestionCategory).where(QuestionCategory.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    fields_set = payload.model_fields_set
    if "name" in fields_set and payload.name is not None:
        normalized_name = payload.name.strip()
        if not normalized_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category name is required")
        existing = await db.execute(
            select(QuestionCategory).where(
                func.lower(QuestionCategory.name) == normalized_name.lower(),
                QuestionCategory.id != category.id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category name already exists")
        category.name = normalized_name
    if "description" in fields_set:
        category.description = payload.description.strip() if payload.description else None
    if "is_active" in fields_set and payload.is_active is not None:
        category.is_active = payload.is_active

    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/question-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    """Delete question category (questions remain, category_id becomes null)."""
    result = await db.execute(select(QuestionCategory).where(QuestionCategory.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    await db.delete(category)
    await db.commit()


@router.get("/questions", response_model=list[AdminQuestionWithOptionsResponse])
async def list_questions(
    category_id: UUID | None = None,
    skip: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[Question]:
    """List all questions from standalone question bank."""
    stmt = (
        select(Question)
        .options(selectinload(Question.answer_options))
        .order_by(Question.created_at.desc())
        .offset(max(0, skip))
        .limit(min(max(1, limit), 500))
    )
    if category_id is not None:
        stmt = stmt.where(Question.category_id == category_id)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post(
    "/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_question(
    question_data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Question:
    """Create a new question in standalone admin question bank."""
    category_name = question_data.category.strip() if question_data.category else None
    resolved_category_id = question_data.category_id
    if resolved_category_id is not None:
        category_result = await db.execute(
            select(QuestionCategory).where(QuestionCategory.id == resolved_category_id)
        )
        if category_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")
    elif category_name:
        category_result = await db.execute(
            select(QuestionCategory).where(func.lower(QuestionCategory.name) == category_name.lower())
        )
        category = category_result.scalar_one_or_none()
        if category is None:
            category = QuestionCategory(name=category_name, is_active=True)
            db.add(category)
            await db.flush()
        resolved_category_id = category.id
        category_name = category.name

    bank_test = await _get_or_create_question_bank_test(db)

    new_question = Question(
        test_id=bank_test.id,
        text=question_data.text,
        image_url=question_data.image_url,
        video_url=question_data.video_url,
        media_type=question_data.media_type,
        topic=question_data.topic,
        category=category_name,
        category_id=resolved_category_id,
        difficulty=question_data.difficulty,
        difficulty_percent=question_data.difficulty_percent,
    )
    db.add(new_question)
    await db.commit()
    await db.refresh(new_question)
    return new_question


@router.post(
    "/tests/{test_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_question_legacy(
    test_id: UUID,
    question_data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Question:
    """
    Backward-compatible endpoint.
    New question bank flow still works without test dependency, but this route remains
    for older clients and tests.
    """
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    if test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")

    category_name = question_data.category.strip() if question_data.category else None
    resolved_category_id = question_data.category_id
    if resolved_category_id is not None:
        category_result = await db.execute(
            select(QuestionCategory).where(QuestionCategory.id == resolved_category_id)
        )
        category = category_result.scalar_one_or_none()
        if category is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")
        category_name = category.name

    question = Question(
        test_id=test.id,
        text=question_data.text,
        image_url=question_data.image_url,
        video_url=question_data.video_url,
        media_type=question_data.media_type,
        topic=question_data.topic,
        category=category_name,
        category_id=resolved_category_id,
        difficulty=question_data.difficulty,
        difficulty_percent=question_data.difficulty_percent,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: UUID,
    question_data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Question:
    """Update a question."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    
    if question_data.text is not None:
        question.text = question_data.text
    if question_data.image_url is not None:
        question.image_url = question_data.image_url
    if question_data.video_url is not None:
        question.video_url = question_data.video_url
    if question_data.media_type is not None:
        question.media_type = question_data.media_type
    if question_data.topic is not None:
        question.topic = question_data.topic
    if question_data.category is not None:
        question.category = question_data.category
    if question_data.category_id is not None:
        category_result = await db.execute(
            select(QuestionCategory).where(QuestionCategory.id == question_data.category_id)
        )
        category = category_result.scalar_one_or_none()
        if category is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")
        question.category_id = category.id
        question.category = category.name
    if question_data.difficulty is not None:
        question.difficulty = question_data.difficulty
    if question_data.difficulty_percent is not None:
        question.difficulty_percent = question_data.difficulty_percent
    
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    """Delete a question (cascades to options)."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    
    await db.delete(question)
    await db.commit()


# ========== AnswerOption CRUD ==========

@router.post(
    "/questions/{question_id}/options",
    response_model=AnswerOptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_answer_option(
    question_id: UUID,
    option_data: AnswerOptionCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> AnswerOption:
    """
    Create a new answer option for a question.
    Enforces only ONE correct answer per question.
    """
    # Verify question exists
    result = await db.execute(
        select(Question)
        .where(Question.id == question_id)
        .options(selectinload(Question.answer_options))
    )
    question = result.scalar_one_or_none()
    
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    
    # Enforce only ONE correct answer per question
    if option_data.is_correct:
        for existing_option in question.answer_options:
            if existing_option.is_correct:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Question already has a correct answer. Update existing option first.",
                )
    
    new_option = AnswerOption(
        question_id=question_id,
        text=option_data.text,
        is_correct=option_data.is_correct,
    )
    db.add(new_option)
    await db.commit()
    await db.refresh(new_option)
    return new_option


@router.put("/options/{option_id}", response_model=AnswerOptionResponse)
async def update_answer_option(
    option_id: UUID,
    option_data: AnswerOptionUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> AnswerOption:
    """
    Update an answer option.
    Enforces only ONE correct answer per question.
    """
    result = await db.execute(
        select(AnswerOption).where(AnswerOption.id == option_id)
    )
    option = result.scalar_one_or_none()
    
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer option not found",
        )
    
    # Enforce only ONE correct answer per question if setting is_correct=True
    if option_data.is_correct is True and not option.is_correct:
        result = await db.execute(
            select(AnswerOption).where(
                AnswerOption.question_id == option.question_id,
                AnswerOption.is_correct == True,
                AnswerOption.id != option_id,
            )
        )
        existing_correct = result.scalar_one_or_none()
        if existing_correct:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question already has a correct answer. Set the other option to is_correct=False first.",
            )
    
    if option_data.text is not None:
        option.text = option_data.text
    if option_data.is_correct is not None:
        option.is_correct = option_data.is_correct
    
    await db.commit()
    await db.refresh(option)
    return option


@router.delete("/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_answer_option(
    option_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    """Delete an answer option."""
    result = await db.execute(
        select(AnswerOption).where(AnswerOption.id == option_id)
    )
    option = result.scalar_one_or_none()
    
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer option not found",
        )
    
    await db.delete(option)
    await db.commit()


# ========== User Admin ==========

@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[AdminUserResponse]:
    """List all users with subscription info."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.subscription))
        .order_by(User.created_at.desc())
    )
    users = list(result.scalars().all())
    response: list[AdminUserResponse] = []
    for user in users:
        subscription = user.subscription
        response.append(
            AdminUserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                is_verified=user.is_verified,
                is_admin=user.is_admin,
                is_premium=user.is_premium,
                created_at=user.created_at,
                subscription_plan=subscription.plan if subscription else None,
                subscription_status=subscription.status if subscription else None,
                subscription_expires_at=subscription.expires_at if subscription else None,
            )
        )
    return response


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: UUID,
    payload: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> AdminUserResponse:
    """Update user admin flags."""
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.subscription))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_verified is not None:
        user.is_verified = payload.is_verified
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin

    await db.commit()
    await db.refresh(user)

    subscription = user.subscription
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_admin=user.is_admin,
        is_premium=user.is_premium,
        created_at=user.created_at,
        subscription_plan=subscription.plan if subscription else None,
        subscription_status=subscription.status if subscription else None,
        subscription_expires_at=subscription.expires_at if subscription else None,
    )


# ========== Promo Codes ==========

@router.get("/plans", response_model=list[SubscriptionPlanResponse])
async def list_subscription_plans(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[SubscriptionPlan]:
    result = await db.execute(
        select(SubscriptionPlan).order_by(
            SubscriptionPlan.sort_order.asc(),
            SubscriptionPlan.created_at.asc(),
        )
    )
    return list(result.scalars().all())


@router.post("/plans", response_model=SubscriptionPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription_plan(
    payload: SubscriptionPlanCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> SubscriptionPlan:
    plan = SubscriptionPlan(
        code=payload.code.strip().lower(),
        name=payload.name.strip(),
        description=payload.description,
        price_cents=payload.price_cents,
        currency=payload.currency.strip().upper(),
        duration_days=payload.duration_days,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(plan)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Plan code already exists",
        )
    await db.refresh(plan)
    return plan


@router.get("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def get_subscription_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> SubscriptionPlan:
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.put("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_subscription_plan(
    plan_id: UUID,
    payload: SubscriptionPlanUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> SubscriptionPlan:
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    fields_set = payload.model_fields_set
    if "code" in fields_set and payload.code is not None:
        plan.code = payload.code.strip().lower()
    if "name" in fields_set and payload.name is not None:
        plan.name = payload.name.strip()
    if "description" in fields_set:
        plan.description = payload.description
    if "price_cents" in fields_set and payload.price_cents is not None:
        plan.price_cents = payload.price_cents
    if "currency" in fields_set and payload.currency is not None:
        plan.currency = payload.currency.strip().upper()
    if "duration_days" in fields_set and payload.duration_days is not None:
        plan.duration_days = payload.duration_days
    if "is_active" in fields_set and payload.is_active is not None:
        plan.is_active = payload.is_active
    if "sort_order" in fields_set and payload.sort_order is not None:
        plan.sort_order = payload.sort_order

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Plan code already exists",
        )
    await db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    await db.delete(plan)
    await db.commit()


# ========== Promo Codes ==========

@router.get("/promos", response_model=list[PromoCodeResponse])
async def list_promo_codes(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[PromoCode]:
    result = await db.execute(
        select(PromoCode)
        .options(selectinload(PromoCode.applicable_plans))
        .order_by(PromoCode.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/promos", response_model=PromoCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_promo_code(
    payload: PromoCodeCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> PromoCode:
    code = payload.code.strip().upper()
    promo = PromoCode(
        code=code,
        name=payload.name,
        description=payload.description,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        max_redemptions=payload.max_redemptions,
        starts_at=payload.starts_at,
        expires_at=payload.expires_at,
        is_active=payload.is_active,
    )
    await _set_promo_applicable_plans(
        promo=promo,
        applicable_plan_ids=payload.applicable_plan_ids,
        db=db,
    )
    db.add(promo)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Promo code already exists",
        )
    result = await db.execute(
        select(PromoCode)
        .where(PromoCode.id == promo.id)
        .options(selectinload(PromoCode.applicable_plans))
    )
    promo_with_plans = result.scalar_one()
    return promo_with_plans


@router.get("/promos/{promo_id}", response_model=PromoCodeResponse)
async def get_promo_code(
    promo_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> PromoCode:
    result = await db.execute(
        select(PromoCode)
        .where(PromoCode.id == promo_id)
        .options(selectinload(PromoCode.applicable_plans))
    )
    promo = result.scalar_one_or_none()
    if promo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promo code not found")
    return promo


@router.put("/promos/{promo_id}", response_model=PromoCodeResponse)
async def update_promo_code(
    promo_id: UUID,
    payload: PromoCodeUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> PromoCode:
    result = await db.execute(
        select(PromoCode)
        .where(PromoCode.id == promo_id)
        .options(selectinload(PromoCode.applicable_plans))
    )
    promo = result.scalar_one_or_none()
    if promo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promo code not found")

    fields_set = payload.model_fields_set

    if "code" in fields_set and payload.code is not None:
        promo.code = payload.code.strip().upper()
    if "name" in fields_set:
        promo.name = payload.name
    if "description" in fields_set:
        promo.description = payload.description
    if "discount_type" in fields_set and payload.discount_type is not None:
        promo.discount_type = payload.discount_type
    if "discount_value" in fields_set and payload.discount_value is not None:
        promo.discount_value = payload.discount_value
    if "max_redemptions" in fields_set:
        promo.max_redemptions = payload.max_redemptions
    if "starts_at" in fields_set:
        promo.starts_at = payload.starts_at
    if "expires_at" in fields_set:
        promo.expires_at = payload.expires_at
    if "is_active" in fields_set:
        promo.is_active = payload.is_active
    if "applicable_plan_ids" in fields_set and payload.applicable_plan_ids is not None:
        await _set_promo_applicable_plans(
            promo=promo,
            applicable_plan_ids=payload.applicable_plan_ids,
            db=db,
        )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Promo code already exists",
        )
    result = await db.execute(
        select(PromoCode)
        .where(PromoCode.id == promo.id)
        .options(selectinload(PromoCode.applicable_plans))
    )
    promo_with_plans = result.scalar_one()
    return promo_with_plans


@router.delete("/promos/{promo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_promo_code(
    promo_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = result.scalar_one_or_none()
    if promo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promo code not found")
    await db.delete(promo)
    await db.commit()


# ========== Violations ==========

@router.get("/violations", response_model=list[ViolationLogResponse])
async def list_violations(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[ViolationLogResponse]:
    result = await db.execute(
        select(ViolationLog)
        .options(
            selectinload(ViolationLog.user),
            selectinload(ViolationLog.test),
        )
        .order_by(ViolationLog.created_at.desc())
    )
    logs = list(result.scalars().all())
    response: list[ViolationLogResponse] = []
    for log in logs:
        response.append(
            ViolationLogResponse(
                id=log.id,
                user_id=log.user_id,
                guest_id=log.guest_id,
                test_id=log.test_id,
                attempt_id=log.attempt_id,
                event_type=log.event_type,
                details=log.details,
                created_at=log.created_at,
                user_email=log.user.email if log.user else None,
                test_title=log.test.title if log.test else None,
            )
        )
    return response


@router.put("/users/{user_id}/subscription", response_model=AdminUserResponse)
async def update_user_subscription(
    user_id: UUID,
    payload: AdminUserSubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> AdminUserResponse:
    """Update or create a user's subscription."""
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.subscription))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    subscription = user.subscription
    if subscription is None:
        subscription = Subscription(user_id=user.id)
        user.subscription = subscription
        db.add(subscription)

    normalized_plan = (payload.plan or "free").strip().lower()
    normalized_status = (payload.status or "inactive").strip().lower()
    now = datetime.now(timezone.utc)
    is_grant_action = normalized_plan != "free" and normalized_status in {"active", "trialing"}

    # Revoke flow: always normalize to a clean free-state to avoid partial cancellations.
    if normalized_plan == "free":
        subscription.plan = "free"
        subscription.status = "inactive"
        subscription.starts_at = None
        subscription.expires_at = None
        subscription.canceled_at = now
        subscription.cancel_at_period_end = False
        subscription.provider_subscription_id = None
    else:
        subscription.plan = normalized_plan
        subscription.status = normalized_status
        subscription.starts_at = subscription.starts_at or now
        # If admin grants premium without expiry, default to 30 days.
        subscription.expires_at = payload.expires_at or (now + timedelta(days=30))
        subscription.canceled_at = None
        subscription.cancel_at_period_end = False

    if is_grant_action:
        expiry_label = (
            subscription.expires_at.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            if subscription.expires_at is not None
            else "muddatsiz"
        )
        db.add(
            UserNotification(
                user_id=user.id,
                notification_type="admin_grant_premium",
                title="Premium hadya qilindi",
                message=(
                    f"Admin tomonidan sizga '{normalized_plan}' premium tarifi berildi. "
                    f"Amal qilish muddati: {expiry_label}."
                ),
                payload={
                    "plan": normalized_plan,
                    "status": normalized_status,
                    "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
                    "granted_by": _admin.email,
                },
            )
        )

    await db.commit()
    await db.refresh(user, attribute_names=["subscription"])

    subscription = user.subscription
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_admin=user.is_admin,
        is_premium=user.is_premium,
        created_at=user.created_at,
        subscription_plan=subscription.plan if subscription else None,
        subscription_status=subscription.status if subscription else None,
        subscription_expires_at=subscription.expires_at if subscription else None,
    )
