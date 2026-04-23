"""
Analytics domain services.
"""

from services.admin_analytics import get_admin_analytics_summary
from services.admin_experiments import get_admin_experiment_summary
from services.admin_growth import get_admin_growth_summary
from services.analytics_events import (
    MONETIZATION_EVENT_TYPES,
    persist_analytics_event,
    record_analytics_event,
)
from services.monetization_analytics import get_feature_funnel, get_feature_performance
from services.monetization_insights import generate_monetization_insights

__all__ = [
    "MONETIZATION_EVENT_TYPES",
    "generate_monetization_insights",
    "get_admin_analytics_summary",
    "get_admin_experiment_summary",
    "get_admin_growth_summary",
    "get_feature_funnel",
    "get_feature_performance",
    "persist_analytics_event",
    "record_analytics_event",
]
