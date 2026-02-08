"""
AUTOTEST Database Base
SQLAlchemy Declarative Base for all models
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.
    All models should inherit from this class.
    """
    pass
