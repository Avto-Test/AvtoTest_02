"""
AUTOTEST Models Package
"""

from models.answer_option import AnswerOption
from models.achievement_definition import AchievementDefinition
from modules.analytics.models import AnalyticsEvent
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.coin_transaction import CoinTransaction
from models.coin_wallet import CoinWallet
from models.experiment import Experiment
from models.payment import Payment
from models.question import Question
from models.question_difficulty import QuestionDifficulty
from models.question_category import QuestionCategory
from models.permission import Permission
from models.refresh_session import RefreshSession
from models.review_queue import ReviewQueue
from models.role import Role
from models.role_permission import RolePermission
from modules.schools.models import SchoolMembership
from models.subscription import Subscription
from models.test import Test
from modules.users.models import PendingRegistration, User
from models.user_role import UserRole
from models.user_adaptive_profile import UserAdaptiveProfile
from models.user_experiment import UserExperiment
from models.user_notification import UserNotification
from models.user_topic_stats import UserTopicStats
from models.user_training_history import UserTrainingHistory
from models.user_question_history import UserQuestionHistory
from models.inference_snapshot import InferenceSnapshot
from models.user_skill import UserSkill
from models.verification_token import VerificationToken
from modules.promocodes.models import PromoCode, PromoCodePlan, PromoRedemption, SubscriptionPlan
from models.violation_log import ViolationLog
from models.guest_attempt import GuestAttempt
from models.guest_attempt_answer import GuestAttemptAnswer
from models.leaderboard_snapshot import LeaderboardSnapshot
from models.lesson import Lesson
from models.feedback import Feedback
from models.feature import Feature
from modules.schools.models import (
    DrivingSchool,
    DrivingSchoolCourse,
    DrivingSchoolLead,
    DrivingSchoolMedia,
    DrivingSchoolPartnerApplication,
    DrivingSchoolReview,
)
from models.driving_instructor import DrivingInstructor
from models.driving_instructor_media import DrivingInstructorMedia
from models.driving_instructor_review import DrivingInstructorReview
from models.driving_instructor_lead import DrivingInstructorLead
from models.driving_instructor_application import DrivingInstructorApplication
from models.driving_instructor_registration_setting import DrivingInstructorRegistrationSetting
from models.driving_instructor_complaint import DrivingInstructorComplaint
from models.exam_simulation_attempt import ExamSimulationAttempt
from models.simulation_exam_setting import SimulationExamSetting
from models.user_achievement import UserAchievement
from models.user_streak import UserStreak
from models.user_exam_result import UserExamResult
from models.xp_boost import XPBoost
from models.xp_event import XPEvent
from models.xp_wallet import XPWallet
from models.user_prediction_snapshot import UserPredictionSnapshot
from models.user_session import UserSession
from models.ml_dataset import MLDataset

__all__ = [
    "User",
    "VerificationToken",
    "Test",
    "Question",
    "QuestionDifficulty",
    "QuestionCategory",
    "Permission",
    "RefreshSession",
    "ReviewQueue",
    "Role",
    "RolePermission",
    "SchoolMembership",
    "AnswerOption",
    "AnalyticsEvent",
    "AchievementDefinition",
    "Attempt",
    "AttemptAnswer",
    "CoinTransaction",
    "CoinWallet",
    "Experiment",
    "Payment",
    "Subscription",
    "UserTrainingHistory",
    "UserQuestionHistory",
    "UserSkill",
    "InferenceSnapshot",
    "PromoCode",
    "PromoCodePlan",
    "PromoRedemption",
    "SubscriptionPlan",
    "ViolationLog",
    "GuestAttempt",
    "GuestAttemptAnswer",
    "PendingRegistration",
    "LeaderboardSnapshot",
    "Lesson",
    "Feedback",
    "Feature",
    "UserAdaptiveProfile",
    "UserExperiment",
    "UserNotification",
    "UserRole",
    "UserTopicStats",
    "DrivingSchool",
    "DrivingSchoolCourse",
    "DrivingSchoolMedia",
    "DrivingSchoolReview",
    "DrivingSchoolLead",
    "DrivingSchoolPartnerApplication",
    "DrivingInstructor",
    "DrivingInstructorMedia",
    "DrivingInstructorReview",
    "DrivingInstructorLead",
    "DrivingInstructorApplication",
    "DrivingInstructorRegistrationSetting",
    "DrivingInstructorComplaint",
    "ExamSimulationAttempt",
    "SimulationExamSetting",
    "UserAchievement",
    "UserStreak",
    "XPBoost",
    "XPEvent",
    "XPWallet",
]
