"""
School domain models exposed through the modular package structure.
"""

from models.driving_school import DrivingSchool
from models.driving_school_course import DrivingSchoolCourse
from models.driving_school_lead import DrivingSchoolLead
from models.driving_school_media import DrivingSchoolMedia
from models.driving_school_partner_application import DrivingSchoolPartnerApplication
from models.driving_school_review import DrivingSchoolReview
from models.school_membership import SchoolMembership

__all__ = [
    "DrivingSchool",
    "DrivingSchoolCourse",
    "DrivingSchoolLead",
    "DrivingSchoolMedia",
    "DrivingSchoolPartnerApplication",
    "DrivingSchoolReview",
    "SchoolMembership",
]
